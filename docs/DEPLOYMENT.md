# ThreatStream Deployment

ThreatStream does not yet have a production-accepted deployment. This document records the current minimum topology and gaps; it is not a production-readiness claim.

## Current minimum processes

- static/Vite frontend artifact;
- FastAPI API;
- PostgreSQL-backed scan worker;
- PostgreSQL/Neon database.

The future release additionally requires public-intelligence ingestion workers, scheduler ownership, monitoring, and an isolated honeypot sensor.

## Configuration boundaries

Local, test, staging, and production must have separate databases, Auth settings, encryption keys, GitHub App/webhook secrets, worker queues, public-source credentials, sensor credentials, URLs, and monitoring. Secrets remain deployment configuration and must never be committed.

## Migration order

1. Identify the exact target environment and database.
2. Confirm backups/restore requirements.
3. Run `python -m alembic heads` from `backend` and require one head.
4. Render/review offline SQL where required.
5. Apply migrations before starting code that requires them.
6. Verify health/readiness and worker compatibility.

The repository head is `20260719_0006`; no live target was verified during Phase 0.

## Current operational state

- API liveness and database readiness routes exist but are not production-verified.
- Durable lease/retry/recovery/schedule logic is test-covered with fake adapters.
- TLS, rate limiting, metrics, alerts, backup restore, rollback rehearsal, production scanner isolation, and deployment smoke tests are missing or unverified.
- Browser authentication is broken/unverified and blocks release.

Production deployment must not proceed until the master-plan production gates pass.
