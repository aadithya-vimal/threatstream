# API usage guide

FastAPI serves interactive documentation at `/docs` and its OpenAPI document at `/api/v1/openapi.json`. Use those generated resources as the schema authority; this guide records the application-specific access and safety conventions that clients must preserve.

`GET /health` is a dependency-free liveness check. `GET /ready` verifies database reachability and returns `503` when PostgreSQL is unavailable or unconfigured.

## Assets

Asset reads require `asset:read`; creation and ordinary edits require `asset:write`; ownership and activation require `asset:manage`. Every query is constrained by the path workspace and a supplied `X-Workspace-ID` must match it.

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/v1/workspaces/{workspace_id}/assets` | Filtered/paginated inventory or manual creation |
| GET | `/api/v1/workspaces/{workspace_id}/assets/owners` | Active workspace ownership choices |
| GET, PATCH | `/api/v1/workspaces/{workspace_id}/assets/{asset_id}` | Detail or optimistic edit |
| POST | `/api/v1/workspaces/{workspace_id}/assets/{asset_id}/activate` | Reactivate an Asset |
| POST | `/api/v1/workspaces/{workspace_id}/assets/{asset_id}/deactivate` | Soft-deactivate an Asset |
| GET | `/api/v1/workspaces/{workspace_id}/assets/{asset_id}/findings` | Related Findings |

List parameters include repeated `asset_type`, `criticality`, `environment`, and `tag` filters; `active`, `owner_user_id`, `source`, `search`, bounded pagination, sorting, and direction. Duplicate normalized identifiers return `409`; stale versions return `409`. Supported types are `domain`, `subdomain`, `ip_address`, `url`, `repository`, `cloud_account`, `host`, `container_image`, `kubernetes_cluster`, and `custom`.

## Findings

All Findings paths require a Neon Auth bearer token and workspace scope. Reads require `finding:read`; creates, edits, transitions, comments, evidence changes, assignment, and deletion require `finding:triage`. The optional `X-Workspace-ID` header must match the path workspace.

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/v1/workspaces/{workspace_id}/findings` | Filtered/paginated list or create a finding |
| GET | `/api/v1/workspaces/{workspace_id}/findings/assignees` | Active workspace members eligible for assignment |
| GET, PATCH, DELETE | `/api/v1/workspaces/{workspace_id}/findings/{finding_id}` | Detail, optimistic edit, or optimistic deletion |
| POST | `/api/v1/workspaces/{workspace_id}/findings/{finding_id}/transitions` | Perform a validated lifecycle transition |
| POST | `/api/v1/workspaces/{workspace_id}/findings/{finding_id}/comments` | Add durable triage context |
| POST | `/api/v1/workspaces/{workspace_id}/findings/{finding_id}/evidence` | Add text, URL, or code evidence |
| DELETE | `/api/v1/workspaces/{workspace_id}/findings/{finding_id}/evidence/{evidence_id}` | Optimistically remove evidence |

List filters support repeated `status` and `severity` parameters, `assignee_user_id`, `asset_id`, text `search`, `page`, `page_size`, `sort`, and `direction`. Mutable requests carry the last observed positive `version`; stale versions return `409` instead of overwriting newer work.

Lifecycle values are `open`, `acknowledged`, `in_progress`, `resolved`, `closed`, and `reopened`. Resolution or direct closure requires a resolution summary, and reopening requires a note. Every transition is written to both finding activity and the workspace audit log.

## Integration credentials

All paths require a Neon Auth bearer token. `{workspace_id}` is authoritative; when `X-Workspace-ID` is supplied it must match. List and detail require `workspace:read`. Mutations require `integration:manage`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/workspaces/{workspace_id}/integrations` | List the authoritative provider catalog and masked workspace state |
| GET | `/api/v1/workspaces/{workspace_id}/integrations/{provider_id}` | Read one masked integration state |
| PUT | `/api/v1/workspaces/{workspace_id}/integrations/{provider_id}` | Create or replace an encrypted credential payload |
| POST | `/api/v1/workspaces/{workspace_id}/integrations/{provider_id}/test` | Test the stored credential where supported |
| DELETE | `/api/v1/workspaces/{workspace_id}/integrations/{provider_id}` | Delete the encrypted credential |

The only enabled provider is `virustotal`, with one required `api_key` field containing a 64-character hexadecimal key:

```json
{
  "credentials": {
    "api_key": "<entered value>"
  }
}
```

The backend rejects unknown providers, unexpected fields, and invalid formats. A successful PUT returns provider metadata and state such as `configured`, `status`, `masked_hint`, safe timestamps, credential field definitions, and capability metadata. It never echoes `credentials`, ciphertext, nonce, or plaintext.

Test results are normalized to `connected`, `invalid_credentials`, `unreachable`, `rate_limited`, `provider_error`, or `configuration_error`. Unconfigured integrations use `not_configured`; newly saved credentials use `untested`. Provider bodies, headers, internal exceptions, and secrets are never returned.

Successful responses include an `X-Correlation-ID` header. Errors use a stable `error` envelope containing `code`, `message`, and `correlation_id`; clients should not depend on internal exception text.

## Scanner routes

| Method | Path | Permission |
|---|---|---|
| GET | `/api/v1/workspaces/{workspace_id}/scanners` | `scan:read` |
| GET | `/api/v1/workspaces/{workspace_id}/scanners/{scanner_type}/health` | `scan:read` |
| GET/POST | `/api/v1/workspaces/{workspace_id}/scan-profiles` | `scan:read` / `scan:manage` |
| GET/PATCH/DELETE | `/api/v1/workspaces/{workspace_id}/scan-profiles/{profile_id}` | `scan:read` / `scan:manage` |
| POST/DELETE | `/api/v1/workspaces/{workspace_id}/scan-profiles/{profile_id}/targets[/{asset_id}]` | `scan:manage` |
| POST | `/api/v1/workspaces/{workspace_id}/scan-profiles/{profile_id}/run` | `scan:run` |
| GET | `/api/v1/workspaces/{workspace_id}/scan-jobs` | `scan:read` |
| GET | `/api/v1/workspaces/{workspace_id}/scan-jobs/{job_id}` | `scan:read` |
| POST | `/api/v1/workspaces/{workspace_id}/scan-jobs/{job_id}/cancel` | `scan:manage` |
| GET | `/api/v1/workspaces/{workspace_id}/scan-jobs/{job_id}/results` | `scan:read` |
| GET | `/api/v1/workspaces/{workspace_id}/scan-worker/status` | `scan:read` |
| GET/POST | `/api/v1/workspaces/{workspace_id}/scan-schedules` | `scan:read` / `scan:manage` |
| GET/PATCH/DELETE | `/api/v1/workspaces/{workspace_id}/scan-schedules/{schedule_id}` | `scan:read` / `scan:manage` |
| POST | `/api/v1/workspaces/{workspace_id}/scan-schedules/{schedule_id}/enable` | `scan:manage` |
| POST | `/api/v1/workspaces/{workspace_id}/scan-schedules/{schedule_id}/disable` | `scan:manage` |

Job listing supports bounded pagination plus status, scanner, profile, Asset, requester, date, search, and sort filters. The results route exposes hashes and safe summaries only—not raw payload JSON, stderr, local paths, command lines, claim tokens, or worker identifiers. A run returns `202` after committing queue state; unavailable scanners return `503`, and a duplicate active profile run returns `409`. Schedule mutations use optimistic versions and return `409` for stale writes.
