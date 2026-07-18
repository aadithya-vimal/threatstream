# Architecture

ThreatStream is a layered application-security operations platform.

| Layer | Responsibility |
|---|---|
| React | User experience and API invocation |
| Clerk | Hosted identity authentication |
| FastAPI | Trust boundary, tenancy, authorization, validation, error envelopes |
| Services | Transaction ownership and use-case orchestration |
| Repositories | Typed, tenant-scoped SQLAlchemy queries |
| PostgreSQL | Constraints, relational integrity, audit history, encrypted credential records |
| Alembic | Authoritative schema evolution |

The browser never connects to PostgreSQL. Clerk claims establish external identity only and never grant organization or workspace permissions. Authorization is resolved from local memberships and role-permission grants.

Cloud currently targets Neon PostgreSQL. The application remains compatible with standard PostgreSQL for self-hosting.
