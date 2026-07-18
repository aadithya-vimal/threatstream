# ThreatStream Target Architecture

## Product boundary

ThreatStream is an open-source, self-hostable Application Security Operations platform. Its canonical flow is:

`Application → Component → Finding or Runtime Event → Evidence → Owner → Remediation → Verification`

External scanners and providers produce evidence. ThreatStream owns attribution, deduplication, development-to-runtime context, remediation state, verification, authorization, and auditability.

## Bounded domains

| Domain | Responsibility | Primary objects |
|---|---|---|
| Identity and tenancy | Tenant boundaries, membership, roles, permissions | Organization, Workspace, Team, Membership, Role |
| Applications | Application inventory, ownership, criticality | Application, Component, Relationship |
| Repositories | Source-control metadata and application mapping | Repository, Branch, Commit, Pull Request |
| Integrations | Provider lifecycle and encrypted credentials | Integration, Credential, Installation, Webhook |
| Scans | Policies, queued execution, provenance, artifacts | Scan Policy, Scan Run, Scan Artifact, SBOM |
| Findings | Canonical finding model and occurrences | Finding, Finding Occurrence, Fingerprint, Relationship |
| Deployments | Runtime placement of code and artifacts | Environment, Deployment, Endpoint, Workload |
| Runtime | Authenticated security-event ingestion | Runtime Source, Runtime Event, Alert |
| Correlation | Deterministic, explainable object relationships | Correlation, Method, Confidence, Evidence |
| Remediation | Assignment, triage, resolution, verification | Remediation Item, Link, Case, Verification |
| Evidence | Immutable security evidence and provenance | Evidence, Blob Reference, Provenance Hash |
| Audit | Append-only sensitive-action history | Audit Event |
| Workers | Isolated scanner execution and capability health | Worker, Capability, Lease, Job |

## Runtime topology

| Service | Responsibilities | Trust boundary |
|---|---|---|
| Frontend | User interaction; never receives service-role or unmasked integration secrets | Untrusted client |
| API | Authentication, authorization, validation, orchestration, query APIs | Trusted control plane |
| PostgreSQL | Tenant-scoped records and RLS enforcement | Trusted persistence |
| Queue | Durable scan and normalization jobs | Trusted internal transport |
| Object storage | Raw scanner output, SBOMs, and evidence blobs | Tenant-scoped trusted storage |
| Worker | Repository checkout and isolated scanner execution | High-risk execution boundary |
| Reverse proxy | TLS termination, request limits, routing | Internet boundary |

The API must not execute scanner binaries. The worker must not accept arbitrary shell commands. Every job references a validated scanner capability and typed target.

## Request authorization

1. Validate the Supabase access token, issuer, audience, expiry, and subject.
2. Resolve organization and workspace membership server-side.
3. Enforce the route permission before object lookup or mutation.
4. Apply organization/workspace filters in queries.
5. Let RLS independently enforce the same tenant boundary.
6. Use service-role credentials only for narrowly scoped internal worker and webhook services.
7. Write an audit event for security-sensitive actions.

Initial permission names follow the product specification, including `application:read`, `scan:create`, `finding:triage`, `deployment:manage`, `runtime_event:ingest`, and `audit:read`.

## Credential model

- Frontend submits credentials to a permission-protected backend endpoint over TLS.
- API validates provider-specific typed configuration.
- Secret material is encrypted before persistence using a deployment-controlled encryption key or supported external secret manager.
- Read APIs return configuration metadata and masked secret hints, never recoverable secret values.
- Rotation writes a new credential version and audit event.
- Workers receive short-lived, job-scoped decrypted material only when required.
- Environment variables remain available for bootstrap infrastructure secrets, not routine provider configuration.

## Scanner interface

V1 scanner adapters implement:

- `metadata()`
- `capabilities()`
- `validate_config()`
- `health_check()`
- `prepare_job()`
- `execute()`
- `parse_results()`
- `normalize_results()`
- `cleanup()`

Supported V1 adapters are Semgrep, Gitleaks, Trivy, OSV-Scanner, Checkov, and Syft. Scanner images or binaries are version-pinned and invoked from a fixed adapter-owned command template.

## Finding pipeline

1. Worker records scanner/version, repository, commit, target, policy, timestamps, exit code, and provenance hash.
2. Raw output is stored as an immutable scan artifact.
3. A scanner-specific parser validates the result format.
4. A normalizer maps results to a canonical finding occurrence.
5. A versioned fingerprint deduplicates occurrences into a finding.
6. Application and component attribution is mandatory or explicitly unassigned.
7. Explainable priority factors are calculated and stored.
8. Status transitions follow an explicit state machine.

No parser error may create a synthetic finding. Partial parse results must be marked partial and preserve error evidence.

## Development-to-runtime correlation

Correlations are deterministic records with method, confidence, source objects, supporting evidence, timestamp, and engine version. Initial methods include exact repository/commit mapping, artifact or image digest equality, endpoint equality, registered workload identity, and package presence in an artifact SBOM.

Uncertain relationships require user confirmation. No graph edge is rendered without a persisted relationship and provenance.

## Verification model

`Resolved` is a user workflow state. `Verified` requires evidence:

- A later scan no longer detects the occurrence.
- The fixed commit or artifact is identified.
- The required environment is running a deployment containing that fixed version.
- The verification policy succeeds.

Manual verification is permitted only to authorized users and requires immutable evidence and an audit event.

## Repository structure evolution

The repository will evolve incrementally toward feature-oriented frontend modules and bounded backend domains. Files move only when their destination domain and import contract are established.

```text
src/
  app/ layouts/ routes/ lib/
  features/
    auth/ tenancy/ applications/ repositories/ integrations/
    scans/ findings/ deployments/ runtime/ remediation/ audit/

backend/app/
  api/routes/ api/dependencies/
  core/ database/
  domains/
    tenancy/ applications/ repositories/ integrations/
    scans/ findings/ deployments/ runtime_events/
    correlation/ remediation/ audit/ workers/
  scanners/ providers/

worker/threatstream_worker/
  execution/ plugins/ sandbox/ transport/ health/ config/
```

## Self-hosting target

The production Compose stack will contain frontend, API, PostgreSQL, Redis-compatible durable queue, S3-compatible object storage, worker, and reverse proxy services with health checks. Hosted mode uses the same APIs and worker protocol. Core functionality must not require Supabase Cloud or another proprietary hosted service.

## Threat-model priorities

The first security design review focuses on cross-tenant access, service-role misuse, webhook forgery, integration-secret exposure, worker impersonation, arbitrary scanner execution, command injection, path traversal, malicious repositories, archive bombs, SSRF, oversized SARIF/SBOM payloads, evidence tampering, XSS through scanner output, duplicate jobs, and secret leakage in logs.
