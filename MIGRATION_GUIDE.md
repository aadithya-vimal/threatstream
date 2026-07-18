# Infrastructure Migration Guide

The Phase 2 schema was never deployed to the previous hosted database, so no record export/import is expected. Alembic revision `20260718_0001` is the canonical initial Phase 2 schema.

## Required local configuration

Set these without sharing values in chat:

```powershell
$env:DATABASE_URL="<pooled PostgreSQL URL>"
$env:DATABASE_URL_DIRECT="<direct PostgreSQL URL>"
$env:CLERK_JWT_ISSUER="<issuer>"
$env:CLERK_JWKS_URL="<JWKS URL>"
$env:CLERK_AUDIENCE="threatstream"
$env:CLERK_AUTHORIZED_PARTY="http://localhost:5173"
$env:VITE_CLERK_PUBLISHABLE_KEY="<publishable key>"
```

## Validation sequence

1. Confirm the target is an empty or disposable database.
2. Run `python -m alembic upgrade head`.
3. Run `python -m alembic current`.
4. Start FastAPI and verify `/health` and `/ready`.
5. Authenticate through Clerk.
6. Complete first-organization onboarding.
7. Verify audit and encrypted credential persistence.
8. Run cross-tenant denial tests against an isolated test database.

Stop if existing persistent tenancy data is discovered. Inventory and plan an explicit migration rather than overwriting either database.
