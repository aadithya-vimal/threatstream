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

## Integration credential boundary

The backend owns one canonical safe provider registry. It allowlists provider IDs and credential field schemas; the frontend renders those schemas but cannot invent providers or fields. Credentials follow `authenticated user → organization → workspace → permission → encrypted integration credential`.

Credential payloads are serialized, encrypted with AES-256-GCM before persistence, and authenticated with workspace ID plus provider ID as associated data. Only ciphertext, nonce, key version, masked hint, status, safe timestamps, and actor IDs are stored. Decryption happens only immediately before an outbound provider test and fails closed. API responses, logs, exceptions, and audit metadata never contain plaintext. This release supports workspace credentials only, with no environment fallback.

Reads require `workspace:read`; create, update, test, and delete require `integration:manage`. The path workspace is authoritative, mismatched `X-Workspace-ID` values are denied, and repository queries always include `workspace_id`.

## Web application shell

React routes are loaded lazily inside one responsive protected shell. Neon Auth owns authentication UI and session tokens; the tenancy context loads authorized organizations and workspaces, persists only the selected workspace identifier as a device preference, and sends the selected workspace as an API scope header. No credentials or operational records are stored in browser storage.

The overview composes existing tenant-scoped integration, team, and audit reads. Team creation uses `team:manage`; audit reads use `audit:read`. Audit responses deliberately expose a narrow safe projection and exclude before/after summaries, ciphertext, nonces, request headers, and secret payloads.

## Asset inventory boundary

Assets are the canonical workspace-scoped inventory for domains, subdomains, IP addresses, URLs, repositories, cloud accounts, hosts, container images, Kubernetes clusters, and custom identifiers. Type-aware normalization produces a stable identifier and PostgreSQL enforces uniqueness across `workspace_id + asset_type + normalized_identifier`. Manual creation never silently merges duplicates.

Durable tags use normalized workspace records and an association table. Asset mutations use positive optimistic versions and safe field-level audit summaries. `metadata_json` accepts bounded JSON objects with limited nesting; API projections recursively redact secret-like keys and the UI renders values as text rather than HTML. Findings hold an optional `asset_id` with `SET NULL` deletion behavior, while services validate the Asset and Finding share the authoritative workspace. Assets are normally deactivated instead of deleted.

Reads require `asset:read`; creation and ordinary edits require `asset:write`; ownership and activation require `asset:manage`. Organization administrators retain their existing permission bypass.

## Runtime capability model

Integration metadata declares `web_supported`, `desktop_supported`, `requires_local_agent`, and `test_connection`. Runtime mode currently defaults to `web`. This is metadata only: no Electron/Tauri packaging, filesystem access, local command execution, or local agent exists.

## Scanner boundary

The generic scan service resolves typed adapters through a registry and knows nothing about Nuclei command flags or output. Profiles own validated configuration and durable Asset membership; jobs own immutable target snapshots. The web process only commits queued jobs. An independent worker claims due work with PostgreSQL `FOR UPDATE SKIP LOCKED` and an opaque claim token, then renews a time-bounded lease while executing. Every mutation verifies the current worker, token, status, and unexpired lease. Expired leases are recovered as bounded retries or terminal failures, and a partial unique job index prevents multiple active jobs for one profile.

The Nuclei adapter builds subprocess argument arrays from an allowlist, captures stdout/stderr separately, applies bounded time and output, parses JSONL, and redacts secret-like keys. Raw records are immutable except processing state and are never returned directly. A per-job payload hash uniqueness constraint and a per-raw-result occurrence constraint make retries idempotent. Normalized occurrences connect jobs to canonical Findings; fingerprint uniqueness provides idempotent cross-run ingestion.

Scan schedules are workspace-scoped records tied to profiles. Interval and cron inputs are validated centrally, including IANA timezone and minimum-frequency rules. The worker scheduler locks due rows, creates the job and advances the next occurrence in one transaction, records explicit misfire or active-job skips, and uses a schedule/occurrence uniqueness constraint to prevent duplicate dispatch.
