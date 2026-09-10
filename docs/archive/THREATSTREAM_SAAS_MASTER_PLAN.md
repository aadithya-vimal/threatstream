> Historical record (SaaS era, superseded 2026-09-09). Not authoritative � ThreatStream is now a frontend-only visualization app. See root README.md.

# ThreatStream SaaS Master Execution Plan

**Document role:** Authoritative implementation sequence for converting the current ThreatStream repository into a reliable, demonstrable SaaS product.

**Required repository location:** `docs/THREATSTREAM_SAAS_MASTER_PLAN.md`

**Execution rule:** Tasks must be completed in order. A later phase may not begin until the current phase gate passes with recorded evidence.

**Product name:** ThreatStream
**Primary focus:** Vulnerability identification and security visibility
**Explicitly deferred:** Automated remediation, AI-generated patches, automatic fix pull requests, SIEM/EDR/SOAR expansion, malware sandboxing, endpoint agents, compliance automation, and billing unless separately authorized.

---

## 1. Mission

ThreatStream will become one platform with two deliberately separated product surfaces:

### A. Public Threat Intelligence Surface

A public, anonymous experience that displays **real cyber-threat observations** through:

- A live global globe
- A continuously updating observation feed
- Regional and category filters
- Historical trends and source breakdowns
- Clear source attribution
- A methodology and limitations section

The public product must never present simulated or fabricated records as real. It must distinguish between:

- Directly observed honeypot attack attempts
- Malware or indicator feed records
- Known-exploited-vulnerability intelligence
- Inferred geographic metadata
- Aggregated trends

The public UI must use the term **threat observation** unless the source proves a real attack attempt. Customer or workspace data must never enter this public data plane.

### B. Authenticated Vulnerability Discovery SaaS

A multi-tenant application for engineering and security teams that:

- Connects GitHub through a GitHub App
- Imports selected repositories
- Tracks repositories, branches, pull requests, and commits
- Scans complete repository baselines
- Scans pull-request and commit changes
- Scans public URLs and internet-facing application targets
- Normalizes all scanner output into one Findings model
- Deduplicates repeated detections
- Shows occurrences and scan history
- Supports assignment, status, comments, evidence, teams, permissions, and audit history

The initial private product identifies and organizes vulnerabilities. It does not automatically remediate them.

---

## 2. Final Definition of Done

The plan is complete only when all of the following are true.

### Public experience

- Anonymous visitors can open the landing page and Global Monitor without authentication.
- The globe shows current records from real, attributed data sources.
- No production component generates fake attacks, fake coordinates, fake metrics, or fake threat names.
- Each observation states its source class and confidence.
- Full source IP addresses are not unnecessarily exposed.
- The live feed updates without refreshing the page.
- Regional, source, category, protocol, and time filters work.
- Historical charts are computed from persisted aggregates.
- A methodology page explains exactly what each source represents.
- Empty, degraded, stale-source, and partial-source states are honest and visible.

### Authenticated SaaS experience

A new user can complete this exact browser journey:

1. Sign up or sign in.
2. Refresh and retain the session.
3. Create an organization and workspace.
4. Install the ThreatStream GitHub App.
5. Import a selected repository.
6. Create an Application and associate the repository.
7. run a full repository scan.
8. See dependency, secret, static-analysis, and configuration Findings when applicable.
9. Open a pull request in the connected repository.
10. See a ThreatStream scan created from the webhook.
11. See a GitHub check result linked to ThreatStream.
12. Register a public URL owned by the user.
13. Run an authorized URL scan.
14. View normalized Findings from repository and URL scanners in one queue.
15. Filter Findings by Application, repository, pull request, commit, target, category, scanner, severity, and status.
16. Assign and transition a Finding.
17. See immutable occurrence and audit history.
18. Invite another team member and verify permission differences.
19. Sign out and lose access to protected routes.

### Reliability and security

- Authentication works in a real browser; no mocked acceptance is allowed.
- Critical browser paths have automated end-to-end tests.
- GitHub webhook signatures are verified before payload parsing or persistence.
- Webhook deliveries are idempotent.
- Repository source is processed in an isolated, disposable workspace.
- User repository code is never executed.
- Dependency installation scripts are never run.
- Scanner binaries and rulesets are pinned and recorded.
- Secrets detected by scanners are never returned as raw values.
- Customer scan data is separated from public-monitor data.
- Worker restart, lease expiry, retry, and cancellation paths are tested.
- Database backup restoration is tested.
- Production migration and rollback procedures are documented.
- Health, readiness, worker state, queue depth, source freshness, and failure rates are observable.
- No critical acceptance item depends on a manually edited database row.
- The release can be demonstrated from a clean browser profile using documented steps.

---

## 3. Current Repository Baseline

The agent must begin by verifying the repository rather than assuming this document exactly matches the current checkout.

Known current characteristics from the supplied repository snapshot:

- React and Vite frontend
- FastAPI backend
- Async SQLAlchemy and PostgreSQL
- Alembic migrations
- Provider-neutral local identity mapping
- Neon Auth integration that currently fails in the real browser
- Workspace tenancy and role permissions
- Encrypted integration credentials
- Asset Inventory
- Findings
- Scanner profiles and Nuclei adapter
- PostgreSQL-backed durable worker, leases, retries, cancellation, and schedules
- Multiple dormant frontend SOC pages
- A second, obsolete backend plugin architecture
- Historical migration reports that conflict with the current implementation
- Mostly mocked frontend tests
- No Application domain
- No real GitHub App integration
- No repository, PR, or commit ingestion
- No real public threat-observation data plane

The existing Asset, Finding, audit, authorization, encryption, worker, retry, occurrence, and scheduling foundations should be reused when sound. The repository must not be rewritten merely to produce a cleaner diagram.

---

## 4. Product Boundary

### Included in the target release

- Public landing site
- Public Global Monitor
- Real threat-observation ingestion
- Public methodology and source status
- Authentication
- Multi-tenant organizations and workspaces
- Applications
- GitHub App installations
- Repositories
- Pull requests and commits
- Public URL targets
- Full repository scans
- Pull-request and commit scans
- URL scans
- Dependency vulnerability detection
- Secret detection
- Static analysis
- Infrastructure-as-code and configuration analysis
- Unified Findings
- Occurrence history
- Team membership and invitations
- Role-based permissions
- Audit history
- In-app notifications
- Reliable worker execution
- Production deployment and monitoring
- Demo environment using real scans against controlled assets

### Excluded from this release

- Automatic code fixes
- AI remediation
- Automatic remediation pull requests
- Full SIEM
- Full EDR
- SOAR playbooks
- Endpoint agents
- Malware detonation
- YARA management platform
- Threat hunting workspace
- Generic IOC enrichment console
- Network packet capture
- Customer telemetry on the public globe
- Arbitrary shell-command execution
- Arbitrary local filesystem scanning
- User-provided scanner flags
- Unbounded active scanning
- Unverified “live attack” claims
- Fabricated demo metrics
- Payment collection unless separately authorized after launch readiness

---

## 5. Target Information Architecture

### Public routes

- `/`
- `/monitor`
- `/monitor/map`
- `/monitor/feed`
- `/monitor/trends`
- `/monitor/sources`
- `/methodology`
- `/terms`
- `/privacy`
- `/auth/:path`

### Authenticated routes

Prefer the `/app` namespace for the final product. Preserve compatibility redirects from current routes during migration.

- `/app`
- `/app/applications`
- `/app/applications/:applicationId`
- `/app/repositories`
- `/app/repositories/:repositoryId`
- `/app/repositories/:repositoryId/pull-requests/:pullRequestId`
- `/app/repositories/:repositoryId/commits/:commitId`
- `/app/targets`
- `/app/targets/:targetId`
- `/app/findings`
- `/app/findings/:findingId`
- `/app/scans`
- `/app/scans/jobs/:jobId`
- `/app/scans/policies`
- `/app/integrations`
- `/app/team`
- `/app/audit`
- `/app/settings`

### Primary authenticated navigation

1. Overview
2. Applications
3. Repositories
4. Targets
5. Findings
6. Scans
7. Integrations
8. Team
9. Audit
10. Settings

Do not expose scanner internals as the primary mental model. Users choose an Application, repository, pull request, commit, or URL; ThreatStream chooses compatible scanners through policy.

---

## 6. Target Technical Architecture

```text
Public browser
    |
    +--> Public Monitor API --------------------+
    |                                           |
Authenticated browser                           |
    |                                           |
    +--> Auth provider                          |
    |                                           |
    +--> FastAPI trust boundary                  |
              |                                 |
              +--> Tenancy and RBAC             |
              +--> Applications                 |
              +--> GitHub integration           |
              +--> Repositories / PRs / commits |
              +--> Targets / Assets             |
              +--> Scan policies and jobs       |
              +--> Findings and occurrences     |
              +--> Public-intel read API <------+
              +--> Audit and notifications
                         |
                         v
                 PostgreSQL / Neon
                         |
             +-----------+------------+
             |                        |
      Scan worker fleet       Intel ingestion workers
             |                        |
      Disposable workspaces     External feeds
      Pinned scanners           Isolated honeypot gateway
```

### Required data-plane separation

Use separate modules, permissions, tables, and API routes for:

- Customer workspace data
- Public threat observations

No public query may join directly to customer Assets, Findings, repositories, raw scan results, or credentials.

### Scanner execution boundary

Repository and URL scanner execution must occur only in workers, never in the frontend or API request process.

Repository scanning requires a disposable working directory or isolated container with:

- Read-only source after acquisition
- No execution of repository scripts
- No package installation
- No inherited customer credentials
- Restricted environment variables
- Bounded CPU, memory, disk, process count, output, and duration
- Cleanup after success, failure, cancellation, or worker restart
- No secret values in logs
- No token in command-line arguments
- No access to unrelated filesystem paths

---

## 7. Agent Operating Contract

The coding agent must obey these rules throughout the plan.

### 7.1 Inspect before modifying

For every task:

1. Read the task and its dependencies.
2. Inspect current files, routes, schemas, tests, migrations, and Git state.
3. State the exact implementation approach.
4. Identify conflicts with the repository.
5. Implement only the current task.
6. Run the task-specific checks.
7. Update the status ledger.
8. Commit only the current coherent change.
9. Do not push unless the phase gate authorizes it.

### 7.2 One authoritative implementation

- One auth client
- One scanner adapter system
- One durable job system
- One schema-management system
- One provider registry per integration class
- One authoritative status document
- One active route for each product capability

Delete or archive competing implementations after proving they are unused.

### 7.3 Truthful completion

The agent must not call a feature “working” because:

- A unit test passed
- A route returned HTTP 200
- A mocked API response rendered
- OpenAPI contains an endpoint
- A migration applied
- The production build completed

A browser-facing feature is complete only after a real browser journey passes against real backend services.

### 7.4 No fake production data

Fixtures are allowed in tests. Production code must not:

- Generate fake attacks
- Return fallback vulnerabilities
- Invent hosts, ports, operating systems, locations, or CVEs
- Display static arrays as live feeds
- Replace parsing failures with fabricated results
- Label cached or historical data as current without timestamps

### 7.5 Source control

- Begin with `git status --short`, `git branch --show-current`, and `git rev-parse HEAD`.
- Preserve unrelated work.
- Never force push.
- Never rewrite public history.
- Never commit `.env`, tokens, keys, repository archives, scan outputs, caches, logs, databases, or build output.
- Keep `repomix-output.xml` untouched and untracked.
- Use focused commit messages listed under each task.
- Record final commit hashes in the status ledger.

### 7.6 Database safety

- Use Alembic only.
- Confirm the exact development target before applying any migration.
- Never run destructive tests against shared development or production data.
- Use a disposable database or isolated branch for integration tests.
- Render offline SQL for every migration.
- Keep exactly one Alembic head.
- Do not edit historical migrations after they have been applied except through an explicitly approved recovery procedure.

### 7.7 Security

- Never print full tokens, secrets, connection strings, cookies, private keys, source files, or scanner payloads.
- Webhook signatures must be validated using the raw request body.
- Use constant-time comparisons.
- Use least-privilege GitHub App permissions.
- Installation tokens are ephemeral and must not be assumed to have a fixed string length.
- Do not put repository tokens in subprocess arguments.
- Detected secret values must be discarded or redacted before persistence.
- Do not scan targets without recorded authorization.

### 7.8 Stop conditions

Stop and report instead of inventing behavior when:

- Current repository state contradicts the task
- An external API contract cannot be confirmed from official documentation
- A required credential or service is unavailable
- A migration target cannot be positively identified
- A security control cannot be implemented safely
- A phase acceptance gate fails
- The requested change would silently broaden product scope

---

## 8. Required Project-Control Files

The following files must exist before implementation proceeds:

### `AGENTS.md`

A short root-level instruction file that tells every agent to read this master plan and the current status ledger before editing.

### `docs/THREATSTREAM_SAAS_MASTER_PLAN.md`

This document. It is authoritative for sequence and product scope.

### `docs/STATUS.md`

A live execution ledger with:

- Current task
- Completed task IDs
- Blocked task IDs
- Baseline commit
- Latest validated commit
- Current Alembic revision
- Current test counts
- Browser acceptance state
- Deployment state
- Known risks
- Exact next task

### `docs/PRODUCT.md`

The final product contract: audience, problem, two surfaces, scope, exclusions, vocabulary, and user journeys.

### `docs/ARCHITECTURE.md`

Only the current target and implemented architecture. Historical migrations belong in `docs/archive/`.

### `docs/DEVELOPMENT.md`

Local setup, environment contracts, test commands, worker commands, and safe scanner prerequisites.

### `docs/DEPLOYMENT.md`

Environment separation, migration order, process topology, backups, monitoring, and rollback.

### `docs/SECURITY.md`

Threat model, data classification, scanner isolation, secret handling, webhook validation, and incident response.

---

# 9. Execution Phases and Tasks

---

## PHASE 0 — Product Reset and Repository Truth

**Goal:** Remove ambiguity before adding functionality.

### TS-000 — Initialize the execution ledger

**Outcome**

Create the control files and record the actual repository baseline.

**Work**

- Record branch, HEAD, remotes, status, current migration, package versions, Python version, Node version, and active processes.
- Create `docs/STATUS.md`.
- Add this plan to `docs/`.
- Add the root `AGENTS.md`.
- Mark every task as `not_started`, `in_progress`, `blocked`, or `complete`.
- Record the exact next task as `TS-001`.

**Acceptance**

- A new agent can open the repository and identify the current task in under one minute.
- No implementation code changes.
- The worktree contains only documentation-control changes.

**Evidence**

- `git diff --check`
- File links in the status ledger

**Commit**

`docs: add ThreatStream SaaS execution controls`

---

### TS-001 — Produce a repository reality audit

**Outcome**

A precise inventory of active, legacy, duplicated, broken, and unverified code.

**Work**

Audit:

- Active frontend routes
- Unregistered pages
- Frontend API modules
- Auth providers and SDK versions
- Backend routes
- Domain services
- Repositories
- Models
- Migrations
- Workers
- Scanner adapters
- Legacy plugins
- Tests and mock boundaries
- Documentation contradictions
- Environment files
- Startup scripts
- Deployment files
- Untracked and ignored artifacts

For every major module, classify it as:

- Keep
- Refactor
- Move
- Delete
- Blocked pending verification

Create `docs/REPOSITORY_AUDIT.md`.

**Acceptance**

- Every top-level source directory has a disposition.
- Duplicate scanner systems are explicitly identified.
- Every active route maps to a backend contract.
- Every “functional” claim is labeled browser-verified, API-verified, test-only, or unverified.

**Evidence**

- Import graph or `rg` references for deletion candidates
- Route map
- API map
- Test-boundary map

**Commit**

`docs: audit current ThreatStream repository`

---

### TS-002 — Lock the product contract

**Outcome**

Create the authoritative product definition.

**Work**

Write `docs/PRODUCT.md` with:

- Product statement
- Public surface
- Private surface
- Personas
- Core user journeys
- Included and excluded scope
- Vocabulary
- Data-truth rules
- Customer-data isolation
- Release definition
- Future roadmap separated from current release

Normalize the name to `ThreatStream` in active documentation and UI.

**Acceptance**

- No active document describes ThreatStream as a SIEM, EDR, SOAR, malware sandbox, or generic security toolbox.
- The public monitor uses “threat observations” accurately.
- Remediation automation is explicitly deferred.
- Application, repository, PR, commit, target, scan, occurrence, and Finding are defined.

**Commit**

`docs: define ThreatStream product contract`

---

### TS-003 — Remove dormant frontend product surfaces

**Outcome**

The active frontend contains only code relevant to the defined product.

**Work**

Prove that dormant pages are not imported. Then delete or move to `docs/archive/source-reference/` only when there is a concrete reason to retain text.

Expected deletion candidates include legacy:

- Threat hunting
- Threat intelligence
- Malware analysis
- IOC enrichment
- Graph investigation
- YARA platform
- Duplicate connectors
- Duplicate audit pages
- Unused globe or threat-feed components that depend on fabricated data

Do not delete reusable visual primitives until their imports are audited.

**Acceptance**

- `src/pages` contains only active or explicitly planned pages.
- No legacy page can be reached through routing.
- No fake event arrays or simulated scan actions remain in active frontend code.
- Build and tests pass.

**Evidence**

- `rg` results showing no imports before deletion
- Route list
- `npm test`
- `npm run build`

**Commit**

`refactor: remove retired frontend product surfaces`

---

### TS-004 — Remove the obsolete backend plugin architecture

**Outcome**

Only the scanner-neutral adapter framework remains authoritative.

**Work**

Audit and remove the obsolete `backend/app/plugins` system and any top-level alias or service imports tied to it.

Delete simulated or unsafe behavior including:

- Hardcoded hosts
- Invented ports or CVEs
- Sleep-based fake progress
- Fallback fabricated scan records
- Plugin manager registries unrelated to the current scan domain
- Legacy telemetry collectors without real ingestion contracts

Preserve only code deliberately migrated into the current adapter architecture with tests.

**Acceptance**

- Exactly one scanner interface and registry remain.
- Backend startup imports no removed plugin.
- No production scanner returns fabricated fallback findings.
- Compilation and all existing tests pass.

**Evidence**

- `rg "app\.plugins|PluginManager|BasePlugin"`
- `python -m compileall app`
- `python -m pytest -q`

**Commit**

`refactor: remove obsolete scanner plugin system`

---

### TS-005 — Consolidate documentation

**Outcome**

Current documentation is short, authoritative, and non-contradictory.

**Work**

Move historical migration reports, phase reports, removal checklists, and superseded plans into `docs/archive/`.

Replace root-level documentation sprawl with the required current documents.

Add a header to every archived document:

> Historical record. Not authoritative for current product behavior.

Update README to contain only:

- Product statement
- Screenshots later
- Architecture summary
- Local quick start
- Documentation index
- Current release status

**Acceptance**

- No current document says a completed domain is still “future”.
- No archived document is linked as current setup guidance.
- README can be understood without reading migration history.

**Commit**

`docs: consolidate current and historical documentation`

---

### TS-006 — Normalize repository structure without rewriting working code

**Outcome**

The repository is navigable and has clear ownership boundaries.

**Work**

- Place frontend page modules into feature directories where safe.
- Create backend domain directories for future `applications`, `repositories`, `github`, `public_intel`, and `notifications`.
- Remove the legacy top-level `app` alias only after proving all commands and imports work directly from `backend`.
- Standardize test locations and naming.
- Keep changes mechanical; no product behavior in this task.

**Acceptance**

- Backend commands work from the documented working directory.
- Import paths are unambiguous.
- Frontend feature folders align with routes.
- All tests and build pass.

**Commit**

`refactor: normalize ThreatStream project structure`

---

### TS-007 — Establish the truth-based functionality matrix

**Outcome**

Replace vague “functional” claims with evidence classes.

**Work**

Create or rewrite `docs/STATUS.md` tables with columns:

- Capability
- Route
- Backend contract
- Data source
- Unit tested
- Integration tested
- Browser verified
- Production verified
- Known limitations

Do not mark current authentication or protected workflows complete until real browser verification occurs.

**Acceptance**

- Every active route has a row.
- “Test-only” is visibly different from “browser-verified”.
- Broken auth is recorded as the current release blocker.

**Commit**

`docs: establish evidence-based functionality status`

---

### PHASE 0 GATE

Proceed only when:

- Legacy frontend surfaces are removed.
- The obsolete backend plugin system is removed.
- Documentation has one current source of truth.
- Product scope is locked.
- All baseline tests and builds pass.
- `docs/STATUS.md` names `TS-010` as the next task.

---

## PHASE 1 — Make the Existing Core Operational

**Goal:** A real user can authenticate and use the existing workspace, Asset, Finding, Scan, Team, Integration, and Audit features.

### TS-010 — Resolve the authentication-provider decision

**Outcome**

Use one stable, supported authentication integration.

**Work**

First reproduce and diagnose the current Neon Auth failure in a real browser.

Inspect:

- Exact SDK versions
- Exact generated token endpoint
- Branch Auth URL
- Session request
- JWT request
- Issuer
- JWKS
- Cookie and origin behavior
- Backend claim validation
- Current upstream package support and security advisories

Create an ADR with one of two outcomes:

1. Keep Neon Auth after proving the current official SDK and branch service work securely.
2. Replace the broken beta integration with a stable OIDC or Better Auth implementation while preserving the provider-neutral backend principal and local identity mapping.

Do not keep two providers active. Do not weaken token validation.

**Acceptance**

- The provider decision is evidence-based.
- One client, one provider, and one bearer-token flow remain.
- A migration plan exists before code changes if the provider changes.
- No unresolved critical dependency advisory is silently accepted.

**Commit**

`docs: decide production authentication boundary`

---

### TS-011 — Implement working browser authentication

**Outcome**

Sign-up, sign-in, restoration, and sign-out work in a real browser.

**Work**

- Replace or correct the frontend auth client.
- Remove obsolete providers and imports.
- Implement explicit loading, signed-out, signed-in, and error states.
- Prevent token request loops and concurrent refresh storms.
- Do not store bearer tokens in local storage.
- Standardize `localhost` versus `127.0.0.1`.
- Ensure protected routes wait for auth initialization.
- Add a useful terminal error after bounded retry.

**Acceptance**

From a clean browser profile:

- Sign-up works if enabled.
- Sign-in works.
- Invalid credentials show a useful error.
- Refresh preserves the session.
- Sign-out clears the session.
- The broken JWT endpoint is no longer requested.
- No infinite request loop occurs.
- No blank protected route occurs.

**Evidence**

- Browser network log summary
- Console error summary
- Screenshot references stored outside source control if needed
- Automated browser test

**Commit**

`fix: restore reliable browser authentication`

---

### TS-012 — Align backend token verification

**Outcome**

FastAPI validates the real token issued by the selected provider.

**Work**

Verify actual:

- Algorithm
- `kid`
- Issuer
- Audience behavior
- Subject
- Expiry
- Not-before
- JWKS rotation

Preserve:

- Signature verification
- Issuer validation
- Algorithm allowlist
- Bounded JWKS timeout and cache
- One refresh on unknown key
- Provider-neutral principal
- Idempotent local identity mapping

**Acceptance**

- Real browser token succeeds on protected API.
- Missing token returns 401.
- Invalid signature returns 401.
- Wrong issuer returns 401.
- Expired token returns 401.
- Unknown workspace access returns 403.
- No raw token is logged.

**Commit**

`fix: align backend authentication verification`

---

### TS-013 — Repair onboarding and tenancy bootstrap

**Outcome**

A newly authenticated user can create the first organization and workspace without database intervention.

**Work**

- Verify the empty-tenant state.
- Make organization/workspace creation atomic.
- Grant the creator the documented administrator role.
- Ensure retries do not duplicate organizations.
- Show recoverable errors.
- Ensure workspace selection persists only as a non-secret preference.
- Verify a second user receives no access by default.

**Acceptance**

- Clean account can bootstrap.
- Refresh retains selected workspace.
- Duplicate submission is safe.
- Cross-tenant access is denied.

**Commit**

`fix: complete workspace onboarding flow`

---

### TS-014 — Standardize API authentication and error handling

**Outcome**

Every frontend request uses one safe API client.

**Work**

- Centralize bearer-token acquisition.
- Attach workspace context consistently.
- Retry once on recoverable 401 after token refresh.
- Prevent recursive 401 loops.
- Preserve correlation IDs.
- Normalize error envelopes.
- Add cancellation support for route changes where useful.
- Remove direct fetch calls that bypass the client.

**Acceptance**

- One API client owns authentication.
- No route performs per-render token acquisition.
- Backend errors produce visible messages.
- 401, 403, 404, 409, 422, 429, 500, and network failures have distinct handling.

**Commit**

`refactor: centralize authenticated API requests`

---

### TS-015 — Make the local runtime deterministic

**Outcome**

One documented command starts the frontend, API, and worker correctly.

**Work**

Update `scripts/threatstream.ps1` and cross-platform documentation.

Requirements:

- Repository-relative paths
- Environment validation without secret output
- No arbitrary process killing
- Clear port-conflict errors
- API, frontend, and worker started independently
- Clean shutdown instructions
- Readiness check before opening browser
- Optional test mode explicitly separated from production mode

**Acceptance**

A new checkout can be started using the documented steps without discovering hidden variables from source code.

**Commit**

`chore: make local ThreatStream runtime deterministic`

---

### TS-016 — Add real browser end-to-end tests

**Outcome**

The critical auth and workspace path is automatically tested.

**Work**

Add Playwright or an existing equivalent.

Cover:

- Signed-out redirect
- Sign-in
- Protected API request
- Workspace bootstrap or selection
- Refresh restoration
- Sign-out
- No repeated JWT failure
- Error rendering

Use environment-provided test credentials or an isolated test-user strategy. Never commit credentials.

**Acceptance**

- Tests run locally and in CI against an isolated test environment.
- Failure artifacts are retained by CI, not committed.
- Tests assert network status, not only visible text.

**Commit**

`test: add authenticated browser acceptance coverage`

---

### TS-017 — Perform the existing-product browser audit

**Outcome**

Every current active feature is tested manually through the browser.

**Work**

Verify:

- Overview
- Assets list/create/detail/edit/deactivate
- Findings list/create/detail/edit/status/comment/evidence
- Scans overview/profile/job/schedule
- Integrations
- Teams
- Audit
- Navigation
- Refresh on detail pages
- Permission states
- Empty states
- Error states

Fix all P0 and P1 defects discovered. Record lower-priority defects with task IDs.

**Acceptance**

One real account completes:

```text
Sign in
→ bootstrap workspace
→ create Asset
→ create linked Finding
→ update Finding
→ create scan profile
→ inspect scanner unavailable or available state
→ inspect Team
→ inspect Audit
→ refresh
→ sign out
```

**Commit**

Use focused fixes rather than one audit mega-commit.

---

### TS-018 — Establish application-wide error boundaries and telemetry hooks

**Outcome**

Unexpected failures are visible and diagnosable.

**Work**

- Add frontend route error boundaries.
- Add backend structured logging with correlation IDs.
- Redact secrets and tokens.
- Add safe exception mapping.
- Add request timing.
- Add worker job correlation.
- Add hooks for production error monitoring without hard-coding a vendor.

**Acceptance**

- A forced frontend exception shows a recovery UI.
- A forced backend exception returns a safe envelope.
- Logs correlate browser request, API request, worker job, and audit event where applicable.
- No secret appears in test logs.

**Commit**

`feat: add safe application error boundaries`

---

### PHASE 1 GATE

Proceed only when:

- Real browser authentication works.
- A clean user can bootstrap a workspace.
- Existing protected routes pass browser audit.
- Automated browser auth tests pass.
- The API, frontend, and worker start deterministically.
- No infinite auth request exists.
- `docs/STATUS.md` names `TS-020` as next.

---

## PHASE 2 — Introduce the Application-Centric Domain

**Goal:** Make the product understandable to users.

### TS-020 — Design the Application domain

**Outcome**

Applications become the top-level unit for vulnerability discovery.

**Required model**

`applications`

- `id`
- `organization_id`
- `workspace_id`
- `name`
- `slug`
- `description`
- `business_criticality`
- `lifecycle`
- `owner_user_id`, nullable
- `is_active`
- `version`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Suggested lifecycle values:

- `production`
- `pre_production`
- `internal`
- `experimental`
- `retired`

Create durable associations from Applications to:

- Repositories
- Assets/Targets
- Findings
- Scan jobs

**Acceptance**

- Unique application slug within workspace.
- Soft deactivation.
- Optimistic concurrency.
- Workspace isolation.
- Safe audit summaries.
- Migration renders offline and has one head.

**Commit**

`feat: add workspace application domain`

---

### TS-021 — Design the Repository domain

**Outcome**

A Repository is a first-class connected source, not only an Asset identifier.

**Required model**

`repositories`

- `id`
- `organization_id`
- `workspace_id`
- `application_id`, nullable until assigned
- `provider`
- `provider_repository_id`
- `owner`
- `name`
- `full_name`
- `default_branch`
- `visibility`
- `archived`
- `fork`
- `installation_id`
- `html_url`
- `last_synced_at`
- `last_push_at`
- `is_enabled`
- `version`
- timestamps

Never store an installation token.

**Acceptance**

- Provider repository ID is unique within provider.
- Repository access is constrained by the installation and workspace.
- Archived or removed repositories stop new scans without deleting history.

**Commit**

`feat: add connected repository domain`

---

### TS-022 — Model pull requests and commits

**Outcome**

ThreatStream can represent scan subjects generated by GitHub activity.

**Models**

`pull_requests`

- Repository relation
- Provider PR ID and number
- State
- Title
- Base ref and SHA
- Head ref and SHA
- Author provider ID
- Draft
- Opened, updated, merged, closed timestamps
- Last synchronized timestamp

`commits`

- Repository relation
- SHA
- Author metadata with privacy limits
- Commit timestamp
- Message summary with length bound
- Associated PR when known

Do not copy full source diffs into these tables.

**Acceptance**

- Provider identities are stable.
- Replayed webhooks update rather than duplicate.
- Cross-workspace relations are impossible.

**Commit**

`feat: add pull request and commit domain`

---

### TS-023 — Add a generic scan-subject model

**Outcome**

The scanner pipeline can scan an Asset, repository baseline, PR, or commit without special-case job tables.

**Suggested concept**

`scan_subjects`

- `subject_type`
- `application_id`
- `asset_id`
- `repository_id`
- `pull_request_id`
- `commit_id`
- `ref`
- `sha`
- Safe immutable snapshot

Enforce exactly the valid relation combination for each subject type.

**Acceptance**

- Existing Asset scans remain supported.
- Repository, PR, and commit jobs use the same durable worker.
- The job owns an immutable subject snapshot.

**Commit**

`refactor: generalize scan job subjects`

---

### TS-024 — Extend Findings with product context

**Outcome**

One Finding can be traced to its Application and exact scan subject.

Add or normalize:

- `application_id`
- `repository_id`
- `pull_request_id`
- `commit_id`
- `asset_id`
- `category`
- `scanner_type`
- `rule_id`
- `vulnerability_id`
- `file_path`
- `start_line`
- `end_line`
- `endpoint`
- `package_name`
- `installed_version`
- `fixed_version`
- `confidence`

Preserve existing analyst-authored fields and occurrence history.

**Acceptance**

- Findings remain valid when optional subject records are deactivated.
- Source-controlled paths are normalized and bounded.
- Secret values never enter evidence or fingerprint material.
- Existing Findings migrate safely.

**Commit**

`feat: add application and source context to findings`

---

### TS-025 — Implement Application and Repository APIs

**Outcome**

Complete workspace-scoped CRUD and read models.

Include:

- Applications list/create/detail/update/deactivate
- Repository list/detail/enable/disable/assign-to-application
- Application repository and target associations
- Application Findings summary
- Application scan history

Permissions:

- `application:read`
- `application:write`
- `application:manage`
- `repository:read`
- `repository:manage`

**Acceptance**

- Pagination, sorting, filtering, search, 409 conflicts, and 404 behavior match existing conventions.
- Every repository query is workspace-scoped.
- Organization administrators retain documented bypass only.

**Commit**

`feat: add application and repository APIs`

---

### TS-026 — Build Application-first frontend experiences

**Outcome**

Users navigate through Applications rather than disconnected security objects.

Build:

- Applications list
- Application creation
- Application detail
- Repository assignment
- URL/target assignment
- Finding summary
- Scan history
- Owner and criticality editing
- Empty, permission, loading, error, not-found, and conflict states

**Acceptance**

- A user can create an Application and attach an existing Asset.
- Application detail links to repositories, targets, Findings, and scans.
- No fake risk score.

**Commit**

`feat: add application management experience`

---

### TS-027 — Migrate existing Assets and Findings safely

**Outcome**

The new domain does not discard current data.

**Work**

- Keep existing Assets.
- Allow unassigned Assets and Findings temporarily.
- Provide UI to assign them to Applications.
- Add optional backfill only where deterministic.
- Do not invent Application names.
- Do not silently merge records.

**Acceptance**

- Existing records remain accessible.
- Migration downgrade behavior is documented.
- One Alembic head.
- Real development migration is verified only after target confirmation.

**Commit**

`chore: migrate application context schema`

---

### PHASE 2 GATE

Proceed only when:

- Applications are the primary private product concept.
- A user can create an Application and attach a target.
- Repository, PR, commit, and scan-subject schemas exist.
- Existing data remains valid.
- Browser tests cover Application creation and detail.
- `docs/STATUS.md` names `TS-030` next.

---

## PHASE 3 — GitHub App Integration

**Goal:** Import real repositories and receive trustworthy change events.

### TS-030 — Register and document the GitHub App

**Outcome**

Create one GitHub App for ThreatStream.

Use minimum permissions required for the release. Expected initial repository permissions:

- Metadata: read
- Contents: read
- Pull requests: read
- Checks: write
- Commit statuses only if required
- Administration only if an official endpoint genuinely requires it; avoid by default

Expected events:

- `installation`
- `installation_repositories`
- `push`
- `pull_request`
- `check_run` only if rerun actions are implemented

**Work**

Create `docs/GITHUB_APP_SETUP.md` with:

- App creation
- Callback URL
- Webhook URL
- Secret
- Private key storage
- Permissions
- Events
- Development tunnel instructions
- Production configuration
- Rotation process

**Acceptance**

- No PAT is required for normal operation.
- Permissions are justified endpoint by endpoint.
- The private key is backend-only.
- The webhook secret is backend-only.

**Commit**

`docs: define GitHub App configuration`

---

### TS-031 — Implement GitHub App credential handling

**Outcome**

Secure app-level authentication and ephemeral installation tokens.

**Work**

- Store GitHub App ID and private key as deployment secrets.
- Generate app JWTs with bounded lifetime.
- Exchange for installation access tokens.
- Cache tokens only until shortly before expiry.
- Do not assume a fixed token length.
- Do not persist installation tokens.
- Do not log JWTs or tokens.
- Use a typed GitHub client with bounded timeouts and retries.

**Acceptance**

- Unit tests use generated test keys.
- Token expiry and refresh are tested.
- Secret redaction tests pass.
- No token enters subprocess arguments.

**Commit**

`feat: add secure GitHub App authentication`

---

### TS-032 — Implement the webhook trust boundary

**Outcome**

GitHub deliveries are authenticated, idempotent, and auditable.

**Work**

Create a public webhook route that:

1. Reads the exact raw body.
2. Verifies `X-Hub-Signature-256` using HMAC-SHA256.
3. Uses constant-time comparison.
4. Validates content type and size.
5. Extracts delivery ID and event type.
6. Persists a safe delivery record.
7. Rejects duplicate delivery IDs idempotently.
8. Queues processing after commit.
9. Returns quickly.
10. Never logs full payloads.

Suggested table:

`github_webhook_deliveries`

- delivery ID
- event type
- action
- installation ID
- repository provider ID
- received time
- processing state
- payload hash
- safe error summary

**Acceptance**

- Invalid signature rejected.
- Modified payload rejected.
- Missing signature rejected.
- Replay does not duplicate domain records or jobs.
- Oversized payload rejected.
- Processing failure can be retried safely.

**Commit**

`feat: add verified GitHub webhook ingestion`

---

### TS-033 — Implement installation lifecycle

**Outcome**

GitHub installations map safely to workspaces.

**Work**

Handle:

- Installation created
- Installation suspended
- Installation unsuspended
- Installation deleted
- Repository access added
- Repository access removed

Model:

`github_installations`

- workspace relation
- provider installation ID
- account provider ID
- account login
- account type
- repository selection mode
- suspended state
- installed by user
- timestamps

Require a signed-in user with `integration:manage` to complete the installation-to-workspace binding.

**Acceptance**

- A webhook alone cannot attach an installation to an arbitrary workspace.
- Deleted installation disables future scans but preserves history.
- Removed repositories stop scans.
- Workspace isolation tests pass.

**Commit**

`feat: manage GitHub App installations`

---

### TS-034 — Synchronize repositories

**Outcome**

ThreatStream imports authoritative repository metadata.

**Work**

- List repositories available to an installation.
- Upsert metadata by provider repository ID.
- Track access removal.
- Support manual resync.
- Bound pagination and API retries.
- Record sync state and safe errors.
- Do not fetch source code in the API process.

**Acceptance**

- Selected repositories appear in the UI.
- Private repository names are visible only to authorized workspace users.
- Replayed sync is idempotent.
- Removed access is reflected.

**Commit**

`feat: synchronize GitHub repositories`

---

### TS-035 — Build GitHub installation and import UI

**Outcome**

A user can install the App and choose repositories without manual configuration.

**Experience**

- GitHub integration status
- Install button
- Installation callback
- Account and repository list
- Search and selection
- Import
- Assign to Application
- Resync
- Suspended and removed states
- Permission guidance
- Error recovery

**Acceptance**

- Full flow works in browser.
- UI never asks for a personal access token.
- The user can see exactly which repositories are accessible.
- Installation callback cannot be forged into another workspace.

**Commit**

`feat: add GitHub repository connection experience`

---

### TS-036 — Implement safe repository source acquisition

**Outcome**

Workers obtain source for a specific repository and SHA without exposing credentials.

**Preferred process**

- Generate an ephemeral installation token.
- Acquire a provider archive for the exact SHA or perform a controlled shallow clone.
- Pass credentials through an ephemeral credential helper or request header mechanism, never a command argument.
- Verify archive size and content length.
- Extract into a worker-owned disposable directory.
- Reject absolute paths, `..` traversal, symlink escapes, device files, and excessive file counts.
- Record source SHA.
- Remove credentials before scanner execution.
- Make source read-only.
- Delete all files after execution.

**Limits**

Define:

- Maximum repository bytes
- Maximum extracted bytes
- Maximum file count
- Maximum individual file size
- Maximum path length
- Acquisition timeout

**Acceptance**

- Private repository acquisition works.
- Wrong installation cannot access repository.
- Zip-slip/tar-slip fixtures are rejected.
- Symlink escapes are rejected.
- Cleanup works after crash simulation.
- Repository scripts are never executed.

**Commit**

`feat: add isolated repository source acquisition`

---

### TS-037 — Process push and pull-request events

**Outcome**

GitHub activity updates Repository, PR, and Commit records.

**Work**

- Upsert push commit and branch head.
- Upsert PR state and SHAs.
- Handle synchronize, reopened, ready-for-review, closed, and merged actions.
- Ignore unsupported actions safely.
- Create a scan request only when policy allows.
- Deduplicate by repository, event, and SHA.
- Record webhook-to-job trace.

**Acceptance**

- Replayed events do not duplicate jobs.
- Draft PR policy is explicit.
- Deleted branches and force pushes do not corrupt history.
- Fork PR limitations are documented and handled safely.

**Commit**

`feat: ingest GitHub changes into scan subjects`

---

### TS-038 — Add GitHub integration tests

**Outcome**

The complete GitHub trust and sync layer is deterministic.

**Cover**

- Signature verification
- Replay
- Installation binding
- Installation token refresh
- Repository sync
- Access removal
- Push upsert
- PR upsert
- Fork PR
- Suspended installation
- Private repository acquisition
- Archive traversal attacks
- Token/log redaction
- Workspace isolation

**Commit**

`test: cover GitHub integration workflows`

---

### PHASE 3 GATE

Proceed only when:

- A real GitHub App installation works.
- A private test repository can be imported.
- A real webhook is verified and processed.
- Repository source can be acquired for a specific SHA.
- No PAT is needed.
- Browser and integration tests pass.
- `docs/STATUS.md` names `TS-040` next.

---

## PHASE 4 — Repository Vulnerability Scanning

**Goal:** Produce real, safe Findings from repositories.

### TS-040 — Define scan policies

**Outcome**

Users choose security intent; the system chooses scanner adapters.

Model a policy with:

- Name
- Trigger types: manual, schedule, push, pull request
- Subject types: repository baseline, PR, commit, URL
- Scanner capabilities
- Severity threshold
- Included paths
- Excluded paths
- Maximum duration
- Concurrency
- Enabled state
- Version

Initial capability groups:

- Dependency vulnerabilities
- Secret detection
- Static analysis
- IaC and configuration
- URL vulnerability checks

Do not expose arbitrary command flags.

**Acceptance**

- Strict validated schemas.
- Safe defaults.
- No scanner-specific fields in generic policy unless namespaced and validated by the adapter.
- One policy can be assigned to Applications or Repositories.

**Commit**

`feat: add vulnerability scan policies`

---

### TS-041 — Harden the worker sandbox

**Outcome**

Untrusted repositories cannot affect the host.

**Work**

Implement or document an enforceable execution boundary using the current deployment environment.

Required controls:

- Disposable workspace
- Non-root execution
- Read-only source
- Writable output directory only
- CPU and memory limits
- Process count limit
- Disk quota
- Timeout
- Restricted environment
- No Docker socket
- No cloud metadata access
- Bounded network egress
- Cleanup
- Scanner version inventory

Do not claim isolation if the current platform cannot enforce it. Record any remaining deployment requirement as a blocker.

**Acceptance**

- A malicious fixture cannot write outside the workspace.
- A fork bomb or excessive output is stopped.
- Timeout and cancellation clean up child processes.
- No repository code is run.

**Commit**

`security: isolate repository scan execution`

---

### TS-042 — Implement secret detection adapter

**Outcome**

Detect committed secrets without persisting the secret value.

Use a maintained scanner such as Gitleaks or a verified equivalent through the scanner adapter interface.

**Normalization**

- Category: `secret`
- Rule ID
- Safe title
- Severity mapping
- Relative path
- Start line
- Commit/SHA context
- Redacted indicator
- Fingerprint excluding secret value

Immediately discard:

- Matched secret
- Entropy sample
- Source line
- Context containing the secret

**Acceptance**

- Synthetic secret fixture creates a Finding.
- API and database contain no raw secret.
- Logs contain no raw secret.
- Repeated scan deduplicates.
- Resolved Finding reopens on recurrence.

**Commit**

`feat: add safe repository secret detection`

---

### TS-043 — Implement dependency vulnerability adapter

**Outcome**

Detect vulnerable dependencies from repository manifests and lock files.

Use Trivy or a verified equivalent through the generic adapter.

**Normalization**

- Category: `dependency`
- Vulnerability ID
- Package ecosystem
- Package name
- Installed version
- Fixed version
- Manifest or lock-file path
- Severity
- Advisory references with limits
- Application/repository/SHA context

**Safety**

- No package installation
- No build execution
- No postinstall scripts
- No arbitrary config path from users
- Controlled scanner cache
- Pinned scanner version

**Acceptance**

- Controlled vulnerable lockfile produces a real Finding.
- Clean lockfile produces no fabricated Finding.
- Unknown/malformed sections do not invent data.
- Fingerprint is stable across repeated scans.

**Commit**

`feat: add dependency vulnerability scanning`

---

### TS-044 — Implement static-analysis adapter

**Outcome**

Detect source-code security weaknesses.

Use Semgrep or a verified equivalent.

**Requirements**

- Pinned ruleset version
- JSON output
- No network rule fetch during each scan unless performed by a controlled updater
- Safe rule allowlist
- Language detection
- Relative paths
- Line ranges
- CWE/OWASP metadata when provided
- No source excerpt containing secrets by default

**Acceptance**

- Controlled vulnerable code produces a Finding.
- Scanner rule and version are recorded.
- Duplicate scan does not duplicate Finding.
- Unsupported language returns a truthful coverage result.

**Commit**

`feat: add repository static analysis`

---

### TS-045 — Implement IaC and configuration scanning

**Outcome**

Detect misconfigurations in Dockerfiles, Terraform, Kubernetes, CloudFormation, workflows, and other supported configuration.

Use Trivy misconfiguration scanning or another verified adapter.

**Acceptance**

- Controlled insecure Dockerfile/Terraform fixture produces Findings.
- Safe evidence is bounded.
- Rule ID and target type are present.
- No repository code executes.

**Commit**

`feat: add infrastructure configuration scanning`

---

### TS-046 — Generalize scanner result normalization

**Outcome**

Every adapter emits the same typed normalized contract.

Required normalized fields:

- Category
- Scanner
- Scanner version
- Rule ID
- Vulnerability ID
- Title
- Description
- Severity
- Confidence
- Relative path or endpoint
- Line range
- Package context
- Safe evidence
- Safe metadata
- Fingerprint material
- Coverage scope
- Parser warnings

**Acceptance**

- Generic orchestration imports no scanner-specific parser.
- Raw results remain private.
- Secret category has stricter evidence projection.
- Unknown fields are ignored safely.

**Commit**

`refactor: unify scanner finding normalization`

---

### TS-047 — Implement repository scan bundles

**Outcome**

One policy-triggered job can run multiple scanner capabilities against one immutable subject.

**Work**

- Create one parent scan job.
- Create adapter execution records.
- Run capabilities sequentially initially unless resource controls permit bounded parallelism.
- Preserve partial results.
- Distinguish completed, partially completed, failed, and cancelled.
- Aggregate category and scanner counters.
- Link every Finding occurrence to adapter execution.

**Acceptance**

- One repository scan can run secret, dependency, SAST, and IaC adapters.
- Failure of one adapter does not erase successful results.
- UI shows partial coverage honestly.
- Retry does not duplicate occurrences.

**Commit**

`feat: orchestrate repository security scan bundles`

---

### TS-048 — Add scan coverage and freshness

**Outcome**

Users can understand what was actually scanned.

Record:

- Subject SHA
- Policy version
- Adapter versions
- Ruleset/database versions
- Included capabilities
- Excluded paths
- Files inspected
- Files skipped
- Completion state
- Started/completed time
- Coverage warnings

Do not auto-resolve missing Findings until complete-scan semantics are proven.

**Acceptance**

- Every completed job has a coverage summary.
- Partial scan cannot be mistaken for complete coverage.
- Finding detail links to originating coverage.

**Commit**

`feat: expose scan coverage and freshness`

---

### TS-049 — Build deterministic scanner integration tests

**Outcome**

Real scanner adapters are tested with controlled fixtures.

Create a private or local fixture repository owned by the project containing:

- One vulnerable dependency
- One synthetic secret
- One SAST weakness
- One IaC misconfiguration
- Safe clean controls

Do not use real credentials.

**Acceptance**

- Each adapter produces expected normalized Findings.
- Secret value never leaves the worker.
- Repeated baseline scan deduplicates.
- Scanner failure creates truthful partial status.
- Worker restart resumes safely.

**Commit**

`test: add real repository scanner fixtures`

---

### PHASE 4 GATE

Proceed only when:

- A connected repository can run a real baseline scan.
- At least dependency, secret, static-analysis, and IaC categories work.
- No repository code executes.
- Findings are real and normalized.
- Raw secrets never persist.
- Coverage is visible.
- `docs/STATUS.md` names `TS-050` next.

---

## PHASE 5 — Pull Request and Commit Security

**Goal:** Make ThreatStream useful during development.

### TS-050 — Trigger scans from repository events

**Outcome**

Policies create jobs for push and pull-request events.

**Rules**

- Deduplicate by repository, trigger type, SHA, and policy version.
- Allow manual rerun as a new occurrence.
- Define draft PR behavior.
- Define branch allowlists.
- Bound concurrent jobs per repository.
- Coalesce obsolete queued jobs when a newer PR SHA arrives.
- Never cancel a running job without an explicit policy.

**Acceptance**

- One PR synchronization event creates one eligible job.
- Replay creates none.
- New SHA creates a new job.
- Stale queued SHA is marked superseded.

**Commit**

`feat: trigger scans from GitHub changes`

---

### TS-051 — Add diff-aware scan context

**Outcome**

PR results distinguish newly introduced findings from baseline findings.

**Work**

- Record base SHA and head SHA.
- Scan head safely.
- Compute changed file and line ranges from provider metadata or safe diff processing.
- Classify Finding occurrence as:
  - introduced
  - existing_in_changed_file
  - existing_outside_change
  - unknown
- Do not suppress full baseline results silently.

**Acceptance**

- Classification is deterministic.
- Binary and oversized diffs are handled.
- Fork limitations are visible.
- No source code is copied into audit logs.

**Commit**

`feat: classify pull request security findings`

---

### TS-052 — Publish GitHub check runs

**Outcome**

GitHub shows ThreatStream results on commits and pull requests.

**Work**

- Create queued/in-progress/completed check runs.
- Use GitHub App Checks permission.
- Include summary counts and a link to ThreatStream.
- Add bounded line annotations only for safe, relevant Findings.
- Never annotate secret values or sensitive source excerpts.
- Use neutral conclusion for incomplete coverage.
- Use failure only according to policy threshold.
- Support rerequest if implemented.

**Acceptance**

- A real PR shows a ThreatStream check.
- Check status follows job lifecycle.
- Annotations point to valid changed lines.
- Private data is visible only in the private repository check.
- API failures retry safely.

**Commit**

`feat: publish GitHub security checks`

---

### TS-053 — Build Repository, PR, and Commit pages

**Outcome**

Users can inspect security history by development object.

Repository page:

- Application
- Default branch
- Last push
- Baseline scan
- Coverage
- Findings by category/severity
- Recent PRs
- Policy
- Integration state

PR page:

- State
- Base/head SHA
- Job
- Introduced Findings
- Existing Findings
- Check-run link

Commit page:

- SHA
- Associated PR
- Scan history
- Findings

**Acceptance**

- All values come from APIs.
- No fake risk score.
- Links are permission-safe.
- Stale or removed repositories remain historical.

**Commit**

`feat: add repository change security experience`

---

### TS-054 — Add policy and trigger UI

**Outcome**

Workspace administrators can configure scan behavior safely.

UI must support:

- Manual only
- Baseline schedule
- Push trigger
- PR trigger
- Draft behavior
- Severity threshold
- Capability selection
- Path exclusions with safe validation
- Enable/disable

Do not expose raw CLI arguments.

**Acceptance**

- Inline validation matches backend.
- Optimistic conflicts return clear 409 state.
- Permissions are enforced in UI and API.

**Commit**

`feat: add repository scan policy controls`

---

### TS-055 — Add Finding filters for source-control context

**Outcome**

The unified queue remains usable.

Filters:

- Application
- Repository
- PR
- Commit
- Category
- Scanner
- Severity
- Status
- Introduced-by-PR
- Assignee
- Detection window

**Acceptance**

- Filter combinations are paginated and indexed.
- URLs remain shareable where appropriate.
- Empty state explains filters.

**Commit**

`feat: filter findings by repository context`

---

### TS-056 — Add GitHub workflow browser tests

**Outcome**

A real repository change is covered end to end.

Test in an isolated GitHub test installation:

- Installation
- Import
- Baseline scan
- PR open
- Webhook
- Job
- Finding
- Check run
- PR synchronize
- Deduplication
- Installation removal

**Acceptance**

- Test can be run as a documented release gate.
- Credentials are environment-only.
- Cleanup is reliable.

**Commit**

`test: add GitHub pull request acceptance flow`

---

### PHASE 5 GATE

Proceed only when:

- Real PR events create scan jobs.
- Real GitHub checks complete.
- Users can inspect PR and commit Findings.
- Duplicate webhook deliveries do not duplicate jobs.
- `docs/STATUS.md` names `TS-060` next.

---

## PHASE 6 — Public URL Vulnerability Scanning

**Goal:** Identify vulnerabilities on authorized internet-facing application targets.

### TS-060 — Define target authorization

**Outcome**

ThreatStream records that the user is authorized to scan a target.

For URL/domain targets require:

- Workspace
- Application
- Canonical target
- Ownership/authorization attestation
- Attesting user
- Attestation timestamp
- Allowed scan intensity
- Verification state
- Optional verification method

Initial verification options:

- DNS TXT challenge
- HTTP well-known challenge
- Manual attestation for low-impact passive checks only

Do not allow high-impact profiles without stronger authorization.

**Acceptance**

- Every active scan links to an authorization record.
- Audit records the attestation.
- Cross-workspace target reuse does not inherit authorization.

**Commit**

`security: add target scan authorization`

---

### TS-061 — Convert Assets into user-facing Targets

**Outcome**

Reuse Asset Inventory while presenting a clearer product concept.

**Work**

- Keep canonical Asset records internally.
- Add Application association.
- Add target kind and verification state projections.
- Rename frontend navigation from generic Assets to Targets where appropriate.
- Preserve compatibility routes temporarily.

**Acceptance**

- Existing Asset records remain available.
- Domain, subdomain, URL, IP, and host normalization remains safe.
- Users understand which targets are scan-compatible.

**Commit**

`refactor: present assets as application targets`

---

### TS-062 — Make Nuclei operational in the deployed worker

**Outcome**

The existing Nuclei adapter runs a real, pinned binary.

**Work**

- Pin Nuclei version.
- Pin or record template version.
- Install only in worker deployment image or documented local environment.
- Verify binary checksum where distribution allows.
- Update templates through a controlled maintenance process.
- Preserve strict option allowlist.
- Disable arbitrary template paths.
- Enforce timeout, rate, concurrency, and output limits.
- Use only authorized target snapshots.

**Acceptance**

- Health reports real version and template state safely.
- A controlled target scan completes.
- No startup crash if unavailable in development.
- Scanner errors never expose local paths or raw stderr.

**Commit**

`feat: operationalize Nuclei URL scanning`

---

### TS-063 — Add passive HTTP and TLS observations

**Outcome**

Provide low-risk configuration visibility even when active scanning is restricted.

Implement safe checks for:

- TLS certificate validity and expiry
- Supported HTTPS
- Redirect behavior
- Security headers
- Cookie flags only for public unauthenticated response
- Server disclosure
- HTTP method behavior only where safe

Use a dedicated adapter or typed passive-check service. Do not use the retired plugin system.

**Acceptance**

- Requests use bounded time, redirect count, response size, and approved methods.
- SSRF protections reject private, loopback, link-local, metadata, and disallowed resolved addresses unless explicit private deployment support is designed.
- DNS rebinding is addressed.
- Evidence is safe and bounded.

**Commit**

`feat: add safe public target posture checks`

---

### TS-064 — Add URL scan policies and scheduling

**Outcome**

Users can run manual and scheduled target scans.

**Work**

- Safe profile presets
- Passive-only
- Standard Nuclei
- Bounded advanced profile for verified targets
- Minimum schedule interval
- Duplicate active-job prevention
- Maintenance windows
- Clear authorization reminder

**Acceptance**

- UI never exposes arbitrary flags.
- Unverified target cannot use disallowed profile.
- Schedule uses existing durable scheduler.

**Commit**

`feat: add authorized URL scan policies`

---

### TS-065 — Normalize URL Findings

**Outcome**

URL and repository Findings coexist cleanly.

Fields may include:

- Endpoint
- Template/rule ID
- Matcher
- CVE
- HTTP method
- Status
- Technology
- TLS field
- Safe request/response summary

Never persist:

- Authentication headers
- Cookies
- Full sensitive responses
- Tokens
- Unbounded bodies

**Acceptance**

- Repeated scan deduplicates.
- Occurrence links to target and job.
- Secret-like content is redacted.

**Commit**

`feat: normalize target vulnerability findings`

---

### TS-066 — Create a controlled vulnerable demo application

**Outcome**

ThreatStream has an explicitly owned URL target for safe demos and tests.

Requirements:

- Separate deployment
- No real customer data
- Deliberately known, documented weaknesses
- Network isolation
- Resettable state
- Clear ownership
- Scan allowlist
- No dangerous internet-facing exploit capability beyond the controlled design

**Acceptance**

- Target is legally and operationally owned by the project.
- Scan results are real.
- Demo can be reset.
- It is not confused with production ThreatStream.

**Commit**

Repository decision required: keep demo target in a separate repository when practical.

---

### TS-067 — Add target scanning browser acceptance

**Outcome**

A user can register and scan a URL entirely through the UI.

**Flow**

```text
Create Application
→ add URL target
→ attest or verify ownership
→ select safe policy
→ run scan
→ worker executes
→ Findings appear
→ occurrence and audit visible
```

**Commit**

`test: add public target scan acceptance flow`

---

### PHASE 6 GATE

Proceed only when:

- The worker runs real Nuclei.
- A controlled URL produces real Findings.
- Authorization is recorded.
- SSRF protections pass.
- Target scanning works in browser.
- `docs/STATUS.md` names `TS-070` next.

---

## PHASE 7 — Unified Vulnerability Management Experience

**Goal:** Make the private SaaS polished, understandable, and useful.

### TS-070 — Redesign the authenticated overview around Applications

**Outcome**

The first screen answers:

- What applications do I own?
- What was scanned?
- What vulnerabilities were found?
- What changed recently?
- What needs attention?

Use real metrics:

- Active Applications
- Connected repositories
- Verified targets
- Open Findings by severity
- New Findings in selected window
- Coverage freshness
- Failed or partial scans
- Recent PR security checks

Do not invent an aggregate “risk score” unless the formula is documented and tested.

**Commit**

`feat: add application security overview`

---

### TS-071 — Upgrade Finding detail

**Outcome**

Finding detail is the authoritative investigation view.

Include:

- Application
- Repository or target
- PR/commit/SHA
- Category
- Scanner and version
- Rule and vulnerability IDs
- Severity and confidence
- Package/file/endpoint context
- Safe evidence
- First/last detected
- Occurrence count
- Scan coverage
- Assignment
- Status
- Comments
- Activity
- Related GitHub check
- Related occurrences

**Acceptance**

- Secret Findings never reveal a match.
- Source excerpts are escaped and bounded.
- Permission checks cover every nested resource.

**Commit**

`feat: complete unified finding detail`

---

### TS-072 — Complete triage workflows

**Outcome**

Teams can manage identified vulnerabilities manually.

Support:

- Acknowledge
- Start investigation
- Resolve with summary
- Close
- Reopen
- Assign
- Comment
- Add safe evidence
- Mark false positive with rationale if added as an explicit status or disposition
- Record acceptance or suppression only if the model is deliberate

Do not implement automated remediation.

**Acceptance**

- Every transition is validated and audited.
- Scanner recurrence reopens according to policy.
- Analyst fields are not overwritten by scans.

**Commit**

`feat: complete vulnerability triage workflow`

---

### TS-073 — Complete team membership and invitations

**Outcome**

The SaaS supports actual collaboration.

Implement:

- Invite by email
- Invitation token with expiry and one-time use
- Accept invitation
- Revoke invitation
- List members
- Change role
- Remove member
- Prevent removal of the final workspace administrator
- Audit every action

**Acceptance**

- Invitations cannot be reused.
- Cross-workspace token use fails.
- Email delivery has a safe development capture mode and production provider abstraction.
- Permissions are browser tested with at least two roles.

**Commit**

`feat: add workspace membership management`

---

### TS-074 — Add in-app notifications

**Outcome**

Users see important security events without email being mandatory.

Initial notification types:

- Scan completed
- Scan partially completed
- Scan failed
- New critical/high Finding
- PR check failed threshold
- GitHub installation suspended
- Target verification expiring or failed
- Invitation

Support read/unread and link to context.

**Acceptance**

- Notifications are tenant-scoped.
- Duplicate event retries do not duplicate notification.
- Sensitive data is not included in notification previews.

**Commit**

`feat: add security workflow notifications`

---

### TS-075 — Improve search and navigation

**Outcome**

Users can find Applications, repositories, targets, Findings, and jobs quickly.

Implement:

- Global command/search
- Permission-aware results
- Server-side bounded search
- Keyboard navigation
- Recent items stored as IDs only
- No source code or secrets in search index

**Commit**

`feat: add unified product search`

---

### TS-076 — Complete empty, loading, degraded, and permission states

**Outcome**

The application remains understandable before data exists and when dependencies fail.

Required states:

- No GitHub installation
- No Applications
- No repositories imported
- No targets
- No scans
- Scanner unavailable
- Worker unavailable
- Partial scan
- Stale threat source
- Permission denied
- Auth error
- Database unavailable

Each state must present one relevant next action.

**Commit**

`feat: polish product system states`

---

### TS-077 — Add role-based browser tests

**Outcome**

Permission differences are proven through the UI.

Roles should cover at least:

- Organization administrator
- Workspace administrator
- AppSec engineer
- Developer
- Read-only user

**Acceptance**

- Hidden controls are also rejected by API.
- Cross-workspace routes fail.
- Direct URL navigation does not bypass permissions.

**Commit**

`test: add role-based browser authorization coverage`

---

### PHASE 7 GATE

Proceed only when:

- Application-centric overview is live.
- Findings from repositories and URLs are unified.
- Team invitations and roles work.
- Important system states are polished.
- Browser acceptance works with two users.
- `docs/STATUS.md` names `TS-080` next.

---

## PHASE 8 — Real Public Global Monitor

**Goal:** Build an impressive public experience without fabricated data.

### TS-080 — Define the public observation contract

**Outcome**

One normalized model supports multiple real sources.

Suggested `threat_observations` fields:

- `id`
- `source_id`
- `source_event_id`
- `source_class`
- `observed_at`
- `received_at`
- `observation_type`
- `attack_category`
- `protocol`
- `source_network_hash`
- `source_country_code`
- `target_region_code`
- `destination_port`
- `malware_family`
- `vulnerability_id`
- `confidence`
- `severity`
- `latitude_bucket`
- `longitude_bucket`
- `safe_metadata`
- `deduplication_hash`

Source classes:

- `honeypot_observation`
- `malware_infrastructure_feed`
- `indicator_feed`
- `vulnerability_intelligence`
- `community_sensor_aggregate`

Do not call feed publication time an attack time unless the source defines it that way.

**Acceptance**

- Customer workspace IDs cannot be represented in this table.
- Full source IP need not be stored; if temporarily required for enrichment, it must have a documented deletion path.
- Safe metadata schema is bounded.

**Commit**

`feat: add public threat observation domain`

---

### TS-081 — Establish source governance

**Outcome**

Every source has legal, technical, and quality metadata.

Create `public_intel_sources` with:

- Name
- Operator
- Source class
- License or terms reference
- Attribution requirement
- Commercial-use restriction
- Polling limit
- Retention limit
- Data fields
- Freshness expectation
- Health state
- Enabled state
- Last success
- Last failure
- Parser version

Initial candidates must be verified from official documentation at implementation time. Suitable categories include:

- URLhaus malware URL feed
- ThreatFox IOC feed
- CISA Known Exploited Vulnerabilities for enrichment, not live attacks
- Project-owned Cowrie honeypot observations

Do not enable a source until its terms are reviewed and documented.

**Acceptance**

- Public methodology lists only enabled sources.
- Commercial-use restrictions are recorded.
- A source can be disabled without breaking the monitor.

**Commit**

`docs: govern public intelligence sources`

---

### TS-082 — Implement public feed adapters

**Outcome**

Ingest real external records into the normalized contract.

For each adapter:

- Official endpoint only
- Authentication stored as deployment secret or encrypted integration as appropriate
- Conditional requests where supported
- Bounded pagination
- Rate-limit handling
- Schema versioning
- Raw payload retention disabled or tightly bounded
- Idempotent source event ID
- Parser warning counters
- Source-specific tests using synthetic fixtures derived from documented schemas

Start with no more than two external sources.

**Acceptance**

- Adapter failure does not create fake records.
- Repeated polling does not duplicate.
- Source health is visible.
- Attribution is preserved.

**Commit**

One focused commit per source.

---

### TS-083 — Deploy an isolated project-owned honeypot sensor

**Outcome**

The globe includes directly observed attack attempts owned by the project.

Preferred first sensor:

- Cowrie SSH/Telnet honeypot, or another reviewed low-interaction sensor

Architecture:

```text
Internet
→ isolated honeypot VM/container host
→ local JSON event output
→ outbound-only signed ingestion request
→ ThreatStream public-intel API
```

Requirements:

- Separate host or strict network boundary from ThreatStream production
- No credentials shared with production
- No inbound access from sensor to production database
- Outbound-only event delivery
- Mutual authentication or signed requests
- Rate limits
- Event schema validation
- Malware samples and uploaded files are not forwarded in this release
- Commands and usernames are redacted or excluded from public output
- Full IP is anonymized after geolocation
- Retention policy
- Incident runbook
- Automatic patching and monitoring

**Acceptance**

- Sensor compromise cannot directly access customer data.
- Events are real and timestamped.
- Public API never exposes raw commands or credentials.
- Disabling the sensor does not break the monitor.

**Commit**

Keep sensor deployment configuration in a dedicated infrastructure directory or separate private repository, according to security review.

---

### TS-084 — Implement signed sensor ingestion

**Outcome**

Only authorized sensors can submit observations.

Controls:

- Sensor ID
- Per-sensor secret or asymmetric signature
- Timestamp
- Nonce
- Replay window
- Body hash
- Size limits
- Rate limits
- Schema validation
- Safe audit
- Revocation

**Acceptance**

- Invalid signature rejected.
- Replay rejected.
- Stale timestamp rejected.
- Unknown sensor rejected.
- Duplicate event idempotent.
- No public anonymous write endpoint exists.

**Commit**

`feat: add authenticated threat sensor ingestion`

---

### TS-085 — Add geolocation and privacy transformation

**Outcome**

The monitor can render geography without exposing unnecessary personal or network data.

Process:

1. Receive source address only in the trusted ingestion boundary when needed.
2. Resolve country and coarse coordinates using an approved local or contracted database.
3. Bucket or jitter coordinates deterministically at a coarse level.
4. Hash network identity using a rotating keyed hash if recurrence analysis is needed.
5. Remove raw address according to retention policy.
6. Never display a precise source coordinate.

**Acceptance**

- Raw source IP is not returned by public API.
- Coordinate precision is documented.
- Private, reserved, loopback, and invalid addresses are rejected or classified safely.
- Retention job is tested.

**Commit**

`security: anonymize public threat observations`

---

### TS-086 — Implement observation deduplication and aggregation

**Outcome**

High-volume sources do not overwhelm storage or the UI.

Create:

- Stable deduplication keys
- Minute/hour/day aggregates
- Country/source/category/protocol counts
- Source freshness
- Top destination ports
- Approximate unique network counts
- Retention tiers

Suggested retention:

- Fine-grained public events: short bounded period
- Hourly aggregates: medium period
- Daily aggregates: longer period

Finalize periods based on storage budget and source terms.

**Acceptance**

- Replayed feed data does not inflate counts.
- Aggregates can be rebuilt.
- Public queries use indexes and bounded windows.
- Source outages do not reset history.

**Commit**

`feat: aggregate public threat observations`

---

### TS-087 — Add public read APIs and live delivery

**Outcome**

The frontend receives safe live and historical data.

Endpoints:

- Current summary
- Recent observations
- Map buckets
- Trends
- Source health
- Categories
- Methodology metadata

Use Server-Sent Events initially unless bidirectional communication is genuinely needed.

Controls:

- Anonymous rate limiting
- Bounded filters
- Cache headers
- No customer joins
- Maximum event frequency
- Reconnect cursor
- Heartbeat
- Backpressure strategy

**Acceptance**

- Live feed reconnects without duplicating visible records.
- Source health shows stale/degraded states.
- Public endpoints remain responsive under load test.

**Commit**

`feat: add public threat monitor APIs`

---

### TS-088 — Build the Global Monitor globe

**Outcome**

A visually exceptional but honest real-time globe.

Requirements:

- WebGL globe or map
- Country/coarse-coordinate arcs or pulses
- Observation source and category legend
- Live/pause control
- Time window
- Filters
- Accessible non-canvas alternative
- Reduced-motion support
- Mobile fallback
- Performance cap on simultaneous objects
- No fabricated path between attacker and victim when target location is unknown

Visual semantics:

- A point represents an observation bucket.
- An arc appears only when both source and target region are known.
- Feed or IOC infrastructure locations use a distinct visual from honeypot attempts.
- Stale data is visibly labeled.

**Acceptance**

- Globe renders real API data.
- Zero-event state is valid.
- 60-second observation count matches API.
- Reduced-motion mode works.
- Mobile does not crash.

**Commit**

`feat: add real-time global threat globe`

---

### TS-089 — Build public feed, trends, and source pages

**Outcome**

The globe is supported by understandable data views.

Feed:

- Timestamp
- Source
- Source class
- Category
- Country/region
- Protocol/port when safe
- Confidence
- Attribution

Trends:

- Time series
- Source breakdown
- Category breakdown
- Country breakdown
- Freshness

Sources:

- Operator
- What data means
- Update cadence
- Attribution
- Current health
- Limitations

**Acceptance**

- Every metric is traceable to a source or aggregate.
- Users can distinguish attempts, indicators, and intelligence updates.

**Commit**

`feat: add public threat observation analysis`

---

### TS-090 — Publish methodology and limitations

**Outcome**

The project is credible.

Explain:

- What is observed
- What is inferred
- What is aggregated
- Why geolocation is approximate
- Why an observation is not proof of compromise
- Which sources are delayed
- Which events are honeypot attempts
- Retention
- Privacy
- Data-quality limitations
- How customer data is isolated

**Acceptance**

- The landing and monitor link visibly to methodology.
- No marketing claim contradicts it.

**Commit**

`docs: publish threat monitor methodology`

---

### TS-091 — Add public monitor quality tests

**Outcome**

Real data remains honest under failure.

Test:

- No source data
- One source stale
- One source malformed
- Duplicate events
- Burst load
- SSE reconnect
- Aggregate correctness
- IP redaction
- Cross-data-plane isolation
- Reduced-motion and mobile rendering

**Commit**

`test: cover public threat monitor data quality`

---

### PHASE 8 GATE

Proceed only when:

- At least one external feed and one owned sensor are live, unless the source-governance review explicitly chooses a different evidence-backed minimum.
- The globe uses real observations.
- Methodology is public.
- Customer data cannot appear in public APIs.
- Source freshness and outages are visible.
- `docs/STATUS.md` names `TS-100` next.

---

## PHASE 9 — SaaS Product Quality

**Goal:** Make the platform feel deliberate, premium, and trustworthy.

### TS-100 — Rebuild the landing experience around the two-surface product

**Outcome**

The landing page communicates the actual product in seconds.

Sections:

- Hero with real product statement
- Live monitor preview using real aggregate API
- Vulnerability discovery workflow
- GitHub and URL coverage
- Product screenshots from real controlled data
- Security and privacy principles
- Open-source or hosted status accurately described
- Call to open Monitor
- Call to create workspace

Do not add fake customer logos, testimonials, usage counts, or coverage claims.

**Commit**

`feat: align landing page with ThreatStream product`

---

### TS-101 — Finalize the design system

**Outcome**

Public and private surfaces feel like one product.

Define:

- Typography
- Spacing
- Layout grids
- Color tokens
- Severity tokens
- Observation-source tokens
- Focus states
- Loading patterns
- Empty states
- Charts
- Data tables
- Dialogs
- Forms
- Toasts
- Mobile navigation
- Reduced motion
- Dark mode as primary; alternative only if implemented consistently

**Acceptance**

- No page-specific arbitrary colors for severity.
- Components meet contrast requirements.
- Dense data remains readable.

**Commit**

`refactor: finalize ThreatStream design system`

---

### TS-102 — Accessibility audit

**Outcome**

Critical flows target WCAG 2.1 AA.

Audit:

- Keyboard navigation
- Focus order
- Labels
- Error association
- Canvas alternatives
- Reduced motion
- Contrast
- Screen-reader landmarks
- Dialog behavior
- Tables
- Live-region announcements

**Acceptance**

- Automated accessibility checks pass for critical pages.
- Manual keyboard walkthrough passes.
- Globe has a nonvisual equivalent.

**Commit**

`fix: improve application accessibility`

---

### TS-103 — Performance and bundle optimization

**Targets**

- Avoid loading globe dependencies in authenticated routes.
- Route-level code splitting.
- Paginate large tables.
- Virtualize only when measured.
- Cache stable public aggregates.
- Bound API payloads.
- Add database query analysis for slow endpoints.
- Define p95 targets for key APIs.
- Prevent polling when SSE or terminal state makes it unnecessary.

**Acceptance**

- Public landing does not download authenticated dashboard bundles.
- Authenticated shell does not download globe bundle.
- Performance report is recorded.

**Commit**

`perf: optimize public and private application delivery`

---

### TS-104 — Abuse prevention and quotas

**Outcome**

The hosted SaaS cannot be trivially abused as a scanning service.

Implement:

- Anonymous public API rate limits
- Auth rate limits
- Webhook rate and size limits
- Workspace scan concurrency
- Daily scan quotas
- Repository size limits
- URL target count limits
- Minimum schedule intervals
- Per-target backoff
- Account suspension controls
- Authorization attestation
- Administrative override with audit

Do not add billing in this task.

**Commit**

`security: enforce SaaS abuse controls`

---

### TS-105 — Privacy and data controls

**Outcome**

Users understand and control stored data.

Add:

- Privacy policy
- Workspace export
- Workspace deletion request flow
- GitHub disconnect
- Repository data deletion while preserving required audit metadata
- Public sensor retention
- Customer raw-result retention
- Account deletion behavior
- Audit of destructive actions

**Acceptance**

- Deletion has confirmation and background progress.
- Cross-tenant deletion is impossible.
- Backups and retention limitations are documented honestly.

**Commit**

`feat: add workspace data controls`

---

### TS-106 — Operational administration

**Outcome**

Operators can support the service safely.

Build a restricted admin surface or command suite for:

- User/workspace lookup by safe identifiers
- Installation state
- Queue depth
- Stuck jobs
- Source health
- Sensor revocation
- Rate-limit state
- Account suspension
- Audit lookup
- Retry of safe failed ingestion

Do not expose customer source or secrets to operators by default.

**Commit**

`feat: add restricted SaaS operations controls`

---

### TS-107 — Product documentation and guided onboarding

**Outcome**

Users can succeed without developer assistance.

Add:

- First-run checklist
- GitHub App setup guidance
- Application creation guidance
- Repository scan explanation
- URL authorization explanation
- Finding categories
- Scanner coverage
- Data safety
- Public monitor methodology
- Troubleshooting
- Contact/support path

**Commit**

`docs: add ThreatStream product onboarding`

---

### PHASE 9 GATE

Proceed only when:

- Landing and product navigation are coherent.
- Accessibility and performance gates pass.
- Abuse controls exist.
- Privacy and deletion paths are documented and tested.
- No fake social proof or metrics exist.
- `docs/STATUS.md` names `TS-110` next.

---

## PHASE 10 — Production Engineering

**Goal:** Deploy and operate the platform reliably.

### TS-110 — Build continuous integration

**Required CI stages**

- Formatting/linting
- Python compilation
- Backend unit tests
- Backend integration tests with disposable PostgreSQL
- Migration offline SQL
- Alembic one-head check
- Frontend unit tests
- Frontend build
- Browser tests against isolated services
- Dependency vulnerability scan
- Secret scan
- Container scan when containers are used
- Artifact retention for failures

**Acceptance**

- Main branch cannot merge when critical gates fail.
- CI uses no production credentials.

**Commit**

`ci: add complete ThreatStream validation pipeline`

---

### TS-111 — Establish environments

**Required environments**

- Local
- Test
- Staging
- Production

Each must have separate:

- Database
- Auth configuration
- GitHub App or installation configuration
- Encryption key
- Webhook secret
- Worker queue
- Public-intel source credentials
- Sensor credentials
- Monitoring
- URLs

**Acceptance**

- Staging cannot access production customer data.
- Test webhooks cannot queue production scans.
- Environment is displayed safely in admin diagnostics.

**Commit**

`ops: separate ThreatStream environments`

---

### TS-112 — Define deployable services

**Minimum services**

- Frontend
- FastAPI API
- Scan worker
- Public-intel ingestion worker
- Scheduler responsibility
- Optional maintenance worker
- PostgreSQL/Neon
- Isolated honeypot sensor outside application trust boundary

Pin runtime versions and scanner versions.

**Acceptance**

- API restart does not lose jobs.
- Worker restart recovery passes.
- Public ingestion failure does not block customer API.
- Scanner binary absence is visible and scoped.

**Commit**

`ops: define production service topology`

---

### TS-113 — Make migrations production-safe

**Work**

- Pre-deploy migration check
- Backup before destructive migration
- Expand/contract patterns for breaking schema changes
- Lock-time assessment
- Rollback decision tree
- Migration observability
- One-head enforcement
- Staging rehearsal

**Acceptance**

- Latest migration is applied in staging from a production-like prior revision.
- Rollback or forward-fix procedure is documented.
- Backup restore is tested.

**Commit**

`ops: harden database migration delivery`

---

### TS-114 — Add backups and disaster recovery

**Define**

- Database backup cadence
- Point-in-time recovery if available
- Encryption-key backup
- GitHub App key rotation
- Public sensor credential rotation
- Recovery time objective
- Recovery point objective
- Quarterly restore test
- Worker queue recovery
- Source aggregate rebuild

**Acceptance**

- A staging restore from backup succeeds.
- Secrets required for restore are documented without being committed.
- Recovery runbook is executable.

**Commit**

`ops: add disaster recovery runbook`

---

### TS-115 — Add observability

Measure:

- API request rate, latency, error rate
- Auth failures
- Database pool
- Queue depth
- Job age
- Lease recovery
- Scan duration by adapter
- Scanner failure rate
- Webhook deliveries and failures
- GitHub API rate limits
- Public source freshness
- Sensor ingest rate
- SSE clients
- Aggregate lag
- Storage growth

Alerts must be actionable and must not include secrets.

**Acceptance**

- One dashboard or equivalent operational view exists.
- Alerts exist for P0 conditions.
- A test alert is delivered.

**Commit**

`ops: add ThreatStream service observability`

---

### TS-116 — Add production security controls

Review and implement:

- TLS
- Secure cookies
- HSTS where appropriate
- CSP
- Frame protection
- Referrer policy
- CORS allowlist
- CSRF behavior
- Rate limiting
- Request size limits
- SSRF defense
- SQL injection defense through parameterization
- HTML escaping
- File extraction safety
- Secret rotation
- Dependency pinning
- Least-privilege service accounts
- Database role separation
- Scanner worker isolation
- Audit retention
- Admin access protection

Create a threat model with trust boundaries and abuse cases.

**Acceptance**

- No unresolved critical security finding.
- High findings have explicit risk acceptance or fix.
- Security headers are verified in staging.
- Penetration test checklist is completed against controlled staging.

**Commit**

`security: harden production ThreatStream deployment`

---

### TS-117 — Reliability and load testing

Test:

- Concurrent authenticated users
- Findings list pagination
- Repository import bursts
- Webhook bursts
- Queue backlog
- Worker restart
- Scanner timeout
- Public feed burst
- SSE reconnect storm
- Source outage
- Database transient failure
- Deployment during queued work

Define measurable release targets, including:

- Standard API p95 latency
- Public API p95 latency
- Maximum acceptable queue age
- Webhook acknowledgment time
- Monitor freshness
- Worker recovery time

**Acceptance**

- Results and limits are documented.
- Capacity settings match measured behavior.
- No data duplication under retries.

**Commit**

`test: validate ThreatStream reliability under load`

---

### TS-118 — Production deployment rehearsal

**Outcome**

Deploy staging from a clean release candidate exactly as production will be deployed.

Verify:

- Migration
- Auth
- GitHub App
- Webhooks
- Repository acquisition
- All scanners
- URL scanning
- Public feeds
- Sensor ingestion
- Live monitor
- Notifications
- Backups
- Monitoring
- Rollback
- Secret rotation procedure

**Acceptance**

- Rehearsal report contains timestamps, results, failures, and fixes.
- No manual database edits.
- Exact release artifact is identified.

**Commit**

`docs: record production deployment rehearsal`

---

### PHASE 10 GATE

Proceed only when:

- CI is mandatory.
- Staging mirrors production topology.
- Backup restore passes.
- Observability and alerts work.
- Security review passes.
- Load targets pass.
- Deployment rehearsal passes.
- `docs/STATUS.md` names `TS-120` next.

---

## PHASE 11 — Showcase and Release Candidate

**Goal:** Leave the repository and hosted product ready to demonstrate confidently.

### TS-120 — Create controlled showcase assets

**Outcome**

Use real results without exposing customer data.

Create or maintain:

- One project-owned repository with safe intentional vulnerabilities
- One project-owned public demo application target
- One GitHub pull request demonstrating a detected change
- One live honeypot sensor
- Real external public feeds

Every vulnerability must be documented as intentional and safe.

**Acceptance**

- All displayed private Findings originate from real scans.
- All public monitor events originate from real sources.
- No production code has a demo-mode fake-data switch.

---

### TS-121 — Prepare the showcase workspace

**Outcome**

A clean workspace demonstrates the complete private journey.

Include:

- One Application
- Connected repository
- Repository baseline
- PR and commit history
- Verified URL target
- Real scan jobs
- Unified Findings
- Team roles
- Audit events
- Notifications

Create this through normal UI/API workflows, not direct SQL.

**Acceptance**

- Workspace can be recreated from a runbook.
- It contains no credentials or customer data.
- Reset procedure is documented.

---

### TS-122 — Complete the release browser matrix

Run from clean browser profiles:

#### Public

- Landing
- Monitor map
- Feed
- Trends
- Sources
- Methodology
- Mobile
- Reduced motion
- Stale-source behavior

#### Private administrator

- Sign-up/sign-in
- Onboarding
- GitHub installation
- Repository import
- Application creation
- Baseline scan
- PR scan
- GitHub check
- URL target and scan
- Finding triage
- Invitation
- Audit
- Sign-out

#### Private developer/read-only

- Invitation acceptance
- Allowed views
- Denied management actions
- Direct URL denial

**Acceptance**

- Every step is recorded pass/fail.
- No critical console error.
- No unexplained 4xx/5xx.
- No manual database intervention.

**Commit**

`test: complete SaaS release browser matrix`

---

### TS-123 — Final content and visual polish

**Outcome**

The SaaS is presentation-ready.

Complete:

- Product copy
- Metadata
- Favicon
- Social preview
- Real screenshots
- Consistent dates and names
- Loading transitions
- Empty states
- Mobile layout
- Error messages
- Source attribution
- Legal pages
- README images from controlled workspace
- Demo script

Do not add fake testimonials or logos.

**Commit**

`feat: finalize ThreatStream launch experience`

---

### TS-124 — Create the launch runbook

Create `docs/SHOWCASE_RUNBOOK.md` containing:

- Prerequisites
- Environment checks
- Service health checks
- Demo account preparation
- Public-monitor freshness check
- GitHub webhook check
- Worker check
- Scan binary check
- Demo sequence
- Expected results
- Recovery steps
- What not to claim
- Known limitations
- Shutdown and cleanup

**Acceptance**

Another operator can run the demo without repository archaeology.

**Commit**

`docs: add ThreatStream showcase runbook`

---

### TS-125 — Perform final security and privacy sign-off

Verify:

- No secrets in Git history introduced by this plan
- No customer data in public endpoints
- No raw detected secrets
- No arbitrary shell flags
- No repository code execution
- No unverified target scans
- No invalid webhook acceptance
- No cross-tenant access
- No production debug mode
- No public admin endpoint
- Source licenses and attribution recorded
- Privacy and retention implemented

**Acceptance**

Document sign-off and unresolved risks. A critical unresolved risk blocks release.

**Commit**

`security: complete release security sign-off`

---

### TS-126 — Create the release candidate

**Work**

- Update version
- Freeze schema
- Generate changelog
- Confirm migration
- Confirm release artifact
- Tag candidate
- Deploy candidate to staging
- Run full browser matrix
- Run smoke/load/security gates
- Promote the same artifact to production

**Acceptance**

- No code changes between final staging acceptance and production promotion except environment configuration.
- Rollback artifact exists.

**Commit**

`chore: prepare ThreatStream release candidate`

---

### TS-127 — Final SaaS acceptance and release

**This is the final task.**

**Required final report**

- Product architecture
- Public data sources and freshness
- Customer-data isolation
- Auth provider and real browser evidence
- GitHub App permissions and webhook evidence
- Scanner inventory and versions
- Repository sandbox controls
- URL authorization controls
- Findings normalization and secret redaction
- Test totals
- Browser matrix
- Load results
- Backup restore result
- Security review
- Deployment revision
- Database migration revision
- Release commit and tag
- Production URLs
- Known limitations
- Exact demo steps

**Final acceptance**

ThreatStream must be safely demonstrable as:

> A real-time public cyber-threat observation platform and an authenticated vulnerability discovery SaaS that scans GitHub repositories, pull requests, commits, and authorized public application targets.

It must not be described as production-ready unless every required gate above passes.

**Commit**

`release: publish ThreatStream SaaS`

---

# 10. Standard Task Completion Report

For every task, append this exact structure to `docs/STATUS.md`:

```markdown
## TS-XXX — Task title

Status: complete | blocked
Started: ISO timestamp
Completed: ISO timestamp
Starting commit:
Ending commit:

### Implemented
- ...

### Files changed
- ...

### Database
- Migration:
- Target:
- Result:

### Validation
- Command:
- Result:

### Browser verification
- Journey:
- Result:

### Security review
- ...

### Known limitations
- ...

### Next task
TS-YYY
```

---

# 11. Standard Phase Gate Report

At the end of every phase, report:

- Tasks completed
- Tasks blocked
- Commits
- Migration revision
- Test totals
- Browser journeys
- Security checks
- Data cleanup
- Worktree state
- Push result
- Remote HEAD
- Remaining risks
- Exact next task

Do not continue when a gate fails.

---

# 12. Commit and Push Policy

Recommended behavior:

- Commit after each coherent task.
- Do not combine product cleanup, auth migration, schema work, and UI redesign into one commit.
- Push after a phase gate passes, unless the user explicitly requests more frequent pushes.
- Use normal fast-forward pushes only.
- Never force push.
- Never commit:
  - `.env`
  - database URLs
  - JWTs
  - GitHub keys
  - webhook secrets
  - scanner caches
  - repository archives
  - source checkouts
  - raw scan results
  - raw threat-feed dumps
  - honeypot logs
  - uploaded malware
  - screenshots containing secrets
  - build outputs
  - test artifacts
  - `node_modules`
  - Python caches
  - `repomix-output.xml`

---

# 13. Implementation Reference Rules

When the task depends on an external contract, consult current official documentation before coding.

Primary reference categories:

- GitHub Apps authentication, installation tokens, permissions, webhooks, and Checks API
- Current authentication-provider SDK and token verification
- Trivy repository, filesystem, secret, and misconfiguration output
- Semgrep CLI and JSON schema
- Gitleaks report format
- Nuclei JSONL output and template management
- Cowrie JSON event format and deployment guidance
- URLhaus and ThreatFox API terms and schemas
- CISA Known Exploited Vulnerabilities data format
- Chosen geolocation database terms and precision
- Chosen deployment platform process and secret model

Record the version or access date in the implementation ADR when behavior may change.

---

# 14. Non-Negotiable Product Truths

1. The globe shows real observations, not animations pretending to be attacks.
2. Threat-intelligence feed records and honeypot attack attempts are different data classes.
3. Customer data is never public-monitor data.
4. A connected GitHub repository is not an arbitrary URL supplied to a shell command.
5. Repository code is data, never executable input.
6. A detected secret value is never a UI feature.
7. A passing mocked test is not browser acceptance.
8. A page rendering is not proof that its workflow works.
9. Scanner availability is reported honestly.
10. Remediation is deferred; vulnerability identification must be excellent first.
11. Git history preserves removed code; the active tree does not need dead code for nostalgia.
12. Every release claim must be supported by evidence in `docs/STATUS.md`.
