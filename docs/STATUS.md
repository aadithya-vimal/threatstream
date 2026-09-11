# ThreatStream Execution Status (frontend-only era)

Supersedes the SaaS ledger archived at `docs/archive/STATUS.md` on 2026-09-09.
The SaaS master plan (`docs/archive/THREATSTREAM_SAAS_MASTER_PLAN.md`) is
historical and not authoritative.

## Current state

- Current task: validate + harden (tests, build, docs) — then demo.
- Exact next task: run `npm install`, `npm test`, `npm run build`; fix fallout.
- Architecture: static React + Three.js frontend. No backend/database/auth.
- Live sources (all verified browser-compatible 2026-09-10): Spamhaus DROP
  (FireHOL mirror, 10 min), DShield via FireHOL mirror (10 min), ISC Attack
  Sources direct API (30 min), OpenPhish community raw mirror (30 min),
  CISA KEV via official cisagov/kev-data mirror (60 min);
  ipwho.is → ipwhois.app enrichment. 60-second due-check scheduler (overlap-guarded)
  + snapshot diffing with lifecycle transitions (enter/fade/pulse), NEW badges,
  source drawer, ASN analytics.
- Pair-telemetry hunt 2026-09-10: no keyless CORS-compatible endpoint-bearing
  feed found (ISC sources+counts only; Feodo/URLhaus CORS-blocked; ThreatFox
  key-gated; ET/blocklist.de bare IP lists, no CORS) — arcs stay honestly at 0;
  verified arcs would repeat/pulse continuously while loaded.
- Unavailable (documented): Feodo Tracker (CORS-blocked + stale + Auth-Key).
- Disabled (documented): URLhaus, ThreatFox, AbuseIPDB, GreyNoise, OTX.
- Enrichment: ipwho.is primary + ipwhois.app fallback (both verified CORS),
  failure TTL retry (no permanent poisoning), live diagnostics in Source health.
- Monitor: replay Timeline removed; LIVE INGEST strip (last fetch, next checks,
  +added/−removed/~unchanged, NO FEED CHANGES) + source drawer + UTC clock.
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
