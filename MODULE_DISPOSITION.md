# ThreatStream Module Disposition

Disposition labels: Keep, Refactor, Repurpose, Archive, Remove, and Planned.

## Frontend pages

| Module | Disposition | Rationale |
|---|---|---|
| `Landing.jsx` | Refactor | Replace SOC/globe claims with verified AppSecOps positioning |
| `Terms.jsx` | Refactor | Align product description and data handling language |
| `Dashboard.jsx` | Replace | Current threat globe and SOC metrics do not fit target product |
| `Assets.jsx` | Repurpose | Useful inventory patterns; future Applications and Components module |
| `Vulnerabilities.jsx` | Repurpose | Useful list patterns; future canonical Findings module |
| `Operations.jsx` | Repurpose | Future Scan Runs, Schedules, and Workers surfaces |
| `Connectors.jsx` | Repurpose | Future typed Integrations management after secure credentials exist |
| `Incidents.jsx` | Repurpose | Future Cases and Remediation; remove attack-simulation concepts |
| `Reports.jsx` | Repurpose | Future application-security reports |
| `GraphInvestigation.jsx` | Repurpose | Future persisted Application Relationships only |
| `AuditLog.jsx` | Repurpose | Future append-only tenant-scoped Audit Events view |
| `Administration.jsx` | Repurpose | Future Organizations, Workspaces, Teams, Roles, and Policies |
| `SystemSettings.jsx` | Refactor | Split user preferences from secure administrative/provider configuration |
| `ThreatIntelligence.jsx` | Archive | Provider-centric threat-intelligence platform is outside V1 |
| `IOCEnrichment.jsx` | Archive | Future evidence-enrichment extension, not a primary V1 page |
| `Network.jsx` | Archive | Generic network dashboard is outside product scope |
| `Endpoints.jsx` | Archive | ThreatStream will ingest runtime events, not act as an EDR |
| `ThreatHunting.jsx` | Archive | Generic hunting console is outside V1 |
| `MalwareAnalysis.jsx` | Archive | Malware laboratory is an explicit non-goal |
| `YARAPlatform.jsx` | Archive | YARA authoring platform is an explicit non-goal |
| `BackupManager.jsx` | Archive | Backup/recovery belongs in operations documentation and administration, not flagship navigation |

## Frontend shared modules

| Module group | Disposition | Rationale |
|---|---|---|
| `layouts/DashboardLayout.jsx` | Refactor | Keep responsive shell; rename SOC-specific labels and add workspace context later |
| `components/Sidebar.jsx` | Refactor | Replace legacy navigation with implemented AppSecOps routes only |
| `components/Topbar.jsx` | Refactor | Remove fake live-backend badge; add workspace context and truthful health later |
| `components/ProtectedRoute.jsx` | Keep then Refactor | Preserve Supabase Auth UX; adopt new permissions after Phase 2 |
| Generic panels, tables, loading, error, empty-state components | Keep | Reusable visual foundation |
| `components/Globe.jsx` and `ThreatFeed.jsx` | Archive | Explicitly outside target product |
| `components/GlobalSearch.jsx` | Refactor | Rebuild around applications, components, findings, deployments, and cases |
| `components/SetupWizard.jsx` | Refactor | Replace SOC setup with organization/workspace onboarding |
| `contexts/AuthContext.jsx` | Refactor | Keep auth lifecycle; replace static SOC roles and frontend authority |
| `contexts/NotificationContext.jsx` | Refactor | Keep realtime pattern; bind to persisted notification events later |
| `types/index.js` | Replace incrementally | Current monolithic SOC model; create feature-local contracts |
| `lib/api.js` | Refactor | Preserve authenticated fetch behavior; add typed errors, correlation IDs, pagination |
| `lib/supabase/client.js` | Keep | Browser auth/data client foundation; restrict direct table writes over time |

## Frontend repositories and services

| Module | Disposition | Rationale |
|---|---|---|
| `AssetRepository.js` / `AssetService.js` | Repurpose | Applications/components migration source; stop silent empty fallbacks |
| `OperationsRepository.js` / `OperationsService.js` | Repurpose | Scan-run and worker concepts; remove client-generated operational records |
| `ConfigurationRepository.js` / `ConfigurationService.js` | Refactor | Non-secret preferences only; provider secrets move behind backend API |
| `IncidentRepository.js` / `IncidentService.js` | Repurpose | Cases/remediation only; remove malware and exploit-simulation behavior |
| `TelemetryRepository.js` / `TelemetryService.js` | Repurpose | Runtime-event display after signed backend ingestion; no client-side alert fabrication |
| `ThreatRepository.js` / `ThreatService.js` | Archive | Threat-intelligence platform is outside V1 |
| `MalwareRepository.js` / `MalwareService.js` | Archive | Explicit product non-goal |
| `UserRepository.js` / `UserService.js` | Refactor | Move to organization/workspace membership APIs |

## Backend endpoints and services

| Module | Disposition | Rationale |
|---|---|---|
| `main.py` | Refactor | Retain FastAPI bootstrap; register bounded routes and correlation middleware |
| `api/endpoints/jobs.py` | Repurpose | Future scan job control with tenant scope and worker leases |
| `api/endpoints/scheduler.py` | Repurpose | Future scan policies/schedules after durable queue |
| `api/endpoints/plugins.py` | Replace | Typed integrations/scanners APIs; no generic arbitrary plugin execution |
| `api/endpoints/telemetry.py` | Replace | Generic authenticated runtime webhook and runtime-query APIs |
| `api/endpoints/malware.py` | Archive | Explicit non-goal |
| `services/telemetry.py` | Repurpose | Retain normalization ideas; remove YARA lab/SOC escalation semantics |
| `workers/job_worker.py` | Repurpose | Extract into dedicated worker package; add identity, leases, isolation, provenance |
| `scheduler/task_scheduler.py` | Repurpose | Use only after durable scheduling semantics exist |
| `core/security.py` | Replace | Validate token claims and enforce explicit permissions/workspace scope |
| `core/config.py` | Refactor | Separate API, worker, queue, storage, encryption, and provider bootstrap settings |
| `core/runtime_secrets.py` | Replace | Current settings-table secret lookup does not meet encryption/masking requirements |
| `database/supabase_client.py` | Replace | Request-scoped user client plus narrowly scoped internal service clients |
| Pydantic job schemas | Repurpose | Introduce domain-local request/response schemas |

## Backend plugins

| Plugin group | Modules | Disposition |
|---|---|---|
| Plugin framework | `base.py`, `manager.py` | Replace with typed capability contracts and explicit unknown-plugin failure |
| Discovery | `nmap.py`, `nuclei.py`, `whatweb.py`, `sslyze.py`, `masscan.py`, `rustscan.py`, `nikto.py`, `discovery.py` | Planned for future integration; remove fabricated fallback records before reuse |
| IOC providers | `virustotal.py`, `ioc_providers.py`, `orchestrator.py` | Planned for future evidence enrichment; not V1 navigation |
| Runtime collectors | `windows_events.py`, `sysmon.py`, `auditd.py`, `osquery.py`, `zeek.py`, `suricata.py` | Planned runtime-source adapters; do not imply agent/EDR capability |
| Required V1 scanners | Semgrep, Gitleaks, Trivy, OSV-Scanner, Checkov, Syft | Planned; implement in Phase 5 |

## Database migrations

| Migration | Disposition | Rationale |
|---|---|---|
| `20260705000000_init_soc_schema.sql` | Preserve as legacy baseline | Existing development schema; broad RLS must be superseded |
| `20260705000100_threat_intel_platform.sql` | Archive domain | Outside V1; retain migration history |
| `20260705000200_asset_intelligence.sql` | Repurpose selectively | Relationship concepts may inform application graph; provenance and tenancy missing |
| `20260705000300_endpoint_telemetry.sql` | Repurpose selectively | Runtime events replace endpoint-product claims |
| `20260705000400_incident_response.sql` | Repurpose selectively | Cases/remediation require new canonical model |
| `20260705000500_threat_analysis.sql` | Archive domain | Malware/YARA/hunting non-goals; broad RLS unsafe |
| `20260705000600_operations.sql` | Repurpose selectively | Jobs/connectors/audit concepts useful; tenant scope and security absent |
| `20260705000700_user_profiles.sql` | Supersede | Replace SOC roles with memberships and explicit permission grants |
| New tenancy migration series | Planned | Phase 2 additive, tested organization/workspace model |

## Documentation and deployment

| Module | Disposition | Rationale |
|---|---|---|
| `README.md` | Replace | Current document leads with unsupported SOC/globe claims |
| `.env.example` | Refactor | Document bootstrap-only secrets and service boundaries |
| `supabase/config.toml` | Keep | Local Supabase foundation |
| Docker Compose | Planned | Required for production-oriented self-hosting |
| Contributor, threat-model, permission, integration, worker, and upgrade docs | Planned | Added phase-by-phase as behavior becomes verified |

## Removal rule

Archived code is not active product functionality. It must not remain in navigation, active route imports, README feature lists, or completion matrices. A later phase may recover implementation techniques from the archive only after adapting them to the canonical application model, tenancy, provenance, and test requirements.
