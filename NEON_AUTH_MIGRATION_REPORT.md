# Neon Auth Migration Report

Report date: 2026-07-18

## Scope

| Item | Result |
|---|---|
| Starting commit | `e7bf8a3` |
| Implementation ending commit | `a8c8909` |
| Branch | `main` |
| Phase | Phase 2 operationalization only; Phase 3 not started |
| Neon Auth package | `@neondatabase/auth` `0.4.2-beta` |
| Neon Auth UI package | `@neondatabase/auth-ui` `0.2.1-beta` |
| Transport | SDK-managed session with server-issued JWT sent to FastAPI as a bearer token |
| Operational data path | React to FastAPI to SQLAlchemy async to PostgreSQL; no browser database or Neon Data API access |

## Clerk removal inventory

Removed active Clerk package dependencies, React providers and hooks, modal methods, frontend environment configuration, backend issuer/JWKS/audience/authorized-party settings, RS256-only Clerk claim assumptions, local identity provider values, test fixtures, and active setup instructions. `NEON_AUTH_MIGRATION_CHECKLIST.md` records the file-level replacement plan.

## Authentication boundary

The React provider uses the official Neon Auth React adapter for session restoration and the official Auth UI for sign-in, sign-up, recovery, and verification routes. Tokens are never written to application-managed local storage.

FastAPI accepts the SDK session JWT only through the Authorization bearer header. Verification requires a configured branch issuer and JWKS endpoint, a non-empty key ID, an explicitly allowed asymmetric algorithm, a signing JWK, valid signature, expiration, issuer, subject, not-before when present, and audience when configured. JWKS requests have a bounded timeout and cache, and an unknown key triggers one refresh before failure.

Verified claims are normalized into `AuthenticatedPrincipal`. Domain authorization code receives the local ThreatStream user UUID and never parses Neon SDK types or raw tokens.

## Identity and authorization

`users` remains the application identity. `external_identities` links `provider = neon_auth`, branch issuer, and token subject under the existing unique constraint. Unit tests verify repeated resolution creates one local user and one external identity. Authentication creates no organization, workspace, team, membership, role, or permission grant.

ThreatStream PostgreSQL remains authoritative for all tenancy and authorization. Neon Auth organizations are unused. Managed Auth credentials, sessions, passwords, OAuth records, and verification tokens are not duplicated into ThreatStream tables.

## Database and Alembic

Canonical ThreatStream revision: `20260718_0001`.

Alembic includes only the default/`public` ThreatStream schema. A tested filter excludes the managed `neon_auth` schema from inspection and autogeneration. No new ThreatStream migration was necessary because the local identity mapping was already provider-neutral.

## Environment contract

| Variable | Scope |
|---|---|
| `DATABASE_URL` | Backend pooled PostgreSQL runtime |
| `DATABASE_URL_DIRECT` | Backend direct Alembic connection |
| `VITE_NEON_AUTH_URL` | Frontend branch Auth endpoint |
| `NEON_AUTH_ISSUER` | Backend trusted token issuer |
| `NEON_AUTH_JWKS_URL` | Backend trusted signing-key endpoint |
| `NEON_AUTH_AUDIENCE` | Optional backend expected audience |
| `CREDENTIAL_ENCRYPTION_KEY` | Backend-only credential encryption key |

All real values must be configured locally and must refer to the same intended Neon development branch. The previously exposed database password must be rotated before hosted validation.

## Verification results

| Gate | Result |
|---|---|
| Python compilation | Passed |
| Backend deterministic tests | 18 passed |
| Frontend deterministic tests | 7 passed |
| Frontend production build | Passed |
| Production dependency audit | Blocked: current official Neon Auth betas pin vulnerable Better Auth versions |
| Alembic offline PostgreSQL rendering | Passed |
| Neon Auth invalid signature, issuer, audience, expiry, subject, algorithm, unknown-key, timeout | Passed |
| Idempotent local identity mapping | Passed |
| Authentication grants no tenancy | Passed |
| Alembic excludes `neon_auth` | Passed |
| Real Neon migration | Pending local rotated database URLs |
| Real sign-up/sign-in/sign-out/restoration | Pending branch Auth provisioning |
| Real local identity persistence | Pending hosted authentication |
| Real onboarding and workspace selection | Pending hosted authentication and migration |
| Real cross-tenant isolation | Pending isolated Neon branch |
| Real audit persistence | Pending isolated Neon branch |
| Real credential ciphertext persistence | Pending isolated Neon branch |
| `/health` | Covered locally; live process check pending final hosted run |
| `/ready` against Neon | Pending database configuration |

## Provider eradication

Active Clerk implementation and dependencies are removed. ThreatStream has no direct Supabase code or manifest dependency. The official Neon Auth package currently includes `@supabase/auth-js` as an internal transitive migration adapter; ThreatStream does not import or configure it. Historical removal reports may name retired providers for auditability.

## Portability and limitations

ThreatStream Cloud uses managed Neon Auth, which is tied to Neon and is not described as self-hostable. The provider-neutral principal and external identity mapping preserve a future path to self-hosted Better Auth or generic OIDC, but neither adapter is implemented in this phase.

The latest official packages available during this migration pin Better Auth `1.4.18`. The production audit reports advisories including a critical issue affecting optional server plugins. Forcing Better Auth `1.6.23` was tested and rejected because it breaks the official Neon Auth UI bundle API. The application must not be declared production-ready until Neon publishes a compatible patched SDK, even though ThreatStream uses the managed Neon server and only the browser client bundle.

Phase 2 is locally code-verified but not operationally complete until every pending hosted gate above passes. `repomix-output.xml` was not modified and remains untracked.
