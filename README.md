# ThreatStream

ThreatStream is an open-source Application Security Operations platform. Phase 2 provides the authenticated, tenant-aware foundation: organizations, workspaces, teams, explicit permissions, audit events, and encrypted integration credentials.

## Architecture

```text
React → Neon Auth → FastAPI → SQLAlchemy async → Neon PostgreSQL
```

ThreatStream Cloud uses branchable Neon Auth and Neon PostgreSQL. Neon Auth authenticates identity; ThreatStream owns local users, tenancy, roles, permissions, and audit history. The browser never accesses PostgreSQL or the Neon Data API.

## Current status

- SQLAlchemy 2.0 async data access and `asyncpg` are active.
- Alembic is the only schema-management system.
- Neon Auth JWTs are verified using issuer-bound, cached JWKS keys and an explicit asymmetric algorithm policy.
- External Neon Auth subjects map idempotently to local ThreatStream users without receiving tenancy permissions.
- React accesses operational data only through FastAPI.
- Phase 3 has not started.
- A clean Neon deployment and real Neon Auth lifecycle still require local branch configuration before Phase 2 can be declared operational.

## Local setup

```powershell
Copy-Item .env.example backend\.env
cd backend
python -m pip install -r requirements.txt
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is not set" }
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In a second terminal:

```powershell
cd C:\Users\aadit\OneDrive\Desktop\threatstream
npm install
if (-not $env:VITE_NEON_AUTH_URL) { throw "VITE_NEON_AUTH_URL is not set" }
npm run dev
```

Generate a credential-encryption key without printing production secrets:

```powershell
python -c "import base64,secrets; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
```

## Verification

```powershell
cd backend
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
python -m pytest -q
python -m alembic current

cd ..
npm test
npm run build
```

See `DATABASE.md`, `DEPLOYMENT.md`, and `NEON_AUTH_MIGRATION_REPORT.md` for operational details.
