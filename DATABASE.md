# ThreatStream PostgreSQL Database Schema Specification

This document details the normalized relational PostgreSQL schema designed for the ThreatStream SOC platform. The migrations are located under `supabase/migrations/`.

---

## 1. Schema Design Core Principles

1. **UUID Primary Keys**: Every table uses a `UUID` primary key (`uuid_generate_v4()`) rather than auto-incrementing integers, preventing hash collisions and ensuring synchronization safety across distributed environments.
2. **Normalized Layout**: Grouped into seven logical domains (IAM, Asset Inventory, Threat Intel, Case Management, EDR Telemetry, Sandboxing, and System Auditing) with strict foreign key constraints.
3. **Optimized Indexes**: Mapped indexes cover critical query lookups (such as chronological orderings, MAC addresses, hash matching, and hostname searches) to handle massive high-frequency logs.

---

## 2. Tables Schema Glossary

### Domain 1: Identity & Access Management (IAM)
* **roles**: Stores operator roles (`Global Administrator`, `Tier 1 Analyst`).
* **permissions**: Stores fine-grained capabilities (`read:intel`, `write:incidents`).
* **role_permissions**: Map connecting roles to capabilities.
* **users**: Profile metadata and status for console operators.
* **user_roles**: Map connecting operators to roles.

### Domain 2: Asset Inventory Management
* **assets**: Catalogues critical target devices, operating systems, and risk calculations.
* **network_interfaces**: Holds MAC and IP values for every physical/virtual socket.
* **services**: Catalogues discovered active ports (e.g. 22 SSH, 80 HTTP).
* **software_inventory**: Catalogues packages installed on target machines.
* **vulnerabilities**: Registry for all CVE vulnerabilities and CVSS weights.
* **asset_vulnerabilities**: Map linking discovered vulnerabilities to target systems.

### Domain 3: Threat Intelligence
* **threat_sources**: Integrations toggle configurations (e.g., AbuseIPDB, VirusTotal).
* **threat_events**: Tracks inbound attack telemetry (coordinates, IPs) on honeypots.
* **iocs**: Unified directory of IPs, Domains, URLs, and file hashes.
* **detections**: Houses Sigma and YARA configuration files.
* **alerts**: Triggered rule matches mapped to source systems.

### Domain 4: Case Management (Incident Response)
* **incidents**: Incident tickets carrying status, owner, and severity markers.
* **incident_notes**: Comments entered by investigating analysts.
* **timeline_events**: Audit steps detailing timeline actions.

### Domain 5: Endpoint Detection (EDR Telemetry)
* **telemetry**: Core table storing raw endpoint logs.
* **process_events**: Stores process startup telemetry (Process Names, Command Lines).
* **network_events**: Log files of endpoint sockets (allowed/blocked inbound/outbound).
* **dns_events**: Queries made by EDR agents to resolve remote addresses.
* **auth_events**: Workstation login successes and failures.
* **usb_events**: Mount/unmount logging of external hardware.
* **powershell_events**: Script blocks executed inside powershell.
* **registry_events**: Key manipulation logs.
* **scheduled_tasks**: Task Scheduler persistence records.

### Domain 6: Malware Sandboxing
* **malware_samples**: Hashes (MD5, SHA1, SHA256) and subsystem attributes of uploaded malware.
* **malware_reports**: Deep JSON analysis metrics detailing strings and YARA matches.
* **reports**: Compliance audit PDF generation logs.

### Domain 7: Configuration & System Health
* **audit_logs**: Audit trail tracks console changes.
* **plugins**: Registered dynamic integrations.
* **system_settings**: App settings key-values (Log cleanups, thresholds).
* **jobs**: Logs of celery run intervals.
* **system_health**: CPU/Memory/WebSocket metrics.

---

## 3. Row Level Security (RLS) Policies

All tables inside the Supabase instance have RLS active. Below is the security rules config mapping:

| Target Table | Action Select (Read) | Action Insert/Update/Delete (Write) |
| :--- | :--- | :--- |
| **users** | Allowed to all authenticated operators | Allowed to Administrators |
| **threat_events** | Allowed to all authenticated operators | Allowed to Administrators / Collectors |
| **assets** | Allowed to all authenticated operators | Allowed to SOC Analysits / Threat Hunters |
| **telemetry** | Allowed to all authenticated operators | Denied (Write occurs via background workers) |
| **incidents** | Allowed to all authenticated operators | Allowed to Incident Responders |
| **reports** | Allowed to all authenticated operators | Allowed to Incident Responders / Admins |
| **system_settings**| Allowed to all authenticated operators | Allowed to Administrators |

---

## 4. Storage Integration Buckets

The platform configures three default buckets inside the `storage.buckets` schema table:

1. **`reports`** (Public): Holds generated markdown and PDF security audits. Accessible via public URLs for dashboard sharing.
2. **`malware`** (Private): Secured container storing submitted executable binaries. Strictly isolated; files cannot be accessed or run directly from the browser without token verification.
3. **`evidence`** (Private): Secured cabinet storing text dumps, attachments, and PCAP packets uploaded during incident response operations.

---

## 5. Threat Intelligence Platform (TIP) Schema

The platform implements the following tables to manage indicator datasets:

### 1. `threat_actors`
Tracks malicious groups, APT aliases, motivations, and systems risks.
* Primary Key: `id` (UUID)
* Unique Constraint: `name` (VARCHAR)
* Attributes: `aliases`, `country`, `motivation`, `target_industries`, `risk_score`, `status`.

### 2. `campaigns`
Tracks active threat campaigns, regions focus, target sectors, and references.
* Primary Key: `id` (UUID)
* Unique Constraint: `name` (VARCHAR)
* Attributes: `description`, `start_date`, `end_date`, `status`, `target_regions`, `affected_industries`, `references`.

### 3. `malware_families`
Tracks classified malware strains capability and tactical signatures.
* Primary Key: `id` (UUID)
* Unique Constraint: `name` (VARCHAR)
* Attributes: `aliases`, `malware_type`, `capabilities`, `mitre_techniques`, `description`.

### 4. `ioc_correlations`
Maintains relational mapping links between indicators and assets/incidents/vulnerabilities.
* Primary Key: `id` (UUID)
* Foreign Key: `ioc_id` references `iocs.id`
* Attributes: `target_type` (Asset, Incident, CVE), `target_id`, `relationship_score`.

All TIP tables have RLS enabled by default to permit read-only select actions to all authenticated SOC operators, while restricting insert/update/delete operations to designated security personnel roles.

---

## 6. Asset Intelligence & Attack Surface Schema

The platform implements the following tables to manage assets relationships and network pathways:

### 1. `asset_relationships`
Tracks logical and network topology connections between mapped assets.
* Primary Key: `id` (UUID)
* Foreign Key: `source_asset_id` references `assets.id`, `target_asset_id` references `assets.id`
* Attributes: `relationship_type` (`depends_on`, `connects_to`, `routes_to`, `manages`).

### 2. `topology_nodes`
Tracks physical and logical switch/firewall nodes on the network.
* Primary Key: `id` (VARCHAR)
* Attributes: `label`, `type`, `zone`.

### 3. `topology_links`
Tracks connections between network topology nodes.
* Primary Key: `id` (UUID)
* Attributes: `source`, `target`, `bandwidth`.

All Asset Intelligence tables have RLS active, with select rules allowing read access to authenticated SOC operators.

---

## 7. Endpoint Telemetry & Alerts Schema

The platform implements the following tables to manage event logs and triggers:

### 1. `telemetry` (Expanded)
Stores normalized telemetry events collected by forwarding agents.
* Attributes: `pid`, `ppid`, `source` (Sysmon/Auditd/Zeek), `severity`, `mitre_id`, `mitre_name`, `mitre_tactic`, `parent_process`, `command_line`, `hash`, `raw_event` (JSONB), `normalized_event` (JSONB), `risk_score`, `correlation_id` (UUID).

### 2. `alerts` (New)
Stores security incidents triggered by matching rule definitions.
* Primary Key: `id` (UUID)
* Foreign Key: `rule_id` references `detections.id`, `telemetry_id` references `telemetry.id`, `affected_asset_id` references `assets.id`, `threat_actor_id` references `threat_actors.id`, `campaign_id` references `campaigns.id`
* Attributes: `severity` (Critical, High, Medium, Low, Info), `ioc_value`, `risk_score`, `evidence` (JSONB), `status` (New, In Progress, Resolved).

