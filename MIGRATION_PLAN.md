# Migration Plan

## Phase 2 operationalization

- [x] Inventory previous provider dependencies.
- [x] Add SQLAlchemy 2.0 async engine and sessions.
- [x] Model Phase 2 tenancy and local identities.
- [x] Create explicit canonical Alembic migration.
- [x] Replace REST/RPC data access with repositories.
- [x] Replace browser authentication with the Neon Auth React/Vite SDK.
- [x] Replace Clerk JWT validation with Neon Auth issuer/JWKS validation.
- [x] Exclude Neon Auth-managed schema objects from Alembic.
- [x] Remove browser database access and inactive privileged-client modules.
- [x] Remove the previous active migration system and dependencies.
- [x] Add PostgreSQL readiness checks.
- [ ] Apply migration to a confirmed clean Neon database.
- [ ] Validate real Neon Auth sign-up, sign-in, sign-out, and restoration.
- [ ] Validate constraints, tenant isolation, onboarding, audit persistence, and credential persistence.

## Gate

Do not begin Phase 3 until every unchecked Phase 2 item passes. Database and Neon Auth values must be set locally and never pasted into chat or committed.
