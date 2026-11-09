# HMX Home Studio — Production Database, Migration, Backup & Deployment Guide (Phases 9–11)

## 1. Required Production Environment Variables

Configure the following environment variables in your hosting environment (Vercel Project Settings / FastAPI host) — **never commit `.env` files or secrets to Git**:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `HMX_ENV` | Backend / Server | Set to `production` in production deployments. Enforces PostgreSQL and `Secure` cookies, and blocks SQLite or `/tmp` storage. |
| `DATABASE_URL` | Backend / Server | PostgreSQL connection string (`postgresql+psycopg2://user:pass@host:5432/dbname?sslmode=require`). |
| `HMX_AUTH_SECRET` | Backend / Server | 32+ byte cryptographic secret for signing `HttpOnly` session tokens (`openssl rand -hex 32`). |
| `HMX_SESSION_TTL_SECONDS` | Backend / Server | Session lifetime in seconds (default `604800` = 7 days). |
| `HMX_CORS_ORIGINS` | Backend / Server | Comma-separated list of allowed frontend origins for credentialed requests. |
| `DB_POOL_SIZE` | Backend | SQLAlchemy connection pool size (default `10`). |
| `DB_MAX_OVERFLOW` | Backend | SQLAlchemy max overflow connections (default `20`). |
| `NEXT_PUBLIC_API_URL` | Frontend | Public URL of the FastAPI backend (`/api/backend` on Vercel or `http://localhost:8000` locally). |

---

## 2. Alembic Database Migrations & Rollback Strategy

All 16 relational + JSONB tables (`users`, `user_profiles`, `home_studio_projects`, `building_project_data`, `project_floors`, `project_rooms`, `project_walls`, `project_openings`, `project_furniture`, `project_material_assignments`, `project_building_settings`, `construction_estimates`, `estimation_assumptions`, `material_labour_rate_overrides`, `project_versions`, `report_metadata`) are managed via Alembic in `backend/alembic/`.

### Apply Migrations (Upgrade to Latest Schema)
```bash
cd backend
export DATABASE_URL="postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
alembic upgrade head
```

### Verify Current Migration Revision
```bash
cd backend
alembic current
```

### Safe Rollback Strategy
1. **Always take a pre-migration snapshot** before rolling back (`pg_dump` or managed cloud snapshot).
2. To roll back one revision step:
   ```bash
   cd backend
   alembic downgrade -1
   ```
3. Destructive migrations are never executed automatically on startup in production.

---

## 3. PostgreSQL Backup & Recovery Procedures

### Logical Backup (`pg_dump`)
```bash
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" --file="hmx_home_studio_$(date +%Y%m%d_%H%M%S).dump"
```

### Point-in-Time Restore (`pg_restore`)
```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" hmx_home_studio_YYYYMMDD_HHMMSS.dump
```

---

## 4. Health Checks & Monitoring

- **Existing HMX Valuation Health Check**: `GET /health` (verifies `hmx_model.joblib` and `Housing.csv` metrics).
- **Home Studio Database Health Check**: `GET /home-studio/health/db` or `GET /api/home-studio/health/db` (verifies database connectivity, dialect, and connection pool health).

