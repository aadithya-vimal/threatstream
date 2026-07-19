# Current State

Audit date: 2026-07-19

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
| Audit experience | Permission-scoped recent-event API and filterable workspace UI |
| Teams experience | Workspace-scoped list and create UI with permission-aware controls |
| Integration credentials | Workspace-scoped Settings UI, authoritative provider schemas, AES-256-GCM persistence, masked state, lifecycle audit events |
| VirusTotal credential test | Constrained HTTPS request, five-second timeout, normalized safe status |
| Schema management | Alembic only |
| Health and readiness | Process liveness plus PostgreSQL query |

## Verification state

Backend unit/API tests and frontend tests/build pass locally. The Alembic migration renders valid PostgreSQL SQL offline and excludes the managed `neon_auth` schema. A clean Neon migration, real Auth lifecycle, isolated database integration tests, onboarding smoke test, and persistence checks remain blocked until rotated database credentials and branch-specific Neon Auth values are configured locally.

## Product boundary

The hosted web product exposes tenant infrastructure, teams, safe audit history, and credential settings. Its live dashboard is composed only from these real endpoints. VirusTotal is the only enabled third-party credential provider; its enrichment workflow remains deferred. Application, repository, scanning, finding, deployment, and runtime domains remain Phase 3 or later. No archived SOC module is registered as an active route.

The future desktop product will share core UI, API, auth, authorization, and credential contracts. Desktop packaging and privileged/local capabilities have not started.
