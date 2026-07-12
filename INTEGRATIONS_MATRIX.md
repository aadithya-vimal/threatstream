# ThreatStream Integration Matrix

Status legend:
- `Complete` = live backend/data integration is in place and the UI consumes it directly.

## Core Platform

| Service | Status | Notes |
| --- | --- | --- |
| Supabase auth/data layer | Complete | Live persistence/auth backend is configured and used across the app. |
| Job orchestration / execution engine | Complete | Backend job runner and plugin manager are live. |
| Operations connectors | Complete | Connector fetch, config, status, and execution flows are live-backed. |
| Audit logs | Complete | Live data is fetched and rendered from backend sources. |
| Backups | Complete | Create, list, delete, and restore-related flows are live-backed. |
| Scheduled tasks | Complete | Listing, toggling, and creation are live-backed. |

## Threat Intel and Enrichment

| Service | Status | Notes |
| --- | --- | --- |
| VirusTotal | Complete | Real backend client and job flow are wired through the UI. |
| AbuseIPDB | Complete | Backend provider is wired into enrichment workflows. |
| GreyNoise | Complete | Backend provider is wired into enrichment workflows. |
| Shodan | Complete | Backend provider is wired into enrichment workflows. |
| Censys | Complete | Backend provider is wired into enrichment workflows. |
| URLHaus | Complete | Backend provider is wired into enrichment workflows. |
| AlienVault OTX | Complete | Backend provider is wired into enrichment workflows. |
| Hybrid Analysis | Complete | Backend provider is wired into enrichment workflows. |
| Any.Run | Complete | Backend provider is wired into enrichment workflows. |
| MISP | Complete | Backend provider is wired into enrichment workflows. |
| OpenCTI | Complete | Backend provider is wired into enrichment workflows. |

## Detection and Scanning

| Service | Status | Notes |
| --- | --- | --- |
| Nmap | Complete | Live discovery orchestration is wired to backend jobs. |
| RustScan | Complete | Live discovery orchestration is wired to backend jobs. |
| Masscan | Complete | Live discovery orchestration is wired to backend jobs. |
| Nikto | Complete | Live discovery orchestration is wired to backend jobs. |
| WhatWeb | Complete | Live discovery orchestration is wired to backend jobs. |
| SSLyze | Complete | Live discovery orchestration is wired to backend jobs. |
| Nuclei | Complete | Live discovery/vuln job execution is wired. |
| YARA rules | Complete | UI, telemetry, and backend rule execution are live-backed. |

## Endpoint and Asset Inventory

| Service | Status | Notes |
| --- | --- | --- |
| Telemetry events | Complete | Backend endpoints and UI consumption are live-backed. |
| Asset inventory | Complete | Live fetch and topology views are wired. |
| Incident management | Complete | Live fetch, updates, evidence, and collaboration flows are wired. |
| User directory | Complete | Live fetch is wired from backend data. |
| Network topology | Complete | Live topology data is fetched and rendered. |
| Endpoints page | Complete | Metrics and controls are live-backed. |

## Malware / Hunting / Threat Research

| Service | Status | Notes |
| --- | --- | --- |
| Malware samples repository | Complete | Live repository methods query backend data directly. |
| Threat research repository | Complete | Live repository methods query backend data directly. |
| IOC enrichment | Complete | Live job execution and provider results are wired end-to-end. |
| Threat Hunting | Complete | Live telemetry, rules, and alerts are rendered directly. |

## Enterprise / External Integrations

| Integration | Status | Notes |
| --- | --- | --- |
| Google OAuth / Supabase auth | Complete | Authentication is routed through Supabase configuration. |
| SIEM / EDR connector catalog entries | Complete | Catalog and runtime integrations are wired where exposed. |
| Slack / PagerDuty / webhook notifications | Complete | Notification configuration and execution are live-backed. |
| VirusTotal enrichment entry in UI | Complete | Exposed across the relevant UI surfaces. |

## Summary

All currently listed integrations are marked complete and backed by live data paths.
