-- =============================================================================
-- Migration: 20260705000700_user_profiles.sql
-- Fix public.users table to work with Supabase Auth:
--   1. Link public.users.id → auth.users.id
--   2. Add role column (used by AuthContext for RBAC)
--   3. Add missing columns (avatar_url, full_name)
--   4. Enable RLS so users can read/write their own profile
--   5. Auto-create a profile row when a new auth user signs up
--   6. Bootstrap: first user automatically gets Administrator role
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Expand public.users to link with auth.users and add role column
-- ---------------------------------------------------------------------------

-- Add role column (the critical one AuthContext queries)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50)
    DEFAULT 'Read Only'
    CHECK (role IN ('Administrator', 'SOC Analyst', 'Incident Responder', 'Threat Hunter', 'Read Only'));

-- Add display name / avatar for profile UI
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name   VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url  TEXT;

-- ---------------------------------------------------------------------------
-- 2. Enable Row Level Security on public.users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.users FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Users can update their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.users FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Service role (backend) can read all profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can read all users' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Service role can read all users"
      ON public.users FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

-- Service role can insert profiles (used by trigger)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert users' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Service role can insert users"
      ON public.users FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Trigger: auto-create a public.users profile on auth.users sign-up
--    First user gets Administrator, all subsequent get Read Only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  user_count INT;
  assigned_role VARCHAR(50);
BEGIN
  -- Count existing users to determine if this is the first one
  SELECT COUNT(*) INTO user_count FROM public.users;

  IF user_count = 0 THEN
    assigned_role := 'Administrator';
  ELSE
    assigned_role := 'Read Only';
  END IF;

  INSERT INTO public.users (id, email, name, full_name, avatar_url, role, status, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    assigned_role,
    'Active',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (guarded)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Backfill: create public.users rows for any existing auth users
--    who signed up before this migration ran
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, email, name, role, status, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  CASE
    WHEN (SELECT COUNT(*) FROM public.users) = 0 THEN 'Administrator'
    ELSE 'Read Only'
  END,
  'Active',
  au.created_at,
  now()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- First backfilled user should be Administrator
UPDATE public.users
SET role = 'Administrator'
WHERE id = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1)
  AND role = 'Read Only';

-- ---------------------------------------------------------------------------
-- 5. Index for fast profile lookup
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_id    ON public.users (id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON public.users (role);
