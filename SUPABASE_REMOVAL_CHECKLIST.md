# Supabase Removal Checklist

Baseline: `main` at `2020dc2`, synchronized with `origin/main`. `repomix-output.xml` is untracked and must remain untouched.

## Active dependencies found

- Backend configuration contains Supabase URL, anonymous key, service-role key, and JWT settings.
- Backend authentication validates Supabase HS256 access tokens.
- Backend tenancy access uses a bearer-scoped PostgREST client and database RPC functions.
- API readiness checks the Supabase REST endpoint.
- Frontend authentication, API token retrieval, and notifications use the Supabase browser client.
- The dependency manifests include Supabase Python and JavaScript packages.
- The active migration system is the top-level `supabase/` directory.

## Archived or inactive dependencies found

- Legacy repositories directly query SOC-era tables, storage, and realtime.
- Legacy pages directly query alerts, telemetry, vulnerabilities, and reports.
- Legacy administration and product copy names Supabase as the database provider.
- Historical SOC migrations contain provider-specific Auth, Storage, RLS, and service-role behavior.

## Required disposition

- Replace active persistence with SQLAlchemy async sessions and Alembic.
- Replace identity authentication with Clerk JWT verification and local identity mapping.
- Keep authorization, tenancy, audit, and credentials application-owned.
- Remove inactive direct-database modules rather than preserving a compatibility layer.
- Remove the active top-level provider migration/configuration system after canonical schema extraction.
- Update all operator and architecture documentation.
- Validate against a clean PostgreSQL/Neon database before declaring completion.
