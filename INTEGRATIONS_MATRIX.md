# ThreatStream Integration Matrix

Status legend:
- `Complete` = wired end-to-end to live backend/data.
- `Partial` = live backend exists, but UI, schema, or write-path coverage is incomplete.
- `Catalog-only` = visible in UI/config, but not yet fully backed by a complete runtime integration.
- `Mock-only` = still driven by static/demo data.

## Core Platform

| Service | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Supabase auth/data layer | Complete | `backend/app/core/config.py`, `backend/app/main.py`, `src/lib/supabase/client.js` | Primary persistence and auth backend is live. |
| Job orchestration / execution engine | Complete | `backend/app/plugins/orchestrator.py`, `backend/app/plugins/manager.py`, `src/repositories/OperationsRepository.js` | Jobs, tasks, and connector execution are live-backed. |
| Operations connectors | Partial | `src/pages/Connectors.jsx`, `src/repositories/OperationsRepository.js` | Live connector fetches are in place, but some UI affordances are still local-only. |
| Audit logs | Partial | `src/pages/AuditLog.jsx`, `src/repositories/OperationsRepository.js` | Live log fetch is wired; some detail views remain presentation-only. |
| Backups | Partial | `src/pages/BackupManager.jsx`, `src/repositories/OperationsRepository.js` | Live create/delete is wired, but restore workflows are still incomplete. |
| Scheduled tasks | Partial | `src/pages/Operations.jsx`, `src/repositories/OperationsRepository.js` | Live task listing/toggling is wired; deeper scheduling controls still need polish. |

## Threat Intel and Enrichment

| Service | Status | Evidence | Notes |
| --- | --- | --- | --- |
| VirusTotal | Partial | `backend/app/plugins/virustotal.py`, `backend/app/plugins/ioc_providers.py`, `src/pages/IOCEnrichment.jsx`, `src/services/ThreatService.js` | Real API client exists and the UI can launch live jobs, but history, attribution, and result normalization still need end-to-end hardening. |
| AbuseIPDB | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Provider exists in backend and is surfaced in UI directory. |
| GreyNoise | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Provider exists, but completeness depends on configured API key and job schema coverage. |
| Shodan | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; UI exposure is partial. |
| Censys | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; UI exposure is partial. |
| URLHaus | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; UI exposure is partial. |
| AlienVault OTX | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; connector state still needs configuration. |
| Hybrid Analysis | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; not fully wired through every enrichment surface. |
| Any.Run | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; not fully wired through every enrichment surface. |
| MISP | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; requires deployment config and UI completion. |
| OpenCTI | Partial | `backend/app/plugins/ioc_providers.py`, `src/services/ThreatService.js` | Backend provider exists; requires deployment config and UI completion. |

## Detection and Scanning

| Service | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Nmap | Complete | `backend/app/plugins/nmap.py`, `src/pages/Assets.jsx` | Live discovery orchestration is wired to backend jobs. |
| RustScan | Complete | `backend/app/plugins/rustscan.py`, `src/pages/Assets.jsx` | Live discovery orchestration is wired to backend jobs. |
| Masscan | Complete | `backend/app/plugins/masscan.py`, `src/pages/Assets.jsx` | Live discovery orchestration is wired to backend jobs. |
| Nikto | Complete | `backend/app/plugins/nikto.py`, `src/pages/Assets.jsx` | Live discovery orchestration is wired to backend jobs. |
| WhatWeb | Complete | `backend/app/plugins/whatweb.py`, `src/pages/Assets.jsx` | Live discovery orchestration is wired to backend jobs. |
| SSLyze | Complete | `backend/app/plugins/sslyze.py`, `src/pages/Assets.jsx` | Live discovery orchestration is wired to backend jobs. |
| Nuclei | Complete | `backend/app/plugins/nuclei.py`, `src/pages/Assets.jsx` | Live discovery/vuln job execution is wired. |
| YARA rules | Partial | `backend/app/api/endpoints/telemetry.py`, `src/pages/YARAPlatform.jsx`, `src/services/TelemetryService.js` | Backend scan path exists; UI still had mock analytics before the latest live-data pass. |
| Telemetry events | Partial | `backend/app/api/endpoints/telemetry.py`, `src/repositories/TelemetryRepository.js` | Backend endpoints exist, but repository still contains large mock fallback catalogs. |

## Endpoint and Asset Inventory

| Service | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Asset inventory | Partial | `src/pages/Assets.jsx`, `src/repositories/AssetRepository.js` | UI now uses live fetching, but repository still contains a large mock catalog fallback. |
| Incident management | Partial | `src/pages/Incidents.jsx`, `src/repositories/IncidentRepository.js` | UI now uses live fetching, but repository still contains mock fallback data and some static narrative fields. |
| User directory | Partial | `src/repositories/UserRepository.js`, `src/pages/Administration.jsx` | Backed by live fetches, but repository fallback data still exists. |
| Network topology | Partial | `src/repositories/AssetRepository.js`, `src/pages/Assets.jsx` | Live topology is fetched, but visual topology is still mostly illustrative. |
| Endpoints page | Partial | `src/pages/Endpoints.jsx` | Live backend wiring exists, but not every metric is yet sourced from the same live pipeline. |

## Malware / Hunting / Threat Research

| Service | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Malware samples repository | Mock-heavy | `src/repositories/MalwareRepository.js`, `src/pages/MalwareAnalysis.jsx` | Repository still contains a very large mock analysis corpus. |
| Threat research repository | Mock-heavy | `src/repositories/ThreatRepository.js`, `src/pages/ThreatIntelligence.jsx` | Live data fetch exists, but the repository still carries a full seeded dataset. |
| YARA platform | Partial | `src/pages/YARAPlatform.jsx`, `src/services/TelemetryService.js` | Now live-backed for rules, but some right-rail analytics are still derived from UI state only. |
| IOC enrichment | Partial | `src/pages/IOCEnrichment.jsx`, `backend/app/plugins/ioc_providers.py` | Live job execution exists; result normalization and provider coverage are not yet fully complete. |

## Enterprise / External Integrations

| Integration | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Google OAuth / Supabase auth | Partial | `.env.local`, `.env.example`, `backend/app/core/config.py` | Configured via Supabase, but depends on project-side auth settings. |
| SIEM / EDR connector catalog entries | Catalog-only | `src/pages/SystemSettings.jsx`, `src/pages/Connectors.jsx` | Several vendors are displayed as available integrations, but not all have complete backend implementations. |
| Slack / PagerDuty / webhook notifications | Partial | `src/pages/SystemSettings.jsx` | UI configuration exists; end-to-end notification delivery still needs validation. |
| VirusTotal enrichment entry in UI | Partial | `src/pages/SystemSettings.jsx`, `src/pages/IOCEnrichment.jsx` | Visible and operationally usable, but not yet fully normalized across every page. |

## Immediate Production Blockers

| Blocker | Severity | Why it matters |
| --- | --- | --- |
| Mock datasets still exist in core repositories | High | Users can still hit seeded data paths instead of live records. |
| Some pages still show static analytics or narrative placeholders | High | The UI can look “complete” while not actually reflecting live state. |
| Not every integration has a verified write path | High | Reads may work while actions like restore, toggle, or enrichment normalization remain partial. |
| Connector/provider completeness depends on environment variables | Medium | Several live integrations need API keys and deployment config before they are truly complete. |
| Some UI surfaces still use illustrative metrics | Medium | Metrics like timelines, distributions, and top lists need to be sourced from backend aggregates. |

