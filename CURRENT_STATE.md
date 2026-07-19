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
| Findings domain | Workspace-isolated CRUD, lifecycle validation, assignment, evidence, comments, activity, audit, filtering, pagination, sorting, search, and optimistic versions |
| Findings experience | Live list, creation, detail, editing, transition, evidence, comment, activity, loading, empty, permission, conflict, and error states |
| Asset Inventory domain | Workspace-isolated Assets, normalization, durable tags, metadata safety, ownership, classification, activation, audit, filtering, pagination, sorting, search, and optimistic versions |
| Asset Inventory experience | Live list, creation, detail, editing, related Findings, metadata, loading, empty, permission, conflict, and error states |
| Scanner framework | Profiles, durable targets, PostgreSQL-leased worker jobs, heartbeat, cancellation, bounded retry/recovery, safe raw results, Nuclei adapter, Finding deduplication/reopening, and occurrences |
| Scheduled scans | Workspace schedules, interval and five-field cron validation, IANA timezones, misfire policy, exactly-once occurrences, active-profile conflict handling, and audit |
| Scanner experience | Live overview, worker state, profiles, schedules, target selection, runtime availability, jobs, retry/stall context, polling, cancellation, and safe result summaries |
| Schema management | Alembic only |
| Health and readiness | Process liveness plus PostgreSQL query |

## Verification state

Backend unit/API tests and frontend tests/build pass locally. Revision `20260719_0006` is applied to the approved Neon development branch, has one head, renders valid PostgreSQL SQL offline, and excludes the managed `neon_auth` schema. Disposable live worker, lease recovery, idempotency, schedule dispatch, audit, and cleanup checks pass with a fake adapter. Real Auth lifecycle and Nuclei execution still require their separately configured runtimes.

## Product boundary

The hosted web product exposes tenant infrastructure, teams, safe audit history, credential settings, canonical Asset Inventory, Findings, and scanner execution. Nuclei is the only active scanner adapter and remains an optional backend runtime capability. VirusTotal is the only enabled third-party credential provider; its enrichment workflow remains deferred. Application, deployment, and runtime domains remain later work. No archived SOC module is registered as an active route.

The future desktop product will share core UI, API, auth, authorization, and credential contracts. Desktop packaging and privileged/local capabilities have not started.
