-- =======================================================
-- MIGRATION: 20260705000400_incident_response
-- EXTENDING INCIDENTS & DIGITAL FORENSICS SCHEMAS
-- =======================================================

-- 1. Alter incidents Table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assignee VARCHAR(100) DEFAULT 'Unassigned';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter VARCHAR(100) DEFAULT 'System Alert';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Malware Execution';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source_alert_id UUID;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS classification VARCHAR(100) DEFAULT 'True Positive';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS tags VARCHAR(100)[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS threat_actor_id UUID;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS campaign_id UUID;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS malware_family_id UUID;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS affected_assets TEXT[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS affected_users VARCHAR(100)[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS evidence JSONB;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS timeline JSONB;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS related_iocs VARCHAR(100)[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS related_cves VARCHAR(15)[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS related_alerts UUID[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS related_detections UUID[];
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS playbook_checklist JSONB;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS tasks JSONB;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS comments JSONB;

-- 2. Create index on incidents priority & category
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
