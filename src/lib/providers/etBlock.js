/**
 * Provider: Emerging Threats Block IPs (compromised hosts), via the
 * FireHOL-maintained mirror on raw.githubusercontent.com.
 *
 * The ET Block list names hosts Emerging Threats flags as compromised and
 * frequently involved in malicious activity (maintainer Category: attacks).
 * Current at verification (Sep 2026, ~1474 subnets). FireHOL is only the
 * CORS-compatible mirror — attribution names Emerging Threats as the origin.
 *
 * Verified browser-compatible (Access-Control-Allow-Origin: *).
 * Source-only by construction: no victims, no per-event timestamps — each
 * event carries the file's Source File Date as LIST_PUBLICATION time.
 */
import { normalizeEtList } from "../threat/normalize.js";

export const ET_BLOCK_MIRROR_URL =
  "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/et_block.netset";
export const ET_BLOCK_SOURCE_URL = "https://rules.emergingthreats.net/fwrules/emerging-Block-IPs.txt";
export const ET_INFO_URL = "https://www.emergingthreats.net/";

/** Deterministic cap: first N subnets in file order per refresh cycle. */
export const MAX_ET_PER_CYCLE = 120;

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
  id: "et-block",
  name: "ET Block",
  kind: "compromised_host_feed",
  description:
    "Hosts flagged as compromised and frequently involved in malicious activity — block recommendations, not a victim-attack log.",
  sourceUrl: ET_INFO_URL,
  feedUrl: ET_BLOCK_MIRROR_URL,
  attribution: "Emerging Threats (via FireHOL mirror)",
  updateCadence: "Daily refresh · polled every 30 min",
  feedType: "CIDR blocklist (text)",
  browserCompatible: true,
  limitations:
    "Flagged-host list only — absence proves nothing. No victims, no per-event times. First ~120 subnets per cycle.",
  refreshIntervalMs: 30 * 60 * 1000,
  requiresKey: false,

  async fetchLatest({ fetchText = fetchWithTimeout } = {}) {
    const started = Date.now();
    const text = await fetchText(ET_BLOCK_MIRROR_URL);
    const { events, skipped, fileDateIso } = normalizeEtList(text, {
      sourceUrl: ET_INFO_URL,
    });
    return {
      events: events.slice(0, MAX_ET_PER_CYCLE),
      truncated: events.length > MAX_ET_PER_CYCLE,
      totalInFeed: events.length,
      skipped,
      fileDateIso,
      fetchedAt: new Date(started).toISOString(),
    };
  },
};

export default provider;
