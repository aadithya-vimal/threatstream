# ThreatStream Migration Plan

## Migration principles

- Deliver one complete repository-to-runtime vertical slice before broadening scope.
- Keep existing data readable until an explicit, tested backfill or archival decision exists.
- Never present fixture, fallback, or simulated records as live product data.
- Establish tenant isolation and backend permissions before adding new operational records.
- Keep the API process free of scanner execution.
- Keep each commit and migration independently understandable and verifiable.

## Phase plan

| Phase | Objective | Exit criteria |
|---|---|---|
| 0. Repository truth audit | Inventory current implementation and record baseline | Four audit documents complete; build/tests recorded; no production code changed |
| 1. Product shell correction | Make active product language and navigation truthful | SOC/globe routes removed; landing, overview, terms, and navigation match AppSecOps direction; no fake metrics; frontend builds |
| 2. Tenancy and authorization | Establish secure tenant boundaries | Organizations, workspaces, teams, memberships, permissions, backend enforcement, RLS isolation, audit foundation, cross-tenant tests |
| 3. Application model | Add the canonical top-level object model | Applications, components, ownership, relationships, application detail/timeline foundations |
| 4. GitHub integration | Connect source control safely | GitHub App installation, repository discovery/selection, signed webhooks, commit and pull-request metadata, mapping |
| 5. Worker and scanning | Execute V1 scanners outside the API | Durable queue, worker registration/leases, isolated execution, Semgrep/Gitleaks/Trivy/OSV/Checkov/Syft adapters, raw artifacts |
| 6. Finding lifecycle | Normalize and manage scanner results | Fingerprints, deduplication, occurrences, triage, assignment, suppression, risk acceptance, remediation links |
| 7. Deployment context | Connect code and artifacts to environments | Environments, deployments, commit/artifact/image linkage, endpoints, authenticated deployment webhook |
| 8. Runtime context | Ingest deployment-aware security events | Runtime sources, signed generic webhook, normalization, application/deployment mapping |
| 9. Correlation and verification | Prove production relevance and fixed state | Deterministic correlations, explainable priority, rescanning, fixed deployment verification, reopening logic |
| 10. Production hardening | Make self-hosted deployment supportable | Complete tests, threat-model controls, observability, Docker Compose, backup/recovery, upgrade docs |

## Phase 1 implementation scope

Phase 1 changes only the active product shell:

1. Rewrite public product language around Application Security Operations.
2. Replace the dashboard with a truthful overview containing workflow explanations and implementation-state links, not operational metrics.
3. Reduce navigation to implemented shell destinations.
4. Remove dead or misleading routes.
5. Move explicitly unrelated product pages to a legacy archive where useful.
6. Keep reusable visual primitives, authentication, and layout components.
7. Remove globe packages only after no active import requires them.
8. Rewrite README to describe verified behavior and label Available, Experimental, and Planned features.

Phase 1 does not expose Applications, Findings, Scans, Deployments, Runtime, or Remediation as functioning modules until their backend domains exist.

## Data migration strategy

Existing SOC tables remain untouched through Phase 1. Phase 2 introduces new tenant tables in additive migrations. Later phases add application-security tables and explicit nullable legacy-reference columns where a safe mapping exists.

Legacy data is classified as:

- Mappable: records with reliable ownership and provenance that can become Components, Findings, Runtime Events, or Evidence.
- Archivable: useful historical records that cannot satisfy the new object contract.
- Disposable development fixtures: records explicitly identified as fixtures and excluded from production views.
- Unknown provenance: quarantined until reviewed; never silently promoted.

Every backfill migration documents selection criteria, conflict handling, rollback behavior, and record counts.

## Verification gates

| Gate | Required checks |
|---|---|
| Every frontend phase | Install consistency, production build, configured lint/typecheck/tests, route smoke test |
| Every backend phase | Compile, unit tests, integration tests, API smoke tests, typed error envelopes |
| Every tenancy migration | Clean migration, upgrade migration, RLS tests, cross-tenant denial tests |
| Every scanner adapter | Fixture parser tests, normalization tests, timeout/cancel tests, malicious-input tests |
| Every webhook | Signature, replay, payload-limit, idempotency, and authorization tests |
| Production hardening | Compose build/start, health checks, full E2E vertical slice, secret/static/dependency scans |

## Immediate risks to resolve in Phase 2

1. Eliminate service-role use from user-facing API requests.
2. Replace unconditional authenticated RLS policies with tenant predicates.
3. Add backend permission dependencies and object-level authorization.
4. Replace plaintext/readable integration settings with encrypted, masked credentials.
5. Add correlation IDs and typed API error envelopes.
6. Prevent repositories from converting failures into empty successful states.

## Commit sequence

Each phase uses focused commits for documentation, shell, schema, authorization, domain logic, UI, tests, and operational documentation. Database migrations, backend contracts, and frontend consumers remain separate commits when doing so preserves a working intermediate state.
