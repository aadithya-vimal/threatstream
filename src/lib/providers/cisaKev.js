/**
 * Provider: CISA Known Exploited Vulnerabilities (KEV) catalog, via the
 * official CISA-maintained GitHub mirror (cisagov/kev-data).
 *
 * The canonical cisa.gov endpoint sends no CORS headers (verified
 * 2026-09-10) and is unusable from browsers. The GitHub mirror serves the
 * identical catalog JSON from raw.githubusercontent.com with
 * `Access-Control-Allow-Origin: *` (verified HTTP 200, same
 * catalogVersion/count as canonical) — browser-compatible with full
 * attribution to CISA.
 *
 * KEV is vulnerability intelligence — exploited CVEs, affected products,
 * remediation due dates. No IPs, no geography: non-geographic by design
 * (feed/stats only, zero globe markers, never arcs).
 */
import { normalizeKevCatalog } from "../threat/normalize.js";

export const CISA_KEV_MIRROR_URL =
  "https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json";
export const CISA_KEV_INFO_URL =
  "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";

/** Most recently added CVEs first, bounded for memory + rendering. */
export const MAX_KEV_PER_CYCLE = 120;

async function fetchJsonWithTimeout(url, { timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function sortByDateAddedDesc(events) {
  return [...events].sort((a, b) => {
    const ta = a.raw?.dateAdded ? Date.parse(a.raw.dateAdded) : 0;
    const tb = b.raw?.dateAdded ? Date.parse(b.raw.dateAdded) : 0;
    return tb - ta;
  });
}

const provider = {
  id: "cisa-kev",
  name: "CISA KEV",
  kind: "vulnerability_intelligence",
  description:
    "Vulnerabilities confirmed exploited in the wild. Non-geographic: no globe markers, full feed + stats coverage.",
  sourceUrl: CISA_KEV_INFO_URL,
  feedUrl: CISA_KEV_MIRROR_URL,
  attribution: "CISA (via official cisagov/kev-data mirror)",
  updateCadence: "Weekdays on catalog change · polled every 60 min",
  feedType: "Vulnerability catalog (JSON, ~1.7 MB)",
  browserCompatible: true,
  limitations:
    "CVE intel only — no IPs, no geography, no severity field (stays unknown).",
  refreshIntervalMs: 60 * 60 * 1000,
  requiresKey: false,

  async fetchLatest({ fetchJson = fetchJsonWithTimeout } = {}) {
    const started = Date.now();
    const payload = await fetchJson(CISA_KEV_MIRROR_URL);
    const { events, skipped, catalogVersion, dateReleased } = normalizeKevCatalog(payload);
    const sorted = sortByDateAddedDesc(events);
    return {
      events: sorted.slice(0, MAX_KEV_PER_CYCLE),
      truncated: sorted.length > MAX_KEV_PER_CYCLE,
      totalInFeed: sorted.length,
      skipped,
      fileDateIso: null,
      catalogVersion: catalogVersion ?? null,
      dateReleased: dateReleased ?? null,
      fetchedAt: new Date(started).toISOString(),
    };
  },
};

export default provider;
