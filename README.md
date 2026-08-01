# ThreatStream

ThreatStream is one cybersecurity platform with two deliberately separated surfaces: a public experience for real, attributed threat observations and an authenticated vulnerability-discovery SaaS for repositories, code changes, and authorized public targets.

## Current maturity

ThreatStream is under active development and is **not production-ready**. The current tree contains test-covered tenancy, Assets, Findings, integrations, scan profiles/jobs/schedules, a durable worker, and one active Nuclei adapter. Real browser authentication is currently blocked, real Nuclei execution is unverified, and the public monitor, GitHub integration, Application/Repository domains, and production operations remain planned. See [`docs/STATUS.md`](docs/STATUS.md) for evidence-based state.

## Product surfaces

- **Public Threat Intelligence:** planned Global Monitor, globe, live observation feed, trends, source health, methodology, and limitations using real attributed sources only.
- **Authenticated Vulnerability Discovery SaaS:** workspace-scoped Applications, repositories, pull requests, commits, authorized targets, scans, unified Findings, occurrences, triage, teams, permissions, and audit history.

Automated remediation is deferred.

## Architecture

The React/Vite frontend calls a FastAPI trust boundary. FastAPI enforces identity, tenancy, and permissions and persists customer data in PostgreSQL through async SQLAlchemy. Scan jobs are claimed by a separate durable worker using PostgreSQL leases. The typed adapter registry under `backend/app/domains/scans/adapters` is the sole scanner interface; Nuclei is the only active adapter. The future public-intelligence data plane must remain isolated from all customer data.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Local quick start

Prerequisites: Node.js/npm, Python, PostgreSQL-compatible development credentials, and configured Neon Auth values. Never use production credentials locally.

```powershell
npm install
python -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
.\scripts\threatstream.ps1
```

The required processes are:

- Vite frontend on `127.0.0.1:5173`;
- FastAPI API on `127.0.0.1:8000`;
- PostgreSQL-backed scan worker from `backend`.

The launcher does not prove readiness and the current auth path is not browser-accepted. Full commands and safe setup notes are in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Documentation

- [Product contract](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [API](docs/API.md)
- [Repository audit](docs/REPOSITORY_AUDIT.md)
- [Execution status](docs/STATUS.md)
- [Master execution plan](docs/THREATSTREAM_SAAS_MASTER_PLAN.md)
- [Historical archive](docs/archive/)

## Security and authorization

Scan only repositories and systems you own or are explicitly authorized to test. Never commit `.env` files, tokens, keys, scan outputs, source checkouts, logs, caches, databases, or `repomix-output.xml`. Repository code is data and must never be executed by scanners. Detected secret values must never be persisted or displayed.

## Release status

Phase 0 establishes repository truth and removes obsolete product surfaces. The exact next task and release blockers are maintained only in [`docs/STATUS.md`](docs/STATUS.md). Documentation, tests, or a successful build do not by themselves prove browser or production functionality.
