-- =======================================================
-- MIGRATION: 20260705000300_endpoint_telemetry
-- EXTENDING EDR TELEMETRY & ALERTS SCHEMAS
-- =======================================================

-- 1. Alter telemetry Table
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS pid INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS ppid INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'informational' CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical'));
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS mitre_id VARCHAR(15);
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS mitre_name VARCHAR(100);
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS mitre_tactic VARCHAR(50);
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS parent_process VARCHAR(255);
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS command_line TEXT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS process_tree JSONB;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hash VARCHAR(128);
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS raw_event JSONB;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS normalized_event JSONB;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100);
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- 2. Alter detections Table (Rules Library metadata)
ALTER TABLE detections ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0';
ALTER TABLE detections ADD COLUMN IF NOT EXISTS author VARCHAR(100);
ALTER TABLE detections ADD COLUMN IF NOT EXISTS tags VARCHAR(100)[];
ALTER TABLE detections ADD COLUMN IF NOT EXISTS execution_count INT DEFAULT 0;
ALTER TABLE detections ADD COLUMN IF NOT EXISTS last_triggered TIMESTAMP WITH TIME ZONE;

-- 3. Create alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES detections(id) ON DELETE SET NULL,
    telemetry_id UUID REFERENCES telemetry(id) ON DELETE CASCADE,
    affected_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical')),
    mitre_id VARCHAR(15),
    mitre_name VARCHAR(100),
    ioc_value VARCHAR(255),
    threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    risk_score INT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    evidence JSONB,
    status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved', 'False Positive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- =======================================================
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read of alerts" ON alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write alerts by SOC personnel" ON alerts FOR ALL TO authenticated USING (true);
