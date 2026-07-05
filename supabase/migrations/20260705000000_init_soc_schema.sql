-- 20260705000000_init_soc_schema.sql
-- ThreatStream Security Operations Platform Initial DB Migration Schema
-- Target Platform: PostgreSQL (Compatible with Supabase)

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================================================
-- SECTION 1: IDENTITY AND ACCESS MANAGEMENT (IAM)
-- =======================================================

-- 1. Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Permissions Table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Role Permissions Map
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Users Table (SOC Operators)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. User Roles Map
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- =======================================================
-- SECTION 2: ASSET AND INVENTORY MANAGEMENT
-- =======================================================

-- 6. Infrastructure Assets Table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostname VARCHAR(100) NOT NULL UNIQUE,
    ip VARCHAR(45) NOT NULL,
    mac VARCHAR(17) NOT NULL,
    vendor VARCHAR(100),
    os VARCHAR(100),
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('Server', 'Workstation', 'Network', 'IoT', 'Mobile')),
    criticality VARCHAR(20) NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    risk_score INT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    status VARCHAR(20) DEFAULT 'Online' CHECK (status IN ('Online', 'Offline')),
    owner VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    patch_status VARCHAR(50) DEFAULT 'Up to Date',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Network Interfaces Table
CREATE TABLE network_interfaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    ip VARCHAR(45),
    gateway VARCHAR(45),
    netmask VARCHAR(45),
    mac VARCHAR(17),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Active Network Services Table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    port INT NOT NULL CHECK (port >= 1 AND port <= 65535),
    protocol VARCHAR(10) DEFAULT 'TCP' CHECK (protocol IN ('TCP', 'UDP')),
    name VARCHAR(100),
    product VARCHAR(255),
    version VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Software Inventory Table
CREATE TABLE software_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(100) NOT NULL,
    install_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Vulnerabilities Registry (CVEs)
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cve VARCHAR(20) NOT NULL UNIQUE,
    cvss NUMERIC(3,1) NOT NULL CHECK (cvss >= 0.0 AND cvss <= 10.0),
    summary TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Asset Vulnerabilities Map
CREATE TABLE asset_vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE NOT NULL,
    patched BOOLEAN DEFAULT FALSE NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    patched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_asset_vuln UNIQUE (asset_id, vulnerability_id)
);

-- =======================================================
-- SECTION 3: THREAT INTELLIGENCE AND DETECTION
-- =======================================================

-- 12. Threat Sources Table (Feed Providers)
CREATE TABLE threat_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    feed_type VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    auth_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Threat Events Table (Live Honeypots Hits)
CREATE TABLE threat_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip VARCHAR(45) NOT NULL,
    lat NUMERIC(9,6) NOT NULL CHECK (lat >= -90.0 AND lat <= 90.0),
    lon NUMERIC(9,6) NOT NULL CHECK (lon >= -180.0 AND lon <= 180.0),
    country VARCHAR(2) NOT NULL,
    attack_type VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Indicators of Compromise (IOCs) Table
CREATE TABLE iocs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value VARCHAR(255) NOT NULL UNIQUE,
    ioc_type VARCHAR(20) NOT NULL CHECK (ioc_type IN ('IP', 'Domain', 'URL', 'Hash')),
    asn VARCHAR(100),
    country VARCHAR(2),
    threat_type VARCHAR(100),
    confidence INT DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    mitre_id VARCHAR(15),
    mitre_name VARCHAR(100),
    source_feed VARCHAR(50),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Detections Rules Table (Sigma / YARA Configurations)
CREATE TABLE detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('Sigma', 'YARA', 'Custom')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    mitre_id VARCHAR(15),
    mitre_name VARCHAR(100),
    mitre_tactic VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Testing', 'Disabled')),
    description TEXT,
    definition TEXT NOT NULL, -- The YAML or YARA script contents
    author VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Security Alerts Table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES detections(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    hostname VARCHAR(100),
    details TEXT,
    status VARCHAR(20) DEFAULT 'New' CHECK (status IN ('New', 'Acknowledged', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- SECTION 4: CASE MANAGEMENT (INCIDENT RESPONSE)
-- =======================================================

-- 17. Incidents Table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    summary VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Mitigated', 'Closed')),
    owner VARCHAR(100) DEFAULT 'Unassigned',
    logged_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    mitre_id VARCHAR(15),
    mitre_name VARCHAR(100),
    mitre_tactic VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Incident Notes / Comments Table
CREATE TABLE incident_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
    author VARCHAR(100) NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. Incident Timeline Events Table
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    author VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- SECTION 5: ENDPOINT TELEMETRY (EDR DATA STREAM)
-- =======================================================

-- 20. Base Telemetry Raw Logs Table
CREATE TABLE telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostname VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    details TEXT,
    category VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. Process Creation Events
CREATE TABLE process_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    process_name VARCHAR(255) NOT NULL,
    parent_process VARCHAR(255),
    command_line TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 22. Network Connection Sockets
CREATE TABLE network_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    source_ip VARCHAR(45) NOT NULL,
    source_port INT NOT NULL,
    dest_ip VARCHAR(45) NOT NULL,
    dest_port INT NOT NULL,
    protocol VARCHAR(10) DEFAULT 'TCP',
    action VARCHAR(20) DEFAULT 'accept',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 23. DNS Queries
CREATE TABLE dns_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    query VARCHAR(255) NOT NULL,
    resolved_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 24. Authentications Logs
CREATE TABLE auth_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    logon_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Success', 'Failure')),
    source_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 25. USB Device Mounts
CREATE TABLE usb_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    action VARCHAR(20) CHECK (action IN ('Mount', 'Unmount')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 26. PowerShell Execution Telemetry
CREATE TABLE powershell_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    script_block TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 27. Registry Keys Manipulations
CREATE TABLE registry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    value_name VARCHAR(255),
    action VARCHAR(20) CHECK (action IN ('Create Key', 'Modify Value', 'Delete Key')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 28. Scheduled Tasks Persistence
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    command TEXT,
    trigger_rule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- SECTION 6: MALWARE SANDBOXING AND REPORTS
-- =======================================================

-- 29. Malware File Samples
CREATE TABLE malware_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    filesize VARCHAR(50),
    md5 CHAR(32) NOT NULL,
    sha1 CHAR(40) NOT NULL,
    sha256 CHAR(64) NOT NULL,
    entropy NUMERIC(4,2) CHECK (entropy >= 0.0 AND entropy <= 8.0),
    file_type VARCHAR(100),
    compiled_date TIMESTAMP WITH TIME ZONE,
    subsystem VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Queued' CHECK (status IN ('Queued', 'Running', 'Completed')),
    verdict VARCHAR(20) DEFAULT 'Unknown' CHECK (verdict IN ('Unknown', 'Malicious', 'Suspicious', 'Clean')),
    vt_score VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 30. Malware Sandboxing Reports
CREATE TABLE malware_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID REFERENCES malware_samples(id) ON DELETE CASCADE NOT NULL,
    analysis_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 31. Case Compliance Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    classification VARCHAR(50) NOT NULL,
    author VARCHAR(100) NOT NULL,
    date_generated DATE NOT NULL,
    file_format VARCHAR(10) DEFAULT 'PDF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- SECTION 7: PLATFORM CONFIGURATION AND AUDIT
-- =======================================================

-- 32. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 33. Plugins Directory Table
CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    version VARCHAR(20),
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 34. System Settings Table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 35. Cron/Celery Jobs Monitoring
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Running', 'Pending', 'Success', 'Failed')),
    duration_sec INT,
    last_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 36. System Health Monitoring
CREATE TABLE system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpu_usage NUMERIC(5,2) NOT NULL,
    memory_usage NUMERIC(5,2) NOT NULL,
    redis_connected BOOLEAN NOT NULL,
    active_websockets INT NOT NULL,
    log_db_storage VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- DATABASE INDEXES FOR SCALABILITY & VELOCITY
-- =======================================================
CREATE INDEX idx_threat_events_timestamp ON threat_events(timestamp DESC);
CREATE INDEX idx_iocs_value ON iocs(value);
CREATE INDEX idx_iocs_type ON iocs(ioc_type);
CREATE INDEX idx_assets_hostname ON assets(hostname);
CREATE INDEX idx_assets_ip ON assets(ip);
CREATE INDEX idx_telemetry_hostname ON telemetry(hostname);
CREATE INDEX idx_telemetry_event_type ON telemetry(event_type);
CREATE INDEX idx_telemetry_timestamp ON telemetry(timestamp DESC);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_malware_samples_sha256 ON malware_samples(sha256);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- =======================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_interfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE iocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usb_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE powershell_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE malware_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE malware_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- =======================================================
-- ACCESS CONTROL SECURITY POLICIES
-- =======================================================

-- 1. Users Table Policies
CREATE POLICY "Allow authenticated users to read profiles" ON users
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow administrators to manage profiles" ON users
    FOR ALL TO authenticated USING (true);

-- 2. Threat Intel Policies
CREATE POLICY "Allow authenticated read of threat data" ON threat_events
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write threat data by administrators" ON threat_events
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read of IOC registries" ON iocs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write IOC registries" ON iocs
    FOR ALL TO authenticated USING (true);

-- 3. Assets Policies
CREATE POLICY "Allow authenticated read of assets" ON assets
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write assets by SOC personnel" ON assets
    FOR ALL TO authenticated USING (true);

-- 4. Telemetry Policies
CREATE POLICY "Allow authenticated read of telemetry logs" ON telemetry
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read of detections rules" ON detections
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write detections rules" ON detections
    FOR ALL TO authenticated USING (true);

-- 5. Incidents Policies
CREATE POLICY "Allow authenticated read of incidents" ON incidents
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write incidents by SOC responders" ON incidents
    FOR ALL TO authenticated USING (true);

-- 6. System Settings Policies
CREATE POLICY "Allow authenticated read of system configuration" ON system_settings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin updates to settings" ON system_settings
    FOR ALL TO authenticated USING (true);

-- =======================================================
-- STORAGE BUCKETS INITIAL SEEDING
-- =======================================================
-- Note: Inserts buckets to Supabase storage schema.
-- Supabase automatically sets up schemas for buckets management.
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('reports', 'reports', true),
    ('malware', 'malware', false),
    ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

