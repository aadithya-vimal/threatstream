> Historical record (SaaS era, superseded 2026-09-09). Not authoritative � ThreatStream is now a frontend-only visualization app. See root README.md.

# ThreatStream API

The FastAPI application is defined in `backend/app/main.py`. The versioned base path defaults to `/api/v1`; OpenAPI is available at `/api/v1/openapi.json` when the API is running.

## Public operational routes

- `GET /health` — process liveness
- `GET /ready` — database readiness

## Authenticated route families

- `/api/v1/tenancy` — context, Organization/Workspace bootstrap, teams, and audit
- `/api/v1/workspaces/{workspace_id}/integrations` — provider credential lifecycle
- `/api/v1/workspaces/{workspace_id}/assets` — Asset inventory
- `/api/v1/workspaces/{workspace_id}/findings` — Finding lifecycle, comments, and evidence
- `/api/v1/workspaces/{workspace_id}/scanners` — scanner definitions and health
- `/api/v1/workspaces/{workspace_id}/scan-profiles` — profiles, targets, and run requests
- `/api/v1/workspaces/{workspace_id}/scan-jobs` — durable jobs, cancellation, and safe results
- `/api/v1/workspaces/{workspace_id}/scan-schedules` — schedules and enable/disable controls
- `/api/v1/workspaces/{workspace_id}/scan-worker/status` — queue/lease summary

All customer routes require a bearer token. Workspace routes enforce domain permissions and return safe error envelopes with correlation IDs. A registered route is not proof of a working browser workflow; current verification is maintained in [`STATUS.md`](STATUS.md).
