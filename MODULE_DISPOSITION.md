# Module Disposition

## Active

- React public pages and authenticated overview.
- Neon Auth-backed authentication context and provider-neutral FastAPI principal.
- Tenant context, workspace selection, and onboarding.
- FastAPI tenancy routes, authorization dependencies, and error envelopes.
- SQLAlchemy database foundation, models, repositories, and Alembic migrations.
- Credential encryption and health/readiness endpoints.

## Removed

- Archived SOC pages and browser repositories with direct database access.
- In-process worker, scheduler, telemetry, malware, discovery, and provider modules tied to the retired persistence layer.
- Legacy migration/configuration tooling.

## Deferred

Application, repository, scan, finding, deployment, runtime, remediation, and worker domains remain future phases. They must not be exposed until their real backend contracts and tests exist.
