-- =============================================================================
-- Migration: 20260705000600_operations.sql
-- Operations Platform tables: jobs, connectors, scheduled_tasks, audit_logs,
-- backups, system_metrics, api_keys
-- Idempotent: all statements are guarded with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: jobs – expand existing table with new operations columns
-- The table already exists from 000000_init_soc_schema.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS type          VARCHAR;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority      INT DEFAULT 5;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS payload       JSONB DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS result        JSONB;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS error         TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS progress      INT DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS connector_id  UUID;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS started_at    TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES auth.users(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT now();

-- ---------------------------------------------------------------------------
-- TABLE: connectors (new – not in 000000)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connectors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR UNIQUE NOT NULL,
  display_name  VARCHAR NOT NULL,
  category      VARCHAR NOT NULL,
  plugin_type   VARCHAR NOT NULL,
  status        VARCHAR DEFAULT 'not_configured'
                  CHECK (status IN ('active','inactive','error','not_configured','deprecated')),
  version       VARCHAR,
  description   TEXT,
  icon          VARCHAR,
  config        JSONB DEFAULT '{}',
  capabilities  JSONB DEFAULT '[]',
  health        JSONB DEFAULT '{}',
  last_seen     TIMESTAMPTZ,
  install_date  TIMESTAMPTZ,
  is_licensed   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TABLE: scheduled_tasks – expand existing table with new columns
-- The table already exists from 000000_init_soc_schema.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS cron_expression VARCHAR;
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS job_type        VARCHAR;
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS connector_id    UUID REFERENCES public.connectors(id);
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS payload         JSONB DEFAULT '{}';
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS enabled         BOOLEAN DEFAULT true;
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS next_run        TIMESTAMPTZ;
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS run_count       INT DEFAULT 0;
ALTER TABLE public.scheduled_tasks ADD COLUMN IF NOT EXISTS fail_count      INT DEFAULT 0;

-- ---------------------------------------------------------------------------
-- TABLE: audit_logs – expand existing table with new columns
-- The table already exists from 000000_init_soc_schema.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email    VARCHAR;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_id   VARCHAR;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_name VARCHAR;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details       JSONB DEFAULT '{}';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent    TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS severity      VARCHAR DEFAULT 'info'
                                                         CHECK (severity IN ('debug','info','warning','critical'));

-- ---------------------------------------------------------------------------
-- TABLE: backups (new)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR NOT NULL,
  type             VARCHAR DEFAULT 'full'
                     CHECK (type IN ('full','incremental','config')),
  status           VARCHAR DEFAULT 'pending'
                     CHECK (status IN ('pending','running','completed','failed','deleted')),
  size_bytes       BIGINT DEFAULT 0,
  file_path        VARCHAR,
  checksum         VARCHAR,
  tables_included  VARCHAR[],
  retention_days   INT DEFAULT 30,
  triggered_by     VARCHAR DEFAULT 'manual',
  created_by       UUID REFERENCES auth.users(id),
  completed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TABLE: system_metrics (new)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp           TIMESTAMPTZ DEFAULT now(),
  cpu_percent         DECIMAL,
  memory_percent      DECIMAL,
  disk_percent        DECIMAL,
  active_connections  INT,
  active_jobs         INT,
  events_per_second   INT,
  alerts_per_hour     INT,
  api_latency_ms      INT,
  db_query_ms         INT
);

-- ---------------------------------------------------------------------------
-- TABLE: api_keys (new)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR NOT NULL,
  key_prefix  VARCHAR NOT NULL,
  key_hash    VARCHAR NOT NULL,
  scopes      VARCHAR[] DEFAULT ARRAY['read'],
  created_by  UUID REFERENCES auth.users(id),
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_jobs_status        ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at    ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_connector_id  ON public.jobs(connector_id);

CREATE INDEX IF NOT EXISTS idx_connectors_category    ON public.connectors(category);
CREATE INDEX IF NOT EXISTS idx_connectors_status      ON public.connectors(status);
CREATE INDEX IF NOT EXISTS idx_connectors_plugin_type ON public.connectors(plugin_type);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled  ON public.scheduled_tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp     ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);

CREATE INDEX IF NOT EXISTS idx_backups_status     ON public.backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON public.system_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_is_active  ON public.api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON public.api_keys(created_by);

-- =============================================================================
-- updated_at triggers (guarded)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jobs_updated_at') THEN
    CREATE TRIGGER trg_jobs_updated_at
      BEFORE UPDATE ON public.jobs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_connectors_updated_at') THEN
    CREATE TRIGGER trg_connectors_updated_at
      BEFORE UPDATE ON public.connectors
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Authenticated users can view jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Authenticated users can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Authenticated users can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Authenticated users can delete jobs" ON public.jobs FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- connectors
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view connectors' AND tablename = 'connectors') THEN
    CREATE POLICY "Authenticated users can view connectors" ON public.connectors FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert connectors' AND tablename = 'connectors') THEN
    CREATE POLICY "Authenticated users can insert connectors" ON public.connectors FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update connectors' AND tablename = 'connectors') THEN
    CREATE POLICY "Authenticated users can update connectors" ON public.connectors FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete connectors' AND tablename = 'connectors') THEN
    CREATE POLICY "Authenticated users can delete connectors" ON public.connectors FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- scheduled_tasks
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view scheduled_tasks' AND tablename = 'scheduled_tasks') THEN
    CREATE POLICY "Authenticated users can view scheduled_tasks" ON public.scheduled_tasks FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert scheduled_tasks' AND tablename = 'scheduled_tasks') THEN
    CREATE POLICY "Authenticated users can insert scheduled_tasks" ON public.scheduled_tasks FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update scheduled_tasks' AND tablename = 'scheduled_tasks') THEN
    CREATE POLICY "Authenticated users can update scheduled_tasks" ON public.scheduled_tasks FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete scheduled_tasks' AND tablename = 'scheduled_tasks') THEN
    CREATE POLICY "Authenticated users can delete scheduled_tasks" ON public.scheduled_tasks FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view audit_logs' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Authenticated users can view audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert audit_logs' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Authenticated users can insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- backups
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view backups' AND tablename = 'backups') THEN
    CREATE POLICY "Authenticated users can view backups" ON public.backups FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert backups' AND tablename = 'backups') THEN
    CREATE POLICY "Authenticated users can insert backups" ON public.backups FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update backups' AND tablename = 'backups') THEN
    CREATE POLICY "Authenticated users can update backups" ON public.backups FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete backups' AND tablename = 'backups') THEN
    CREATE POLICY "Authenticated users can delete backups" ON public.backups FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- system_metrics
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view system_metrics' AND tablename = 'system_metrics') THEN
    CREATE POLICY "Authenticated users can view system_metrics" ON public.system_metrics FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert system_metrics' AND tablename = 'system_metrics') THEN
    CREATE POLICY "Authenticated users can insert system_metrics" ON public.system_metrics FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own api_keys' AND tablename = 'api_keys') THEN
    CREATE POLICY "Users can view their own api_keys" ON public.api_keys FOR SELECT TO authenticated USING (created_by = auth.uid());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert api_keys' AND tablename = 'api_keys') THEN
    CREATE POLICY "Users can insert api_keys" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own api_keys' AND tablename = 'api_keys') THEN
    CREATE POLICY "Users can update their own api_keys" ON public.api_keys FOR UPDATE TO authenticated USING (created_by = auth.uid());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own api_keys' AND tablename = 'api_keys') THEN
    CREATE POLICY "Users can delete their own api_keys" ON public.api_keys FOR DELETE TO authenticated USING (created_by = auth.uid());
  END IF;
END $$;
