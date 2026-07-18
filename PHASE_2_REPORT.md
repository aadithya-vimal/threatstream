# Phase 2 Delivery Report

Report date: 2026-07-18

## Phase objective

Establish organizations, workspaces, teams, memberships, explicit permissions, tenant-safe RLS, backend authorization, secure integration-credential storage, workspace selection, and append-only audit foundations before application data is introduced.

## Existing implementation inspected

- Supabase Auth session handling and static frontend SOC role mapping.
- Backend HS256 JWT parsing and authenticated-only dependencies.
- Global service-role Supabase client usage in user-facing routes.
- Legacy job, scheduler, plugin, malware, and telemetry APIs.
- Existing SOC role/profile migration and broad authenticated RLS policies.
- Frontend API wrapper, protected route, layout, top bar, and overview.

## Files changed

### Database

- `supabase/migrations/20260718000000_tenancy_authorization.sql`
- `supabase/tests/tenancy_authorization.sql`

### Backend

- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/app/core/errors.py`
- `backend/app/core/credentials.py`
- `backend/app/database/rest_client.py`
- `backend/app/api/dependencies/tenancy.py`
- `backend/app/api/routes/tenancy.py`
- `backend/app/domains/tenancy/schemas.py`
- `backend/app/domains/tenancy/service.py`
- Package initialization files for the new bounded domains.
- `backend/tests/test_tenancy_security.py`

### Frontend

- `src/contexts/AuthContext.jsx`
- `src/contexts/TenancyContext.jsx`
- `src/lib/api.js`
- `src/App.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/components/Topbar.jsx`
- `src/pages/Dashboard.jsx`

### Configuration and documentation

- `.env.example`
- `README.md`

## Database changes

- Added organizations, organization memberships, workspaces, workspace memberships, teams, team memberships, permission definitions, workspace roles, role grants, integration credentials, and audit events.
- Added authoritative `is_organization_member`, `is_organization_administrator`, `is_workspace_member`, and `has_workspace_permission` functions.
- Added transactional RPCs for organization/workspace bootstrap, workspace creation, team creation, credential rotation, credential metadata listing, and credential removal.
- Added tenant indexes and explicit RLS policies.
- Made audit events append-only.
- Revoked authenticated users' direct access to encrypted credential rows.
- Kept legacy tables unchanged and inactive.

## API changes

- Active API surface now contains tenancy routes plus liveness/readiness endpoints only.
- Removed legacy job, plugin, scheduler, malware, and telemetry routers from registration.
- Added audience and issuer validation for Supabase JWTs.
- Added request correlation IDs and stable error envelopes.
- Added request-scoped PostgREST access using the user's bearer token and anon key.
- Added backend permission dependencies for workspace and organization operations.
- Added encrypted credential write, metadata-list, and delete endpoints.

## UI changes

- Removed static frontend SOC roles and permission maps.
- Added server-backed tenant context.
- Added atomic first-organization and first-workspace onboarding.
- Added persistent workspace selection in the top bar.
- Added explicit tenant-loading, unavailable, empty, and configured states.
- Added visible correlation IDs when tenant API calls fail.

## Security controls added

- Organization/workspace RLS predicates.
- Backend permission checks independent of frontend state.
- AES-256-GCM credential encryption with workspace/provider-bound associated data.
- Masked credential metadata; no secret-read endpoint.
- Credential key versioning foundation.
- Immutable audit-event trigger.
- Generic authentication errors without JWT decoder details.
- Explicit CORS methods and headers.
- User-facing API no longer uses the service-role database client.

## Tests added

- Valid Supabase JWT decoding.
- Generic rejection of invalid JWTs.
- Correlation IDs in error responses.
- Legacy API route removal.
- Workspace permission denial.
- Tenant context membership-role mapping.
- Credential encryption/decryption and associated-data binding.
- Credential route registration.
- SQL assertions for permission/role catalogs, tenant policy presence, audit immutability grants, and credential-table isolation.
- Frontend tenant loading, empty-state, failure-state, and workspace persistence tests.

## Commands and results

| Command | Result |
|---|---|
| `npm run build` | Pass; 101 modules, 445.44 KB main bundle |
| `python -m compileall app` | Pass |
| `$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'; python -m pytest -q` | Pass; 9 tests, 3 legacy worker deprecation warnings |
| `npm test` | Pass; 3 frontend tenancy-context tests |
| `npm audit --omit=dev` | Pass; zero production dependency vulnerabilities |
| `npm audit` | Two development-tool advisories remain; remediation requires a breaking Vite 8 upgrade |
| FastAPI route inventory | Pass; only tenancy, health, readiness, and documentation routes active |
| `supabase status` | Blocked; Docker engine was not running |
| Docker Desktop startup and `docker info` | Blocked; local engine returned HTTP 500 for API versions 1.54 and 1.51 |
| `supabase db push --dry-run --include-all` | Blocked; remote login-role creation timed out and `SUPABASE_DB_PASSWORD` is not configured |

## Known limitations

1. The migration has not been executed against a clean or existing database because no working local Docker engine or remote database password was available.
2. Phase 2 cannot be declared operational in the deployed Supabase project until migration and RLS tests pass there.
3. Existing SOC tables retain broad historical RLS policies, but active API routes no longer expose them.
4. Credential decryption is intentionally internal-only; worker-scoped retrieval will be added with the dedicated worker.
5. Organization membership invitation and role-management UIs are not yet exposed.
6. The frontend still has no configured lint or typecheck command.

## Remaining risks

- Migration compatibility with existing remote development data is unverified.
- Supabase projects configured for asymmetric JWT signing require a JWKS validation path before deployment.
- The encryption key needs production secret-manager storage, backup, and rotation procedures.
- Denied authorization attempts are logged by the API but are not yet persisted as audit events.

## Next phase

Do not begin Phase 3 until the Phase 2 migration is applied to a disposable database, the SQL authorization test passes, and cross-tenant behavior is verified with two real test users. After that gate, Phase 3 adds Applications, Components, ownership, relationships, and the application timeline foundation.
