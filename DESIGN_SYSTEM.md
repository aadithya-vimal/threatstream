# ThreatStream design system

ThreatStream uses a calm enterprise-security visual language derived from midnight navy surfaces, thin luminous borders, restrained cyan interaction color, limited violet/coral ambient accents, system typography, and softly translucent glass surfaces. The system is centralized in `src/index.css`; route components consume semantic variables and shared classes instead of defining independent palettes.

## Brand system

The shared `Brand` component is the source of truth for the product signature across public, authentication, protected, and application-shell routes. It pairs a shield-and-stream mark with a title-case `ThreatStream` wordmark; the stream half receives the cyan accent while the base name remains neutral. The compact variant retains the mark alone for collapsed navigation without introducing a second logo treatment.

The SVG mark is deliberately static and self-contained: it has no scripts, external resources, embedded credentials, or runtime dependencies. Product surfaces should use the shared component instead of reconstructing the wordmark in route markup.

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

Panels, buttons, fields, badges, notices, empty states, loading states, dialogs, navigation, and layout primitives have shared class variants. Primary surfaces use bounded translucency and blur, subtle inset highlights, pill action geometry, and generally 20–30 px container radii. Glass is used to clarify hierarchy rather than reduce contrast; dense data surfaces remain more opaque than ambient containers. Dialogs close with Escape and backdrop activation, interactive controls have visible focus rings, and animation respects `prefers-reduced-motion`. The authenticated sidebar becomes a mobile drawer below 760 px; metrics and content grids adapt at 1024 px and 760 px.

Monospace text is reserved for identifiers, slugs, timestamps, and correlation IDs. The current application does not render fabricated charts, threat maps, or security telemetry.
