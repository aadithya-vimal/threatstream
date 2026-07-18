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

## Clerk

Configure a Clerk application and set `CLERK_JWT_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE`, `CLERK_AUTHORIZED_PARTY`, and frontend-only `VITE_CLERK_PUBLISHABLE_KEY`. Never expose a Clerk secret key to React.

## Runtime checks

- `GET /health` verifies API process liveness and does not require dependencies.
- `GET /ready` executes a safe PostgreSQL query and returns `503` when unavailable.
- Responses never expose connection strings or raw database exceptions.

## Self-hosting

Use a standard PostgreSQL connection URL and run the same Alembic migration. Generic OIDC is planned but is not implemented; the current hosted identity provider is Clerk.
