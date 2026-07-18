-- ThreatStream Phase 2: explicit tenancy, permissions, and append-only audit.
-- This migration is additive. Legacy SOC tables remain untouched until their
-- data has been classified and a documented backfill exists.

CREATE TABLE IF NOT EXISTS public.appsec_permissions (
    key TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workspace_roles (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.workspace_role_permissions (
    role_key TEXT NOT NULL REFERENCES public.workspace_roles(key) ON DELETE CASCADE,
    permission_key TEXT NOT NULL REFERENCES public.appsec_permissions(key) ON DELETE CASCADE,
    PRIMARY KEY (role_key, permission_key)
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL CHECK (role_key IN ('organization_administrator', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
    slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL REFERENCES public.workspace_roles(key),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
    slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL DEFAULT 'member' CHECK (role_key IN ('lead', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    request_correlation_id UUID,
    source_ip INET,
    before_summary JSONB,
    after_summary JSONB,
    result TEXT NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failure', 'denied')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider_key TEXT NOT NULL CHECK (provider_key ~ '^[a-z0-9]+(?:[_-][a-z0-9]+)*$'),
    secret_ciphertext TEXT NOT NULL,
    secret_nonce TEXT NOT NULL,
    secret_hint TEXT NOT NULL CHECK (char_length(secret_hint) <= 32),
    key_version INTEGER NOT NULL DEFAULT 1 CHECK (key_version > 0),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, provider_key)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workspaces_org ON public.workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_teams_workspace ON public.teams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_created ON public.audit_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_org_created ON public.audit_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_workspace ON public.integration_credentials(workspace_id, provider_key);

INSERT INTO public.appsec_permissions (key, description) VALUES
    ('organization:manage', 'Manage organization settings and membership'),
    ('workspace:read', 'Read workspace data'),
    ('workspace:manage', 'Manage workspace settings and membership'),
    ('team:manage', 'Manage teams and team membership'),
    ('application:read', 'Read applications and components'),
    ('application:create', 'Create applications'),
    ('application:update', 'Update applications'),
    ('application:delete', 'Delete applications'),
    ('repository:connect', 'Connect and map repositories'),
    ('integration:manage', 'Manage provider integrations'),
    ('scan:create', 'Create scan runs'),
    ('scan:cancel', 'Cancel scan runs'),
    ('scan:read', 'Read scan runs and artifacts'),
    ('finding:read', 'Read findings'),
    ('finding:triage', 'Triage and assign findings'),
    ('finding:suppress', 'Suppress findings'),
    ('finding:accept_risk', 'Accept finding risk'),
    ('remediation:create', 'Create remediation work'),
    ('remediation:assign', 'Assign remediation work'),
    ('remediation:update', 'Update remediation work'),
    ('deployment:manage', 'Manage environments and deployments'),
    ('runtime_event:ingest', 'Ingest runtime events'),
    ('runtime_event:read', 'Read runtime events'),
    ('case:create', 'Create security cases'),
    ('case:update', 'Update security cases'),
    ('audit:read', 'Read audit events'),
    ('policy:manage', 'Manage security and scan policies')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.workspace_roles (key, name, description) VALUES
    ('workspace_administrator', 'Workspace Administrator', 'Full workspace administration'),
    ('application_security_engineer', 'Application Security Engineer', 'Application security triage and policy management'),
    ('devsecops_engineer', 'DevSecOps Engineer', 'Repository, scan, deployment, and remediation operations'),
    ('secops_analyst', 'SecOps Analyst', 'Runtime event, alert, and case operations'),
    ('developer', 'Developer', 'Application visibility and assigned remediation work'),
    ('read_only', 'Read Only', 'Read-only workspace access')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.workspace_role_permissions (role_key, permission_key)
SELECT 'workspace_administrator', key FROM public.appsec_permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.workspace_role_permissions (role_key, permission_key) VALUES
    ('application_security_engineer', 'workspace:read'),
    ('application_security_engineer', 'team:manage'),
    ('application_security_engineer', 'application:read'),
    ('application_security_engineer', 'application:create'),
    ('application_security_engineer', 'application:update'),
    ('application_security_engineer', 'repository:connect'),
    ('application_security_engineer', 'integration:manage'),
    ('application_security_engineer', 'scan:create'),
    ('application_security_engineer', 'scan:cancel'),
    ('application_security_engineer', 'scan:read'),
    ('application_security_engineer', 'finding:read'),
    ('application_security_engineer', 'finding:triage'),
    ('application_security_engineer', 'finding:suppress'),
    ('application_security_engineer', 'finding:accept_risk'),
    ('application_security_engineer', 'remediation:create'),
    ('application_security_engineer', 'remediation:assign'),
    ('application_security_engineer', 'remediation:update'),
    ('application_security_engineer', 'deployment:manage'),
    ('application_security_engineer', 'runtime_event:read'),
    ('application_security_engineer', 'case:create'),
    ('application_security_engineer', 'case:update'),
    ('application_security_engineer', 'audit:read'),
    ('application_security_engineer', 'policy:manage'),
    ('devsecops_engineer', 'workspace:read'),
    ('devsecops_engineer', 'application:read'),
    ('devsecops_engineer', 'application:create'),
    ('devsecops_engineer', 'application:update'),
    ('devsecops_engineer', 'repository:connect'),
    ('devsecops_engineer', 'scan:create'),
    ('devsecops_engineer', 'scan:cancel'),
    ('devsecops_engineer', 'scan:read'),
    ('devsecops_engineer', 'finding:read'),
    ('devsecops_engineer', 'finding:triage'),
    ('devsecops_engineer', 'remediation:create'),
    ('devsecops_engineer', 'remediation:update'),
    ('devsecops_engineer', 'deployment:manage'),
    ('devsecops_engineer', 'runtime_event:read'),
    ('secops_analyst', 'workspace:read'),
    ('secops_analyst', 'application:read'),
    ('secops_analyst', 'scan:read'),
    ('secops_analyst', 'finding:read'),
    ('secops_analyst', 'finding:triage'),
    ('secops_analyst', 'remediation:create'),
    ('secops_analyst', 'remediation:assign'),
    ('secops_analyst', 'remediation:update'),
    ('secops_analyst', 'runtime_event:read'),
    ('secops_analyst', 'case:create'),
    ('secops_analyst', 'case:update'),
    ('developer', 'workspace:read'),
    ('developer', 'application:read'),
    ('developer', 'scan:read'),
    ('developer', 'finding:read'),
    ('developer', 'remediation:create'),
    ('developer', 'remediation:update'),
    ('developer', 'deployment:manage'),
    ('read_only', 'workspace:read'),
    ('read_only', 'application:read'),
    ('read_only', 'scan:read'),
    ('read_only', 'finding:read'),
    ('read_only', 'runtime_event:read')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_organization_member(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members member
        WHERE member.organization_id = target_organization_id
          AND member.user_id = (SELECT auth.uid())
          AND member.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_administrator(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members member
        WHERE member.organization_id = target_organization_id
          AND member.user_id = (SELECT auth.uid())
          AND member.role_key = 'organization_administrator'
          AND member.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members member
        WHERE member.workspace_id = target_workspace_id
          AND member.user_id = (SELECT auth.uid())
          AND member.status = 'active'
    ) OR EXISTS (
        SELECT 1
        FROM public.workspaces workspace
        JOIN public.organization_members member ON member.organization_id = workspace.organization_id
        WHERE workspace.id = target_workspace_id
          AND member.user_id = (SELECT auth.uid())
          AND member.role_key = 'organization_administrator'
          AND member.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_permission(target_workspace_id UUID, required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
      EXISTS (
        SELECT 1
        FROM public.workspace_members member
        JOIN public.workspace_role_permissions grant_row ON grant_row.role_key = member.role_key
        WHERE member.workspace_id = target_workspace_id
          AND member.user_id = (SELECT auth.uid())
          AND member.status = 'active'
          AND grant_row.permission_key = required_permission
      )
      OR EXISTS (
        SELECT 1
        FROM public.workspaces workspace
        JOIN public.organization_members member ON member.organization_id = workspace.organization_id
        WHERE workspace.id = target_workspace_id
          AND member.user_id = (SELECT auth.uid())
          AND member.role_key = 'organization_administrator'
          AND member.status = 'active'
      );
$$;

REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_organization_administrator(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_permission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_administrator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_organization_with_workspace(
    organization_name TEXT,
    organization_slug TEXT,
    workspace_name TEXT,
    workspace_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor UUID := (SELECT auth.uid());
    new_organization public.organizations;
    new_workspace public.workspaces;
BEGIN
    IF actor IS NULL THEN
        RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
    END IF;

    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (trim(organization_name), lower(trim(organization_slug)), actor)
    RETURNING * INTO new_organization;

    INSERT INTO public.organization_members (organization_id, user_id, role_key)
    VALUES (new_organization.id, actor, 'organization_administrator');

    INSERT INTO public.workspaces (organization_id, name, slug, created_by)
    VALUES (new_organization.id, trim(workspace_name), lower(trim(workspace_slug)), actor)
    RETURNING * INTO new_workspace;

    INSERT INTO public.workspace_members (workspace_id, user_id, role_key)
    VALUES (new_workspace.id, actor, 'workspace_administrator');

    INSERT INTO public.audit_events (
        organization_id, workspace_id, actor_id, action, target_type, target_id, after_summary
    ) VALUES (
        new_organization.id,
        new_workspace.id,
        actor,
        'organization.created',
        'organization',
        new_organization.id,
        jsonb_build_object('organization_name', new_organization.name, 'workspace_name', new_workspace.name)
    );

    RETURN jsonb_build_object(
        'organization', to_jsonb(new_organization),
        'workspace', to_jsonb(new_workspace),
        'role_key', 'workspace_administrator'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace(
    target_organization_id UUID,
    workspace_name TEXT,
    workspace_slug TEXT,
    workspace_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor UUID := (SELECT auth.uid());
    new_workspace public.workspaces;
BEGIN
    IF NOT public.is_organization_administrator(target_organization_id) THEN
        RAISE EXCEPTION 'organization administrator permission required' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.workspaces (organization_id, name, slug, description, created_by)
    VALUES (target_organization_id, trim(workspace_name), lower(trim(workspace_slug)), workspace_description, actor)
    RETURNING * INTO new_workspace;

    INSERT INTO public.workspace_members (workspace_id, user_id, role_key)
    VALUES (new_workspace.id, actor, 'workspace_administrator');

    INSERT INTO public.audit_events (organization_id, workspace_id, actor_id, action, target_type, target_id, after_summary)
    VALUES (target_organization_id, new_workspace.id, actor, 'workspace.created', 'workspace', new_workspace.id, to_jsonb(new_workspace));

    RETURN to_jsonb(new_workspace);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_team(
    target_workspace_id UUID,
    team_name TEXT,
    team_slug TEXT,
    team_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor UUID := (SELECT auth.uid());
    workspace_organization_id UUID;
    new_team public.teams;
BEGIN
    IF NOT public.has_workspace_permission(target_workspace_id, 'team:manage') THEN
        RAISE EXCEPTION 'team management permission required' USING ERRCODE = '42501';
    END IF;

    SELECT organization_id INTO workspace_organization_id
    FROM public.workspaces WHERE id = target_workspace_id;

    INSERT INTO public.teams (organization_id, workspace_id, name, slug, description, created_by)
    VALUES (workspace_organization_id, target_workspace_id, trim(team_name), lower(trim(team_slug)), team_description, actor)
    RETURNING * INTO new_team;

    INSERT INTO public.team_members (team_id, user_id, role_key)
    VALUES (new_team.id, actor, 'lead');

    INSERT INTO public.audit_events (organization_id, workspace_id, actor_id, action, target_type, target_id, after_summary)
    VALUES (workspace_organization_id, target_workspace_id, actor, 'team.created', 'team', new_team.id, to_jsonb(new_team));

    RETURN to_jsonb(new_team);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_integration_credential(
    target_workspace_id UUID,
    target_provider_key TEXT,
    encrypted_secret TEXT,
    encryption_nonce TEXT,
    masked_hint TEXT,
    encryption_key_version INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor UUID := (SELECT auth.uid());
    workspace_organization_id UUID;
    stored public.integration_credentials;
BEGIN
    IF NOT public.has_workspace_permission(target_workspace_id, 'integration:manage') THEN
        RAISE EXCEPTION 'integration management permission required' USING ERRCODE = '42501';
    END IF;

    SELECT organization_id INTO workspace_organization_id
    FROM public.workspaces WHERE id = target_workspace_id;

    INSERT INTO public.integration_credentials (
        organization_id, workspace_id, provider_key, secret_ciphertext,
        secret_nonce, secret_hint, key_version, created_by
    ) VALUES (
        workspace_organization_id, target_workspace_id, lower(target_provider_key), encrypted_secret,
        encryption_nonce, masked_hint, encryption_key_version, actor
    )
    ON CONFLICT (workspace_id, provider_key) DO UPDATE SET
        secret_ciphertext = EXCLUDED.secret_ciphertext,
        secret_nonce = EXCLUDED.secret_nonce,
        secret_hint = EXCLUDED.secret_hint,
        key_version = EXCLUDED.key_version,
        created_by = EXCLUDED.created_by,
        rotated_at = now()
    RETURNING * INTO stored;

    INSERT INTO public.audit_events (organization_id, workspace_id, actor_id, action, target_type, target_id, after_summary)
    VALUES (
        workspace_organization_id,
        target_workspace_id,
        actor,
        'integration.credential_rotated',
        'integration_credential',
        stored.id,
        jsonb_build_object('provider_key', stored.provider_key, 'secret_hint', stored.secret_hint, 'key_version', stored.key_version)
    );

    RETURN jsonb_build_object(
        'provider_key', stored.provider_key,
        'secret_hint', stored.secret_hint,
        'key_version', stored.key_version,
        'rotated_at', stored.rotated_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_integration_credential_metadata(target_workspace_id UUID)
RETURNS TABLE(provider_key TEXT, secret_hint TEXT, key_version INTEGER, rotated_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT credential.provider_key, credential.secret_hint, credential.key_version, credential.rotated_at
    FROM public.integration_credentials credential
    WHERE credential.workspace_id = target_workspace_id
      AND public.has_workspace_permission(target_workspace_id, 'integration:manage')
    ORDER BY credential.provider_key;
$$;

CREATE OR REPLACE FUNCTION public.delete_integration_credential(target_workspace_id UUID, target_provider_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor UUID := (SELECT auth.uid());
    workspace_organization_id UUID;
    deleted_id UUID;
BEGIN
    IF NOT public.has_workspace_permission(target_workspace_id, 'integration:manage') THEN
        RAISE EXCEPTION 'integration management permission required' USING ERRCODE = '42501';
    END IF;

    SELECT organization_id INTO workspace_organization_id FROM public.workspaces WHERE id = target_workspace_id;
    DELETE FROM public.integration_credentials
    WHERE workspace_id = target_workspace_id AND provider_key = lower(target_provider_key)
    RETURNING id INTO deleted_id;

    IF deleted_id IS NULL THEN
        RETURN false;
    END IF;

    INSERT INTO public.audit_events (organization_id, workspace_id, actor_id, action, target_type, target_id, after_summary)
    VALUES (
        workspace_organization_id,
        target_workspace_id,
        actor,
        'integration.credential_removed',
        'integration_credential',
        deleted_id,
        jsonb_build_object('provider_key', lower(target_provider_key))
    );
    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_with_workspace(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_workspace(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_team(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_workspace(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team(UUID, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.upsert_integration_credential(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_integration_credential_metadata(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_integration_credential(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_integration_credential(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_integration_credential_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_integration_credential(UUID, TEXT) TO authenticated;

ALTER TABLE public.appsec_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appsec_permissions_read ON public.appsec_permissions;
CREATE POLICY appsec_permissions_read ON public.appsec_permissions FOR SELECT TO authenticated USING (key IS NOT NULL);
DROP POLICY IF EXISTS workspace_roles_read ON public.workspace_roles;
CREATE POLICY workspace_roles_read ON public.workspace_roles FOR SELECT TO authenticated USING (key IS NOT NULL);
DROP POLICY IF EXISTS workspace_role_permissions_read ON public.workspace_role_permissions;
CREATE POLICY workspace_role_permissions_read ON public.workspace_role_permissions FOR SELECT TO authenticated
USING (role_key IS NOT NULL AND permission_key IS NOT NULL);

DROP POLICY IF EXISTS organizations_member_read ON public.organizations;
CREATE POLICY organizations_member_read ON public.organizations FOR SELECT TO authenticated
USING (public.is_organization_member(id));
DROP POLICY IF EXISTS organizations_admin_update ON public.organizations;
CREATE POLICY organizations_admin_update ON public.organizations FOR UPDATE TO authenticated
USING (public.is_organization_administrator(id)) WITH CHECK (public.is_organization_administrator(id));

DROP POLICY IF EXISTS organization_members_member_read ON public.organization_members;
CREATE POLICY organization_members_member_read ON public.organization_members FOR SELECT TO authenticated
USING (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS organization_members_admin_manage ON public.organization_members;
CREATE POLICY organization_members_admin_manage ON public.organization_members FOR ALL TO authenticated
USING (public.is_organization_administrator(organization_id))
WITH CHECK (public.is_organization_administrator(organization_id));

DROP POLICY IF EXISTS workspaces_member_read ON public.workspaces;
CREATE POLICY workspaces_member_read ON public.workspaces FOR SELECT TO authenticated
USING (public.is_workspace_member(id));
DROP POLICY IF EXISTS workspaces_admin_update ON public.workspaces;
CREATE POLICY workspaces_admin_update ON public.workspaces FOR UPDATE TO authenticated
USING (public.has_workspace_permission(id, 'workspace:manage'))
WITH CHECK (public.has_workspace_permission(id, 'workspace:manage'));

DROP POLICY IF EXISTS workspace_members_member_read ON public.workspace_members;
CREATE POLICY workspace_members_member_read ON public.workspace_members FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS workspace_members_admin_manage ON public.workspace_members;
CREATE POLICY workspace_members_admin_manage ON public.workspace_members FOR ALL TO authenticated
USING (public.has_workspace_permission(workspace_id, 'workspace:manage'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'workspace:manage'));

DROP POLICY IF EXISTS teams_member_read ON public.teams;
CREATE POLICY teams_member_read ON public.teams FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS teams_manager_write ON public.teams;
CREATE POLICY teams_manager_write ON public.teams FOR ALL TO authenticated
USING (public.has_workspace_permission(workspace_id, 'team:manage'))
WITH CHECK (public.has_workspace_permission(workspace_id, 'team:manage'));

DROP POLICY IF EXISTS team_members_workspace_read ON public.team_members;
CREATE POLICY team_members_workspace_read ON public.team_members FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.teams team
    WHERE team.id = team_members.team_id
      AND public.is_workspace_member(team.workspace_id)
));
DROP POLICY IF EXISTS team_members_manager_write ON public.team_members;
CREATE POLICY team_members_manager_write ON public.team_members FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.teams team
    WHERE team.id = team_members.team_id
      AND public.has_workspace_permission(team.workspace_id, 'team:manage')
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.teams team
    WHERE team.id = team_members.team_id
      AND public.has_workspace_permission(team.workspace_id, 'team:manage')
));

DROP POLICY IF EXISTS audit_events_authorized_read ON public.audit_events;
CREATE POLICY audit_events_authorized_read ON public.audit_events FOR SELECT TO authenticated
USING (
    (workspace_id IS NOT NULL AND public.has_workspace_permission(workspace_id, 'audit:read'))
    OR public.is_organization_administrator(organization_id)
);

REVOKE INSERT, UPDATE, DELETE ON public.audit_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.appsec_permissions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.workspace_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.workspace_role_permissions FROM authenticated;
REVOKE ALL ON public.integration_credentials FROM authenticated;

CREATE OR REPLACE FUNCTION public.prevent_audit_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'audit events are append-only' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_immutable ON public.audit_events;
CREATE TRIGGER audit_events_immutable
BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();

COMMENT ON TABLE public.audit_events IS 'Append-only tenant audit history. Writes occur through trusted transactional functions and internal services.';
COMMENT ON FUNCTION public.has_workspace_permission(UUID, TEXT) IS 'Authoritative workspace permission check for RLS and backend authorization.';
