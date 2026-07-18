# Target Architecture

```text
React
  → Neon Auth session JWT
  → FastAPI identity and authorization boundary
  → SQLAlchemy async repositories and services
  → PostgreSQL (Neon hosted, ordinary PostgreSQL self-hosted)
```

## Ownership boundaries

Neon Auth owns sign-in, sign-up, recovery, sessions, and identity-provider connections. ThreatStream owns local users, organizations, workspaces, teams, memberships, roles, permissions, credentials, and audit records. Neon Auth organizations are not part of the canonical tenancy model.

All operational browser requests pass through FastAPI. Every object query must authenticate identity, resolve the local user, enforce membership and permission, scope by organization/workspace, execute transactionally where required, and emit an audit event.

## Product progression

Phase 2 establishes identity and tenancy. Phase 3 may add applications and components only after a clean database migration and cross-tenant validation pass. Later phases add repositories, scans, normalized findings, deployments, runtime correlation, remediation, and verification.

Managed Neon Auth is not claimed as self-hostable. Generic OIDC or self-hosted Better Auth remains a future adapter requirement and is not implemented in Phase 2.
