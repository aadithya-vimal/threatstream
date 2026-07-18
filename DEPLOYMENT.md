# Deployment

## Neon database

1. Create a Neon project, database, and branch.
2. Copy the pooled connection URL into `DATABASE_URL`.
3. Copy the direct connection URL into `DATABASE_URL_DIRECT`.
4. Confirm variable presence without echoing values.
5. Run `python -m alembic upgrade head` from `backend`.
6. Run `python -m alembic current` and confirm `20260718_0001`.

```powershell
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is not set" }
if (-not $env:DATABASE_URL_DIRECT) { throw "DATABASE_URL_DIRECT is not set" }
cd C:\Users\aadit\OneDrive\Desktop\threatstream\backend
python -m alembic upgrade head
python -m alembic current
```

## Neon Auth

1. Select the same intended development branch used for the database URLs.
2. Enable the current branchable Neon Auth implementation from the branch's Auth page.
3. Add `http://localhost:5173` as a trusted frontend origin.
4. Copy the branch Auth URL into frontend-only `VITE_NEON_AUTH_URL`.
5. Copy the branch issuer and JWKS URL into backend-only `NEON_AUTH_ISSUER` and `NEON_AUTH_JWKS_URL`.
6. Set `NEON_AUTH_AUDIENCE` only when the issued token contains an audience that must be enforced.
7. Confirm the database URLs, Auth URL, issuer, and JWKS configuration are displayed for the same development branch before migration.

Do not paste values into chat, expose backend Auth configuration through Vite, enable the Neon Data API for this application, or configure the obsolete Stack Auth-based Neon Auth product.

## Runtime checks

- `GET /health` verifies API process liveness and does not require dependencies.
- `GET /ready` executes a safe PostgreSQL query and returns `503` when unavailable.
- Responses never expose connection strings or raw database exceptions.

## Self-hosting

Use a standard PostgreSQL connection URL and run the same Alembic migration. ThreatStream Cloud uses managed Neon Auth, which is tied to Neon. Generic OIDC and self-hosted Better Auth adapters are planned but not implemented.
