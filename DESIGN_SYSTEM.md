# ThreatStream design system

ThreatStream uses a calm enterprise-security visual language derived from midnight navy surfaces, thin luminous borders, restrained cyan interaction color, and limited violet/coral ambient accents. The system is centralized in `src/index.css`; route components consume semantic variables and shared classes instead of defining independent palettes.

## Semantic tokens

| Purpose | Token |
|---|---|
| Application and elevated backgrounds | `--background`, `--background-elevated` |
| Panels and interaction surfaces | `--surface`, `--surface-strong`, `--surface-secondary`, `--surface-hover`, `--active-surface` |
| Boundaries | `--border`, `--border-strong` |
| Text hierarchy | `--text-primary`, `--text-secondary`, `--text-muted` |
| Interaction and support accents | `--accent-cyan`, `--accent-blue`, `--accent-violet`, `--accent-magenta` |
| Priority emphasis | `--accent-coral`, `--accent-amber` |
| Status | `--success`, `--warning`, `--danger`, `--info` |
| Accessibility and depth | `--focus-ring`, `--overlay`, `--shadow-sm`, `--shadow-lg`, `--glow` |

Cyan is the primary interaction color. Red is reserved for errors or dangerous actions. Coral and amber identify priority or warning states. Violet and magenta appear mainly in ambient gradients, never as universal severity signals.

## Shared components and behavior

Panels, buttons, fields, badges, notices, empty states, loading states, dialogs, navigation, and layout primitives have shared class variants. Dialogs close with Escape and backdrop activation, interactive controls have visible focus rings, and animation respects `prefers-reduced-motion`. The authenticated sidebar becomes a mobile drawer below 760 px; metrics and content grids adapt at 1024 px and 760 px.

Monospace text is reserved for identifiers, slugs, timestamps, and correlation IDs. The current application does not render fabricated charts, threat maps, or security telemetry.
