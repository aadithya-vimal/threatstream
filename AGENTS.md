# ThreatStream Agent Instructions

The authoritative product scope and execution sequence is:

`docs/THREATSTREAM_SAAS_MASTER_PLAN.md`

The authoritative progress ledger is:

`docs/STATUS.md`

Before editing:

1. Read both files completely.
2. Work only on the exact next task recorded in `docs/STATUS.md`.
3. Inspect before modifying.
4. Preserve working architecture and unrelated work.
5. Do not skip phase gates.
6. Do not use fabricated production data.
7. Do not claim browser functionality from mocked tests.
8. Never expose or commit secrets, tokens, source checkouts, raw scan outputs, honeypot logs, `.env` files, caches, builds, or `repomix-output.xml`.
9. Use Alembic only and verify the database target before migration.
10. Never force push.

Stop and document contradictions or blockers instead of inventing product behavior.
