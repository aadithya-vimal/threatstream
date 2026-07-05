-- =======================================================
-- MIGRATION: 20260705000200_asset_intelligence
-- EXTENDING ASSETS SCHEMA TO SUPPORT ATTACK SURFACE ENGINE
-- =======================================================

-- 1. Alter assets Table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ipv6 VARCHAR(45);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS architecture VARCHAR(20);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'Production' CHECK (environment IN ('Production', 'Development', 'Testing'));
ALTER TABLE assets ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS business_unit VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tags VARCHAR(100)[];
ALTER TABLE assets ADD COLUMN IF NOT EXISTS security_score INT DEFAULT 100 CHECK (security_score >= 0 AND security_score <= 100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS internet_facing BOOLEAN DEFAULT FALSE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS cloud_provider VARCHAR(50);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(50) DEFAULT 'Active';

-- 2. Alter services Table
ALTER TABLE services ADD COLUMN IF NOT EXISTS banner TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS tls_status VARCHAR(50) DEFAULT 'None';
ALTER TABLE services ADD COLUMN IF NOT EXISTS certificate_expiry TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

-- 3. Alter software_inventory Table
ALTER TABLE software_inventory ADD COLUMN IF NOT EXISTS vendor VARCHAR(100);
ALTER TABLE software_inventory ADD COLUMN IF NOT EXISTS publisher VARCHAR(100);
ALTER TABLE software_inventory ADD COLUMN IF NOT EXISTS license VARCHAR(100);
ALTER TABLE software_inventory ADD COLUMN IF NOT EXISTS package_manager VARCHAR(50);
ALTER TABLE software_inventory ADD COLUMN IF NOT EXISTS dependencies VARCHAR(100)[];
ALTER TABLE software_inventory ADD COLUMN IF NOT EXISTS support_status VARCHAR(50) DEFAULT 'Supported';
ALTER TABLE software_inventory ADD COLUMN IF NOT EXISTS end_of_life DATE;

-- 4. Alter vulnerabilities Table
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS epss NUMERIC(5,4);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS cwe VARCHAR(20);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS capec VARCHAR(20);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS exploit_available BOOLEAN DEFAULT FALSE;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS patch_available BOOLEAN DEFAULT FALSE;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS vendor_advisory TEXT;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS "references" TEXT[];
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS known_exploited BOOLEAN DEFAULT FALSE;

-- 5. Create Asset Relationships Table
CREATE TABLE IF NOT EXISTS asset_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    target_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    relationship_type VARCHAR(100) NOT NULL CHECK (relationship_type IN ('depends_on', 'connects_to', 'routes_to', 'manages')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_asset_rel UNIQUE (source_asset_id, target_asset_id)
);

-- 6. Topology Mapping Tables
CREATE TABLE IF NOT EXISTS topology_nodes (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    zone VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS topology_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100) NOT NULL,
    target VARCHAR(100) NOT NULL,
    bandwidth VARCHAR(50)
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- =======================================================
ALTER TABLE asset_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE topology_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE topology_links ENABLE ROW LEVEL SECURITY;

-- Read/Write policies
CREATE POLICY "Allow authenticated read of asset_relationships" ON asset_relationships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write asset_relationships by SOC personnel" ON asset_relationships FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read of topology_nodes" ON topology_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write topology_nodes by SOC personnel" ON topology_nodes FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read of topology_links" ON topology_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write topology_links by SOC personnel" ON topology_links FOR ALL TO authenticated USING (true);
