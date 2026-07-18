# Neon and Clerk Migration Report

## Summary

- Starting commit: `2020dc2`
- Branch: `main`
- Architecture before: React authentication and direct provider access, FastAPI PostgREST/RPC access, provider-managed migrations and authorization policies.
- Architecture after: React with Clerk, FastAPI-owned authorization, SQLAlchemy async repositories, Alembic, and provider-neutral PostgreSQL targeting Neon Cloud.

## Supabase removal inventory

The retired provider was present in frontend authentication, API token retrieval, realtime notifications, browser repositories, backend service-role modules, REST tenancy access, readiness checks, migration tooling, dependencies, and documentation. Those active dependencies were removed; no compatibility layer remains.

## Database models

`users`, `external_identities`, `appsec_permissions`, `workspace_roles`, `workspace_role_permissions`, `organizations`, `organization_members`, `workspaces`, `workspace_members`, `teams`, `team_members`, `audit_events`, and `integration_credentials`.

Canonical revision: `20260718_0001`.

## Clerk integration

Clerk JWTs require RS256 signatures, configured issuer, expiration, not-before, optional audience, and optional authorized-party validation. JWKS keys are cached with bounded lifetime and refreshed for unknown key IDs. Clerk subjects map transactionally to local users and never receive tenancy permissions automatically.

## Authorization

ThreatStream PostgreSQL is authoritative for membership, roles, and permission grants. Queries enforce object-level organization/workspace scope in FastAPI repositories. Clerk roles or organizations are not canonical.

## Environment variables

Required database variables are `DATABASE_URL` and optionally `DATABASE_URL_DIRECT`. Authentication uses `CLERK_JWT_ISSUER`, `CLERK_JWKS_URL`, optional `CLERK_AUDIENCE`, optional `CLERK_AUTHORIZED_PARTY`, and frontend-only `VITE_CLERK_PUBLISHABLE_KEY`. Encryption uses `CREDENTIAL_ENCRYPTION_KEY` and `CREDENTIAL_KEY_VERSION`.

## Verification results

- Python compilation: passed.
- Alembic offline PostgreSQL rendering: passed.
- Backend tests: passed locally.
- Frontend tests: passed locally.
- Frontend production build: passed locally.
- Neon migration: pending locally configured database URLs.
- Health: verified by tests.
- Readiness against Neon: pending database configuration.
- Cross-tenant PostgreSQL test: pending isolated database.
- Onboarding, audit persistence, and encrypted credential persistence: pending clean database deployment.

## Remaining limitations

Generic OIDC is not implemented. Clerk is the current hosted authentication provider. Standard PostgreSQL remains the database contract for self-hosting. Phase 3 was not started. `repomix-output.xml` was untouched and remains untracked.
