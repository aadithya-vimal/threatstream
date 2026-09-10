> Historical record (SaaS era, superseded 2026-09-09). Not authoritative — ThreatStream is now a frontend-only visualization app. See root README.md.

# ThreatStream Product Contract

This document is authoritative for ThreatStream product scope, vocabulary, data truth, and release boundaries. The execution sequence remains authoritative in [`THREATSTREAM_SAAS_MASTER_PLAN.md`](THREATSTREAM_SAAS_MASTER_PLAN.md), and implementation evidence remains authoritative in [`STATUS.md`](STATUS.md).

## Product mission

ThreatStream is one cybersecurity platform with two deliberately separated surfaces:

1. a public threat-intelligence experience presenting real, attributed cyber-threat observations; and
2. an authenticated, multi-tenant vulnerability-discovery SaaS for identifying and organizing vulnerabilities across software repositories and authorized internet-facing targets.

The first release identifies, normalizes, and organizes vulnerabilities. Automated remediation, generated patches, and automatic fix pull requests are deferred.

## Public Threat Intelligence

The anonymous public surface will provide:

- a Global Monitor overview;
- an interactive globe using coarse, honest geography;
- a live threat-observation feed;
- regional, category, protocol, source, and time views;
- historical trends derived from persisted aggregates;
- source health and freshness;
- methodology, attribution, privacy, and limitations.

The public surface describes records as **threat observations** unless a source establishes a stronger fact. A feed record is not automatically an attack, and an attack attempt is not proof of compromise.

## Authenticated Vulnerability Discovery SaaS

The authenticated surface is a multi-tenant platform for:

- Applications;
- GitHub repositories, branches, pull requests, and commits;
- authorized public URLs and internet-facing Assets;
- full-baseline, pull-request, commit, and URL security scans;
- unified Findings and immutable Finding occurrences;
- assignment, status transitions, comments, and safe evidence;
- teams, roles, permissions, and invitations;
- audit history and notifications.

Users work in terms of Applications, repositories, changes, targets, scans, and Findings. Scanner internals support that workflow but are not the primary product model.

## Personas

| Persona | Primary need |
|---|---|
| Anonymous public visitor | Understand current, attributed cyber-threat observations without signing in. |
| Independent developer | Connect owned code and targets, run authorized scans, and understand actionable vulnerabilities. |
| Engineering team lead | See application coverage, ownership, recent changes, and vulnerabilities needing attention. |
| Application security engineer | Configure scanning intent, normalize results, triage Findings, and preserve evidence/history. |
| DevSecOps engineer | Integrate repository and deployment workflows with reliable, policy-controlled security scans. |
| Workspace administrator | Manage workspace configuration, integrations, membership, roles, and data controls. |
| Security analyst | Investigate Findings, assign work, record rationale, and review occurrences and audit history. |

## Primary user problems

- Public threat information is often visually compelling but ambiguous about whether records are attacks, indicators, intelligence updates, or estimates.
- Engineering teams receive fragmented scanner output without consistent application, repository, change, target, ownership, or lifecycle context.
- Security findings recur across scans without durable deduplication and occurrence history.
- Repository and URL scanning can become unsafe when authorization, credential handling, isolation, or scanner options are weakly controlled.
- Teams need evidence-backed visibility without exposing customer data, source code, detected secrets, or credentials.

## Current release scope

The release includes:

- public landing, Global Monitor, feed, trends, sources, and methodology;
- real external threat sources and an isolated project-owned sensor, subject to source governance;
- authentication, organizations, workspaces, teams, roles, invitations, and audit history;
- Applications, GitHub App installations, repositories, branches, pull requests, and commits;
- Assets and authorized public targets;
- repository baseline, pull-request, commit, and URL scan policies and jobs;
- dependency, secret, static-analysis, infrastructure/configuration, Nuclei, and passive HTTP/TLS capabilities when implemented and available;
- normalized Findings, occurrences, assignment, comments, safe evidence, and status transitions;
- in-app notifications, reliable workers, deployment controls, monitoring, backups, and documented release acceptance.

Nothing in this scope is claimed implemented or verified merely because it appears here. [`STATUS.md`](STATUS.md) records actual evidence.

## Explicit exclusions

The current release excludes:

- automated remediation, AI-generated fixes, generated patches, and automatic remediation pull requests;
- a SIEM, EDR, SOAR platform, endpoint agent, threat-hunting suite, malware sandbox, or generic security toolbox;
- malware detonation, arbitrary YARA management, packet capture, and arbitrary IOC enrichment consoles;
- arbitrary shell commands, arbitrary local filesystem scans, user-provided scanner flags, and unbounded active scanning;
- customer telemetry on the public monitor;
- compliance automation and billing unless separately authorized.

## Core user journeys

### Public visitor

1. Open the landing page or Global Monitor anonymously.
2. View current observation buckets and a bounded live feed.
3. Filter by source class, category, geography, protocol, and time.
4. Inspect trends, source health, attribution, methodology, and limitations.
5. See honest zero-data, stale, degraded, and partial-source states.

### New workspace administrator

1. Sign up or sign in and restore the session after refresh.
2. Create an Organization and Workspace.
3. Install the ThreatStream GitHub App and bind it to the Workspace.
4. Import an authorized repository and create an Application.
5. Associate repository and public targets with the Application.
6. Invite members and verify role differences.

### Engineering and security team

1. Run a real repository baseline scan.
2. Open or update a pull request and receive a webhook-triggered scan and GitHub check.
3. Verify and scan an owned public URL with an allowed policy.
4. Review repository and URL Findings in one queue.
5. Filter, assign, transition, comment, and add safe evidence.
6. Inspect immutable occurrences, coverage, scan history, notifications, and audit events.

## Domain vocabulary

| Term | Definition |
|---|---|
| Organization | The highest customer tenancy boundary, containing one or more Workspaces and organization-level administrators. |
| Workspace | An isolated operational boundary within an Organization for members, permissions, Applications, integrations, scans, and Findings. |
| Application | The user-facing unit representing a software product or service and associating its repositories, targets, Findings, owners, and scan history. |
| Repository | A provider-owned source-code repository connected through an authorized installation; it is not an arbitrary URL passed to a command. |
| Branch | A named repository reference whose current commit may change; branch metadata is distinct from immutable commit identity. |
| Pull request | A provider change proposal between base and head references, with stable provider identity, state, and associated commits/scans. |
| Commit | An immutable repository revision identified by its full provider SHA and bounded metadata. |
| Asset | A canonical workspace-owned inventory record for a domain, URL, IP, repository identifier, host, cloud resource, or other governed object. |
| Public target | An internet-facing URL/domain/host Asset with recorded authorization and verification state that constrains permitted scans. |
| Scan profile | A validated, versioned configuration selecting security intent, compatible capability, safe options, and eligible targets. |
| Scan job | A durable execution record for an immutable subject snapshot, lifecycle, coverage, attempts, results, and audit context. |
| Scanner adapter | A typed implementation that validates configuration/subjects, invokes a pinned scanner safely, parses output, reports health, and emits normalized results. |
| Raw result | A private, bounded, redacted scanner record retained for controlled processing; it is never public-monitor data. |
| Finding | A deduplicated vulnerability or security weakness with stable identity, severity, subject context, ownership, lifecycle, and safe evidence. |
| Finding occurrence | An immutable record that a particular scan execution detected a Finding at a given time and subject context. |
| Threat observation | A real, attributed public-intelligence record representing a source-defined event, indicator, vulnerability-intelligence update, honeypot attempt, or aggregateâ€”not necessarily a successful attack. |
| Threat source | A governed external feed, owned sensor, or community aggregate with recorded operator, source class, terms, freshness, attribution, and health. |
| Audit event | An append-only, tenant-scoped record of a security-relevant action containing safe summaries rather than secrets or full payloads. |

## Data-truth rules

- Production code must not fabricate telemetry, attacks, coordinates, metrics, scanner output, or vulnerabilities.
- Parsing or provider failures must produce honest errors or empty/degraded states, never invented fallback Findings.
- An observation is not described as a successful attack unless the source proves that outcome.
- Honeypot attack attempts, malware infrastructure feeds, indicator feeds, vulnerability intelligence, and community aggregates remain distinct source classes.
- GeoIP and coarse coordinate metadata are approximate and must be labeled accordingly.
- Stale, delayed, unavailable, malformed, or partial sources must be shown honestly with timestamps and source health.
- Full source IP addresses are not exposed unnecessarily; geolocation and anonymization occur at a trusted boundary.
- Detected secret values are discarded or redacted and are never UI features.
- Demonstration data must be explicitly labeled, isolated from live production data, created from controlled assets, and never presented as live customer or public telemetry.
- Test fixtures may be synthetic inside tests, but production paths have no fake-data fallback.

## Customer-data isolation

- Customer Workspace data and public threat-observation data use separate modules, tables, permissions, APIs, and workers.
- Public APIs never join directly to customer Assets, repositories, Findings, scan jobs, raw results, credentials, or audit records.
- Customer repository source, diffs, scanner payloads, secrets, target responses, and identifiers are private by default.
- A sensor or public feed cannot obtain customer database access or attach data to a Workspace.
- Cross-workspace and cross-organization access is denied in repositories, services, routes, and direct URL navigation.
- Demonstration Workspaces and targets contain no customer data and are created through normal authorized workflows.

## Release Definition of Done

The release is complete only when the public and authenticated browser journeys in the master plan pass against real services from clean browser profiles; all critical tests, migrations, worker recovery, scanner isolation, source governance, data isolation, security, accessibility, performance, backup/restore, observability, load, and deployment gates pass; and the same accepted artifact is promoted to production.

In particular:

- the public monitor uses real, attributed observations with honest freshness and methodology;
- real browser authentication, onboarding, GitHub installation/import, repository and URL scanning, unified Finding triage, invitations, audit, and sign-out pass;
- scanner binaries/rules are pinned and repository code is never executed;
- webhook signatures/idempotency, URL authorization/SSRF controls, secret redaction, tenant isolation, retries, leases, cancellation, and recovery are proven;
- no acceptance depends on fabricated data, mocked browser behavior, manual database edits, or hidden production credentials;
- unresolved critical security or privacy risk blocks release.

## Future roadmap

Future work is separate from the current release. Possible later initiatives include carefully authorized remediation assistance, additional scanner adapters, broader integrations, advanced analytics, compliance workflows, or commercial billing. None is included until separately scoped, threat-modeled, prioritized after vulnerability discovery quality, and added to the authoritative execution plan.
