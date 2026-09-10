# ThreatStream — Live Cyber Threat Intelligence, Visualized

ThreatStream is a **frontend-only** cybersecurity threat-intelligence
visualization platform. It retrieves current threat observations from
legitimate public, browser-accessible sources, normalizes them in the
browser, geolocates source infrastructure where the data permits, and renders
source → destination relationships as animated arcs on an interactive 3D Earth —
alongside a live event feed, filters, statistics, event details, timeline
controls, and geographic exploration.

It clearly distinguishes **observed facts** from **inferred/enriched**
information, attributes every event to its source, and **never fabricates**
attack events, IPs, locations, timestamps, attackers, victims, or statistics.

## Architecture

```text
┌──────────┐     ┌─────────────────────────────────┐     ┌────────────────┐
│  Browser │────▶│ Live public threat-intel sources │────▶│ Client-side    │
│  (React) │     │  · Spamhaus DROP (FireHOL mirror)│     │ normalization  │
└──────────┘     │  · CISA KEV catalog              │     │ + enrichment   │
      ▲          │  · ipwho.is geolocation (approx) │     └───────┬────────┘
      │          └─────────────────────────────────┘             │
      │                                                         ▼
      │                                                  ┌────────────────┐
      └──────────────────────────────────────────────────│ React state    │
                                                         │ (in-memory)    │
                                                         └───────┬────────┘
                                                                 ▼
                                                  ┌────────────────────────┐
                                                  │ Three.js globe + UI    │
                                                  │ feed · filters · stats │
                                                  │ timeline · methodology │
                                                  └────────────────────────┘
```

There is **no** backend, database, auth, worker, Docker, ORM, migration,
persistence layer, or server process. `npm run build` emits a static `dist/`
deployable to Cloudflare Pages, Vercel, Netlify, GitHub Pages, or any static
host. Page refresh intentionally resets all state (in-memory session only —
no localStorage, no IndexedDB).

## Data sources (live, keyless, browser-compatible)

| Provider | What it publishes | What ThreatStream renders | Attribution |
|---|---|---|---|
| **Spamhaus DROP** via FireHOL mirror (`raw.githubusercontent.com`) | CIDR ranges under hijacked / botnet-C&C control, ~12h refresh | Source-only markers (●), geolocated in-browser | `https://www.spamhaus.org/drop/drop.txt` |
| **CISA KEV** catalog JSON | CVEs confirmed exploited in the wild | Non-geographic intel records (feed/stats only) | `https://www.cisa.gov/known-exploited-vulnerabilities-catalog` |
| **ipwho.is** (free, keyless) | Approximate IP → country/city/ASN/org | Enrichment only, labeled `geolocation_approximate` | Per-event, in detail panel |

**Deliberately disabled** (documented in-app under Source health): URLhaus,
ThreatFox, Feodo Tracker (abuse.ch now requires a personal Auth-Key — a
browser bundle cannot hold it without leaking credentials), AbuseIPDB,
GreyNoise, AlienVault OTX (secret API keys). No private keys ship in the
bundle, ever.

## How live data is obtained

1. On load (and every 10 min after, pausing while the tab is hidden), the
   provider registry fetches each enabled source directly from the browser.
2. Payloads are normalized into `ThreatEvent`s (see `src/lib/threat/model.js`).
3. Events deduplicate on stable `provider + record + timestamp` keys —
   unchanged data merges silently; the UI never pretends old data is new.
4. Source-only IPs missing coordinates are enriched via ipwho.is within a
   per-cycle budget (25 lookups, cached in-memory); failures stay `null`
   (“pending”), never guessed.
5. One provider failing degrades gracefully; all failing shows an honest
   empty state. There is **no mock fallback** — `if (!data) return mockData`
   does not exist in this codebase.

## Event normalization

`src/lib/threat/` holds the pure pipeline: `model.js` (event factory, `null`
defaults, coordinate guards rejecting `(0,0)`), `normalize.js` (DROP lines,
KEV entries; malformed input skipped + counted), `dedup.js` (stable hashing,
enrichment-preserving merges), `filter.js` (country/category/provider/
relationship/time/search), `statistics.js` (metrics derived only from loaded
events). `src/lib/providers/` holds one module per source plus the registry
(`fetchLatest / normalize / getMetadata / getSourceHealth` semantics).

## Globe visualization

`src/components/globe/ThreatGlobe.jsx` (plain Three.js + OrbitControls):

- Source-only intel → marker; genuine both-endpoint observations → great-circle
  arc with traveling pulse; enriched markers render amber vs red.
- Current providers publish **source-only** intelligence, so the globe
  truthfully shows markers, not attack arcs — arcs render automatically if a
  future provider supplies destinations.
- Auto-rotate, drag, zoom, reset, focus-on-event, hover/click select,
  pause/resume, instanced markers (cap 600), arc cap (40), rAF paused when
  hidden, full disposal on unmount, reduced-motion support.

## Run locally

Prerequisites: Node.js 18+ and npm.

```powershell
npm install
npm run dev      # Vite on http://localhost:5173
```

## Build for deployment

```powershell
npm run build    # static output in dist/
npm run preview  # serve dist/ locally to verify
```

Deploy `dist/` as a static site (Cloudflare Pages, Vercel, Netlify, GH Pages).
No environment variables, no server, no secrets required.

## Tests

```powershell
npm test         # vitest: normalization, dedup, filtering, stats,
                 #        malformed input, missing coords, provider failure
                 #        isolation, timestamp + confidence handling,
                 #        purity (no randomness in the pipeline)
```

## Data-truth principles

- Every displayed event has an identifiable source + source link.
- Unknown stays `null`/`unknown` — never `(0,0)`, never “now”, never “medium”.
- Observed (feed record), enriched (approximate GeoIP), and inferred markers
  are labeled separately in list, globe legend, and detail views.
- Statistics count loaded data only. Small datasets are reported honestly.
- Methodology (`/methodology`) documents sources, meanings, confidence,
  geolocation limits, timestamps, dedup, retention (none — memory only),
  and provider limitations.

## Known limitations

- DROP contributes only the first ~140 subnets per cycle; geolocation is
  budgeted (~25 new lookups/cycle) to respect the free tier — the rest wait
  as “pending”, visible in feed/stats but not on the globe.
- No provider currently supplies victim destinations, so no attack arcs can
  honestly be drawn yet; the renderer supports them when data allows.
- KEV carries no severity — shown as `unknown`, never guessed.
- abuse.ch feeds are disabled until a keyless browser-compatible mirror exists.
- In-memory only: refresh clears everything by design.

## Project layout

```text
src/
  App.jsx  main.jsx  styles.css
  components/  globe/  feed/  detail/  filters/  stats/  timeline/  layout/  ui/
  features/  landing/  monitor/  events/  methodology/
  lib/  threat/ (model·normalize·dedup·filter·statistics)
        providers/ (spamhausDrop·cisaKev·disabled·geoEnrichment·index)
        geo/ (coordinates)  format.js
  state/  ThreatIntelContext.jsx   (in-memory session store)
```

## Roadmap (honest, data-dependent)

- Additional **keyless, CORS-compatible** reputation feeds as they are verified.
- Optional opt-in CORS-friendly relay only if it preserves attribution + terms.
- Denser globe clustering when geolocated volume grows.
- Nothing that requires secrets, accounts, servers, or fabricated data.
