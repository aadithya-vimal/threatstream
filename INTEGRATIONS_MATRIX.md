# Integrations Matrix

Phase 2 stores and tests integration credentials securely but does not perform enrichment or ingest provider data.

| Integration area | Current state | Next implementation gate |
|---|---|---|
| Neon Auth | Code complete | Provision on the intended branch and validate hosted session lifecycle |
| PostgreSQL / Neon | Code complete | Apply Alembic migration and validate persistence |
| Source control | Planned | Phase 3 application/repository model |
| Nuclei scanner | Available when CLI is installed | Local CLI adapter, safe allowlist, health, jobs, ingestion, and Finding occurrences |
| Trivy, Nmap, Semgrep, Gitleaks, ZAP, custom | Known but inactive | Implement and validate one adapter at a time |
| VirusTotal credential management | Available | Workspace save, update, connection test, and delete |
| Other IOC enrichment providers | Deferred | Product workflow and provider adapter design |
| Runtime telemetry | Deferred | Deployment/runtime correlation model |

VirusTotal is the only provider in the authoritative registry. Legacy manager references do not make a provider active.

Nuclei is registered in the separate scanner adapter registry, not the credential-provider registry. It is not installed automatically and needs no stored credential for the initial local-CLI mode. Its absence never prevents backend startup. Scanner subprocesses run only against Assets explicitly assigned to a profile; operators remain responsible for authorization to test every target.
