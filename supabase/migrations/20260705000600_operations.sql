-- =============================================================================
-- Migration: 20260705000600_operations.sql
-- Operations Platform tables: jobs, connectors, scheduled_tasks, audit_logs,
-- backups, system_metrics, api_keys
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Background job queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR NOT NULL,
  type          VARCHAR NOT NULL,  -- 'scan','collect','enrich','backup','report','cleanup'
  status        VARCHAR DEFAULT 'queued'
                  CHECK (status IN ('queued','running','completed','failed','cancelled')),
  priority      INT DEFAULT 5,     -- 1=critical, 10=low
  payload       JSONB DEFAULT '{}',
  result        JSONB,
  error         TEXT,
  progress      INT DEFAULT 0,     -- 0-100
  connector_id  UUID,
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Connector registry (all 27 plugins)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connectors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR UNIQUE NOT NULL,
  display_name  VARCHAR NOT NULL,
  category      VARCHAR NOT NULL,  -- 'scanner','collector','edr','siem','threat_intel','enrichment'
  plugin_type   VARCHAR NOT NULL,  -- 'nmap','masscan','nuclei' etc
  status        VARCHAR DEFAULT 'not_configured'
                  CHECK (status IN ('active','inactive','error','not_configured','deprecated')),
  version       VARCHAR,
  description   TEXT,
  icon          VARCHAR,
  config        JSONB DEFAULT '{}',   -- encrypted in prod
  capabilities  JSONB DEFAULT '[]',   -- what this connector can do
  health        JSONB DEFAULT '{}',   -- last_check, latency_ms, error_count
  last_seen     TIMESTAMPTZ,
  install_date  TIMESTAMPTZ,
  is_licensed   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Scheduled tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR NOT NULL,
  description     TEXT,
  cron_expression VARCHAR,   -- e.g. '0 */6 * * *'
  job_type        VARCHAR NOT NULL,
  connector_id    UUID REFERENCES connectors(id),
  payload         JSONB DEFAULT '{}',
  enabled         BOOLEAN DEFAULT true,
  last_run        TIMESTAMPTZ,
  next_run        TIMESTAMPTZ,
  run_count       INT DEFAULT 0,
  fail_count      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Audit log (immutable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp     TIMESTAMPTZ DEFAULT now(),
  user_id       UUID REFERENCES auth.users(id),
  user_email    VARCHAR,
  action        VARCHAR NOT NULL,  -- 'login','logout','create','update','delete','export','import','config_change'
  resource_type VARCHAR,           -- 'incident','ioc','connector','user','rule'
  resource_id   VARCHAR,
  resource_name VARCHAR,
  details       JSONB DEFAULT '{}',
  ip_address    VARCHAR,
  user_agent    TEXT,
  severity      VARCHAR DEFAULT 'info'
                  CHECK (severity IN ('debug','info','warning','critical'))
);

-- ---------------------------------------------------------------------------
-- Backup records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backups (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  triggered_by     VARCHAR DEFAULT 'manual',  -- 'manual','scheduled','auto'
  created_by       UUID REFERENCES auth.users(id),
  completed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- System metrics snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_metrics (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- API keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR NOT NULL,
  key_prefix  VARCHAR NOT NULL,   -- first 8 chars for display
  key_hash    VARCHAR NOT NULL,   -- bcrypt hashed
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
CREATE INDEX IF NOT EXISTS idx_jobs_status        ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type          ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at    ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_connector_id  ON jobs(connector_id);

CREATE INDEX IF NOT EXISTS idx_connectors_category    ON connectors(category);
CREATE INDEX IF NOT EXISTS idx_connectors_status      ON connectors(status);
CREATE INDEX IF NOT EXISTS idx_connectors_plugin_type ON connectors(plugin_type);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled    ON scheduled_tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run   ON scheduled_tasks(next_run);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp     ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity      ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

CREATE INDEX IF NOT EXISTS idx_backups_status     ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_is_active  ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);

-- =============================================================================
-- updated_at triggers
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_connectors_updated_at
  BEFORE UPDATE ON connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view jobs"
  ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete jobs"
  ON jobs FOR DELETE TO authenticated USING (true);

-- connectors
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view connectors"
  ON connectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert connectors"
  ON connectors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update connectors"
  ON connectors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete connectors"
  ON connectors FOR DELETE TO authenticated USING (true);

-- scheduled_tasks
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view scheduled_tasks"
  ON scheduled_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert scheduled_tasks"
  ON scheduled_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update scheduled_tasks"
  ON scheduled_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete scheduled_tasks"
  ON scheduled_tasks FOR DELETE TO authenticated USING (true);

-- audit_logs (insert-only for non-admins — SELECT open to authenticated)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view audit_logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_logs"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- backups
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view backups"
  ON backups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert backups"
  ON backups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update backups"
  ON backups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete backups"
  ON backups FOR DELETE TO authenticated USING (true);

-- system_metrics
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view system_metrics"
  ON system_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert system_metrics"
  ON system_metrics FOR INSERT TO authenticated WITH CHECK (true);

-- api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own api_keys"
  ON api_keys FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can insert api_keys"
  ON api_keys FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update their own api_keys"
  ON api_keys FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete their own api_keys"
  ON api_keys FOR DELETE TO authenticated USING (created_by = auth.uid());
