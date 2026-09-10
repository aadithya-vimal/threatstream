/**
 * Provider: CISA Known Exploited Vulnerabilities (KEV) catalog.
 *
 * Genuinely public JSON feed, no key, browser-fetchable.
 * KEV is vulnerability intelligence — it names exploited CVEs, affected
 * products, and remediation due dates. It contains no IPs and no
 * geography, so its events are intentionally non-geographic: they appear
 * in the feed, filters, and statistics, never as globe markers.
 */
import { normalizeKevCatalog } from "../threat/normalize.js";

export const CISA_KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
export const CISA_KEV_INFO_URL =
  "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";

/** Most recently added CVEs first, bounded for memory + rendering. */
export const MAX_KEV_PER_CYCLE = 120;

async function fetchJsonWithTimeout(url, { timeoutMs = 20000 } = {}) {
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
  refreshIntervalMs: 60 * 60 * 1000,
  requiresKey: false,

  async fetchLatest({ fetchJson = fetchJsonWithTimeout } = {}) {
    const started = Date.now();
    const payload = await fetchJson(CISA_KEV_URL);
    const { events, skipped } = normalizeKevCatalog(payload);
    const sorted = sortByDateAddedDesc(events);
    return {
      events: sorted.slice(0, MAX_KEV_PER_CYCLE),
      truncated: sorted.length > MAX_KEV_PER_CYCLE,
      totalInFeed: sorted.length,
      skipped,
      fileDateIso: null,
      fetchedAt: new Date(started).toISOString(),
    };
  },
};

export default provider;
