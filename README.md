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
| FastAPI service | Available | Versioned tenant APIs, JWT validation, correlation IDs, and typed error envelopes |
| Supabase persistence | Experimental | Additive tenancy migration is implemented but must be applied and validated in each deployment |
| Organizations, workspaces, and teams | Available after migration | Tenant onboarding, workspace selection, memberships, roles, permissions, and RLS boundaries |
| Encrypted integration credentials | Available after migration | AES-256-GCM encryption, masked metadata readback, rotation/removal audit events |
| Background jobs and scheduler | Archived | Legacy execution APIs are no longer registered; dedicated worker is planned |
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
        | Supabase Auth access token
        v
FastAPI tenant API ----> Supabase PostgREST with the user's bearer token
                              |
                              +----> tenant RLS + permission functions
```

Legacy SOC tables still contain broad historical policies, but they are no longer exposed through active backend routes. New tenant records use explicit organization/workspace policies. Do not reactivate legacy routes until their data models and RLS policies are migrated.

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
VITE_API_URL=http://127.0.0.1:8000
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
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWT_ISSUER=https://your-project.supabase.co/auth/v1
CREDENTIAL_ENCRYPTION_KEY=base64url-encoded-32-byte-key
CREDENTIAL_KEY_VERSION=1
CORS_ALLOW_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
ENABLE_BACKGROUND_TASKS=false
```

Keep `ENABLE_BACKGROUND_TASKS=false` for the API while the dedicated worker architecture is being built.

Generate a credential-encryption key once and store it in the API/worker secret manager:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).Replace('+','-').Replace('/','_')
```

Back up this key securely. Losing it makes stored provider credentials unrecoverable.

### Apply database migrations

Validate against a disposable local stack first:

```powershell
supabase start
supabase db reset
```

Run `supabase/tests/tenancy_authorization.sql` against that disposable database. Applying the migration to a remote project requires its database password and should occur only after reviewing the dry run:

```powershell
$env:SUPABASE_DB_PASSWORD='your-database-password'
supabase db push --dry-run --include-all
supabase db push --include-all
```

## Verification

Current repository checks:

```powershell
npm run build
npm test

cd backend
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
python -m pytest -q
python -m compileall app
```

The frontend has a Vitest tenant-context suite but still has no configured lint or typecheck script. The backend has security and legacy worker tests. These remaining gaps are not treated as successful checks.

`npm audit --omit=dev` currently reports zero production dependency vulnerabilities. The Vite 5 development toolchain retains two advisories that require a breaking Vite upgrade; that upgrade is deferred to a dedicated compatibility change.

## Security status

Before production use, the project must complete:

- Dedicated isolated scanner workers
- Signed and replay-protected webhooks
- Evidence integrity and secret redaction
- Cross-tenant and authorization-bypass tests
- Production deployment and recovery documentation

The Phase 2 implementation report, including migration-validation limitations, is in [PHASE_2_REPORT.md](PHASE_2_REPORT.md).

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
