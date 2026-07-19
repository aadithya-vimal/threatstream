# Route and functionality status

Audit date: 2026-07-19

| Route | State | Data source |
|---|---|---|
| `/` | Functional | Product and implementation scope content |
| `/terms` | Functional | Static project notice |
| `/auth/:path` | Functional when configured | Neon Auth UI |
| `/overview` | Functional | Tenancy context, integrations, teams, safe audit events |
| `/assets` | Functional | Live filtered, sorted, paginated workspace Asset API and creation workflow |
| `/assets/:assetId` | Functional | Live detail, editing, activation, safe metadata, tags, and related Findings |
| `/workspace/teams` | Functional | Team list and create APIs |
| `/audit` | Functional for authorized roles | New tenant-scoped safe audit read API |
| `/findings` | Functional | Live filtered, sorted, paginated Findings API |
| `/findings/new` | Functional for triage roles | Workspace-scoped creation API |
| `/findings/:findingId` | Functional | Live detail, edit, lifecycle, evidence, comments, and activity APIs |
| `/settings/integrations` | Functional | Provider registry and encrypted credential lifecycle APIs |
| `/scans` | Functional | Live capability health, active/recent jobs, profiles, and Asset coverage |
| `/scans/profiles` | Functional | Live Nuclei profile creation and management |
| `/scans/profiles/:profileId` | Functional | Safe options, target management, availability, and run workflow |
| `/scans/jobs/:jobId` | Functional | Bounded polling, target progress, cancellation, and safe results |

## Audit disposition

- Fully functional: authentication bridge, protected routing, tenant context, workspace selection, organization bootstrap, integration list/save/test/delete, team list/create, audit read, Asset Inventory, Findings CRUD and triage, health and readiness.
- Partially functional: teams do not yet expose membership mutation; scanner execution uses an in-process background task pending a durable worker queue.
- UI-only placeholder: none in active navigation.
- Broken: none found in active route validation.
- Missing: application entities, deployments, runtime events, member management, scheduled scans, multi-scanner activation, and audit pagination beyond the bounded recent-event read. Repository identifiers are supported as Assets but repository connections remain future work.
- Out of scope: archived SOC screens, scanner wrappers, local execution, desktop packaging, Electron, and Tauri.

The dormant legacy pages under `src/pages` remain unregistered. They are not presented as product functionality because they depend on removed endpoints, static arrays, browser alerts, or simulated actions.
