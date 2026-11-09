"""
HMX Home Studio — Production Database Configuration & Connection Pooling (Phase 9)
Supports PostgreSQL in production via SQLAlchemy 2.0 + Alembic migrations.
Forbids ephemeral /tmp storage or SQLite in production.
"""

import os
import time
from contextlib import contextmanager
from typing import Dict, Any, Generator
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session

HMX_ENV = os.getenv("HMX_ENV", os.getenv("NODE_ENV", "development")).lower()
RAW_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def resolve_database_url() -> str:
    """
    Resolves and validates the SQLAlchemy database URL.
    In production (`HMX_ENV == 'production'`), a PostgreSQL `DATABASE_URL` is mandatory
    and `/tmp` or SQLite URLs are explicitly rejected.
    """
    if RAW_DATABASE_URL:
        url = RAW_DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and "+psycopg2" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

        if HMX_ENV == "production":
            if "/tmp" in url or url.startswith("sqlite"):
                raise RuntimeError(
                    "Production persistence error: SQLite and /tmp storage are forbidden in production. "
                    "Set DATABASE_URL to a persistent PostgreSQL instance."
                )
        return url

    if HMX_ENV == "production":
        raise RuntimeError(
            "DATABASE_URL environment variable is required in production (PostgreSQL)."
        )

    # Local development / automated test fallback (never /tmp)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    local_db_path = os.path.join(base_dir, "hmx_home_studio_dev.db")
    return f"sqlite:///{local_db_path}"


DATABASE_URL = resolve_database_url()
IS_POSTGRES = DATABASE_URL.startswith("postgresql")

engine_kwargs: Dict[str, Any] = {
    "pool_pre_ping": True,
    "future": True,
}

if IS_POSTGRES:
    engine_kwargs.update(
        {
            "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
            "pool_recycle": 1800,
        }
    )
else:
    engine_kwargs.update(
        {
            "connect_args": {"check_same_thread": False},
        }
    )

engine = create_engine(DATABASE_URL, **engine_kwargs)

if not IS_POSTGRES:
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency providing a transactional SQLAlchemy Session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def transactional_session() -> Generator[Session, None, None]:
    """Context manager for atomic database transactions with automatic rollback on error."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_database_health() -> Dict[str, Any]:
    """Verifies database connectivity, dialect, and latency."""
    start = time.perf_counter()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "healthy",
            "dialect": "postgresql" if IS_POSTGRES else "sqlite_dev",
            "environment": HMX_ENV,
            "latency_ms": latency_ms,
            "pool_pre_ping": True,
        }
    except Exception as exc:
        return {
            "status": "unhealthy",
            "dialect": "postgresql" if IS_POSTGRES else "sqlite_dev",
            "environment": HMX_ENV,
            "error": str(exc),
        }

