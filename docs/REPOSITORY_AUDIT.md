# ThreatStream Repository Reality Audit

Audit date: 2026-08-01
Baseline: `df91af4e6f9eeffb67abe21bd41aa09870b2ac7c` on `main`
Task: `TS-001`

## 1. Executive summary

ThreatStream currently has a registered React/Vite public landing and authenticated workspace application backed by a FastAPI API, PostgreSQL repositories, six linear Alembic revisions, and a PostgreSQL-leased scan worker. The active private surface covers tenancy bootstrap, teams, audit reads, integrations, Assets, Findings, Nuclei profiles/jobs/schedules, and worker status.

The repository does **not** contain browser evidence proving those protected journeys. The active Neon Auth browser bridge is classified **Broken** because the governing baseline records a repeated JWT endpoint `404`; component and JWT unit tests do not resolve that failure. All registered protected routes are consequently **Broken** as end-to-end browser journeys even where their frontend-to-backend contracts are present and test-covered.

There are two scanner systems. `backend/app/domains/scans/adapters` is the registered, worker-integrated authority and has one active adapter, Nuclei. `backend/app/plugins` is unreachable from `backend/app/main.py`, imports modules that do not exist, duplicates Nuclei and Nmap concepts, and contains simulated/fabricated results and sleep-driven progress. It is a later deletion candidate, not accepted product behavior.

Eight page components under `src/pages` are unregistered. They are not product routes and use static, placeholder, simulated, alert-based, or removed-contract behavior. Nineteen test files exist, but none is browser E2E or a live external-service test. The repository metadata has one Alembic head (`20260719_0006`); the live database revision was not queried in this documentation-only audit.

## 2. Audit scope and evidence standard

This audit used the active tree only. `stash@{0}` was inspected by name/status and statistics only and was not applied, popped, dropped, or rewritten. No database was contacted, no server was started, and no implementation code was changed.

Verification labels mean:

- **Browser-verified**: a real browser journey against real backend services is recorded. None qualifies.
- **API-verified**: direct API execution against its required runtime is recorded. Historical claims were not promoted without current evidence.
- **Test-only**: automated tests exercise code, often with mocks or fakes.
- **Unverified**: implementation or documentation exists without current runtime evidence.
- **Broken**: repository evidence identifies a blocking failure or an import/contract cannot work.

Dispositions are limited to **Keep**, **Refactor**, **Move**, **Delete**, and **Blocked pending verification**.

## 3. Repository map

| Path | What exists | Source/operational role | Disposition | Reason |
|---|---|---|---|---|
| `.env.example` | Frontend variable-name template | Frontend environment contract | Keep | Contains placeholder names, not real values. |
| `.gitignore` | Ignore policy | Protects environment files, dependencies, builds, caches, logs, and `repomix-output.xml` | Refactor | Effective for observed artifacts; scanner-output patterns should be reviewed later. |
| `app/` | Tracked `__init__.py` only | Top-level backend import alias | Blocked pending verification | Current commands use `backend/app`; removal safety belongs to TS-006. |
| `backend/` | FastAPI app, Alembic, domains, repositories, worker, tests, and legacy plugins | Active backend plus legacy code | Refactor | Active architecture is coherent but mixed with obsolete plugins and monolithic models. |
| `docs/` | Master plan and status | Authoritative controls | Keep | Current source of truth; this audit joins them. |
| `public/` | Logo, globe textures, social image | Static frontend assets | Blocked pending verification | Some globe assets support currently unregistered/legacy visuals; usage must be checked before removal. |
| `scripts/` | Windows startup script | Local API/frontend/worker launcher | Refactor | Starts three processes but lacks readiness and complete duplicate detection. |
| `src/` | React application, tests, dormant pages | Active frontend plus legacy pages/components | Refactor | Registered product and dormant SOC surfaces coexist. |
| Root Markdown files | 18 historical/current-looking documents | Conflicting documentation set | Move | Consolidate/archive during TS-005 after extracting current facts. |
| `package.json`, `package-lock.json` | npm manifest and lock | Frontend dependencies/scripts | Keep | Lock resolves exact installed package graph. |
| `requirements.txt`, `backend/requirements.txt` | Python constraints | Root legacy utilities and backend runtime | Refactor | Constraints are not a reproducible lock; root/backend split needs documentation. |
| `index.html`, `vite.config.js` | Vite entry/build config | Active frontend build | Keep | Registered by npm scripts. |
| `.env`, `backend/.env` | Ignored local environment files | Local runtime configuration | Keep ignored | Contents were not read. |
| `node_modules/`, `dist/`, caches | Ignored dependencies/build/test caches | Generated artifacts | Keep ignored | Not product source. |
| `repomix-output.xml` | Ignored aggregate artifact | Non-source/generated | Keep ignored | Explicitly forbidden from commit. |

Every top-level source directory (`app`, `backend`, `docs`, `public`, `scripts`, `src`) has a disposition above.

## 4. Product surfaces currently present

| Surface | Exists | Registered/reachable | Data source | Verification | Disposition |
|---|---|---|---|---|---|
| Public landing | Yes | `/` | Static product copy and local assets | Unverified | Refactor |
| Terms | Yes | `/terms` | Static content | Unverified | Keep |
| Neon Auth UI | Yes | `/auth/:path` | Managed Neon Auth client | Broken | Blocked pending verification |
| Authenticated workspace | Yes | 15 protected domain route entries plus redirect/wildcard | FastAPI `/api/v1` | Broken | Refactor |
| Public threat monitor | Visual components/assets only | No monitor routes | Static/legacy visual code | Unverified | Blocked pending verification |
| Repository/GitHub SaaS | No active domain | No | None | Unverified | Keep for later planned work, not current code |

## 5. Active frontend route map

There are 20 `<Route>` entries: 18 concrete user routes, one `/dashboard` redirect, and one wildcard redirect.

| Route | Access | Component | Nav | Purpose | API dependencies | Verification | Blocker | Disposition |
|---|---|---|---|---|---|---|---|---|
| `/` | Public | `Landing` | Brand/home links | Product landing | None | Unverified | No browser record; legacy globe/marketing semantics need product alignment | Refactor |
| `/terms` | Public | `Terms` | Landing/footer only | Terms notice | None | Unverified | No browser record | Keep |
| `/auth/:path` | Public | `AuthPage` | Guard actions | Sign-in/up/recovery UI | Neon Auth | Broken | Repeated JWT endpoint `404` is recorded; real session flow unverified | Blocked pending verification |
| `/overview` | Protected | `Dashboard` | Yes | Workspace overview | tenancy, integrations, teams, audit | Broken | Auth gate blocks real journey; data calls otherwise mapped | Refactor |
| `/dashboard` | Redirect | `Navigate` | Legacy `Header` only | Compatibility redirect | None | Unverified | Old component still links here | Refactor |
| `/settings/integrations` | Protected | `Integrations` | Yes | Credential lifecycle | integrations API | Broken | Auth browser flow broken; provider test requires external service | Keep |
| `/workspace/teams` | Protected | `Teams` | Yes | Team list/create | tenancy teams API | Broken | Auth browser flow broken; membership mutation absent | Refactor |
| `/audit` | Protected | `Audit` | Yes | Workspace audit list | tenancy audit API | Broken | Auth browser flow broken; recent bounded read only | Keep |
| `/findings` | Protected | `Findings` | Yes | Finding queue/filtering | findings and assets APIs | Broken | Auth browser flow broken | Keep |
| `/findings/new` | Protected | `FindingCreate` | Via Findings | Manual finding creation | findings/assignees/assets APIs | Broken | Auth browser flow broken | Keep |
| `/findings/:findingId` | Protected | `FindingDetail` | Via lists | Triage/detail/activity | findings, comments, evidence, assets | Broken | Auth browser flow broken | Keep |
| `/assets` | Protected | `Assets` | Yes | Asset inventory | assets/owners APIs | Broken | Auth browser flow broken | Keep |
| `/assets/:assetId` | Protected | `AssetDetail` | Via Assets | Asset detail/edit/status | assets/owners APIs | Broken | Auth browser flow broken | Keep |
| `/scans` | Protected | `Scans` | Yes | Scanner/job/profile overview | scanner health, profiles, jobs, schedules, worker, assets | Broken | Auth broken; Nuclei runtime unverified | Keep |
| `/scans/profiles` | Protected | `ScanProfiles` | Via Scans | Profile list/create | scan profiles, scanners, assets | Broken | Auth broken; scanner unavailable state is test-only | Keep |
| `/scans/profiles/:profileId` | Protected | `ScanProfileDetail` | Via profiles | Targets/options/run | profile, health, assets, jobs | Broken | Auth and real scanner runtime unverified | Keep |
| `/scans/jobs/:jobId` | Protected | `ScanJobDetail` | Via Scans | Job polling/results/cancel | jobs/results/cancel | Broken | Auth and real worker/scanner unverified | Keep |
| `/scans/schedules` | Protected | `ScanSchedules` | Via Scans | Schedule list/create | schedules/profiles | Broken | Auth and live scheduler unverified | Keep |
| `/scans/schedules/:scheduleId` | Protected | `ScanScheduleDetail` | Via schedules | Schedule edit/toggle | schedules/jobs | Broken | Auth and live scheduler unverified | Keep |
| `*` | Redirect | `Navigate` to `/overview` | No | Fallback | None | Unverified | Sends anonymous unknown routes into broken protected journey | Refactor |

All protected routes have matching backend contracts. Public landing/terms and redirects intentionally have no backend. Auth depends on the external Neon Auth contract rather than FastAPI routes.

## 6. Unregistered frontend pages

`rg` found no imports or active route references for these eight page components.

| File | Imported | Removed API dependency | Static/mock/simulated evidence | Reusable pieces | Disposition | Evidence |
|---|---|---|---|---|---|---|
| `src/pages/AuditLog.jsx` | No | No active client contract | Static arrays/markers | `DataTable`, `StatusBadge` may be reusable | Delete | `rg -l` import count 0; static markers present |
| `src/pages/Connectors.jsx` | No | References connector concepts outside active integration contract | Static configuration and placeholders | `Panel`, `Icons` reusable | Delete | No router/import reference; only legacy network-like text |
| `src/pages/GraphInvestigation.jsx` | No | No graph API | Hard-coded nodes including CVE data | Layout primitives reusable | Delete | No imports; static markers present |
| `src/pages/IOCEnrichment.jsx` | No | No active enrichment API | Poll timers, placeholder/sample IOC behavior | Empty/loading primitives reusable | Delete | No imports; no central API calls |
| `src/pages/MalwareAnalysis.jsx` | No | No malware API | Static/sample analysis content | Metric/table primitives may be reusable | Delete | No imports; no active backend route |
| `src/pages/ThreatHunting.jsx` | No | No hunting API | Static/simulated content | Common primitives reusable | Delete | No imports; static markers present |
| `src/pages/ThreatIntelligence.jsx` | No | No public-intel API | Static data and explicit WHOIS/DNS placeholder | Search/filter primitives may be reusable | Delete | No imports; placeholder marker |
| `src/pages/YARAPlatform.jsx` | No | No YARA API | Static rule-library behavior | Common primitives reusable | Delete | No imports; static markers present |

## 7. Frontend architecture

| Area | Current flow | Evidence | Verification | Disposition |
|---|---|---|---|---|
| Auth | `AuthProvider` → Neon session → `getJWTToken` → `configureApiAuth` | `AuthContext.jsx`, `neonAuth.js` | Broken | Refactor |
| Tenancy | authenticated user → `getTenancyContext` → workspace selection | `TenancyContext.jsx` | Test-only | Refactor |
| API | one central `apiFetch` for `/api/v1`; health/readiness use direct `fetch` | `src/lib/api.js` | Test-only | Keep |
| Route protection | `ProtectedRoute` checks loading/user and renders sign-in actions | `ProtectedRoute.jsx` | Test-only | Refactor |
| Workspace preference | workspace ID only in `localStorage` | `TenancyContext.jsx` | Test-only | Keep |
| Notifications | in-memory context with random local IDs | `NotificationContext.jsx` | Unverified | Refactor |
| Assets | pages → central API → assets routes/service/repository | imports and route map | Test-only | Keep |
| Findings | pages → central API → findings routes/service/repository | imports and route map | Test-only | Keep |
| Scans | pages → central API → scan routes/services/worker | imports and route map | Test-only | Keep |

No authenticated domain page directly calls `fetch`; direct calls are centralized in `src/lib/api.js`. `useApi.js` exists but active pages mostly use explicit local request state, creating a duplicated request-state pattern. `Header.jsx`, `Globe.jsx`, `StatsCounters.jsx`, and `ThreatFeed.jsx` have no import references. `GlobalSearch.jsx` and `SetupWizard.jsx` only self-reference in the import scan and are not mounted. Several generic components are used only by dormant pages and require reassessment after those pages are removed.

The seven paths in the preservation stash include both auth/tenancy clients and a tenancy component test, so TS-010/TS-011/TS-013 must inspect that preserved work deliberately rather than treating it as accepted baseline code.

## 8. Authentication reality

Exact installed versions from `npm ls`:

| Dependency | Installed | Relationship |
|---|---|---|
| `@neondatabase/auth` | `0.4.2-beta` | Direct |
| `@neondatabase/auth-ui` | `0.2.1-beta` | Direct |
| `react` | `18.3.1` | Direct resolved version |
| `react-router-dom` | `7.18.1` | Direct resolved version |
| `better-auth` | `1.4.18` | Transitive through Neon packages |
| `@supabase/auth-js` | `2.79.0` | Transitive through `@neondatabase/auth`; not an active app client |
| Clerk | None found | Obsolete documentation only |
| `@supabase/supabase-js` | None found | Removed/not installed |

| Flow link | Implementation | Verification | Reality |
|---|---|---|---|
| Neon Auth session | `authClient.useSession()` | Broken | Governing baseline records repeated JWT endpoint `404`; no clean-browser evidence |
| JWT acquisition | `authClient.getJWTToken()` | Broken | Mocked in React tests; known endpoint failure remains blocking |
| Bearer header | `configureApiAuth` + `apiFetch` | Test-only | Unit test checks a mocked token/header |
| FastAPI JWT validation | PyJWT, JWKS cache, issuer/algorithm/expiry checks | Test-only | Security tests mock keys/claims; no real provider token verified here |
| Local identity resolution | `ExternalIdentity` + `User` transaction | Test-only | Database-oriented tests do not establish live browser identity |
| Tenancy context | `/api/v1/tenancy/context` | Test-only | Context tests mock API; protected browser path remains blocked |

`AuthPage` supports sign-in, sign-up, forgot/reset password, and email verification routes, but support is UI registration, not browser acceptance. The beta auth packages and transitive Better Auth version are also documented as having unresolved provider/security compatibility concerns in `NEON_AUTH_MIGRATION_REPORT.md`.

## 9. Backend API map

There are 53 registered HTTP routes. All `/api/v1` routes are authenticated; workspace routes additionally enforce the indicated permission. Route functions delegate to the named service except health/readiness and permission dependencies.

| Method/path family | Count | Auth/permission | Service → repository/model | Frontend consumer | Coverage | Verification | Disposition |
|---|---:|---|---|---|---|---|---|
| `GET /health`, `GET /ready` | 2 | Public | engine readiness | `api.health/readiness` (not mounted in pages) | backend smoke | Test-only | Keep |
| `GET /api/v1/tenancy/context` | 1 | bearer | `TenancyService` → `TenancyRepository` → identity/organization/workspace models | `TenancyContext` | tenancy/security | Test-only | Keep |
| `POST /api/v1/tenancy/organizations` | 1 | bearer | tenancy service/repository → organization/workspace/membership | `TenancyContext`/setup | tenancy | Test-only | Keep |
| `POST /api/v1/tenancy/organizations/{organization_id}/workspaces` | 1 | organization admin | tenancy service/repository → workspace/member | API client; no active UI call | tenancy | Test-only | Refactor |
| `GET,POST /api/v1/tenancy/workspaces/{workspace_id}/teams` | 2 | `team:read` / `team:manage` | tenancy service/repository → team | `Teams` | tenancy + component | Test-only | Keep |
| `GET /api/v1/tenancy/workspaces/{workspace_id}/audit` | 1 | `audit:read` | tenancy service/repository → audit event | `Audit`, `Dashboard` | tenancy + component | Test-only | Keep |
| assets: list/create/owners/detail/update/activate/deactivate/related findings | 8 | `asset:read/write/manage` | `AssetsService` → `AssetsRepository` → Asset/Tag/Finding | Assets pages and scan selectors | assets + components | Test-only | Keep |
| integrations: list/detail/store/test/delete | 5 | `workspace:read`, `integration:manage` | `IntegrationService` → `IntegrationRepository` → IntegrationCredential | `Integrations` (detail has no active consumer) | integrations + component | Test-only | Keep |
| findings: list/create/assignees/detail/update/delete/transition/comment/evidence add/delete | 10 | `finding:read/triage` | `FindingsService` → `FindingsRepository` → Finding/activity/comment/evidence | Findings pages | findings + components | Test-only | Keep |
| scanners list/health | 2 | `scan:read` | `ScansService` → registry | Scans/profile pages | scans | Test-only | Keep |
| profiles list/create/detail/update/delete/add/remove target/run | 8 | `scan:read/manage/run` | `ScansService` → `ScansRepository` → profile/target/job | scan pages | scans | Test-only | Keep |
| worker status | 1 | `scan:read` | scans service/repository → jobs/leases | `Scans` | worker tests | Test-only | Keep |
| schedules list/create/detail/update/delete/enable/disable | 7 | `scan:read/manage` | `ScheduleService` → `ScansRepository` → schedule/job | schedule pages | schedule component/backend tests | Test-only | Keep |
| jobs list/detail/cancel/results | 4 | `scan:read/run` | `ScansService` → `ScansRepository` → job/targets/raw results | scan/job pages | scans/worker | Test-only | Keep |

Backend routes with no active frontend consumer include integration detail, organization workspace creation, asset-related-findings as a standalone call, and health/readiness UI. Frontend public/auth routes appropriately lack FastAPI product endpoints. No registered frontend domain route lacks a corresponding backend family.

## 10. Domain/service/repository/model map

| Domain | Schemas | Service | Repository | Primary models/tables | Route/frontend exposure | Tests | Verification | Disposition |
|---|---|---|---|---|---|---|---|---|
| tenancy | `domains/tenancy/schemas.py` | `TenancyService` | `TenancyRepository` | users, identities, permissions, organizations, workspaces, memberships, teams, audit | tenancy routes; context/Teams/Audit | tenancy, identity, security | Test-only | Keep |
| assets | assets schemas/identifier/metadata modules | `AssetsService` | `AssetsRepository` | assets, asset_tags, links | assets routes/pages; scan targeting | assets | Test-only | Keep |
| findings | findings schemas | `FindingsService` | `FindingsRepository` | findings, evidence, comments, activity, occurrences | findings routes/pages | findings | Test-only | Keep |
| integrations | registry/schemas/tester | `IntegrationService` | `IntegrationRepository` | integration_credentials | integration routes/page | integrations | Test-only | Keep |
| scans | schemas/adapters/orchestrator/scheduler | `ScansService`, `ScheduleService` | `ScansRepository` | profiles, targets, jobs, raw results, schedules | scan routes/pages/worker | scans + worker tests | Test-only | Refactor |
| audit | tenancy schema/service | `TenancyService` and domain services emit events | tenancy and domain repositories | audit_events | audit route/page | tenancy/domain tests | Test-only | Refactor |

All 27 SQLAlchemy model classes reside in one `database/models/tenancy.py`, so domain ownership is physically blurred. Audit is cross-cutting but lacks its own domain module. Routes generally delegate to services; permission dependencies call `TenancyRepository` directly. Scan orchestration directly creates Finding models, a cross-domain coupling to refactor. Metadata redaction helpers exist, but raw scanner payload safety is only test-verified. `backend/app/schemas/job.py` is not referenced by the registered job routes and appears obsolete.

## 11. Database and migration reality

| Revision | Parent | Purpose | Main effects | Documented applied | Live verified now | Drift/contradiction | Disposition |
|---|---|---|---|---|---|---|---|
| `20260718_0001` | base | tenancy foundation | identity, RBAC, org/workspace/team/audit/integration tables | Historical reports call it canonical/applied | No | Later docs supersede it as current | Keep |
| `20260719_0002` | `0001` | integration credential state | status/test/update fields | Current docs imply included in head | No | Old migration guide stops at `0001` | Keep |
| `20260719_0003` | `0002` | Findings | findings/evidence/comments/activity | Included in current head claim | No | Older module disposition calls Findings future | Keep |
| `20260719_0004` | `0003` | Assets | assets/tags/link and finding relation | Included in current head claim | No | Older docs call domains deferred | Keep |
| `20260719_0005` | `0004` | scanner framework | profiles/jobs/targets/raw/occurrences | Included in current head claim | No | Real scanner runtime not established | Keep |
| `20260719_0006` | `0005` | leases/retries/schedules | durable job fields and schedules | `CURRENT_STATE.md` claims applied to approved dev branch | No | Claim not revalidated against live DB | Keep |

`python -m alembic history` shows a linear chain and `python -m alembic heads` shows exactly one repository head, `20260719_0006`. Model-to-migration consistency was inspected structurally, not proven by autogenerate or a live database. `migration_scope.py` and `test_alembic_scope.py` protect the managed auth schema. Live state remains **Unverified**.

## 12. Worker and scheduling reality

| Concern | Repository implementation | Verification | Disposition |
|---|---|---|---|
| Entry point | `python -m app.workers.scan_worker` | Test-only | Keep |
| Queue | PostgreSQL `scan_jobs` | Test-only | Keep |
| Claim | repository claim with worker ID/token and lease | Test-only | Keep |
| Lease/heartbeat | expiry, heartbeat, recovery intervals from settings | Test-only | Keep |
| Cancellation | request flag plus adapter cancellation/process termination | Test-only | Keep |
| Retry | bounded attempts and jittered 15/60/300-second backoff | Test-only | Keep |
| Scheduling | database-backed due schedules dispatched by `Scheduler` | Test-only | Keep |
| Concurrency | configured, default `1` | Unverified in real runtime | Refactor |
| Startup | separate PowerShell process | Unverified | Refactor |

The worker tests use fake adapters and disposable/test database boundaries. They prove state-machine behavior under those test conditions, not a production worker, live lease recovery, or real Nuclei execution.

## 13. Scanner architecture comparison

| Concern | Active adapter framework | Legacy plugin framework | Authority | Conflict | Disposition |
|---|---|---|---|---|---|
| Interface | Typed `ScannerAdapter` and normalized result | Generic `BasePlugin` dict contract | Active adapters | Duplicate abstractions | Delete legacy later |
| Registry | `scanner_registry`, imported by scan routes/worker | `PluginManager`, no active import | Active adapters | Manager cannot import because modules are missing | Delete legacy later |
| Nuclei | Real CLI adapter, bounded arguments/output | Missing imported module plus inline fabricated `NucleiPlugin` | Active adapters | Duplicate name and invented CVE outputs | Delete legacy later |
| Nmap | Inactive future definition | Real-command module plus inline simulated wrapper | Active registry definition | Duplicate behavior; simulated open ports/OS/services | Delete legacy later |
| Execution | async worker subprocess | synchronous plugins, sleeps, subprocesses | Active worker | Separate lifecycle/cancellation/security models | Delete legacy later |
| Normalization | typed Finding normalization and occurrence path | arbitrary dictionaries | Active worker | No shared contract | Delete legacy later |
| Reachability | routes → service → registry; worker → orchestrator | no references outside plugin directory | Active adapters | Legacy is unreachable | Delete legacy later |
| Safety | allowlisted Nuclei options, bounded output, redaction | command logging, fallback data, simulated collectors | Active adapters | Legacy violates product truth rules | Delete legacy later |

## 14. Legacy plugin inventory

Fourteen implementation classes are present: 11 module-based plugins (`auditd`, `masscan`, `nmap`, `osquery`, `rustscan`, `sslyze`, `suricata`, `sysmon`, `whatweb`, `windows_events`, `zeek`) and three inline manager classes (`NmapPlugin`, `NucleiPlugin`, `DefaultPlugin`). The manager also imports missing modules/classes for VirusTotal, IOC providers, Nuclei, Nikto, and lazy orchestrators, so importing it fails before use.

| Group | Reality | Verification | Disposition |
|---|---|---|---|
| Inline Nmap/Nuclei/default | sleep-driven progress; invented ports, OS, services, CVEs, and success | Broken | Delete |
| Telemetry collectors | fabricate synchronized event summaries after sleeps | Broken | Delete |
| CLI discovery modules | duplicate active concepts; some log full command strings and synthesize fallback MAC/data | Unverified | Delete |
| `PluginManager` | imports missing modules and is not registered by FastAPI/worker | Broken | Delete |

Deletion appears safe based on `rg 'app\.plugins|PluginManager|BasePlugin'`: references are confined to `backend/app/plugins`. Actual deletion must occur in TS-004 with compile/tests, not in this audit.

## 15. Test-boundary map

There are 19 tracked test files.

| Test file(s) | Category | What it proves | Main mocks/fakes | Does not prove | Verification |
|---|---|---|---|---|---|
| `src/contexts/AuthContext.test.jsx` | Component/unit | context mapping and calls | Neon Auth UI/client | real sign-in, JWT endpoint, cookies | Test-only |
| `src/contexts/TenancyContext.test.jsx` | Component | selection/bootstrap states | auth and API | real persistence/tenancy | Test-only |
| `src/lib/api.test.js` | Unit | bearer/workspace headers and errors | global fetch/token | real network/provider | Test-only |
| seven `src/pages/*.test.jsx` files | Component | rendering/actions/error states for Assets, Findings, Audit, Integrations, Teams, Scans, Schedules | API, contexts, layouts; synthetic fixtures | browser routing, API, DB, worker, scanner | Test-only |
| `backend/tests/test_backend_smoke.py` | API/smoke | route/error registration | app/runtime dependencies | deployed API | Test-only |
| `test_neon_auth_security.py`, `test_identity_resolution.py`, `test_tenancy_security.py` | Security/unit/repository | JWT rules, identity and RBAC logic | keys/claims and test DB boundaries | real Neon Auth/browser | Test-only |
| `test_assets.py`, `test_findings.py`, `test_integrations.py` | Domain/repository/API | validation and persistence behaviors | fixtures/providers/test DB | production DB/external providers | Test-only |
| `test_scans.py` | Unit/worker integration | adapter parsing, state, retry, schedules | fake adapter/process/test DB | real Nuclei/production worker | Test-only |
| `test_alembic_scope.py` | Migration/security | migration scope filtering | repository metadata | live upgrade/downgrade | Test-only |

Missing: browser E2E sign-in/session restoration/authenticated requests/onboarding/cross-tenant behavior; full browser Asset→Finding flow; real scanner invocation; GitHub integration; external-service integration; and deployment smoke tests. Mocked React tests prove none of real Neon Auth, API connectivity, database persistence, worker execution, or scanner execution.

## 16. Documentation contradictions

Ten contradiction groups were verified.

| Document(s) | Claim | Authority | Contradiction | Disposition |
|---|---|---|---|---|
| `docs/THREATSTREAM_SAAS_MASTER_PLAN.md`, `docs/STATUS.md` | Current plan/ledger | Yes | None; controls override older files | Keep authoritative |
| `FUNCTIONALITY_STATUS.md` | Routes are “Functional” | No | No browser proof; auth is broken | Move |
| `CURRENT_STATE.md` | Hosted product “exposes” workflows and tests pass | No | Current browser/runtime verification absent | Move |
| `MIGRATION_GUIDE.md` | Current/canonical target `20260718_0001` | No | Repository head is `20260719_0006` | Move |
| `NEON_AUTH_MIGRATION_REPORT.md` | Canonical revision `0001`; provider migration report | No | Superseded schema/auth reality | Move |
| `NEON_AUTH_MIGRATION_CHECKLIST.md` | Live migration to `0001` remains unchecked | No | Later docs claim `0006` applied | Move |
| `MODULE_DISPOSITION.md` | scans/findings/worker are future | No | Those domains now exist | Move |
| `README.md` | Automated scanner ingestion remains future | No | Active worker ingestion code exists, though runtime unverified | Refactor |
| `ARCHITECTURE.md` vs `TARGET_ARCHITECTURE.md` | Current and target architecture both appear current | No | Competing architecture descriptions | Merge into current document |
| `DEPLOYMENT.md` / `PHASE_2_REPORT.md` | Setup/delivery claims | No | Mix documented procedures with unverified deployment acceptance | Move |

Other root reports/checklists (`NEON_CLERK_MIGRATION_REPORT.md`, `SUPABASE_REMOVAL_CHECKLIST.md`, `MIGRATION_PLAN.md`, `INTEGRATIONS_MATRIX.md`, `DATABASE.md`, `API.md`, `DESIGN_SYSTEM.md`) contain useful history/reference but are not authoritative under `AGENTS.md`; TS-005 should archive or merge them deliberately.

## 17. Environment contract

Only names/default declarations were inspected; real `.env` contents were not read.

| Variable(s) | Scope | Required | Consumer | Safe default/validation | Source | Known issue |
|---|---|---|---|---|---|---|
| `VITE_NEON_AUTH_URL` | frontend | Required for auth | `neonAuth.js` | empty renders configuration error | root example | configured endpoint currently associated with JWT 404 blocker |
| `VITE_API_URL` | frontend | Optional same-origin | `api.js` | `window.location.origin` | root example | dev ports require explicit value/proxy |
| `PROJECT_NAME`, `API_V1_STR` | backend | Optional | FastAPI/config | safe code defaults | backend example/config | none identified |
| `CORS_ALLOW_ORIGINS` | backend | Required cross-origin | CORS middleware | empty allowlist | backend example/config | startup script does not validate |
| `DATABASE_URL`, `DATABASE_URL_DIRECT` | backend/worker/migrations | Required by role | engine/Alembic | empty; readiness 503 | backend example/config | target not verified in TS-001 |
| database pool/echo variables | backend/worker | Optional | engine/config | bounded typed defaults | backend example/config | runtime unverified |
| scan worker timing/concurrency/attempt variables | worker | Optional | worker/settings | typed defaults; concurrency 1 | backend example/config | deployment capacity unverified |
| Neon issuer/JWKS/audience/algorithms/cache/timeout | backend | Required for auth except audience | security/config | empty configuration fails; allowlist exists | backend example/config | real token flow broken/unverified |
| credential encryption key/version | backend | Required for integrations | credentials/config | empty is unusable | backend example/config | launcher does not validate presence |

## 18. Startup and deployment reality

`scripts/threatstream.ps1` resolves repository-relative paths, optionally activates `backend/.venv`, and opens API (`uvicorn --reload`), Vite, and worker in separate interactive PowerShell windows. It checks only npm/Python and basic paths, detects duplicate workers by command line, does not detect duplicate API/frontend processes, has no coordinated shutdown, does not wait for readiness, and opens the browser immediately. It does not print environment values. The preserved stash contains a modified version of this script; that content is not restored or accepted.

| Capability | Current state | Classification |
|---|---|---|
| Local development | Script and manual commands documented | Implemented but unverified |
| Production frontend hosting | General docs only | Documentation-only |
| Production FastAPI hosting | General docs only | Documentation-only |
| Durable worker hosting | Process command exists; no production topology | Implemented but unverified |
| Migrations | Alembic chain and commands exist | Implemented but unverified |
| Secret management | Environment/config and encrypted integration credentials | Implemented but unverified |
| CORS | Configured allowlist middleware | Implemented but unverified |
| Health/readiness | Routes exist | Test-only / implemented but unverified |
| TLS | No application/deployment enforcement found | Missing |
| Structured logs | Basic logging/correlation middleware | Implemented but unverified |
| Backups | No executable restore evidence | Missing |
| Observability | No metrics/tracing/alerting stack | Missing |
| Rate limiting | No middleware/control found | Missing |
| Webhook ingestion | No GitHub/public webhook routes | Missing |
| Job recovery | Lease recovery code/tests exist | Implemented but unverified |
| Rollback | Documentation-level guidance | Documentation-only |

## 19. Ignored/untracked artifacts

After TS-001 began, the only ordinary worktree change is the status ledger plus this audit. No ordinary untracked artifact existed because the agent-start prompt is preserved in `stash@{0}`.

| Category | Observed | Ignore protection | Result |
|---|---|---|---|
| root/backend `.env` | Yes | `.env` / `.env.*` rules, example exception | Protected; contents not inspected |
| `node_modules` | Yes | `node_modules/` | Protected |
| `dist` | Yes | `dist` | Protected |
| pytest/Python caches | Yes | `.pytest_cache` global Git behavior and `__pycache__`, `*.pyc` rules | Protected |
| logs | None enumerated | `logs`, `*.log` | Protected |
| raw scan output | None enumerated | no dedicated named pattern | Blocked pending verification |
| `repomix-output.xml` | Yes | explicit rule | Protected |
| ignored legacy bytecode-only dirs | endpoint/scheduler/service `__pycache__` trees | bytecode rules | Generated, not source; do not infer missing source from bytecode |

## 20. Preserved pre-TS-001 changes

Stash reference: `stash@{0}`
Stash commit: `58ad455967296c59aa648022451bb804d2bac3ad`
State: preserved and unapplied.

| Path | Baseline disposition | In stash | Likely future task | Acceptance statement |
|---|---|---|---|---|
| `backend/app/core/security.py` | Refactor | Yes | TS-010/TS-012 | Content not accepted or restored |
| `scripts/threatstream.ps1` | Refactor | Yes | TS-015 | Content not accepted or restored |
| `src/contexts/AuthContext.jsx` | Refactor | Yes | TS-010/TS-011 | Content not accepted or restored |
| `src/contexts/TenancyContext.jsx` | Refactor | Yes | TS-013 | Content not accepted or restored |
| `src/contexts/TenancyContext.test.jsx` | Refactor | Yes | TS-013/TS-016 | Content not accepted or restored |
| `src/index.css` | Refactor | Yes | TS-101 | Content not accepted or restored |
| `src/lib/neonAuth.js` | Refactor | Yes | TS-010/TS-011 | Content not accepted or restored |

The ordinary untracked `docs/THREATSTREAM_AGENT_START_PROMPT.txt` is also held by the `-u` stash. It is not one of the seven implementation paths.

## 21. Module disposition matrix

| Path/module | Purpose | Active | Reachable | Backend contract | Data source | Verification | Disposition | Reason / dependency risk |
|---|---|---:|---:|---|---|---|---|---|
| `app/` | backend alias | No direct behavior | Import-path dependent | N/A | N/A | Unverified | Blocked pending verification | Commands/imports may depend on path layout |
| `backend/app/api` | FastAPI routes/dependencies | Yes | Yes | Self | services | Test-only | Keep | Central API boundary |
| `backend/app/core` | config/auth/errors/credentials | Yes | Yes | Used by API/worker | env/JWKS | Test-only | Refactor | Auth currently broken in browser |
| `backend/app/database` | engine/models/repositories | Yes | Yes | Via services | PostgreSQL | Test-only | Refactor | Models concentrated in tenancy file |
| `backend/app/domains/tenancy` | identity/RBAC/workspaces/teams | Yes | Yes | tenancy routes | PostgreSQL | Test-only | Keep | Foundation domain |
| `backend/app/domains/assets` | Asset inventory | Yes | Yes | assets routes | PostgreSQL | Test-only | Keep | Reused by target plan |
| `backend/app/domains/findings` | Finding workflows | Yes | Yes | findings routes | PostgreSQL | Test-only | Keep | Core product domain |
| `backend/app/domains/integrations` | provider credentials | Yes | Yes | integration routes | PostgreSQL/external provider | Test-only | Keep | External test unverified |
| `backend/app/domains/scans` | adapter/orchestration/schedules | Yes | Yes | scan routes | PostgreSQL/Nuclei CLI | Test-only | Refactor | Real CLI/runtime unverified |
| `backend/app/workers` | durable job loop | Yes | Process entry | scan routes indirectly | PostgreSQL/scanner | Test-only | Keep | Production runtime unverified |
| `backend/app/plugins` | obsolete plugin framework | No | No | None | fabricated/subprocess/telemetry | Broken | Delete | Isolated imports; missing modules |
| `backend/alembic` | schema migrations | Yes | CLI | N/A | repository metadata | Test-only | Keep | Live DB unverified |
| `backend/tests` | backend tests | Yes | Test runner | N/A | mocks/test DB | Test-only | Keep | No browser/external acceptance |
| `docs` | controls/audit | Yes | Agent-facing | N/A | repository evidence | Unverified | Keep | Authoritative controls |
| `public` | static media | Yes | Build/browser | None | local files | Unverified | Blocked pending verification | Globe assets may be reused later |
| `scripts` | local launcher | Yes | Manual | health not awaited | local env/processes | Unverified | Refactor | Incomplete lifecycle/readiness |
| `src/components` | shared and legacy UI | Mixed | Mixed | Mixed | props/context | Test-only | Refactor | Six clearly unreferenced components; others legacy-only |
| `src/contexts` | auth/tenancy/notifications | Yes | Providers in App | API/Auth | client/session | Broken | Refactor | Auth link blocks protected app |
| `src/hooks` | generic `useApi` hook | No confirmed consumer | No | central API capable | callback | Unverified | Delete | No import references found |
| `src/layouts` | authenticated shell | Yes | Protected pages | None | contexts | Test-only | Keep | Active navigation shell |
| `src/lib` | API/domain helpers/auth client | Yes | Yes | `/api/v1` | API/Auth | Test-only | Refactor | Auth broken; obsolete helpers need proof |
| `src/pages` | active and dormant pages | Mixed | 18 concrete routes | Mixed | API/static | Broken | Refactor | Eight unregistered pages |
| `src/types` | placeholder JS type area | No verified consumer | No | None | static | Unverified | Delete | No substantive referenced contract found |
| `src/legacy` | legacy notice | No | No | None | documentation | Unverified | Move | Historical note belongs in docs archive |
| `src/index.css`, `src/App.css`, page CSS | design styling | Yes | Build imports | None | static | Unverified | Refactor | Active and legacy styling mixed |

## 22. Verified blockers

1. Real browser auth is broken by the recorded repeated JWT endpoint `404`; no evidence in the active baseline proves resolution.
2. Therefore no protected frontend route is browser-verified.
3. The legacy plugin manager imports missing modules and cannot be an active implementation.
4. Real Nuclei availability/execution is unverified; tests fake subprocess behavior.
5. Live database revision/model drift is unverified in this task.
6. No browser E2E, GitHub integration, public-intel data plane, production deployment, backup/restore, observability, or rate limiting exists as verified capability.
7. Historical documents make “functional,” migration, and scope claims that conflict with the authoritative plan and evidence standard.

## 23. Safe deletion candidates for later tasks

Fifteen candidates are supported by current import/reference evidence; deletion is deferred to the named future tasks.

| Candidate | Evidence | Risk/next task |
|---|---|---|
| Eight unregistered pages in section 6 | no router/import references | TS-003; preserve reusable primitives separately |
| `backend/app/plugins/` | no imports outside directory; manager broken | TS-004; compile/tests required |
| `src/components/Header.jsx` | no imports | TS-003 |
| `src/components/Globe.jsx` | no imports | TS-003; check public-monitor reuse intent |
| `src/components/StatsCounters.jsx` | no imports | TS-003 |
| `src/components/ThreatFeed.jsx` | no imports | TS-003 |
| `src/components/GlobalSearch.jsx` | no external imports; legacy concepts | TS-003/TS-075 |
| `src/components/SetupWizard.jsx` | no external imports | TS-003; onboarding intent review |

## 24. Required follow-up tasks

- TS-002 must lock product vocabulary and scope before UI normalization.
- TS-003 should remove only proven dormant frontend surfaces and re-check primitive imports/build/tests.
- TS-004 should remove the legacy plugin system and verify no startup imports remain.
- TS-005 should consolidate/archive the contradictory root documentation.
- TS-006 should resolve the top-level `app` alias and module layout mechanically.
- TS-007 should replace every old “functional” label with this audit’s evidence classes.
- TS-010 onward must reproduce and resolve auth in a real browser before protected-route claims.

## 25. Final conclusion

The active architecture is a plausible test-covered foundation, not a browser-verified SaaS. The authoritative scanner path is the typed domain adapter registry plus durable worker; the plugin manager is obsolete and unsafe. Active frontend routes have backend contracts, but the broken auth boundary prevents end-to-end acceptance. TS-001 changed documentation only, retained the preservation stash, and did not begin TS-002.

## Appendix A — Evidence commands

Read-only evidence included:

- `git status --short`, `git rev-parse HEAD`, `git branch --show-current`, `git remote -v`
- `git stash list`, `git stash show --name-status stash@{0}`, `git stash show --stat stash@{0}`
- `git ls-files`, `git ls-files --others --exclude-standard`, `git status --ignored --short`, `git check-ignore -v`
- `rg --files` across root, `src`, `backend`, `public`, and `scripts`
- `rg` route decorators, React route entries, imports, API calls, storage calls, mock/static/simulated markers, plugin imports, and documentation claims
- direct inspection of `src/App.jsx`, route guards, layouts/navigation, contexts, API/auth clients, `backend/app/main.py`, route modules, services, repositories, models, workers, adapters, plugins, configuration, startup, and Vite files
- `npm ls` for exact auth/React/router dependency versions
- `python -m alembic history` and `python -m alembic heads` without database connection or mutation

Large outputs, secret values, source diffs, raw scan data, and stash patches are intentionally omitted.
