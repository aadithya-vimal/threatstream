# ThreatStream

ThreatStream is being developed as an open, self-hostable Application Security Operations platform.

Its target is to connect code-security findings, build artifacts, deployments, runtime events, application ownership, remediation, and verification through one application-centric model.

> ThreatStream is under active rearchitecture and is not production ready. This README distinguishes verified foundations from experimental and planned functionality.

## Product direction

ThreatStream is intended to answer:

- Which application, repository, component, artifact, deployment, or endpoint is affected?
- Is the issue present in production or externally exposed?
- Has related runtime security activity been observed?
- Which team owns the affected application?
- What remediation is required?
- Was the issue fixed in code, rebuilt, redeployed, and verified?

ThreatStream integrates existing security engines. It is not intended to be a SIEM, EDR, malware sandbox, YARA authoring platform, internet-wide scanner, or proprietary scanning engine.

## Implementation status

| Capability | Status | Verified behavior |
|---|---|---|
| React/Vite application shell | Available | Public landing page, protected overview, responsive shared layout |
| Supabase authentication | Available | Email/password and configured OAuth authentication through Supabase Auth |
| FastAPI service | Experimental | Versioned job, plugin, scheduler, malware, and telemetry endpoints from the legacy product direction |
| Supabase persistence | Experimental | Existing SOC-oriented schema and repositories; tenancy is not implemented |
| Background jobs and scheduler | Experimental | Database polling and scheduling concepts; execution is not yet a dedicated production worker |
| Organizations and workspaces | Planned | Phase 2 |
| Applications and components | Planned | Phase 3 |
| GitHub App and repository discovery | Planned | Phase 4 |
| Semgrep, Gitleaks, Trivy, OSV-Scanner, Checkov, Syft | Planned | Phase 5 |
| Normalized findings and remediation | Planned | Phase 6 |
| Deployments and endpoints | Planned | Phase 7 |
| Runtime event ingestion | Planned | Phase 8 |
| Development-to-runtime correlation and verification | Planned | Phase 9 |
| Production Docker Compose deployment | Planned | Phase 10 |

Inactive legacy pages and plugins are not completed product capabilities. See [MODULE_DISPOSITION.md](MODULE_DISPOSITION.md).

## Architecture today

```text
React + Vite frontend
        |
        | Supabase Auth / direct legacy repositories
        v
Supabase PostgreSQL

FastAPI API ----> Supabase using service-role client
    |
    +----> optional in-process job loop and scheduler
```

This architecture is a foundation, not the target security boundary. User-facing API requests currently use a service-role client, backend permissions are not implemented, and existing RLS policies are too broad. Do not expose the current build to untrusted tenants.

The target architecture is documented in [TARGET_ARCHITECTURE.md](TARGET_ARCHITECTURE.md).

## Local development

### Prerequisites

- Node.js and npm
- Python 3.11 or a compatible Python environment
- A Supabase project or local Supabase stack

### Frontend

```powershell
npm install
npm run dev
```

The Vite development server normally starts at `http://127.0.0.1:5173` or `http://localhost:5173`.

Required frontend values belong in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Never place a Supabase service-role key in a frontend environment variable.

### Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend reads bootstrap configuration from `backend/.env`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
CORS_ALLOW_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
ENABLE_BACKGROUND_TASKS=false
```

Keep `ENABLE_BACKGROUND_TASKS=false` for the API while the dedicated worker architecture is being built.

## Verification

Current repository checks:

```powershell
npm run build

cd backend
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
python -m pytest -q
python -m compileall app
```

The frontend currently has no configured lint, typecheck, or unit-test scripts. The backend has two smoke tests. These are known gaps, not skipped successful checks.

## Security status

Before production use, the project must complete:

- Organization and workspace tenancy
- Backend permission enforcement
- Tenant-safe RLS policies
- Request-scoped database access
- Encrypted and masked integration credentials
- Dedicated isolated scanner workers
- Signed and replay-protected webhooks
- Evidence integrity and secret redaction
- Cross-tenant and authorization-bypass tests
- Production deployment and recovery documentation

See [CURRENT_STATE.md](CURRENT_STATE.md) for the evidence-backed audit and [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for phase gates.

## Repository documents

| Document | Purpose |
|---|---|
| [CURRENT_STATE.md](CURRENT_STATE.md) | Current routes, schema, plugins, security gaps, and baseline results |
| [TARGET_ARCHITECTURE.md](TARGET_ARCHITECTURE.md) | Product boundaries, domains, trust model, worker and correlation design |
| [MIGRATION_PLAN.md](MIGRATION_PLAN.md) | Controlled implementation phases and verification gates |
| [MODULE_DISPOSITION.md](MODULE_DISPOSITION.md) | Keep, refactor, repurpose, archive, and planned decisions |

## License

The project intends to be open source, but this repository does not currently contain a license file. Until one is added, source availability alone does not grant reuse or distribution rights.
