-- =======================================================
-- MIGRATION: 20260705000100_threat_intel_platform
-- EXTENDING PLATFORM TO SUPPORT THREAT INTEL PLATFORM (TIP)
-- =======================================================

-- 1. Create Threat Actors Table
CREATE TABLE IF NOT EXISTS threat_actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    aliases VARCHAR(100)[],
    country VARCHAR(100),
    motivation VARCHAR(255),
    target_industries VARCHAR(100)[],
    known_campaigns VARCHAR(100)[],
    known_malware VARCHAR(100)[],
    mitre_techniques VARCHAR(15)[],
    description TEXT,
    risk_score INT DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Monitored', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Planned')),
    target_regions VARCHAR(100)[],
    affected_industries VARCHAR(100)[],
    reference_links TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Malware Families Table
CREATE TABLE IF NOT EXISTS malware_families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    aliases VARCHAR(100)[],
    malware_type VARCHAR(100) DEFAULT 'Trojan',
    capabilities VARCHAR(100)[],
    mitre_techniques VARCHAR(15)[],
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Alter iocs Table to Support New Relationships & TIP Properties
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS expiration TIMESTAMP WITH TIME ZONE;
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'False Positive', 'Review'));
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE SET NULL;
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS malware_family_id UUID REFERENCES malware_families(id) ON DELETE SET NULL;
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS tags VARCHAR(100)[];
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS reference_links TEXT[];
ALTER TABLE iocs ADD COLUMN IF NOT EXISTS geolocation JSONB;

-- 5. Create Generic IOC Correlations Table for Assets, Incidents, Vulnerabilities mapping
CREATE TABLE IF NOT EXISTS ioc_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ioc_id UUID REFERENCES iocs(id) ON DELETE CASCADE NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('asset', 'incident', 'vulnerability')),
    target_id UUID NOT NULL,
    relationship_score INT DEFAULT 50 CHECK (relationship_score >= 0 AND relationship_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- =======================================================
ALTER TABLE threat_actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE malware_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE ioc_correlations ENABLE ROW LEVEL SECURITY;

-- Read/Write policies
CREATE POLICY "Allow authenticated read of threat_actors" ON threat_actors
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write threat_actors by SOC personnel" ON threat_actors
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read of campaigns" ON campaigns
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write campaigns by SOC personnel" ON campaigns
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read of malware_families" ON malware_families
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write malware_families by SOC personnel" ON malware_families
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read of ioc_correlations" ON ioc_correlations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write ioc_correlations by SOC personnel" ON ioc_correlations
    FOR ALL TO authenticated USING (true);
