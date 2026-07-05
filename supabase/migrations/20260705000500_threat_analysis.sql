-- =============================================================================
-- Migration: 20260705000500_threat_analysis.sql
-- ThreatStream SOC Platform – Threat Analysis Platform Schema
-- Tables: malware_samples (expanded), yara_rules, hunt_sessions, enrichment_results
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: malware_samples (expanded)
-- Full static analysis entity with PE metadata, YARA, MITRE, and attribution
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.malware_samples (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename          VARCHAR NOT NULL,
  file_type         VARCHAR CHECK (file_type IN ('PE','ELF','Mach-O','APK','PDF','Office','Archive','Script')),
  file_size         VARCHAR,
  md5               VARCHAR,
  sha1              VARCHAR,
  sha256            VARCHAR,
  ssdeep            VARCHAR,
  entropy           DECIMAL,
  compiler          VARCHAR,
  packer            VARCHAR,
  architecture      VARCHAR,
  digital_signature VARCHAR,
  compile_time      TIMESTAMP,
  risk_score        INT,
  verdict           VARCHAR CHECK (verdict IN ('clean','low','medium','high','critical')),
  sections          JSONB,
  imports           JSONB,
  exports           JSONB,
  strings           JSONB,
  tls_callbacks     JSONB,
  resources         JSONB,
  version_info      JSONB,
  yara_matches      JSONB,
  mitre_techniques  JSONB,
  behavior_summary  TEXT,
  threat_actor_id   UUID,
  campaign_id       UUID,
  incident_id       UUID,
  tags              VARCHAR[],
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TABLE: yara_rules
-- Detection, classification, attribution and hunting rule definitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.yara_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR UNIQUE NOT NULL,
  description      TEXT,
  author           VARCHAR,
  version          VARCHAR DEFAULT '1.0',
  category         VARCHAR,
  tags             VARCHAR[],
  rule_type        VARCHAR CHECK (rule_type IN ('Detection','Classification','Attribution','Hunting')),
  severity         VARCHAR CHECK (severity IN ('informational','low','medium','high','critical')),
  status           VARCHAR CHECK (status IN ('Active','Testing','Deprecated')) DEFAULT 'Active',
  definition       TEXT,
  mitre_id         VARCHAR,
  execution_count  INT DEFAULT 0,
  last_triggered   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TABLE: hunt_sessions
-- Saved threat hunt queries and session bookmarks for analysts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hunt_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR NOT NULL,
  query        TEXT NOT NULL,
  query_type   VARCHAR DEFAULT 'KQL',
  description  TEXT,
  analyst      VARCHAR,
  status       VARCHAR CHECK (status IN ('Draft','Active','Completed')) DEFAULT 'Draft',
  result_count INT DEFAULT 0,
  tags         VARCHAR[],
  bookmarked   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TABLE: enrichment_results
-- IOC provider enrichment response cache
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enrichment_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ioc_value   VARCHAR NOT NULL,
  ioc_type    VARCHAR NOT NULL,
  provider    VARCHAR NOT NULL,
  reputation  VARCHAR,
  confidence  INT,
  risk_score  INT,
  raw_result  JSONB,
  enriched_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TRIGGERS: updated_at auto-maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- malware_samples trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_malware_samples_updated_at'
  ) THEN
    CREATE TRIGGER trg_malware_samples_updated_at
      BEFORE UPDATE ON public.malware_samples
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- hunt_sessions trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_hunt_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_hunt_sessions_updated_at
      BEFORE UPDATE ON public.hunt_sessions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.malware_samples     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yara_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_results  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS POLICIES: malware_samples
-- ---------------------------------------------------------------------------
CREATE POLICY "malware_samples_select_authenticated"
  ON public.malware_samples FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "malware_samples_insert_authenticated"
  ON public.malware_samples FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "malware_samples_update_authenticated"
  ON public.malware_samples FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "malware_samples_delete_authenticated"
  ON public.malware_samples FOR DELETE
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- RLS POLICIES: yara_rules
-- ---------------------------------------------------------------------------
CREATE POLICY "yara_rules_select_authenticated"
  ON public.yara_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "yara_rules_insert_authenticated"
  ON public.yara_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "yara_rules_update_authenticated"
  ON public.yara_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "yara_rules_delete_authenticated"
  ON public.yara_rules FOR DELETE
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- RLS POLICIES: hunt_sessions
-- ---------------------------------------------------------------------------
CREATE POLICY "hunt_sessions_select_authenticated"
  ON public.hunt_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "hunt_sessions_insert_authenticated"
  ON public.hunt_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "hunt_sessions_update_authenticated"
  ON public.hunt_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "hunt_sessions_delete_authenticated"
  ON public.hunt_sessions FOR DELETE
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- RLS POLICIES: enrichment_results
-- ---------------------------------------------------------------------------
CREATE POLICY "enrichment_results_select_authenticated"
  ON public.enrichment_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enrichment_results_insert_authenticated"
  ON public.enrichment_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "enrichment_results_update_authenticated"
  ON public.enrichment_results FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "enrichment_results_delete_authenticated"
  ON public.enrichment_results FOR DELETE
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- INDEXES: performance optimizations
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_malware_samples_sha256      ON public.malware_samples (sha256);
CREATE INDEX IF NOT EXISTS idx_malware_samples_md5         ON public.malware_samples (md5);
CREATE INDEX IF NOT EXISTS idx_malware_samples_verdict     ON public.malware_samples (verdict);
CREATE INDEX IF NOT EXISTS idx_malware_samples_file_type   ON public.malware_samples (file_type);
CREATE INDEX IF NOT EXISTS idx_malware_samples_risk_score  ON public.malware_samples (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_malware_samples_created_at  ON public.malware_samples (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_malware_samples_threat_actor ON public.malware_samples (threat_actor_id);

CREATE INDEX IF NOT EXISTS idx_yara_rules_status       ON public.yara_rules (status);
CREATE INDEX IF NOT EXISTS idx_yara_rules_severity     ON public.yara_rules (severity);
CREATE INDEX IF NOT EXISTS idx_yara_rules_rule_type    ON public.yara_rules (rule_type);
CREATE INDEX IF NOT EXISTS idx_yara_rules_mitre_id     ON public.yara_rules (mitre_id);

CREATE INDEX IF NOT EXISTS idx_hunt_sessions_status     ON public.hunt_sessions (status);
CREATE INDEX IF NOT EXISTS idx_hunt_sessions_bookmarked ON public.hunt_sessions (bookmarked);
CREATE INDEX IF NOT EXISTS idx_hunt_sessions_analyst    ON public.hunt_sessions (analyst);
CREATE INDEX IF NOT EXISTS idx_hunt_sessions_created_at ON public.hunt_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_results_ioc_value ON public.enrichment_results (ioc_value);
CREATE INDEX IF NOT EXISTS idx_enrichment_results_ioc_type  ON public.enrichment_results (ioc_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_results_provider  ON public.enrichment_results (provider);
CREATE INDEX IF NOT EXISTS idx_enrichment_results_enriched  ON public.enrichment_results (enriched_at DESC);
