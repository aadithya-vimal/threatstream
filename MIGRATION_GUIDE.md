# Infrastructure Migration Guide

The Phase 2 schema was never deployed to the previous hosted database, so no record export/import is expected. Alembic revision `20260718_0001` is the canonical initial Phase 2 schema.

## Required local configuration

Set these without sharing values in chat:

```powershell
$env:DATABASE_URL="<pooled PostgreSQL URL>"
$env:DATABASE_URL_DIRECT="<direct PostgreSQL URL>"
$env:VITE_NEON_AUTH_URL="<branch Auth URL>"
$env:NEON_AUTH_ISSUER="<branch issuer>"
$env:NEON_AUTH_JWKS_URL="<branch JWKS URL>"
# Set only when the real token contains the expected audience.
$env:NEON_AUTH_AUDIENCE=""
```

## Validation sequence

1. Confirm every database and Auth value belongs to the same empty or disposable Neon development branch.
2. Confirm the exposed database credential has been rotated if it was ever shared or committed.
3. Run `python -m alembic upgrade head` and confirm revision `20260718_0001`.
4. Confirm the managed `neon_auth` schema exists and Alembic changed only ThreatStream-owned objects.
5. Start FastAPI and verify `/health` and `/ready`.
6. Sign up, sign out, sign in, and refresh through Neon Auth.
7. Confirm exactly one local user and one `neon_auth` external identity exist.
8. Complete first-organization onboarding and workspace selection.
9. Verify audit and encrypted credential persistence.
10. Run cross-tenant denial tests against the isolated branch.

Stop if existing persistent tenancy data is discovered. Inventory and plan an explicit migration rather than overwriting either database.
