# Database

## Contract

ThreatStream requires PostgreSQL. Neon is the current hosted provider, while ordinary PostgreSQL remains supported for self-hosting.

- `DATABASE_URL`: pooled connection used by the API.
- `DATABASE_URL_DIRECT`: direct connection used by Alembic; falls back to `DATABASE_URL`.
- Hosted connections should use `sslmode=require`.
- Local PostgreSQL does not require TLS unless configured by the operator.

The API normalizes `postgres://` and `postgresql://` into the SQLAlchemy `postgresql+asyncpg://` runtime dialect without logging credentials.

## Current application schema

| Area | Tables |
|---|---|
| Local identity | `users`, `external_identities` |
| Permissions | `appsec_permissions`, `workspace_roles`, `workspace_role_permissions` |
| Tenancy | `organizations`, `organization_members`, `workspaces`, `workspace_members` |
| Teams | `teams`, `team_members` |
| Security operations | `audit_events`, `integration_credentials`, `assets`, `asset_tags`, `asset_tag_links`, `findings`, `finding_evidence`, `finding_comments`, `finding_activities` |

Managed Neon Auth stores authentication records in the separate `neon_auth` schema. SQLAlchemy domain models do not map those tables, and Alembic autogeneration includes only the default/`public` ThreatStream schema. Never create, alter, or drop `neon_auth` objects in a ThreatStream revision.

Audit events are append-only through a database trigger. Integration secrets are AES-256-GCM ciphertext; encryption keys remain outside PostgreSQL.

Findings are owned by both organization and workspace, and every query additionally constrains the authoritative workspace path. A positive `version` column provides optimistic validation for mutable workflows. Evidence and comments cascade with their finding; audit records retain the finding identifier after deletion, while the domain activity table provides the live finding timeline. Status, severity, evidence kind, source/external identity uniqueness, assignment, lifecycle timestamps, and workspace-oriented query indexes are enforced by the schema.

Assets are owned by organization and workspace. Their type and normalized identifier are unique within a workspace. Tags are normalized once per workspace and related through `asset_tag_links`, not serialized into Asset rows. Assets use positive optimistic versions and soft activation. Findings may reference an Asset through nullable `asset_id`; deleting an Asset sets that reference to null, while normal product workflows deactivate Assets to preserve context. Workspace checks in the service prevent cross-workspace assignment.

Asset metadata is a bounded JSON object intended for future scanner-specific structured fields. API responses redact secret-like keys, UI rendering is text-only, and audit events record only safe field names/counts rather than metadata payloads.

## Alembic

From `backend`:

```powershell
if (-not ($env:DATABASE_URL_DIRECT -or $env:DATABASE_URL)) { throw "A database URL is required" }
python -m alembic upgrade head
python -m alembic current
python -m alembic history
```

Current revision: `20260719_0006`. Durable scan execution and schedules require `20260719_0006`; it follows the scanner foundation revision `20260719_0005` without modifying the managed Neon Auth schema. Lease columns live on `scan_jobs`; `scan_schedules` stores timezone-aware recurrence and outcome state. Uniqueness constraints protect raw-result ingestion, schedule occurrences, and active profile execution.

Do not use application startup to create tables. Downgrading the initial migration destroys Phase 2 data and must only be performed against a confirmed disposable database.

## Test safety

Database integration tests must target a local disposable PostgreSQL database, Testcontainers instance, or isolated Neon branch. Never point destructive tests at development or production databases.
