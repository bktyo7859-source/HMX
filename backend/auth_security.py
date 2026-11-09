"""
HMX Home Studio — Authentication, Argon2id Hashing, Session Cookies & IDOR Prevention (Phase 9.3)
Never trusts client-supplied owner IDs or X-HMX-Owner-Id headers.
"""

import os
import time
import hmac
import json
import base64
import secrets
import hashlib
from typing import Optional, Dict, Any, Tuple
from fastapi import Request, Response, HTTPException, status, Depends
from sqlalchemy.orm import Session

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, InvalidHashError
    _ARGON2_HASHER = PasswordHasher(
        time_cost=3,
        memory_cost=65536,
        parallelism=4,
        hash_len=32,
        salt_len=16,
    )
    HAS_ARGON2 = True
except ImportError:
    _ARGON2_HASHER = None
    HAS_ARGON2 = False

try:
    from database import get_db, HMX_ENV
    from models_db import User, HomeStudioProjectRecord
except ImportError:
    from backend.database import get_db, HMX_ENV
    from backend.models_db import User, HomeStudioProjectRecord


SESSION_COOKIE_NAME = "hmx_session"
SESSION_TTL_SECONDS = int(os.getenv("HMX_SESSION_TTL_SECONDS", str(60 * 60 * 24 * 7)))  # 7 days
SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24  # Refresh when < 24h remaining


def _get_signing_secret() -> bytes:
    secret = os.getenv("HMX_AUTH_SECRET", "").strip()
    if not secret:
        if HMX_ENV == "production":
            raise RuntimeError(
                "HMX_AUTH_SECRET environment variable must be configured in production."
            )
        secret = "hmx-dev-only-secret-do-not-use-in-production-9f8e7d6c5b4a"
    return secret.encode("utf-8")


# --- Password Hashing (Argon2id primary, scrypt secondary) ---

def hash_password(plain_password: str) -> Tuple[str, str]:
    """
    Hashes a password using Argon2id (or scrypt if argon2-cffi C extension is unavailable).
    Returns (password_hash, algorithm_name).
    """
    if len(plain_password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if HAS_ARGON2 and _ARGON2_HASHER is not None:
        return _ARGON2_HASHER.hash(plain_password), "argon2id"

    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        plain_password.encode("utf-8"),
        salt=salt,
        n=16384,
        r=8,
        p=1,
        dklen=32,
    )
    encoded = f"scrypt$16384$8$1${salt.hex()}${derived.hex()}"
    return encoded, "scrypt"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verifies a plaintext password against an Argon2id or scrypt hash in constant time."""
    if not plain_password or not stored_hash:
        return False

    if stored_hash.startswith("$argon2"):
        if not HAS_ARGON2 or _ARGON2_HASHER is None:
            return False
        try:
            return bool(_ARGON2_HASHER.verify(stored_hash, plain_password))
        except (VerifyMismatchError, InvalidHashError, Exception):
            return False

    if stored_hash.startswith("scrypt$"):
        try:
            parts = stored_hash.split("$")
            n, r, p = int(parts[1]), int(parts[2]), int(parts[3])
            salt = bytes.fromhex(parts[4])
            expected = bytes.fromhex(parts[5])
            candidate = hashlib.scrypt(
                plain_password.encode("utf-8"),
                salt=salt,
                n=n,
                r=r,
                p=p,
                dklen=len(expected),
            )
            return hmac.compare_digest(candidate, expected)
        except Exception:
            return False

    return False


# --- Signed Session Token Management ---

def create_session_token(
    user_id: str,
    email: str,
    ttl_seconds: int = SESSION_TTL_SECONDS,
) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + ttl_seconds,
        "jti": secrets.token_hex(12),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    sig = hmac.new(
        _get_signing_secret(), payload_b64.encode("ascii"), hashlib.sha256
    ).hexdigest()
    return f"{payload_b64}.{sig}"


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or "." not in token:
        return None
    try:
        payload_b64, sig = token.split(".", 1)
        expected_sig = hmac.new(
            _get_signing_secret(), payload_b64.encode("ascii"), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None

        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        now = int(time.time())
        if int(payload.get("exp", 0)) <= now:
            return None
        return payload
    except Exception:
        return None


def set_auth_cookie(response: Response, token: str, max_age: int = SESSION_TTL_SECONDS) -> None:
    is_secure = HMX_ENV == "production"
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    is_secure = HMX_ENV == "production"
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
    )


# --- Sliding-Window Rate Limiter for Auth Endpoints ---

class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int = 12, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: Dict[str, list[float]] = {}

    def check_or_raise(self, key: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds
        history = [ts for ts in self._buckets.get(key, []) if ts > cutoff]
        if len(history) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts. Please wait a minute before retrying.",
            )
        history.append(now)
        self._buckets[key] = history


auth_rate_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=60)


# --- Server-Side Authentication & Ownership Dependencies ---

def extract_token_from_request(request: Request) -> Optional[str]:
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return None


def get_current_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    """
    Authenticates the request using the signed HttpOnly session cookie or Bearer token.
    Never trusts X-HMX-Owner-Id or client-provided owner IDs.
    """
    token = extract_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to HMX Home Studio.",
        )

    claims = verify_session_token(token)
    if not claims or not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please sign in again.",
        )

    user = db.query(User).filter(User.id == claims["sub"], User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated account no longer exists or is inactive.",
        )

    # Automatic sliding refresh if token is within refresh window
    remaining = int(claims.get("exp", 0)) - int(time.time())
    if 0 < remaining < SESSION_REFRESH_THRESHOLD_SECONDS:
        refreshed = create_session_token(user.id, user.email)
        set_auth_cookie(response, refreshed)

    return user


def verify_project_ownership(
    project_id: str,
    user: User,
    db: Session,
) -> HomeStudioProjectRecord:
    """
    Fetches a project and enforces strict server-side ownership verification (IDOR protection).
    """
    record = (
        db.query(HomeStudioProjectRecord)
        .filter(
            HomeStudioProjectRecord.id == project_id,
            HomeStudioProjectRecord.is_archived.is_(False),
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested Home Studio project was not found.",
        )

    if record.owner_id != user.id:
        # Strict IDOR protection — never leak details of another user's project
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to access or modify this project.",
        )

    return record

