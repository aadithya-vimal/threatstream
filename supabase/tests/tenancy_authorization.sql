-- Phase 2 tenancy authorization regression checks.
-- Run against a disposable local Supabase database after migrations.
BEGIN;

DO $$
DECLARE
    permission_count INTEGER;
    role_count INTEGER;
BEGIN
    SELECT count(*) INTO permission_count FROM public.appsec_permissions;
    IF permission_count < 27 THEN
        RAISE EXCEPTION 'permission catalog incomplete: %', permission_count;
    END IF;

    SELECT count(*) INTO role_count FROM public.workspace_roles;
    IF role_count < 6 THEN
        RAISE EXCEPTION 'workspace role catalog incomplete: %', role_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'organizations'
          AND policyname = 'organizations_member_read'
    ) THEN
        RAISE EXCEPTION 'organization tenant policy missing';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'audit_events'
          AND grantee = 'authenticated'
          AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
    ) THEN
        RAISE EXCEPTION 'authenticated role can mutate audit events';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'integration_credentials'
          AND grantee = 'authenticated'
    ) THEN
        RAISE EXCEPTION 'authenticated role has direct credential-table access';
    END IF;
END;
$$;

ROLLBACK;
