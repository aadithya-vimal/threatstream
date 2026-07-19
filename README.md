# ThreatStream

ThreatStream is an open-source Application Security Operations platform. Its hosted web product provides browser-safe application-security workflows; a future desktop product will add deeper local DevSecOps capabilities while sharing the same auth, authorization, API contracts, and credential settings.

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
- Settings → Integrations manages workspace-owned VirusTotal API credentials without `.env` edits. Saved values are encrypted and can only be replaced, tested, or deleted—not retrieved.
- The operational overview uses live workspace, team, integration, and audit APIs; unavailable data is represented as an empty, loading, permission, or error state rather than a synthetic metric.
- Workspace → Teams supports real tenant-scoped listing and creation. Operations → Audit log exposes safe append-only events to roles with `audit:read`.
- Operations → Findings provides live workspace-scoped creation, filtering, pagination, search, assignment, optimistic editing, validated status transitions, evidence, comments, activity, and audit logging.
- The Findings domain is active; application/repository models and automated scanner ingestion remain future work.
- A clean Neon deployment and real Neon Auth lifecycle still require local branch configuration before Phase 2 can be declared operational.

## Local setup

```powershell
Copy-Item backend\.env.example backend\.env
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

`DATABASE_URL`, Neon Auth configuration, `CREDENTIAL_ENCRYPTION_KEY`, CORS, and pool settings are deployment secrets and are never user-editable. Provider credentials are workspace-owned and entered through Integrations. No deployment-level provider fallback is used: the precedence rule is workspace credential, then not configured.

## Product modes

- **ThreatStream Web** is hosted and browser-based. It uses backend APIs, provides surface-level AppSec/security workflows, and never executes local commands or accesses local files.
- **ThreatStream Desktop** is a future Windows, macOS, and Linux application for deeper local security operations. Packaging, local agents, filesystem access, and tool execution are not implemented.

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

See `API.md`, `ARCHITECTURE.md`, `DATABASE.md`, and `DEPLOYMENT.md` for operational details.

## Experience architecture

Public, authentication, and protected routes share the ThreatStream midnight design system documented in `DESIGN_SYSTEM.md`. The protected shell exposes only routes backed by current APIs: `/overview`, `/findings`, `/findings/new`, `/findings/:findingId`, `/workspace/teams`, `/audit`, and `/settings/integrations`. Archived SOC-style screens remain unregistered because their data and actions are not part of the active backend.
