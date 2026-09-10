> Historical record — superseded.
> Not authoritative for current ThreatStream architecture or setup.

# ThreatStream Development

## Working directories

- Frontend commands run from the repository root.
- Backend, Alembic, API, and worker commands run from `backend`.
- `backend/app` is the sole Python package root; run Python commands from `backend`.

Frontend route components live in capability folders under `src/features`. Shared components, contexts, layouts, and helpers remain in their corresponding top-level `src` directories.

## Environment

Copy `.env.example` to `.env` and `backend/.env.example` to `backend/.env`, then provide development-only values. Never print or commit real values. Required groups include frontend API/Auth URLs, PostgreSQL URLs, Neon Auth issuer/JWKS configuration, and the integration credential encryption key.

## Install

```powershell
npm install
python -m pip install -r backend/requirements.txt
```

Python dependencies are constraints rather than a lock; use an isolated virtual environment.

## Run

```powershell
.\scripts\threatstream.ps1
```

Or start processes independently:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
Set-Location backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
python -m app.workers.scan_worker
```

The current launcher opens separate windows but does not await readiness or provide coordinated shutdown.

## Validate

```powershell
npm test -- --run
npm run build
Set-Location backend
python -m compileall app
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
python -m pytest -q
python -m alembic heads
```

The plugin-autoload setting isolates repository tests from unrelated globally installed pytest plugins. Do not treat tests/build as browser acceptance.

## Database safety

- Use Alembic only.
- Confirm the exact disposable/development target before any migration.
- Do not run destructive tests against shared or production data.
- Current repository metadata has one head, `20260719_0006`; live database state remains unverified unless separately checked.

## Scanner safety

Nuclei is the only active adapter. Its absence must be reported honestly. Run scans only against explicitly authorized targets. Do not add arbitrary flags, shell execution, repository script execution, or fabricated fallback results.
