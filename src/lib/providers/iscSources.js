/**
 * Provider: SANS Internet Storm Center — top attacking sources API.
 *
 * Endpoint: https://isc.sans.edu/api/sources/attacks/100?json
 * Verified 2026-09-10: HTTP 200, `Access-Control-Allow-Origin: *`,
 * current data (lastseen dated today), ~100 records shaped as
 * { ip, attacks, count, firstseen, lastseen }.
 *
 * Genuine observed activity: ISC honeypot sensors saw these source IPs
 * attacking. firstseen/lastseen are real source observation times —
 * still source-only: the API publishes no victim IPs, so destination
 * stays null and no arcs are drawn. Attribution: SANS ISC / DShield.
 */
import { normalizeIscSources } from "../threat/normalize.js";

export const ISC_SOURCES_URL = "https://isc.sans.edu/api/sources/attacks/100?json";
export const ISC_INFO_URL = "https://isc.sans.edu/";

/** Bounded for memory + rendering; API returns ~100. */
export const MAX_ISC_PER_CYCLE = 100;

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

function sortByAttacksDesc(events) {
  return [...events].sort((a, b) => (b.raw?.attacks ?? 0) - (a.raw?.attacks ?? 0));
}

const provider = {
  id: "isc-sources",
  name: "ISC Attack Sources",
  kind: "attack_source_observations",
  description:
    "Attacker source IPs observed by SANS ISC sensors, with observed attack counts and first/last seen dates. Source-only — no victim endpoints published.",
  sourceUrl: ISC_INFO_URL,
  feedUrl: ISC_SOURCES_URL,
  attribution: "SANS Internet Storm Center",
  updateCadence: "Daily sensor aggregates · polled every 30 min",
  feedType: "Attack-source observations (JSON)",
  browserCompatible: true,
  limitations:
    "Source IPs + counts only — no victims, no ports per record, no destinations. Counts reflect sensor visibility, not global totals.",
  refreshIntervalMs: 30 * 60 * 1000,
  requiresKey: false,

  async fetchLatest({ fetchJson = fetchJsonWithTimeout } = {}) {
    const started = Date.now();
    const payload = await fetchJson(ISC_SOURCES_URL);
    const { events, skipped } = normalizeIscSources(payload);
    const sorted = sortByAttacksDesc(events);
    return {
      events: sorted.slice(0, MAX_ISC_PER_CYCLE),
      truncated: sorted.length > MAX_ISC_PER_CYCLE,
      totalInFeed: sorted.length,
      skipped,
      fileDateIso: null,
      fetchedAt: new Date(started).toISOString(),
    };
  },
};

export default provider;
