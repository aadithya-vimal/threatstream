/**
 * Provider: DShield (SANS Internet Storm Center) recommended block list,
 * via the FireHOL-maintained mirror on raw.githubusercontent.com.
 *
 * The feed lists the top ~20 attacking /24 subnets DShield sensors observed
 * over the last three days (maintainer Category: attacks, ~10 min file
 * refresh). Original source: https://feeds.dshield.org/block.txt —
 * FireHOL is only the CORS-compatible mirror and is attributed as such.
 *
 * Verified browser-compatible (Access-Control-Allow-Origin: *).
 * Source-only by construction: no victims, no per-event timestamps — each
 * event carries the file's Source File Date as LIST_PUBLICATION time.
 */
import { normalizeDshieldList } from "../threat/normalize.js";

export const DSHIELD_MIRROR_URL =
  "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/dshield.netset";
export const DSHIELD_SOURCE_URL = "https://www.dshield.org/block.html";

/** The feed itself is tiny (~20 subnets); cap guards against surprises. */
export const MAX_DSHIELD_PER_CYCLE = 40;

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
  id: "dshield",
  name: "DShield Blocklist",
  kind: "attack_source_feed",
  description:
    "Top attacking subnets seen by SANS DShield sensors over the last three days — recent attack sources, not a victim log.",
  sourceUrl: DSHIELD_SOURCE_URL,
  feedUrl: DSHIELD_MIRROR_URL,
  attribution: "SANS Internet Storm Center DShield (via FireHOL mirror)",
  updateCadence: "File ~10 min · polled every 10 min",
  feedType: "CIDR blocklist (text)",
  browserCompatible: true,
  limitations:
    "Top-20 recent attackers only — small, churning set. No victims, no per-event times.",
  refreshIntervalMs: 10 * 60 * 1000,
  requiresKey: false,

  async fetchLatest({ fetchText = fetchWithTimeout } = {}) {
    const started = Date.now();
    const text = await fetchText(DSHIELD_MIRROR_URL);
    const { events, skipped, fileDateIso } = normalizeDshieldList(text, {
      sourceUrl: DSHIELD_SOURCE_URL,
    });
    return {
      events: events.slice(0, MAX_DSHIELD_PER_CYCLE),
      truncated: events.length > MAX_DSHIELD_PER_CYCLE,
      totalInFeed: events.length,
      skipped,
      fileDateIso,
      fetchedAt: new Date(started).toISOString(),
    };
  },
};

export default provider;
