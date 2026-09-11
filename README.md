# ThreatStream

Live Cyber Threat Intelligence, Visualized.

## Overview

ThreatStream is a **frontend-only** live threat-intelligence viewer. It continuously
fetches current public security feeds in the browser, normalizes them into attributed
observations, enriches approximate infrastructure geography, and renders them on an
interactive 3D globe — alongside a live feed, filters, statistics, event inspection,
timeline, and methodology.

It distinguishes **observed facts** from **enriched/inferred** context, attributes
every event to its source, and **never fabricates** attacks, IPs, locations,
timestamps, victims, or statistics.

## Features

- Interactive Globe.GL globe with 7 switchable views (Operations, Threat heatmap,
  Attack paths, Threat rings, Hex density, Satellite, Minimal) — one real
  dataset, per-view projections, no synthetic records
- Real diff-driven transitions: arrivals fade in with rings, removals fade out,
  changes pulse; unchanged markers stay still; no historical replay
- Dark/light analyst themes (runtime only, follows system preference)
- Live observation feed with honest source-only labeling + NEW/removed states
- Compact filter toolbar (search, provider, category, severity, confidence,
  classification, country, relationship, time window) with active-filter chips
- Statistics derived only from loaded in-memory data
- Full event inspection: overview, source, destination, evidence, enrichment,
  assessment, attribution
- Provider health: live / degraded / offline, stale detection, unavailable +
  disabled source documentation
- Methodology & transparency page
- Responsive mobile layout, keyboard navigation, focus states, aria labeling

## Architecture

```text
Browser
↓
Public threat-intelligence sources (Spamhaus DROP · DShield · ISC sources · OpenPhish · CISA KEV mirror · ipwho.is enrichment)
↓
Client normalization (ThreatEvent model · pure functions)
↓
Client enrichment (approximate GeoIP, budgeted + cached in-memory)
↓
In-memory state (React context · snapshot diffing · no storage)
↓
Globe.GL visualization (views · lifecycle transitions · feed · filters · stats · detail)
```

No backend. No database. No accounts. No persistence.

Animation represents changes in the loaded intelligence dataset; it does not
manufacture network traffic.

## Stack

React · Vite · Globe.GL · Three.js · Public CTI feeds · Browser-side GeoIP enrichment

`npm run build` emits a static `dist/` deployable to any static host.

## Live Data Sources

| Provider | What it publishes | What ThreatStream renders | Attribution |
|---|---|---|---|
| **Spamhaus DROP** via FireHOL mirror (`raw.githubusercontent.com`) | CIDR ranges under hijacked / botnet-C&C control, origin ~12h refresh, polled 20 sec | Source-only markers (●), geolocated in-browser | `https://www.spamhaus.org/drop/drop.txt` |
| **DShield** (SANS) via FireHOL mirror | Top ~20 attacking /24s seen over 3 days, ~10 min refresh, polled 20 sec | Source-only markers (●), geolocated in-browser | `https://www.dshield.org/block.html` (mirror: FireHOL) |
| **ISC Attack Sources** (SANS, direct API) | Attacker IPs with observed counts + first/last seen, daily aggregates, polled 20 sec | Source-only markers (●), geolocated in-browser | `https://isc.sans.edu/` |
| **OpenPhish** Community Feed (raw GitHub mirror) | Reported phishing URLs (~300), periodic refresh, polled 20 sec | Intel records (feed/stats only, never globe) | `https://www.openphish.com/phishing_feeds.html` |
| **CISA KEV** via official `cisagov/kev-data` mirror | CVEs confirmed exploited (~1700), weekdays, polled 20 sec | Intel records (feed/stats only, never globe) | `https://www.cisa.gov/known-exploited-vulnerabilities-catalog` |
| **ipwho.is** (free, keyless) | Approximate IP → country/city/ASN/org | Enrichment only, labeled `geolocation_approximate` | Per-event, in detail panel |

**Unavailable** (documented in-app under Source health): Feodo Tracker — blocklist
endpoint sends no CORS headers (browsers block the fetch), the public list was
stale-dated with 5 entries at verification, and API access needs an Auth-Key
(verified 2026-09-10).

**Deliberately disabled**: URLhaus, ThreatFox (abuse.ch Auth-Key required),
AbuseIPDB, GreyNoise, AlienVault OTX (secret API keys). No private keys ship in
the bundle, ever.

## Data Integrity

1. On load — and every ~20 seconds after (a 5-second scheduler checks what is
   due, pausing while the tab is hidden; browser HTTP caching keeps repeat
   fetches cheap) — the provider registry fetches each enabled source directly
   from the browser.
2. Payloads are normalized into `ThreatEvent`s (`src/lib/threat/model.js`).
3. Events deduplicate on stable provider-derived ids; each cycle diffs the live
   snapshot (`+added −removed ~unchanged`) and reports real counts — unchanged
   data merges silently; the UI never pretends old data is new. Removed records
   linger briefly to fade out, then leave the in-memory window.
4. Source-only IPs missing coordinates are enriched via ipwho.is within a
   per-cycle budget (25 lookups, cached in-memory); failures stay `null`
   (“pending”), never guessed.
5. One provider failing degrades gracefully (others continue); all failing shows
   an honest empty state. There is **no mock fallback**.

## Observed vs Inferred

- **Observed** — stated directly by the provider (blocklist membership, list dates).
- **Enriched** — approximate IP metadata resolved in-browser (country, city, ASN,
  organization, coarse coordinates).
- **Inferred** — currently only the `geolocation_approximate` marker. No victim
  guessing, no attack-path fabrication, no severity invention.

Unknown stays `null`/`unknown` — never `(0,0)`, never “now”, never “medium”.
`destination` stays `null` unless a provider genuinely supplies one.

## Globe Visualization

`src/components/globe/ThreatGlobe.jsx` (Globe.GL, 7 switchable views over one
real dataset — Operations, Heatmap, Verified Flows, Rings, Hex, Satellite, Minimal):

- Source-only intel → marker (red observed, amber enriched); genuine
  both-endpoint observations → great-circle arc with a continuously repeating
  directional pulse for as long as the record stays loaded.
- Real arrivals fade/scale in with a ring, removals fade out, changes pulse —
  driven by actual snapshot diffs, never simulated. Unchanged markers stay still.
- No verified victim endpoints exist in current browser-compatible feeds, so
  the globe truthfully reports zero confirmed paths instead of drawing arcs.
  Investigated 2026-09-10: ISC publishes sources + counts only; Feodo is
  CORS-blocked; URLhaus/ThreatFox are key-gated or CORS-blocked; Emerging
  Threats and blocklist.de publish bare IP lists with no CORS headers — and
  even where both endpoint types exist in one record (e.g. MISP attributes),
  the source never establishes that they communicated, so pairing them would
  itself be fabrication.
- Capped markers (600), arcs (40), rings (in-session arrivals only), heat/hex
  derived from the same records at weight 1; rendering pauses when hidden,
  fullscreen support, reduced-motion support.

## Local Development

Prerequisites: Node.js 18+ and npm.

```powershell
npm install
npm run dev      # Vite on http://localhost:5173
```

## Deployment

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

## Limitations

- DROP contributes only the first ~140 subnets per cycle; geolocation is budgeted
  (~25 new lookups/cycle) — the rest wait as “pending”, visible in feed/stats but
  not on the globe.
- No destination-bearing provider exists yet — zero confirmed paths is the honest
  count; the renderer draws arcs automatically when data allows.
- CISA KEV is unavailable (CORS-blocked endpoint), not silently failing.
- abuse.ch feeds are disabled until a keyless browser-compatible mirror exists.
- In-memory only: refresh clears everything by design.

## Privacy

All fetching and enrichment happen in your browser against public endpoints. No
cookies, no browser storage, no accounts, no tracking — there is no server to send
anything to.

## Future Work

- Additional **keyless, CORS-compatible** reputation feeds as they are verified.
- Optional opt-in CORS-friendly relay only if it preserves attribution + terms.
- Denser globe clustering when geolocated volume grows.
- Nothing that requires secrets, accounts, servers, or fabricated data.

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
