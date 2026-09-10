# ThreatStream Agent Instructions

ThreatStream is a **frontend-only** cybersecurity threat-intelligence
visualization app. The SaaS era (FastAPI, PostgreSQL/Neon, Firebase, auth,
tenancy, workers, Alembic) was removed on 2026-09-09; its documents survive
only under `docs/archive/` with a superseded header and are NOT authoritative.

Authoritative sources: `README.md` (product + architecture) and
`docs/STATUS.md` (progress ledger). Methodology lives in the app at
`/methodology`.

Before editing:

1. Read `README.md` and `docs/STATUS.md`.
2. Work only on the exact next task recorded in `docs/STATUS.md`.
3. Inspect before modifying. Preserve working code and unrelated work.
4. Do not reintroduce backends, databases, auth, persistence, or SaaS modules.
5. Do not use fabricated production data — no mock attacks, IPs, coordinates,
   timestamps, severities, or fallback demo arrays in the production path.
6. Do not claim browser functionality from mocked tests.
7. In-memory session state only: no localStorage, IndexedDB, or server storage.
8. Never expose or commit secrets, tokens, `.env` files, caches, builds, or
   `repomix-output.xml`. No private API keys in client-side code, ever.
9. Never force push.

Stop and document contradictions or blockers instead of inventing behavior.
When data cannot support a visualization, change the visualization — never
invent the data.
