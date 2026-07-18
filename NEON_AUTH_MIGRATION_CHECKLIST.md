# Neon Auth Migration Checklist

Starting commit: `e7bf8a3`

## Active Clerk inventory

| Area | Clerk dependency | Neon Auth replacement |
| --- | --- | --- |
| Frontend package | `@clerk/clerk-react` | Pinned `@neondatabase/auth` and `@neondatabase/auth-ui` packages |
| React provider | `ClerkProvider` | `NeonAuthUIProvider` around a provider-neutral ThreatStream context |
| Session hooks | `useAuth`, `useUser`, `useClerk` | Neon Auth React adapter and `useSession` |
| Sign-in and sign-up | Clerk modal methods | Neon Auth UI routes and forms |
| API token | Clerk `getToken()` | Neon Auth SDK `getJWTToken()` bearer token |
| Frontend configuration | `VITE_CLERK_PUBLISHABLE_KEY` | Branch-specific `VITE_NEON_AUTH_URL` |
| Backend issuer | `CLERK_JWT_ISSUER` | Branch-specific `NEON_AUTH_ISSUER` |
| Backend keys | `CLERK_JWKS_URL` | Branch-specific `NEON_AUTH_JWKS_URL` |
| Backend verifier | Clerk-specific RS256 and `azp` checks | Provider-neutral JWT verification against explicit issuer, JWKS, and allowed algorithms |
| Local identity | Provider `clerk` | Provider `neon_auth` while retaining `(provider, issuer, subject)` uniqueness |
| Test fixtures | Clerk claim fixtures | Deterministic Neon Auth JWT/JWKS fixtures |
| Documentation | Clerk setup and migration language | Hosted Neon Auth setup and portability boundary |

## Architectural decisions

- Neon Auth performs authentication only.
- ThreatStream PostgreSQL remains authoritative for organizations, workspaces, teams, memberships, roles, and permissions.
- The frontend obtains the authenticated session JWT through the official SDK and sends it to FastAPI as a bearer token.
- The frontend never accesses PostgreSQL or the Neon Data API.
- FastAPI validates signatures and claims against the configured branch-specific issuer and JWKS endpoint.
- The backend normalizes verified identities into an `AuthenticatedPrincipal`; domain code does not parse provider tokens.
- Alembic manages only ThreatStream-owned tables and explicitly excludes the managed `neon_auth` schema.
- Authentication alone creates no organization or workspace membership.
- Managed Neon Auth is a hosted dependency; the local identity boundary remains compatible with a future Better Auth or generic OIDC adapter.

## Completion gates

- [ ] Clerk package and active references removed.
- [ ] Neon Auth frontend session, sign-in, sign-up, sign-out, and restoration implemented.
- [ ] FastAPI Neon Auth JWT validation implemented and security-tested.
- [ ] Local identity resolution is idempotent and provider-neutral.
- [ ] Existing authorization, onboarding, audit, and credential encryption tests pass.
- [ ] Alembic excludes the `neon_auth` schema.
- [ ] Backend tests, frontend tests, and production build pass.
- [ ] Intended Neon development branch is confirmed without printing secrets.
- [ ] Real Neon migration reaches `20260718_0001`.
- [ ] Real sign-up, sign-in, restoration, onboarding, and cross-tenant checks pass.
- [ ] `repomix-output.xml` remains untouched and untracked.
- [ ] Phase 3 remains unstarted.
