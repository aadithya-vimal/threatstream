# Integrations Matrix

Phase 2 stores integration credentials securely but does not activate provider workflows.

| Integration area | Current state | Next implementation gate |
|---|---|---|
| Neon Auth | Code complete | Provision on the intended branch and validate hosted session lifecycle |
| PostgreSQL / Neon | Code complete | Apply Alembic migration and validate persistence |
| Source control | Planned | Phase 3 application/repository model |
| Security scanners | Planned | Typed scan and finding contracts |
| IOC enrichment | Deferred | Product workflow and provider adapter design |
| Runtime telemetry | Deferred | Deployment/runtime correlation model |

No provider is presented as active merely because a credential can be stored.
