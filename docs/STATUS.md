# ThreatStream Execution Status (frontend-only era)

Supersedes the SaaS ledger archived at `docs/archive/STATUS.md` on 2026-09-09.
The SaaS master plan (`docs/archive/THREATSTREAM_SAAS_MASTER_PLAN.md`) is
historical and not authoritative.

## Current state

- Current task: validate + harden (tests, build, docs) — then demo.
- Exact next task: run `npm install`, `npm test`, `npm run build`; fix fallout.
- Architecture: static React + Three.js frontend. No backend/database/auth.
- Live sources: Spamhaus DROP (FireHOL mirror), CISA KEV, ipwho.is enrichment.
- Disabled (documented): URLhaus, ThreatFox, Feodo, AbuseIPDB, GreyNoise, OTX.
- Browser acceptance: not yet run (pending `npm run dev` + manual pass).
- Production acceptance: none yet (no deployment URL).

## What changed on 2026-09-09 (frontend-only rebuild)

Removed from the active tree:

- `backend/` (FastAPI, SQLAlchemy, Alembic, workers, scanners, Neon Auth
  verification), `scripts/`, `requirements.txt`
- All SaaS frontend: contexts (auth/tenancy/notifications), features
  (assets, findings, scans, teams, audit, integrations, overview, auth),
  ProtectedRoute, API client, Neon Auth, SaaS landing/terms
- Backend env files (keys were never committed — `.env` untracked, ignored)
- `@neondatabase/auth`, `@neondatabase/auth-ui`, `@react-three/fiber`,
  `@react-three/drei`, `react-globe.gl` dependencies
- SaaS docs moved to `docs/archive/` with superseded headers

Rebuilt:

- Provider abstraction + normalized `ThreatEvent` model + dedup + filters +
  derived statistics (`src/lib/threat`, `src/lib/providers`)
- Three.js globe with honest source/arc semantics (`ThreatGlobe.jsx`)
- Monitor dashboard: metrics, feed, detail, filters, timeline, stats,
  source health, disabled-source documentation
- Landing (`/`), monitor (`/monitor`), event (`/event/:id`), methodology
- Test suite for normalization/dedup/filter/stats/malformed/provider-failure
- README rewritten around the static-frontend product

## Validation (2026-09-09)

- `npm install` — clean, neon/3D-framework deps removed (`three` retained).
- `npm test` — 2 files, 21 tests, all pass.
- `npm run build` — success, static `dist/` (route-split; landing ~4 KB JS).
- `npm run dev` — serves HTTP 200 with correct title.
- Sweeps: no `firebase|supabase|neon|postgres|fastapi|sqlalchemy|alembic|
  clerk|tenant|workspace|localStorage|IndexedDB|Math.random` in `src`
  (only comments documenting their absence). No secrets committed
  (`.env` untracked + ignored; backend env files deleted).
- Browser acceptance (interactive globe/feed pass) and production
  deployment: still pending — exact next task.

## Known limitations / risks

1. Live verification pending: real `npm run dev` browser pass + `npm run build`.
2. ipwho.is free-tier budget enforced per-cycle; large backlogs stay pending.
3. No destination-bearing provider yet — globe shows markers, not arcs.
4. abuse.ch sources disabled until a keyless browser-compatible path exists.
5. node_modules still present locally (ignored, not committed).
