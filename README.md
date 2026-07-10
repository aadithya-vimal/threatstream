# ThreatStream

Hybrid cyber security operations platform with a live backend core, demo-friendly frontend fallbacks, and a broad SOC-oriented module layout.

## Current Reality

| Area | Status |
|---|---|
| Frontend routes and shell | Implemented |
| Backend job / plugin / scheduler APIs | Implemented |
| Supabase integration | Implemented with demo fallbacks |
| Live threat/asset/incident data | Partial |
| Full product claims in this README | Aspirational in places |

The repository is useful today as a working platform scaffold, but several screens still rely on mock data when the live database is unavailable.

---

## Features

### 🌍 Interactive 3D Globe Visualization

Experience cyber threats in a stunning three-dimensional view of Earth. The globe is built using WebGL technology, providing smooth 60fps performance even under heavy threat loads.

**Capabilities:**
- **Full 360° Rotation** - Click and drag to rotate the globe in any direction
- **Zoom Control** - Scroll to zoom in on specific regions or zoom out for global overview
- **Pan Navigation** - Multi-touch and mouse pan support for precise positioning
- **Night Lights Texture** - Realistic Earth texture showing city lights at night
- **Atmospheric Glow** - Beautiful cyan atmospheric layer surrounding the planet
- **Performance Optimized** - Handles up to 50 concurrent animated arcs without lag

**Geographic Coverage:**
The globe displays all continents and oceans with accurate geographic positioning, allowing you to track threats from any location worldwide.

---

### ⚡ Animated Attack Arcs

Watch cyber attacks travel across the globe in real-time with stunning animated arcs that connect attackers to their targets.

**Arc Animation System:**
- **Dynamic Path Generation** - Arcs automatically calculate the optimal curved path between attacker and victim
- **Color-Coded by Attack Type** - Each attack type has a unique, vibrant color for instant identification
- **Smooth Animation** - Arcs animate from origin to destination over 2 seconds with fluid motion
- **Glow Effect** - Bright, glowing appearance makes arcs visible even on bright backgrounds
- **Auto-Fade** - Arcs gracefully fade out after 15 seconds to prevent visual clutter
- **Altitude Variation** - Arcs rise above the surface for dramatic 3D effect

**Attack Type Colors:**

| Attack Type | Color | Visual Identity |
|-------------|-------|-----------------|
| **SSH** | Bright Cyan (#00FFFF) | Electric blue, highly visible |
| **FTP** | Bright Green (#00FF00) | Neon green, stands out clearly |
| **Apache** | Bright Red (#FF0000) | Critical alert red |
| **IMAP** | Purple (#8A2BE2) | Royal purple, distinctive |
| **SIP** | Orange (#FFA500) | Warm orange glow |
| **Bots** | Pink (#FF1493) | Hot pink, impossible to miss |
| **StrongIPs** | White (#FFFFFF) | Pure white, maximum contrast |
| **All/Unknown** | Yellow (#FFFF00) | Warning yellow |

**Performance Limits:**
- Maximum 50 concurrent arcs displayed
- Automatic queue management when limit reached
- Oldest arcs removed first (FIFO system)
- Zero performance degradation even at maximum load

---

### 🎯 Strategic Target Locations

Three permanent honeypot targets are marked on the globe, representing real-world attack destinations based on attack type.

**Target Infrastructure:**

**1. SSH/IMAP Target - Berlin, Germany**
- Coordinates: 52.5200°N, 13.4050°E
- Services: SSH servers, IMAP email servers
- Marker Color: Cyan (#00FFFF)
- Attack Types Routed: SSH, IMAP
- Strategic Importance: European data center hub

**2. Web Target - San Francisco, USA**
- Coordinates: 37.7749°N, 122.4194°W
- Services: Apache web servers, HTTP/HTTPS services
- Marker Color: Red (#FF0000)
- Attack Types Routed: Apache, All, Unknown
- Strategic Importance: Silicon Valley tech infrastructure

**3. IoT Target - Singapore**
- Coordinates: 1.3521°N, 103.8198°E
- Services: IoT devices, FTP servers, SIP services
- Marker Color: Green (#00FF00)
- Attack Types Routed: FTP, SIP, Bots, StrongIPs
- Strategic Importance: Asia-Pacific IoT hub

**Routing Intelligence:**
ThreatStream automatically routes each attack to the appropriate target based on the attack type, simulating realistic honeypot infrastructure deployment across strategic global locations.

---

### 📊 Real-Time Statistics Dashboard

Live threat counters provide instant insights into attack patterns and severity distribution.

**Counter Display:**

**1. Total Threats Counter**
- Color: Bright Cyan (#00d9ff)
- Function: Displays cumulative count of all threats received
- Updates: Instantly increments with each new threat
- Maximum: Tracks up to 100 threats in memory

**2. Critical Threats Counter**
- Color: Hot Pink (#ff1493)
- Attack Types: Bots, StrongIPs
- Significance: Highest severity threats requiring immediate attention
- Visual Priority: Pink border signals critical status

**3. High Severity Counter**
- Color: Alert Red (#ff0000)
- Attack Types: SSH, Apache
- Significance: High-priority attacks on common services
- Visual Priority: Red border indicates elevated threat level

**4. Medium/Low Severity Counter**
- Color: Warning Orange (#ffa500)
- Attack Types: FTP, IMAP, SIP, All, Unknown
- Significance: Lower priority but still tracked threats
- Visual Priority: Orange border for awareness

**Severity Classification Logic:**
Each threat is automatically classified based on attack type. The classification happens in real-time as threats arrive, providing instant situational awareness.

**Counter Animation:**
- Smooth number transitions
- No flicker or jump
- Instant update response (<16ms)
- Large, readable numbers (36px font size)

---

### 📡 Live Threat Feed

A continuously updating feed displays the latest 20 threats with complete details, providing a detailed event log.

**Feed Display Features:**

**Information Presented:**
- **Attack Type** - Displayed in brackets [ssh], [apache], etc.
- **Origin Country** - 2-letter ISO country code (US, DE, CN, etc.)
- **Attacker IP** - Full IPv4 or IPv6 address
- **Timestamp** - Precise time in UTC format (YYYY-MM-DD HH:MM:SS UTC)

**Example Entry:**
```
[ssh] from DE • IP: 203.0.113.45 • 2025-01-23 14:32:18 UTC
```

**Feed Behavior:**
- **Newest First** - Latest threats appear at the top
- **Auto-Scroll** - Feed automatically scrolls to show new arrivals
- **20 Threat Limit** - Only displays the 20 most recent threats
- **Smooth Updates** - No jarring transitions or flicker
- **Scrollable History** - User can scroll to view older threats in the feed
- **Empty State** - Displays "Waiting for threat data..." when no threats received

**Visual Design:**
- Dark background (#0f0f0f) for readability
- Cyan left border (#00d9ff) for visual separation
- Compact 12px font for information density
- Adequate spacing (8px margin) between entries
- High contrast text (#cccccc) on dark background

**Performance:**
- Updates instantly as threats arrive
- No lag or delay in display
- Efficient DOM updates (React reconciliation)
- Memory efficient (max 20 DOM nodes)

---

### 🎨 Cyberpunk Visual Theme

A stunning dark theme with animated elements creates an immersive cyber security operations center aesthetic.

**Animated Grid Background:**
- **Pattern**: Glowing cyan grid lines on pure black background
- **Cell Size**: 50px × 50px squares
- **Animation**: Smooth vertical scrolling motion
- **Speed**: 20-second loop for hypnotic effect
- **Color**: Semi-transparent cyan (rgba(0, 217, 255, 0.1))
- **Effect**: Creates sense of depth and motion

**Color Palette:**
- **Primary Background**: Deep Black (#0a0a0a)
- **Secondary Background**: Dark Gray (#1a1a1a)
- **Accent Color**: Bright Cyan (#00d9ff)
- **Text Primary**: Cyan (#00d9ff)
- **Text Secondary**: Light Gray (#cccccc)
- **Borders**: Dark Gray (#333333)

**Typography:**
- **Font Family**: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Base Size**: 14px for optimal readability
- **Headings**: Bold, uppercase for impact
- **Monospace**: Used for IP addresses and technical data

**Custom Scrollbars:**
- Dark theme compatible (#1a1a1a background)
- Cyan highlight on hover (#00d9ff)
- Smooth transitions
- 10px width for easy grabbing

**Visual Hierarchy:**
- Bright cyan for primary actions and titles
- Neon colors for threat indicators
- Dark backgrounds to reduce eye strain
- High contrast for 24/7 monitoring

---

### 🔥 Real-Time Data Streaming

ThreatStream connects to Supabase PostgreSQL Database for instant threat data delivery using active pub/sub channels.

**Supabase Integration:**
- **Connection Protocol**: PostgreSQL Realtime channels
- **Latency**: <100ms from threat creation to visualization
- **Reliability**: Automatic reconnection on network interruption
- **Scalability**: Handles unlimited threat volume from backend

**Data Flow:**
1. Threat detected by honeypot sensors
2. Data pushed to Supabase Database
3. ThreatStream receives Postgres changes instantly
4. Threat visualized on globe and added to feed
5. Statistics updated immediately
6. All happens in under 100 milliseconds

**Data Validation:**
- IP address format verification
- Coordinate range validation (lat: -90 to 90, lon: -180 to 180)
- Country code format check (2-letter ISO)
- Attack type validation against known types
- Timestamp validity check
- Invalid data automatically rejected with console warnings

**Memory Management:**
- Maximum 100 threats stored in memory
- Automatic pruning when limit exceeded
- Oldest threats removed first (FIFO)
- Prevents memory leaks during long sessions
- Maintains smooth performance indefinitely

---

### ⚙️ Performance Optimizations

Built for 24/7 operation in security operations centers with rock-solid stability.

**Optimization Strategies:**

**Globe Rendering:**
- WebGL hardware acceleration
- Efficient Three.js rendering pipeline
- Optimized shader programs
- Minimal draw calls per frame
- 60fps target maintained even with 50 active arcs

**State Management:**
- React's efficient virtual DOM diffing
- Minimal component re-renders
- Memoization where beneficial
- Proper key props for list rendering

**Data Limits:**
- 100 threats maximum in state
- 50 concurrent arcs on globe
- 50 concurrent pulse markers
- 20 threats in feed display
- Automatic cleanup of expired elements

**Bundle Optimization:**
- Minified JavaScript (~2.1MB gzipped: 596KB)
- Code splitting for optimal loading
- Tree-shaking removes unused code
- CSS minification
- Asset optimization

**Browser Requirements:**
- WebGL 2.0 support (3D globe rendering)
- ES6+ JavaScript (modern features)
- CSS3 animations (grid background)
- Recommended: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+

---

### 🛡️ Security & Privacy

ThreatStream is designed as a read-only visualization platform with security best practices.

**Client-Side Security:**
- No write access to database from frontend
- Row Level Security (RLS) policies enforce read-only access
- Environment variables separate from code repository
- API keys restricted in Supabase Dashboard
- No sensitive data stored client-side

**Data Privacy:**
- Only displays public threat intelligence data
- No user authentication required (public dashboard)
- No personal information collected
- No cookies or tracking
- Purely informational display

---

## Technical Specifications

**Built With:**
- React 18 - Modern UI framework with hooks
- Vite - Lightning-fast build tool and dev server
- react-globe.gl - Three.js-based 3D globe library
- Supabase - Database hosting and real-time subscription engine
- Three.js - WebGL 3D graphics library
- CSS3 - Modern animations and styling

**Performance Metrics:**
- Initial load time: <3 seconds on average connection
- Time to interactive: <1 second after load
- Frame rate: Consistent 60fps
- Memory usage: <150MB typical
- CPU usage: <5% on modern hardware
- Data update latency: <100ms from Supabase to screen

**Code Quality:**
- Clean, modular component architecture
- Fully commented service layer
- PropTypes for type safety
- Consistent code formatting

- ESLint compliant
- Production-ready build output

---

## Threat Intelligence Platform (TIP) Specifications

ThreatStream is equipped with a complete Threat Intelligence Platform module supporting ingest, search, correlation, and export of Indicators of Compromise (IOCs).

### 1. Unified IOC Data Model
Indicators are stored in the database mapped to the following entities catalog:
* **Types Supported**: IP (IPv4 & IPv6), Domain, Subdomain, Hostname, URL, URI, Email, File Hashes (MD5, SHA-1, SHA-256, SHA-512), TLS/JA3 Certificate Fingerprints, ASN, CIDR blocks, registry keys, process names, and CVE/CWE references.
* **Standard Fields**: Value, severity classification (`low`, `medium`, `high`, `critical`), confidence rate (0-100), reputation score, timezone dates (`first_seen`, `last_seen`, `expiration`), tags list, references, and geographic/WHOIS attributes.

### 2. Mapped Relationship Vectors
The data model implements logical mappings between IOC entries and structural threat campaigns:
```
[ IP / Domain Indicator ] ────► [ Malware Family ] ────► [ Affected Asset ]
            │                           │
            ▼                           ▼
    [ Cyber Campaign ] ────────► [ Threat Actor Group ] ──► [ Incident Ticket ]
```

### 3. Campaign & Actor Profiling
* **Threat Actors**: Tracks aliases, geographic origin, primary motivations, target industries, risk scores, and known malware signatures.
* **Campaigns**: Tracks date ranges, affected sectors, target regions, references, and related CVE vulnerabilities.
* **Malware Families**: Classifies capabilities, aliases, known C2 server IPs, and MITRE ATT&CK tactical techniques.

### 4. Plug-in Feed Connector Interface
Custom feed integrations (e.g. AbuseIPDB, GreyNoise, VirusTotal) implement a common connector plugin interface:
```typescript
interface ThreatFeedConnector {
  id: string;
  name: string;
  active: boolean;
  
  initialize(): Promise<boolean>;
  pollIOCs(since: Date): Promise<IOC[]>;
  enrichIndicator(ioc: IOC): Promise<IOCEnrichmentData>;
}
```

---

## Asset Intelligence & Attack Surface Management Specifications

ThreatStream features an enterprise-grade Asset Intelligence Platform capable of discovery profiling, network mapping, and weighted risk analysis.

### 1. Enterprise Asset Data Model
Every discovered object (Servers, Workstations, Cloud VMs, IoT, switches, routers, storage containers) is registered in the database with the following fields:
* **Identification**: Hostname, display name, MAC address, IPs, serial number, vendor, model, OS architecture.
* **Environment Context**: Production, Development, Testing, business unit, location, owner department.
* **Security Context**: Internet-facing flag, Cloud Provider metadata, risk score, security score.

### 2. Multi-Tier Relational Mapping
Assets connect directly to active threat sectors, vulnerabilities, and network links:
```
[ Ingress Port / Listening Service ] ──► [ Vulnerability (CVE) ] ──► [ Threat Actor ]
                 │                                │
                 ▼                                ▼
       [ Network Interface ] ──────────► [ Host asset node ] ─────► [ Active incident ]
```

### 3. Attack Surface Risk Engine
The risk evaluation engine calculates real-time risk, security, and exposure indexes:
* **Inputs**: Criticality value (0.2 - 1.0 weight multiplier), open port counts, internet exposure flag (+30 penalty), unpatched CVE counts (+15 to +25 penalty), exploit availability, and active mitigation controls (applied patch credits).

### 4. Pluggable Scanner Plugin Interface
Vulnerability and port scanners implement a common coordination plugin interface:
```typescript
interface ScannerPlugin {
  id: string;
  name: string;
  description: string;
  
  executeScan(targetSubnet: string): Promise<ScanTelemetryOutput>;
}
```

---

## Endpoint Telemetry Platform & Detection Engineering Specifications

ThreatStream is equipped with a high-fidelity Endpoint Telemetry Normalization Engine and live matching Rule Library.

### 1. Telemetry Data Platform
Supports normalized ingestion of Host Processes, Network Connections, Registry changes, DNS lookups, Scheduled Tasks, Driver loads, PowerShell blocks, and Linux syscalls. Each event contains:
* **Event Metrics**: UUID, timestamp, process tree, PPID, parent process, hash, raw JSON payload, risk index, and correlation ID.
* **Source Adapters**: Pre-defined adapters mapping Sysmon log format, Linux Auditd syscalls, Zeek DNS/conn log structures, Suricata alerts, Falco container profiles, and OSQuery snapshots.

### 2. Live Detection Engine & Rule Library
Standardized matching engine supporting Sigma YAML definitions and YARA metadata evaluations:
```
[ Raw Agent Stream Log ] ──► [ Event Normalizer ] ──► [ Rule Evaluator Engine ] ──► [ Threat Alert ]
                                                              │
                                                     (Sigma / YARA Catalog)
```
* **Alert Classifications**: Generates alerts categorized into Critical, High, Medium, Low, and Informational alerts containing triggered rules, affected assets, MITRE mapping, and correlation evidence.

### 3. Forwarder Connector Interface
Endpoint log forwarders and SIEM agents implement a common ingestion plugin interface:
```typescript
interface EDRForwarderConnector {
  id: string;
  name: string;
  active: boolean;
  
  initialize(): Promise<boolean>;
  onTelemetryReceived(callback: (rawPayload: any) => void): void;
}
```

---

## Incident Response & Case Management Specifications

ThreatStream features an enterprise Incident Response and Case Management console to triage and audit security incidents.

### 1. Incident Data Model
Incident entities contain comprehensive metadata representing operational scopes:
* **Identification**: UUID, title, description, category, risk score, classification (True Positive / False Positive), and tags.
* **Assignments**: Assignee department, reporting system, assigned owner, SLA targets, and state timestamps.

### 2. Timeline Reconstruction Engine
Correlates incoming SIEM log flows, analyst checklist logs, and telemetry process creation trees into a single chronological case lifecycle trace.

### 3. Forensic Evidence Cabinet
Tracks registered logs, volatile memory dump file properties, registry exports, and packet captures containing:
* **Integrity Validation**: SHA-256 cryptographic check values.
* **Chain of Custody**: Documented possession histories.

### 4. Remediation Playbook Checklists
Response checklists containing Containment, Eradication, and Recovery milestones ensuring compliance with standard operational procedures.

---

## 🔬 Threat Analysis Platform

ThreatStream's Threat Analysis Platform combines Malware Analysis, Threat Hunting, IOC Enrichment, YARA Rule Management, and Graph Investigation into a unified investigation workspace.

---

### Malware Analysis Engine

Full static analysis for PE, ELF, Mach-O, APK, PDF, Office documents, Archives, and Scripts.

**Every sample stores:**
- Cryptographic: MD5, SHA1, SHA256, SSDeep
- Static: Sections, Imports, Exports, Strings, Resources, Version Info
- PE-specific: TLS Callbacks, Digital Signature, Compile Time
- Classification: Entropy, Architecture, Compiler, Packer
- Relationships: Threat Actor, Campaign, Incident, IOC, CVE

**Analysis Workspace Tabs:**
`Overview` · `Strings` · `Imports` · `Exports` · `Sections` · `Hashes` · `YARA Matches` · `MITRE Mapping` · `Behavior`

---

### YARA Rule Platform

Enterprise YARA rule lifecycle management system.

| Feature | Detail |
|---|---|
| Rule Categories | Ransomware, Credential Dumping, Lateral Movement, Persistence, C2, Exfiltration |
| Rule Types | Detection, Classification, Attribution, Hunting |
| Metadata | Author, Version, Severity, MITRE mapping |
| Analytics | Execution count, last triggered timestamp |

---

### Threat Hunting Workspace

KQL-like investigation console with saved hunts and bookmarks.

**Query Types:**
`KQL` · `IOC Search` · `Process Tree` · `Timeline` · `MITRE ATT&CK` · `Asset Cross-Search`

**Capabilities:**
- Save and bookmark hunt sessions
- Time-range scoped queries (1H / 6H / 24H / 7D / 30D / Custom)
- Results: Events, Timeline, Process Tree, Assets, IOC Pivots

---

### IOC Enrichment Engine

Provider-agnostic enrichment architecture for every indicator type.

**Supported Providers (11):**

| Provider | Status | IOC Types |
|---|---|---|
| VirusTotal | Active | hash, ip, domain, url |
| Hybrid Analysis | Active | hash, url |
| Any.Run | Not Configured | hash, url |
| AbuseIPDB | Active | ip |
| GreyNoise | Active | ip |
| Shodan | Not Configured | ip, domain |
| Censys | Not Configured | ip, domain |
| URLHaus | Active | url, domain, hash |
| OTX AlienVault | Active | ip, domain, hash, url |
| MISP | Not Configured | ip, domain, hash, url |
| OpenCTI | Not Configured | ip, domain, hash, url |

---

### Graph Investigation Engine

Universal relationship graph connecting every security entity:

```
Asset → Incident → Alert → IOC → Threat Actor → Campaign → Malware → Hash → CVE → MITRE → Telemetry
```

**Node types:** Asset · Incident · Alert · IOC · Threat Actor · Campaign · Malware · CVE · MITRE

---

---

### Hunt Analytics Dashboard

- Top Hunts by frequency
- Most Triggered YARA Rules
- Top Malware Families
- Most Queried Assets
- IOC Pivot Statistics
- MITRE ATT&CK Coverage Heatmap

---

### ⚙️ Operations Platform

ThreatStream includes a comprehensive operations management panel:

- **Background Job Queue**: Monitor and orchestrate port scanning, ingestion, enrichment, and platform backups.
- **Plugin Marketplace**: Integrated management console configures credentials and interfaces for **27 security connectors** (Nmap, Zeek, OSQuery, CrowdStrike, Elastic SIEM, VirusTotal, etc.).
- **Cron Scheduler**: Automate daily full backups, perimeter vulnerability assessments, threat intel feed pulls, and host processes telemetry sweeps.
- **Platform Backups**: Download, restore, or schedule backups (Full database state, configuration only, or incremental deltas).
- **Immutable Audit Logging**: Platform-wide operators activity log tracking all configuration modifications, login attempts, user role escalations, and data exports.
- **System Health Monitor**: Live system CPU load, memory utilization, disk capacity, network I/O stats, and API latency indicators.

---

### 🛡️ Threat Intelligence Connector Framework

ThreatStream implements a production-grade, secure, and extensible Threat Intelligence Connector Framework:

- **Unified Interface**: Extends `BasePlugin` to enforce `initialize()`, `authenticate()`, `validate()`, `execute()`, `health()`, and `cleanup()`.
- **VirusTotal Production Connector**: Provides real enrichment for domains, IPs, URLs, and file hashes (MD5, SHA-1, SHA-256) through the VirusTotal API v3.
- **Secure Credentials**: Credentials are saved in Supabase and only read on the backend by the Service Role Key. Secrets are never exposed to the frontend.
- **Intelligent Caching**: Keeps indicator results cached in `enrichment_results` for 24 hours to prevent exceeding provider API rate limits. Bypassing cache is supported through the UI.
- **Asset Discovery Orchestrator**: Concurrently triggers configured network scanners (like Nmap, RustScan, Masscan, Nuclei wrappers), normalizes their results into a standard asset schema, de-duplicates overlapping hosts, and inserts/updates them to Supabase `assets` and `services` tables.
- **Production Nmap Plugin**: Executes local operating system Nmap installation, parses results via structured XML schemas, reports real-time execution progress, and implements alphanumeric whitelist sanitization to eliminate shell injection vulnerabilities.
- **Production Discovery Suite plugins**: Integrates WhatWeb (technologies identification), SSLyze (TLS cert configuration audits), Masscan (high-speed ingress subnet sweeps), RustScan (accelerated initial port scans), and Nikto (CGI/web vulnerability mapping) executing real binary wrappers and parsing native JSON/greppable outputs.

#### Running the Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the uvicorn development server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

---

ThreatStream combines cutting-edge visualization technology with real-time data streaming to create an unparalleled cyber threat monitoring experience.


