# ThreatStream Current State

Audit date: 2026-07-18

## Executive summary

ThreatStream currently has a reusable React/Vite frontend, FastAPI backend, Supabase persistence layer, authentication flow, repository/service separation, a background job loop, scheduler concepts, and a plugin abstraction. The active product, schema, API, documentation, and many inactive pages are still organized around a broad SOC, threat-intelligence, endpoint telemetry, scanning, and malware-analysis concept.

The repository does not yet implement the required Application Security Operations workflow. There is no canonical Organization → Workspace → Application → Component model, no GitHub App integration, no dedicated scanner worker, no normalized finding lifecycle, no deployment model, and no runtime-to-deployment correlation.

The most important current risks are:

1. Backend routes authenticate tokens but do not enforce domain permissions or workspace scope.
2. API endpoints use one global Supabase service-role client, bypassing RLS.
3. Existing RLS policies frequently grant all authenticated users broad read or write access with `USING (true)` or `WITH CHECK (true)`.
4. Integration credentials saved through the current UI are ordinary database settings, not a secure credential vault, and can be read back unmasked.
5. Several repositories convert persistence failures into empty arrays or `null`, making backend failure indistinguishable from no data.
6. The plugin manager contains simulated scan results, a success-producing default plugin, and fallback records that can look like scanner evidence.
7. The README advertises simulated globe, honeypot, and real-time threat behavior as product capabilities.

## Repository inventory

| Area | Current implementation | Assessment |
|---|---|---|
| Frontend | React 18, Vite 5, React Router, Supabase JS, Three.js packages | Keep foundation; remove product-specific globe dependencies after legacy extraction |
| Backend | FastAPI, Pydantic settings, Supabase Python client | Keep foundation; add bounded domains and request-scoped authorization |
| Persistence | Eight Supabase SQL migrations and 50+ SOC-oriented tables | Preserve development data; supersede with tenant-scoped application-security migrations |
| Authentication | Supabase Auth in frontend; JWT verification in backend | Keep authentication; replace frontend-only RBAC with backend permissions |
| Jobs | Database-polled jobs and an in-API worker loop | Repurpose concepts; move execution to a dedicated worker service |
| Scheduler | APScheduler in API lifecycle | Repurpose after durable queue and tenant model exist |
| Plugins | Base interface plus 24 registered scanner, collector, and intelligence plugins | Redesign typed scanner interface; retain only V1-relevant adapters |
| Tests | Two backend smoke tests using fake clients/plugins | Keep as regression tests; add domain, tenancy, integration, and E2E tests |
| Deployment | Local Vite and Uvicorn startup; no Docker Compose stack | Incomplete |

## Active frontend routes

| Route | Page | Current product fit | Decision |
|---|---|---|---|
| `/` | Landing | Advertises broad SOC/globe behavior | Rewrite |
| `/terms` | Terms | Describes threat telemetry and globe | Rewrite |
| `/dashboard` | Dashboard | Threat globe and SOC metrics | Replace with truthful overview |
| `/threat-intelligence` | Threat Intelligence | Non-goal for V1 | Remove from active routes |
| `/assets` | Assets | Host and network asset inventory | Repurpose later as Applications and Components |
| `/network` | Network | Generic network dashboard | Remove from active routes |
| `/endpoints` | Endpoints | Endpoint telemetry product | Remove from active routes |
| `/vulnerabilities` | Vulnerabilities | Closest precursor to Findings | Repurpose after canonical finding model exists |
| `/threat-hunting` | Threat Hunting | Generic hunting console | Remove from active routes |
| `/malware-analysis` | Malware Analysis | Explicit non-goal | Remove from active routes |
| `/ioc-enrichment` | IOC Enrichment | Provider-centric and outside V1 | Remove from active routes; retain provider code for future use |
| `/yara-platform` | YARA Platform | Explicit non-goal | Remove from active routes |
| `/graph-investigation` | Graph Investigation | Uses generic graph data | Remove until real application relationships exist |
| `/incidents` | Incidents / emulation workflow | Wrong object model | Repurpose later as Cases and Remediation |
| `/reports` | Reports | Generic report records | Repurpose later as application-security reports |
| `/settings` | System Settings | Mixes platform settings and plaintext integration credentials | Remove from active routes pending secure administration domain |

The repository also contains orphaned pages for Administration, Audit Log, Backup Manager, Connectors, and Operations. They are not active routes but remain compiled only when imported elsewhere.

## Backend API inventory

All current endpoints are under `/api/v1` except `/health`.

| Prefix | Operations | Current concerns |
|---|---|---|
| `/jobs` | create, list, read, delete, cancel, pause, resume, retry | No workspace scope; service-role persistence; generic job model |
| `/malware` | samples, YARA rules, hunt sessions, aggregate stats | Explicit V1 non-goal |
| `/plugins` | list, execute, test, configure | Advertises unsupported capabilities; arbitrary untyped config |
| `/scheduler` | list and create scheduled jobs, toggle | No durable queue or tenant isolation |
| `/telemetry` | events, ingest, rules, YARA scan, alerts, escalation | Generic endpoint telemetry/SOC model; not deployment-aware |
| `/health` | process status and active in-process jobs | Does not verify database, queue, storage, or worker health |

## Database inventory

The migration history defines SOC-era tables in these groups:

| Group | Tables |
|---|---|
| Identity | `roles`, `permissions`, `role_permissions`, `users`, `user_roles`, `user_profiles` changes |
| Asset and exposure | `assets`, `network_interfaces`, `services`, `software_inventory`, `vulnerabilities`, `asset_vulnerabilities`, `asset_relationships`, `topology_nodes`, `topology_links` |
| Threat intelligence | `threat_sources`, `threat_events`, `iocs`, `threat_actors`, `campaigns`, `malware_families`, `ioc_correlations`, `enrichment_results` |
| Detection and response | `detections`, `alerts`, `incidents`, `incident_notes`, `timeline_events` |
| Endpoint telemetry | `telemetry`, `process_events`, `network_events`, `dns_events`, `auth_events`, `usb_events`, `powershell_events`, `registry_events` |
| Malware and hunting | `malware_samples`, `malware_reports`, `yara_rules`, `hunt_sessions` |
| Platform operations | `scheduled_tasks`, `reports`, `audit_logs`, `plugins`, `system_settings`, `jobs`, `system_health`, `connectors`, `backups`, `system_metrics`, `api_keys` |

Missing required V1 domains include organizations, workspaces, teams, applications, components, repositories, integration credentials, scan policies/runs/artifacts, normalized findings and occurrences, environments, deployments, runtime sources/events, remediation, evidence, workers, and tenant-scoped audit events.

## Authorization and tenancy

| Control | Current state | Gap |
|---|---|---|
| Authentication | Supabase session in frontend and HS256 JWT validation in backend | JWT audience is not verified; error detail exposes decoder text |
| Frontend permissions | Static role-to-permission map | UI-only controls are not authoritative |
| Backend permissions | Authenticated-user dependency only | No route-level permission enforcement |
| Tenant scope | None | Organization/workspace isolation is absent |
| Database access | Global service-role Supabase client | User-facing API bypasses RLS |
| RLS | Enabled on many tables | Dozens of broad authenticated policies use unconditional predicates |
| Credential storage | Integration values stored as ordinary settings/config JSON | No encryption boundary, masking contract, rotation model, or backend-only write path |

## Plugin and worker truth

The current plugin interface exposes `initialize`, `authenticate`, `validate`, `execute`, `health`, and `cleanup`. It lacks typed metadata, supported target declarations, configuration schemas, result parsers, normalized output contracts, resource requirements, and provenance.

The worker loop is part of the API package and may be started inside the API process. It polls one database row, claims by update, and executes plugins in a thread pool. It does not provide durable queue semantics, worker identity, capability registration, job leases, replay protection, isolated temporary directories, scanner resource limits, raw artifact storage, or restart recovery.

Known fabricated behavior includes:

- `NmapPlugin` and `NucleiPlugin` in the manager returning fixed scan results.
- `DefaultPlugin` reporting a successful generic operation.
- Unknown plugin names silently resolving to `DefaultPlugin`.
- Orchestrator and scanner parser fallback records that can be persisted as evidence.
- Some frontend repositories returning empty data on exceptions.
- Telemetry code creating client-side alert identifiers.

## Integration inventory

| Category | Current names | Status for target product |
|---|---|---|
| IOC/intelligence APIs | VirusTotal, AbuseIPDB, GreyNoise, Shodan, Censys, URLHaus, OTX, Hybrid Analysis, ANY.RUN, MISP, OpenCTI | Future integration candidates; not V1 workflow |
| Discovery scanners | Nmap, Nuclei, WhatWeb, SSLyze, Masscan, RustScan, Nikto | Future application-exposure collectors; not V1 core scanners |
| Telemetry collectors | Windows Events, Sysmon, auditd, osquery, Zeek, Suricata | Future runtime-source adapters |
| Required V1 scanners | Semgrep, Gitleaks, Trivy, OSV-Scanner, Checkov, Syft | Not implemented |
| Required source control | GitHub App | Not implemented |

## Documentation truth

The README currently claims an interactive attack globe, attack arcs, strategic honeypot targets, live counters, a live threat feed, unlimited Supabase threat volume, and production-ready output. These claims describe visualization behavior or aspirations, not the target product and not a verified end-to-end security workflow.

## Baseline verification

| Check | Command | Result |
|---|---|---|
| Frontend dependency state | Existing `node_modules` and lockfile inspected | Dependencies present |
| Frontend production build | `npm run build` | Pass; 730 modules; 1.61 MB main JS chunk; chunk-size warning |
| Frontend lint | Not configured | No `lint` script or linter dependency |
| Frontend typecheck | Not configured | JavaScript project; no typecheck script |
| Frontend tests | Not configured | No test script/framework |
| Backend tests, default environment | `python -m pytest -q` | Fails before collection because a global `anchorpy` pytest plugin imports missing `pytest_asyncio` |
| Backend tests, isolated plugins | `$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'; python -m pytest -q` | Pass: 2 tests; 24 deprecation warnings |
| Database migration execution | Not run in Phase 0 | Requires a disposable database and migration safety work |
| Docker Compose | Not available | No compose file exists |

## Phase 0 conclusion

The repository contains useful technical foundations but the current product model is incompatible with the intended Application Security Operations platform. Phase 1 must correct the active shell and product claims without pretending that later domains are complete. Phase 2 must then establish tenancy and authorization before application, GitHub, scanning, finding, deployment, or runtime workflows are exposed.
