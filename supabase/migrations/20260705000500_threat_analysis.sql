-- =============================================================================
-- Migration: 20260705000500_threat_analysis.sql
-- ThreatStream SOC Platform – Threat Analysis Platform Schema
-- Idempotent: uses ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: malware_samples – expand existing table with new columns
-- The table already exists from 000000_init_soc_schema.sql; we only ADD
-- the columns that the analysis platform needs.
-- ---------------------------------------------------------------------------
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS file_size         VARCHAR;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS ssdeep            VARCHAR;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS compiler          VARCHAR;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS packer            VARCHAR;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS architecture      VARCHAR;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS digital_signature VARCHAR;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS compile_time      TIMESTAMP;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS risk_score        INT;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS sections          JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS imports           JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS exports           JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS strings           JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS tls_callbacks     JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS resources         JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS version_info      JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS yara_matches      JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS mitre_techniques  JSONB;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS behavior_summary  TEXT;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS threat_actor_id   UUID;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS campaign_id       UUID;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS incident_id       UUID;
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS tags              VARCHAR[];
ALTER TABLE public.malware_samples ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();

-- ---------------------------------------------------------------------------
-- TABLE: yara_rules (new)
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
-- TABLE: hunt_sessions (new)
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
-- TABLE: enrichment_results (new)
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
-- TRIGGERS: updated_at auto-maintenance (guarded to avoid duplicate errors)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_malware_samples_updated_at'
  ) THEN
    CREATE TRIGGER trg_malware_samples_updated_at
      BEFORE UPDATE ON public.malware_samples
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

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
ALTER TABLE public.malware_samples    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yara_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_results ENABLE ROW LEVEL SECURITY;

-- malware_samples policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'malware_samples_select_authenticated' AND tablename = 'malware_samples') THEN
    CREATE POLICY "malware_samples_select_authenticated" ON public.malware_samples FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'malware_samples_insert_authenticated' AND tablename = 'malware_samples') THEN
    CREATE POLICY "malware_samples_insert_authenticated" ON public.malware_samples FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'malware_samples_update_authenticated' AND tablename = 'malware_samples') THEN
    CREATE POLICY "malware_samples_update_authenticated" ON public.malware_samples FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'malware_samples_delete_authenticated' AND tablename = 'malware_samples') THEN
    CREATE POLICY "malware_samples_delete_authenticated" ON public.malware_samples FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- yara_rules policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yara_rules_select_authenticated' AND tablename = 'yara_rules') THEN
    CREATE POLICY "yara_rules_select_authenticated" ON public.yara_rules FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yara_rules_insert_authenticated' AND tablename = 'yara_rules') THEN
    CREATE POLICY "yara_rules_insert_authenticated" ON public.yara_rules FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yara_rules_update_authenticated' AND tablename = 'yara_rules') THEN
    CREATE POLICY "yara_rules_update_authenticated" ON public.yara_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yara_rules_delete_authenticated' AND tablename = 'yara_rules') THEN
    CREATE POLICY "yara_rules_delete_authenticated" ON public.yara_rules FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- hunt_sessions policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hunt_sessions_select_authenticated' AND tablename = 'hunt_sessions') THEN
    CREATE POLICY "hunt_sessions_select_authenticated" ON public.hunt_sessions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hunt_sessions_insert_authenticated' AND tablename = 'hunt_sessions') THEN
    CREATE POLICY "hunt_sessions_insert_authenticated" ON public.hunt_sessions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hunt_sessions_update_authenticated' AND tablename = 'hunt_sessions') THEN
    CREATE POLICY "hunt_sessions_update_authenticated" ON public.hunt_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hunt_sessions_delete_authenticated' AND tablename = 'hunt_sessions') THEN
    CREATE POLICY "hunt_sessions_delete_authenticated" ON public.hunt_sessions FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- enrichment_results policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enrichment_results_select_authenticated' AND tablename = 'enrichment_results') THEN
    CREATE POLICY "enrichment_results_select_authenticated" ON public.enrichment_results FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enrichment_results_insert_authenticated' AND tablename = 'enrichment_results') THEN
    CREATE POLICY "enrichment_results_insert_authenticated" ON public.enrichment_results FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enrichment_results_update_authenticated' AND tablename = 'enrichment_results') THEN
    CREATE POLICY "enrichment_results_update_authenticated" ON public.enrichment_results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enrichment_results_delete_authenticated' AND tablename = 'enrichment_results') THEN
    CREATE POLICY "enrichment_results_delete_authenticated" ON public.enrichment_results FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- INDEXES: performance optimizations
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_malware_samples_sha256       ON public.malware_samples (sha256);
CREATE INDEX IF NOT EXISTS idx_malware_samples_md5          ON public.malware_samples (md5);
CREATE INDEX IF NOT EXISTS idx_malware_samples_verdict      ON public.malware_samples (verdict);
CREATE INDEX IF NOT EXISTS idx_malware_samples_file_type    ON public.malware_samples (file_type);
CREATE INDEX IF NOT EXISTS idx_malware_samples_risk_score   ON public.malware_samples (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_malware_samples_created_at   ON public.malware_samples (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_malware_samples_threat_actor ON public.malware_samples (threat_actor_id);

CREATE INDEX IF NOT EXISTS idx_yara_rules_status    ON public.yara_rules (status);
CREATE INDEX IF NOT EXISTS idx_yara_rules_severity  ON public.yara_rules (severity);
CREATE INDEX IF NOT EXISTS idx_yara_rules_rule_type ON public.yara_rules (rule_type);
CREATE INDEX IF NOT EXISTS idx_yara_rules_mitre_id  ON public.yara_rules (mitre_id);

CREATE INDEX IF NOT EXISTS idx_hunt_sessions_status     ON public.hunt_sessions (status);
CREATE INDEX IF NOT EXISTS idx_hunt_sessions_bookmarked ON public.hunt_sessions (bookmarked);
CREATE INDEX IF NOT EXISTS idx_hunt_sessions_analyst    ON public.hunt_sessions (analyst);
CREATE INDEX IF NOT EXISTS idx_hunt_sessions_created_at ON public.hunt_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_results_ioc_value ON public.enrichment_results (ioc_value);
CREATE INDEX IF NOT EXISTS idx_enrichment_results_ioc_type  ON public.enrichment_results (ioc_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_results_provider  ON public.enrichment_results (provider);
CREATE INDEX IF NOT EXISTS idx_enrichment_results_enriched  ON public.enrichment_results (enriched_at DESC);
