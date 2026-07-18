# Target Architecture

```text
React
  → Clerk authentication
  → FastAPI identity and authorization boundary
  → SQLAlchemy async repositories and services
  → PostgreSQL (Neon hosted, ordinary PostgreSQL self-hosted)
```

## Ownership boundaries

Clerk owns sign-in, sign-up, recovery, sessions, and identity-provider connections. ThreatStream owns local users, organizations, workspaces, teams, memberships, roles, permissions, credentials, and audit records.

All operational browser requests pass through FastAPI. Every object query must authenticate identity, resolve the local user, enforce membership and permission, scope by organization/workspace, execute transactionally where required, and emit an audit event.

## Product progression

Phase 2 establishes identity and tenancy. Phase 3 may add applications and components only after a clean database migration and cross-tenant validation pass. Later phases add repositories, scans, normalized findings, deployments, runtime correlation, remediation, and verification.

Generic OIDC remains a self-hosting requirement but is not currently implemented or claimed.
