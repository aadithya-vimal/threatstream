# ThreatStream Architecture

This document describes the current implemented boundaries and the target boundaries already authorized by the product contract. Evidence and verification state belong in [`STATUS.md`](STATUS.md).

## Current implemented shape

```text
React/Vite browser
  ├─ Neon Auth client (browser flow currently broken/unverified)
  └─ FastAPI /api/v1
       ├─ identity, tenancy, and permissions
       ├─ Assets, Findings, integrations, and audit
       ├─ scan profiles, jobs, schedules, and worker status
       └─ async SQLAlchemy → PostgreSQL

PostgreSQL-leased scan worker
  └─ typed scanner adapter registry
       └─ Nuclei adapter (only active adapter; real binary unverified)
```

The API registers routes from `backend/app/api/routes`. Domain logic lives under `backend/app/domains`, persistence under `backend/app/database`, and the worker under `backend/app/workers`. The obsolete `backend/app/plugins` runtime was removed in TS-004.

## Trust boundaries

- The browser never receives database credentials or integration secrets.
- FastAPI validates identity and enforces Workspace permissions before customer-data access.
- Integration credentials are encrypted and plaintext is not returned to the browser.
- Scanner execution occurs in a worker, not the browser or API request process.
- Repository code must be treated as untrusted data and never executed.
- Detected secret values and unsafe raw payload fields must be redacted or discarded.

## Target authorized shape

The target adds Application, Repository, GitHub, notifications, and public-intelligence domains. Customer Workspace data and public threat observations must use separate modules, tables, routes, permissions, and workers. Public queries must never join customer Assets, repositories, Findings, jobs, results, credentials, or audit events.

## Current limitations

- Auth has no passing real-browser acceptance and the repeated JWT endpoint `404` remains the leading blocker.
- The Nuclei CLI and worker have not been verified as a real deployed scanning path.
- GitHub, public-intelligence, Application, Repository, and notification domains are not implemented.
- Production isolation, observability, backups, restore, rate limiting, and deployment acceptance are not verified.
