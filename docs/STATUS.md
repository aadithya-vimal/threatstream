# ThreatStream Execution Status

This is the authoritative evidence ledger for the execution sequence in
[`THREATSTREAM_SAAS_MASTER_PLAN.md`](THREATSTREAM_SAAS_MASTER_PLAN.md). Product scope is defined by [`PRODUCT.md`](PRODUCT.md).

## Current state

- Current task: `TS-013 — Repair the authenticated application shell`
- Task status: `complete`
- Phase 0 gate: `complete` after the final validation recorded below
- Exact next task: `TS-014 — Verify and repair existing core workflows`
- TS-010 implementation: complete
- Leading release blocker: Phase 1 backend and workflow acceptance remains incomplete; authentication is no longer the leading blocker
- Browser acceptance: real sign-in, session restoration, tenancy resolution, and protected navigation verified for TS-010
- Production acceptance: no capability is production verified
- Repository Alembic head: `20260719_0006`; no live database was contacted in Phase 0

Evidence labels are intentionally independent. A component test using mocks is unit evidence, not browser or production evidence. `None` means no evidence was produced or found during Phase 0.

## Active route and capability matrix

| Capability | Product surface | Route or entry point | Backend contract | Data source | Unit tested | Integration tested | Browser verified | Production verified | Current state | Known limitation | Blocking task |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Landing page | Public | `/` | None | Static product content | Build/import only | None | No | No | Unverified | No browser run | TS-010 |
| Terms | Public | `/terms` | None | Static legal/product content | Build/import only | None | No | No | Unverified | No browser run or legal acceptance | TS-010 |
| Global Monitor overview | Public | Not routed | Planned public-intel API | Real attributed observations only | None | None | No | No | Planned | No implementation | TS-080 |
| Globe | Public | Not routed | Planned public-intel API | Approximate GeoIP from attributed observations | None | None | No | No | Planned | Image assets only; no active component | TS-083 |
| Live observation feed | Public | Not routed | Planned public-intel API | Real attributed sources | None | None | No | No | Planned | No implementation | TS-082 |
| Trends | Public | Not routed | Planned public-intel API | Aggregated real observations | None | None | No | No | Planned | No implementation | TS-084 |
| Sources | Public | Not routed | Planned source-health API | Source metadata and freshness | None | None | No | No | Planned | No implementation | TS-081 |
| Methodology | Public | Not routed | None planned for static page | Documented source classes and limitations | None | None | No | No | Planned | No implementation | TS-086 |
| Sign-up | Authentication | `/auth/sign-up` through `/auth/:path` | Neon Auth / identity resolution | External identity provider | `src/contexts/AuthContext.test.jsx` (mocked) | `backend/tests/test_neon_auth_security.py` | No | No | Partially verified | Correct SDK boundary is tested; real sign-up still requires browser acceptance | TS-010 |
| Sign-in | Authentication | `/auth/sign-in` through `/auth/:path` | Neon Auth / identity resolution | External identity provider | `src/contexts/AuthContext.test.jsx` and `src/lib/neonAuth.test.js` (mocked) | Configured `/get-session` returned 200 unauthenticated | Yes | No | Verified | Production verification remains outstanding | None |
| Session restoration | Authentication | `AuthProvider` application entry | Bearer JWT verification | External identity provider | Auth state, retry, deduplication, and refresh tests | `backend/tests/test_identity_resolution.py` | Yes | No | Verified | Production verification remains outstanding | None |
| Sign-out | Authentication | Authenticated shell action | Neon Auth client | External identity provider | `src/contexts/AuthContext.test.jsx` (mocked) | None | No | No | Test-only | Mocked client only | TS-010 |
| Protected routing | Authentication | All private routes via `ProtectedRoute` | Identity plus Workspace context | Auth and API state | `src/contexts/AuthContext.test.jsx` (mocked) | None | Yes | No | Verified | Full route-by-route E2E remains TS-015 | TS-015 |
| Organization onboarding | Tenancy | Provider flow; no dedicated route | Tenancy API | PostgreSQL through API | `src/contexts/TenancyContext.test.jsx` (mocked) | `backend/tests/test_tenancy_security.py` | No | No | Test-only | No browser acceptance | TS-011 |
| Workspace selection | Tenancy | Authenticated shell selector | Tenancy API | PostgreSQL through API | `src/contexts/TenancyContext.test.jsx` (mocked) | `backend/tests/test_tenancy_security.py` | No | No | Test-only | Protected browser flow blocked | TS-011 |
| Cross-workspace isolation | Tenancy | API enforcement on private routes | Workspace-scoped dependencies | PostgreSQL test fixtures | None | `backend/tests/test_tenancy_security.py` | No | No | Partially verified | Deterministic tests only; no live database or production proof | TS-012 |
| Overview | Private SaaS | `/overview` | Aggregated existing APIs | PostgreSQL through API | Build/import only | Backend domain tests | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Dashboard compatibility redirect | Private SaaS | `/dashboard` → `/overview` | None | Router state | Build/import only | None | No | No | Unverified | No browser route test | TS-010 |
| Teams | Private SaaS | `/workspace/teams` | Tenancy API | PostgreSQL through API | `src/features/teams/Teams.test.jsx` (mocked) | `backend/tests/test_tenancy_security.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Membership management | Private SaaS | `/workspace/teams` | Tenancy membership endpoints | PostgreSQL through API | `src/features/teams/Teams.test.jsx` (mocked) | `backend/tests/test_tenancy_security.py` | No | No | Test-only | Browser roles and mutations unverified | TS-012 |
| Assets | Private SaaS | `/assets` | Assets API | PostgreSQL through API | `src/features/assets/Assets.test.jsx` (mocked) | `backend/tests/test_assets.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Asset detail | Private SaaS | `/assets/:assetId` | Assets API | PostgreSQL through API | `src/features/assets/Assets.test.jsx` (mocked) | `backend/tests/test_assets.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Public URL targets | Private SaaS | Asset routes; dedicated model not implemented | Existing Asset API only | PostgreSQL through API | Asset tests only | `backend/tests/test_assets.py` | No | No | Planned | Target authorization model incomplete | TS-022 |
| Findings | Private SaaS | `/findings` | Findings API | PostgreSQL through API | `src/features/findings/Findings.test.jsx` (mocked) | `backend/tests/test_findings.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Finding create | Private SaaS | `/findings/new` | Findings API | PostgreSQL through API | Finding form component test (mocked) | `backend/tests/test_findings.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Finding detail | Private SaaS | `/findings/:findingId` | Findings API | PostgreSQL through API | `src/features/findings/Findings.test.jsx` (mocked) | `backend/tests/test_findings.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Finding transitions | Private SaaS | Finding detail | Finding transition endpoints | PostgreSQL through API | Finding component tests (mocked) | `backend/tests/test_findings.py` | No | No | Test-only | Browser permissions unverified | TS-013 |
| Comments | Private SaaS | Finding detail | Finding comment endpoints | PostgreSQL through API | Finding component tests (mocked) | `backend/tests/test_findings.py` | No | No | Test-only | Browser workflow unverified | TS-013 |
| Evidence | Private SaaS | Finding detail | Finding evidence endpoints | PostgreSQL through API | Finding component tests (mocked) | `backend/tests/test_findings.py` | No | No | Test-only | Browser rendering and sensitive-data handling unverified | TS-013 |
| Unified vulnerability filtering | Private SaaS | `/findings` | Existing Findings API; target contract broader | PostgreSQL through API | Basic finding filters tested | `backend/tests/test_findings.py` | No | No | Partially verified | Repository/code occurrence filters not implemented | TS-071 |
| Scan jobs | Private SaaS | `/scans` | Scans API | PostgreSQL through API | `src/features/scans/Scans.test.jsx` (mocked) | `backend/tests/test_scans.py` with fake adapter | No | No | Test-only | Real Nuclei binary execution unverified | TS-015 |
| Scan profiles | Private SaaS | `/scans/profiles` | Scan profile endpoints | PostgreSQL through API | `src/features/scans/Scans.test.jsx` (mocked) | `backend/tests/test_scans.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Scan profile detail | Private SaaS | `/scans/profiles/:profileId` | Scan profile endpoints | PostgreSQL through API | `src/features/scans/Scans.test.jsx` (mocked) | `backend/tests/test_scans.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Scan job detail | Private SaaS | `/scans/jobs/:jobId` | Scan job/result endpoints | PostgreSQL through API | `src/features/scans/Scans.test.jsx` (mocked) | `backend/tests/test_scans.py` with fake adapter | No | No | Test-only | Raw-result browser flow and real scanner unverified | TS-015 |
| Scan schedules | Private SaaS | `/scans/schedules` | Schedule endpoints | PostgreSQL through API | `src/features/scans/ScanSchedules.test.jsx` (mocked) | `backend/tests/test_scans.py` | No | No | Test-only | Scheduler not production verified | TS-015 |
| Scan schedule detail | Private SaaS | `/scans/schedules/:scheduleId` | Schedule endpoints | PostgreSQL through API | `src/features/scans/ScanSchedules.test.jsx` (mocked) | `backend/tests/test_scans.py` | No | No | Test-only | Scheduler not production verified | TS-015 |
| Worker status | Private SaaS | Scan UI and worker entry `python -m app.workers.scan_worker` | Scan status/lease contracts | PostgreSQL leases | None | `backend/tests/test_scans.py` with fake adapter | No | No | Partially verified | Recovery is deterministic-test evidence; real deployment unverified | TS-015 |
| Integrations | Private SaaS | `/settings/integrations` | Integrations API | Encrypted PostgreSQL records plus external services | `src/features/integrations/Integrations.test.jsx` (mocked) | `backend/tests/test_integrations.py` | No | No | Test-only | No live external-service result | TS-016 |
| Audit | Private SaaS | `/audit` | Tenancy audit endpoints | PostgreSQL through API | `src/features/audit/Audit.test.jsx` (mocked) | `backend/tests/test_tenancy_security.py` | No | No | Test-only | Protected browser flow blocked | TS-010 |
| Unknown-route redirect | Private SaaS | `*` → `/overview` | None | Router state | Build/import only | None | No | No | Unverified | Behavior not browser tested; auth then blocks destination | TS-010 |
| Applications | Private SaaS | Not routed; reserved package only | Planned Application API | Planned PostgreSQL domain | None | None | No | No | Planned | No implementation | TS-020 |
| GitHub App | Private SaaS | Not routed | Planned GitHub App API | GitHub App webhooks/API | None | None | No | No | Planned | No implementation or live GitHub verification | TS-030 |
| Repository import | Private SaaS | Not routed | Planned Repository API | GitHub metadata and PostgreSQL | None | None | No | No | Planned | No implementation | TS-031 |
| Pull-request ingestion | Private SaaS | Not routed | Planned GitHub ingestion | GitHub webhooks/API | None | None | No | No | Planned | No implementation | TS-032 |
| Commit ingestion | Private SaaS | Not routed | Planned GitHub ingestion | GitHub webhooks/API | None | None | No | No | Planned | No implementation | TS-032 |
| Repository baseline scans | Private SaaS | Not routed | Planned repository scan orchestration | Authorized source snapshot plus scanners | None | None | No | No | Planned | No implementation | TS-040 |
| PR scans | Private SaaS | Not routed | Planned repository scan orchestration | Authorized pull-request snapshot plus scanners | None | None | No | No | Planned | No implementation | TS-041 |
| Commit scans | Private SaaS | Not routed | Planned repository scan orchestration | Authorized commit snapshot plus scanners | None | None | No | No | Planned | No implementation | TS-042 |
| Notifications | Private SaaS | No product route; provider currently local UI only | Planned notification API | Planned PostgreSQL plus delivery providers | None | None | No | No | Planned | Reserved backend package has no implementation | TS-074 |
| Database migrations | Operations | `backend`: `python -m alembic heads` | Alembic | Repository migration metadata | `backend/tests/test_alembic_scope.py` | One repository head: `20260719_0006` | No | No | Partially verified | No live database revision check | TS-014 |
| API health | Operations | `/health` | FastAPI health endpoint | Process state | `backend/tests/test_backend_smoke.py` | TestClient smoke test | No | No | Test-only | No deployed endpoint check | TS-014 |
| API readiness | Operations | `/ready` | FastAPI readiness endpoint | Dependency state | `backend/tests/test_backend_smoke.py` | TestClient smoke test | No | No | Test-only | No deployed dependency check | TS-014 |
| Worker recovery | Operations | Worker process | PostgreSQL lease/retry behavior | PostgreSQL test fixtures | None | `backend/tests/test_scans.py` with fake adapter | No | No | Partially verified | No process-kill or deployed recovery exercise | TS-015 |
| Backups | Operations | Operational procedure | Planned platform controls | Production database/storage | None | None | No | No | Unverified | No backup evidence | TS-091 |
| Restore | Operations | Operational procedure | Planned platform controls | Backup artifacts | None | None | No | No | Unverified | No restore exercise | TS-091 |
| Production deployment | Operations | No production URL verified | Deployment configuration | Hosted services | None | None | No | No | Unverified | No production environment acceptance | TS-090 |
| Monitoring | Operations | No production entry point | Planned observability | Runtime telemetry | None | None | No | No | Planned | No implementation or production signals | TS-092 |
| Rate limiting | Operations | API boundary | Planned middleware/control | Request state | None | None | No | No | Planned | No verified enforcement | TS-093 |
| Browser E2E | Operations | Public and private routes | Full browser/API chain | Real configured development environment | None | None | No | No | Broken | Authentication blocks protected journeys | TS-010 |
| Deployment smoke tests | Operations | No production URL verified | Deployed frontend/API/worker | Hosted services | None | None | No | No | Planned | Cannot run before deployment exists | TS-094 |

## Phase 0 task ledger

| Task | Status | Commit | Acceptance evidence | Next task |
|---|---|---|---|---|
| TS-000 | complete | `22bbb85b2e44b03b69dce367291a0d77a5da69c0` (original identifier; locally amended during baseline closeout) | Baseline direction, boundaries, blockers, clean tree, and preservation recorded | TS-001 |
| TS-001 | complete | `58b925caa3f58d39b8dbb712caaa423d44750e36` | Route/module/test/migration/document audit in `REPOSITORY_AUDIT.md` | TS-002 |
| TS-002 | complete | `e369d56330ac456dabd5cadce079f96cc2b0fb7d` | Product contract and naming review; `git diff --check` | TS-003 |
| TS-003 | complete | `a2d1e765090f7e3b2af53be7cfe15181cfbb7d35` | Dormant-route reference proof; 34 frontend tests; production build | TS-004 |
| TS-004 | complete | `a85e4a72558ba5376bd8d9db43cfbc1c257c1953` | Plugin-reference proof; compileall; 101 backend tests | TS-005 |
| TS-005 | complete | `e21a676cb095d20bf0e80d96cf8a4b255316a214` | Historical headers, contradiction/link review, and `git diff --check` | TS-006 |
| TS-006 | complete | `854ffe51b35fe429774f4fcf61bfab68f5b1fd80` | Feature grouping; backend imports/Alembic; 34 frontend and 101 backend tests; build | TS-007 |
| TS-007 | complete | this commit (`docs: establish evidence-based functionality status`) | Route/API comparison and evidence classification; final Phase 0 gate recorded below | TS-010 |

## Phase 1 execution

| Task | Status | Commit | Validation | Blocker | Next task |
|---|---|---|---|---|---|
| TS-010 | complete | `f85207afb9cd9e38283571e5464e4c8553cb4227` plus closure evidence commit | 12 frontend test files / 48 tests; production build; real sign-in, refresh persistence, tenancy, protected navigation; no bogus JWT loop | none | TS-011 |
| TS-011 | complete | current TS-011 commit | real browser/API acceptance; public JWKS metadata; JWT/JWKS/identity/tenancy tests; full backend suite | none | TS-012 |
| TS-012 | complete | current TS-012 commit | 55 frontend tests; production build; focused bootstrap/identity/tenancy tests | none | TS-013 |
| TS-013 | complete | current TS-013 commit | 13 frontend test files / 64 tests; production build; route/data-loader review | none | TS-014 |
| TS-014 | not_started | — | — | — | — |
| TS-015 | not_started | — | — | — | — |
| TS-016 | not_started | — | — | — | — |
| TS-017 | not_started | — | — | — | — |

### TS-010 evidence and stash review

- Root cause: `createAuthClient` returns the Better Auth React adapter. Calling `getJWTToken` on that dynamic adapter constructs the nonexistent Better Auth action `/get-j-w-t-token`. Token retrieval now uses the wrapper returned by `createInternalNeonAuth`; the adapter remains the single UI/session client.
- Package versions remain current and mutually matched: `@neondatabase/auth@0.4.2-beta`, `@neondatabase/auth-ui@0.2.1-beta`, and transitive `better-auth@1.4.18`.
- The client exposes deterministic auth states, bounded token retry, concurrent-request deduplication, one forced refresh after API 401, and a visible terminal retry state. JWTs remain SDK-managed and are not logged or stored by ThreatStream.
- Non-secret endpoint evidence: the configured Neon Auth host/path responded `200` at `/get-session`; the previously generated bogus endpoint responds `404` as expected.
- At the implementation commit, browser acceptance was not claimed because the mandated browser-control runtime failed before opening a tab; no alternate browser mechanism was substituted.
- Subsequent user-observed browser acceptance verified real sign-in, session restoration after refresh, tenancy resolution, protected navigation, and no repeated `/get-j-w-t-token` requests. The observed scanner-health CORS failure is tracked separately and did not reject authentication.
- Stash `src/lib/neonAuth.js`: accepted the wrapper/adapter separation idea and independently implemented it without the stashed Proxy; the Proxy approach was rejected as an opaque API override.
- Stash `src/contexts/AuthContext.jsx`: stable callbacks/memoized context were accepted and independently combined with the required state model. The stashed version alone did not address token refresh, bounded errors, or the endpoint cause.
- The remaining five stash paths are still pending later Phase 1 review. The stash remains intact and unapplied.

### Post-TS-010 scanner-health defect

- Browser evidence showed the scanner-health request hidden behind a missing-CORS-header error while other authenticated application requests worked.
- Reproduction proved normal preflight and 401 responses had CORS, while an uncaught HTTP 500 response omitted `Access-Control-Allow-Origin`. The cause was error-boundary/middleware ordering, not the configured `http://localhost:5173` origin and not evidence of JWT rejection.
- CORS is now the outermost user middleware around a sanitized application exception boundary. Both intentional local origins are supported without wildcard credentials.
- Scanner health now reports `configured` and `binary_detected` truthfully. Missing Nuclei remains a normal HTTP 200 unavailable result; unexpected health failures are sanitized and cannot expose subprocess details.
- Focused evidence covers both loopback origins, preflight, authenticated unavailable state, internal failure, CORS error headers, unauthorized access, and wrong-workspace denial. Live browser re-verification remains required before marking the Scans surface browser verified.

### TS-011 evidence and stash review

- Real sign-in reached tenancy and protected API-backed routes, proving the issued token passed the existing required signature, issuer, expiry, subject, algorithm, and `kid` checks. No token, cookie, or authorization header was printed or persisted.
- Safe public metadata check: issuer and JWKS share the configured Neon Auth host; JWKS path is `/neondb/auth/.well-known/jwks.json`; one signing key was published with a `kid` and `EdDSA`. Audience validation remains deliberately disabled because `NEON_AUTH_AUDIENCE` is empty for this branch contract.
- Backend validation now enforces a fixed asymmetric algorithm ceiling (`EdDSA`, `RS256`, `ES256`) in addition to the environment allowlist, so configuration cannot accidentally enable a symmetric JWT algorithm.
- Tests cover valid signature, invalid signature, wrong issuer/audience, optional absent audience, expiry, future `nbf`, missing subject, missing `kid`, symmetric algorithm rejection, unknown-key refresh, JWKS timeout, idempotent provider-neutral identity mapping, and no tenancy auto-grant.
- Stash `backend/app/core/security.py`: rejected in full. It logged unverified token claims and detailed decode errors, violating token secrecy and verified-claims-only rules. No stashed security code was restored. The stash remains intact.

### TS-012 evidence and stash review

- The tenancy provider now exposes explicit loading, onboarding, ready, workspace-unavailable, permission-denied, backend-unavailable, and authentication-expired states. Invalid stored workspace IDs are discarded in favor of the first backend-authorized workspace with a visible notice.
- All private routes wait for tenancy resolution. Users without a membership are directed to the deliberate `/overview` bootstrap form; product pages do not render against an empty tenant boundary.
- Bootstrap slugs are normalized server-side, database uniqueness remains authoritative, conflicts return HTTP 409, and users with an existing active organization or workspace membership cannot invoke first-tenant bootstrap again.
- A 401 tenancy response triggers one guarded Neon sign-out. A 403 remains a permission state and does not globally clear authentication.
- Stash `src/contexts/TenancyContext.jsx` and its test: accepted the one-time 401 logout guard concept and independently implemented it as part of the fuller state model. No stashed file was restored. The stash remains intact.

### TS-013 evidence

- Signed-out, initializing, authenticated, onboarding, tenancy-error, and ready route states are deterministic. Unknown authenticated routes now render a controlled 404 instead of silently redirecting to the overview.
- The API client performs one forced refresh after a 401 and triggers sign-out only when the retried authenticated request is also 401. HTTP 400, 403, 404, 409, 422, 429, 500, and 503 remain typed application errors and do not clear authentication.
- All retained feature data loaders were reviewed and key their workspace-scoped loads to `currentWorkspace.id`, causing workspace switches to reload rather than reuse another workspace's data.
- Direct-route import/build coverage passes. Full real-browser route-by-route acceptance remains assigned to TS-015.

## Phase 0 gate evidence

- Product scope is locked in `PRODUCT.md`; public and customer data planes are explicitly separated.
- Eight dormant SOC pages and their unreachable support modules were removed in TS-003. All active routes appear in the matrix above.
- The obsolete `backend/app/plugins` implementation was removed in TS-004. The typed registry in `backend/app/domains/scans/adapters` is the sole scanner interface; Nuclei is its only active adapter and real-binary execution remains unverified.
- Current documentation is `PRODUCT.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `DEPLOYMENT.md`, `API.md`, `STATUS.md`, `REPOSITORY_AUDIT.md`, and the master plan. Historical Markdown is under `docs/archive` with a non-authoritative header.
- Frontend baseline: 10 test files, 34 tests passed; production build passed with the known Neon Auth chunk-size warning.
- Backend baseline: compileall passed; 101 tests passed with unrelated global pytest plugin autoload disabled; Alembic reports one repository head, `20260719_0006`.
- Browser authentication remains broken and is the leading release blocker. Tests do not establish browser or production verification.
- No migration or database operation was performed in Phase 0.
- No TS-010 implementation has started.

## Preserved pre-Phase-0 implementation work

The following work is preserved, unreviewed, and not accepted as product implementation:

- Stash reference: `stash@{0}`
- Stash commit: `58ad455967296c59aa648022451bb804d2bac3ad`
- Stash name: `pre-TS-001 preserved implementation changes after TS-000 baseline`
- Paths (all modified in the stash):
  - `backend/app/core/security.py`
  - `scripts/threatstream.ps1`
  - `src/contexts/AuthContext.jsx`
  - `src/contexts/TenancyContext.jsx`
  - `src/contexts/TenancyContext.test.jsx`
  - `src/index.css`
  - `src/lib/neonAuth.js`

Phase 0 did not modify these baseline paths, so no overlap occurred. The stash must remain unapplied for TS-010 review; selective recovery may require manual comparison.

## Known release blockers

1. TS-010 must diagnose and fix real-browser authentication without assuming the preservation stash is correct.
2. Protected workflows need browser acceptance after authentication works.
3. Nuclei needs authorized real-binary execution evidence.
4. Live database, external integration, deployment, backup/restore, monitoring, and rate-limit acceptance remain unverified.
5. Planned Application, Repository, GitHub, public-intelligence, and notification domains are structural placeholders only.
