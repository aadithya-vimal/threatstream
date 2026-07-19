# API usage guide

FastAPI serves interactive documentation at `/docs` and its OpenAPI document at `/api/v1/openapi.json`. Use those generated resources as the schema authority; this guide records the application-specific access and safety conventions that clients must preserve.

`GET /health` is a dependency-free liveness check. `GET /ready` verifies database reachability and returns `503` when PostgreSQL is unavailable or unconfigured.

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
