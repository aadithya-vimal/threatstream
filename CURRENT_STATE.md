# Current State

Audit date: 2026-07-18

## Implemented

| Capability | State |
|---|---|
| React protected shell | Neon Auth SDK and hosted auth UI routes |
| FastAPI identity boundary | Neon Auth JWT/JWKS validation and normalized principal |
| Local identity mapping | `users` and `external_identities` |
| Organizations and workspaces | SQLAlchemy services and API routes |
| Teams and memberships | SQLAlchemy services and constraints |
| Roles and explicit permissions | Application-owned PostgreSQL model |
| Audit foundation | Append-only PostgreSQL events |
| Integration credentials | AES-256-GCM encrypted persistence |
| Schema management | Alembic only |
| Health and readiness | Process liveness plus PostgreSQL query |

## Verification state

Backend unit/API tests and frontend tests/build pass locally. The Alembic migration renders valid PostgreSQL SQL offline and excludes the managed `neon_auth` schema. A clean Neon migration, real Auth lifecycle, isolated database integration tests, onboarding smoke test, and persistence checks remain blocked until rotated database credentials and branch-specific Neon Auth values are configured locally.

## Product boundary

Only Phase 2 infrastructure is active. Application, repository, scanning, finding, deployment, and runtime domains remain Phase 3 or later. No archived SOC module is registered as an active route.
