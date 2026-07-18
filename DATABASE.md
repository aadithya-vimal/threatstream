# Database

## Contract

ThreatStream requires PostgreSQL. Neon is the current hosted provider, while ordinary PostgreSQL remains supported for self-hosting.

- `DATABASE_URL`: pooled connection used by the API.
- `DATABASE_URL_DIRECT`: direct connection used by Alembic; falls back to `DATABASE_URL`.
- Hosted connections should use `sslmode=require`.
- Local PostgreSQL does not require TLS unless configured by the operator.

The API normalizes `postgres://` and `postgresql://` into the SQLAlchemy `postgresql+asyncpg://` runtime dialect without logging credentials.

## Canonical Phase 2 schema

| Area | Tables |
|---|---|
| Local identity | `users`, `external_identities` |
| Permissions | `appsec_permissions`, `workspace_roles`, `workspace_role_permissions` |
| Tenancy | `organizations`, `organization_members`, `workspaces`, `workspace_members` |
| Teams | `teams`, `team_members` |
| Security operations | `audit_events`, `integration_credentials` |

Managed Neon Auth stores authentication records in the separate `neon_auth` schema. SQLAlchemy domain models do not map those tables, and Alembic autogeneration includes only the default/`public` ThreatStream schema. Never create, alter, or drop `neon_auth` objects in a ThreatStream revision.

Audit events are append-only through a database trigger. Integration secrets are AES-256-GCM ciphertext; encryption keys remain outside PostgreSQL.

## Alembic

From `backend`:

```powershell
if (-not ($env:DATABASE_URL_DIRECT -or $env:DATABASE_URL)) { throw "A database URL is required" }
python -m alembic upgrade head
python -m alembic current
python -m alembic history
```

Canonical Phase 2 revision: `20260718_0001`.

Do not use application startup to create tables. Downgrading the initial migration destroys Phase 2 data and must only be performed against a confirmed disposable database.

## Test safety

Database integration tests must target a local disposable PostgreSQL database, Testcontainers instance, or isolated Neon branch. Never point destructive tests at development or production databases.
