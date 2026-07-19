# Route and functionality status

Audit date: 2026-07-19

| Route | State | Data source |
|---|---|---|
| `/` | Functional | Product and implementation scope content |
| `/terms` | Functional | Static project notice |
| `/auth/:path` | Functional when configured | Neon Auth UI |
| `/overview` | Functional | Tenancy context, integrations, teams, safe audit events |
| `/workspace/teams` | Functional | Team list and create APIs |
| `/audit` | Functional for authorized roles | New tenant-scoped safe audit read API |
| `/findings` | Functional | Live filtered, sorted, paginated Findings API |
| `/findings/new` | Functional for triage roles | Workspace-scoped creation API |
| `/findings/:findingId` | Functional | Live detail, edit, lifecycle, evidence, comments, and activity APIs |
| `/settings/integrations` | Functional | Provider registry and encrypted credential lifecycle APIs |

## Audit disposition

- Fully functional: authentication bridge, protected routing, tenant context, workspace selection, organization bootstrap, integration list/save/test/delete, team list/create, audit read, Findings CRUD and triage, health and readiness.
- Partially functional: teams do not yet expose membership mutation; dashboard has no application-derived finding metrics because application and scanner ingestion domains do not yet exist.
- UI-only placeholder: none in active navigation.
- Broken: none found in active route validation.
- Missing: applications, repositories, automated scans and finding ingestion, deployments, runtime events, member management, and audit pagination beyond the bounded recent-event read.
- Out of scope: archived SOC screens, scanner wrappers, local execution, desktop packaging, Electron, and Tauri.

The dormant legacy pages under `src/pages` remain unregistered. They are not presented as product functionality because they depend on removed endpoints, static arrays, browser alerts, or simulated actions.
