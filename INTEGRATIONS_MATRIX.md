# Integrations Matrix

Phase 2 stores and tests integration credentials securely but does not perform enrichment or ingest provider data.

| Integration area | Current state | Next implementation gate |
|---|---|---|
| Neon Auth | Code complete | Provision on the intended branch and validate hosted session lifecycle |
| PostgreSQL / Neon | Code complete | Apply Alembic migration and validate persistence |
| Source control | Planned | Phase 3 application/repository model |
| Security scanners | Planned | Typed scan and finding contracts |
| VirusTotal credential management | Available | Workspace save, update, connection test, and delete |
| Other IOC enrichment providers | Deferred | Product workflow and provider adapter design |
| Runtime telemetry | Deferred | Deployment/runtime correlation model |

VirusTotal is the only provider in the authoritative registry. Legacy manager references do not make a provider active.
