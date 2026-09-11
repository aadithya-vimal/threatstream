/**
 * Provider: Spamhaus DROP (Don't Route Or Peer) list, via the
 * FireHOL-maintained mirror on raw.githubusercontent.com.
 *
 * Why this source:
 * - Genuinely public, no key, browser-fetchable (CORS-enabled static file,
 *   verified Access-Control-Allow-Origin: *).
 * - Updated ~every 12h at origin; the mirror header states its file date,
 *   which becomes each event's LIST_PUBLICATION timestamp.
 * - Each entry is a CIDR under hijacked / botnet-C&C control.
 *
 * What it proves: "this network range is blocklisted malicious
 * infrastructure". It does NOT name victims or attack times — events are
 * source-only by construction and rendered as such.
 */
import { normalizeDropList } from "../threat/normalize.js";

export const SPAMHAUS_DROP_MIRROR_URL =
  "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/spamhaus_drop.netset";
export const SPAMHAUS_DROP_SOURCE_URL = "https://www.spamhaus.org/drop/drop.txt";

/** Deterministic cap: first N subnets in file order per refresh cycle. */
export const MAX_SUBNETS_PER_CYCLE = 140;

async function fetchWithTimeout(url, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

const provider = {
  id: "spamhaus-drop",
  name: "Spamhaus DROP",
  kind: "reputation_blocklist",
  description:
    "Networks under hijacked or botnet command-and-control — published for blocklisting, not a victim-attack log.",
  sourceUrl: SPAMHAUS_DROP_SOURCE_URL,
  feedUrl: SPAMHAUS_DROP_MIRROR_URL,
  attribution: "Spamhaus Project (via FireHOL mirror)",
  updateCadence: "Origin ~12h · polled every 10 min",
  feedType: "CIDR blocklist (text)",
  browserCompatible: true,
  limitations:
    "Lists ranges only — absence proves nothing. No victims, times, or targets. First ~140 subnets per cycle.",
  refreshIntervalMs: 10 * 60 * 1000,
  requiresKey: false,

  async fetchLatest({ fetchText = fetchWithTimeout } = {}) {
    const started = Date.now();
    const text = await fetchText(SPAMHAUS_DROP_MIRROR_URL);
    const { events, skipped, fileDateIso } = normalizeDropList(text, {
      sourceUrl: SPAMHAUS_DROP_SOURCE_URL,
    });
    return {
      events: events.slice(0, MAX_SUBNETS_PER_CYCLE),
      truncated: events.length > MAX_SUBNETS_PER_CYCLE,
      totalInFeed: events.length,
      skipped,
      fileDateIso,
      fetchedAt: new Date(started).toISOString(),
    };
  },
};

export default provider;
