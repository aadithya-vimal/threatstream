# Architecture

ThreatStream is a layered application-security operations platform.

| Layer | Responsibility |
|---|---|
| React | User experience and API invocation |
| Neon Auth | Hosted, branchable identity authentication |
| FastAPI | Trust boundary, tenancy, authorization, validation, error envelopes |
| Services | Transaction ownership and use-case orchestration |
| Repositories | Typed, tenant-scoped SQLAlchemy queries |
| PostgreSQL | Constraints, relational integrity, audit history, encrypted credential records |
| Alembic | Authoritative schema evolution |

The browser never connects to PostgreSQL and does not use the Neon Data API. A Neon Auth session JWT establishes external identity only and never grants organization or workspace permissions. FastAPI normalizes verified claims into an `AuthenticatedPrincipal`; authorization is resolved from local memberships and role-permission grants.

ThreatStream Cloud uses managed Neon Auth and Neon PostgreSQL. The database and authorization layers remain standard PostgreSQL. Managed Neon Auth is tied to Neon; a future self-hosted authentication adapter may use Better Auth or generic OIDC without changing domain ownership.
