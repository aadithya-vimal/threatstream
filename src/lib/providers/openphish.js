/**
 * Provider: OpenPhish Community Feed (phishing URLs).
 *
 * The public feed (one URL per line) 302-redirects to OpenPhish's own
 * GitHub mirror; this provider fetches that raw mirror URL directly
 * (verified Access-Control-Allow-Origin: *, HTTP 200, ~300 URLs).
 *
 * Phishing intelligence — NOT attack telemetry and NOT geographic:
 * the feed provides URLs with no IPs and no timestamps, so events are
 * non-geographic intel records (feed/stats only, zero globe markers).
 * Timestamps are RECEIVED (client fetch time), honestly labeled.
 */
import { normalizeOpenphishFeed } from "../threat/normalize.js";

export const OPENPHISH_FEED_URL =
  "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
export const OPENPHISH_INFO_URL = "https://www.openphish.com/phishing_feeds.html";

/** Newest-first is not guaranteed; bounded deterministic slice in file order. */
export const MAX_OPENPHISH_PER_CYCLE = 150;

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
  id: "openphish",
  name: "OpenPhish",
  kind: "phishing_intelligence",
  description:
    "Community phishing URLs — intelligence records for awareness and blocking, never plotted as attacks.",
  sourceUrl: OPENPHISH_INFO_URL,
  feedUrl: OPENPHISH_FEED_URL,
  attribution: "OpenPhish Community Feed",
  updateCadence: "Periodic community refresh · polled every 20 sec",
  feedType: "URL list (text)",
  browserCompatible: true,
  limitations:
    "URLs only — no IPs, no timestamps, no victims. Shown in feed/stats, never on the globe.",
  refreshIntervalMs: 20 * 1000,
  requiresKey: false,

  async fetchLatest({ fetchText = fetchWithTimeout } = {}) {
    const started = Date.now();
    const text = await fetchText(OPENPHISH_FEED_URL);
    const { events, skipped } = normalizeOpenphishFeed(text);
    // Timestamps stay null (the feed provides none): stable identity comes
    // from the URL itself, so refresh diffing compares URL membership.
    // Stamping fetch time here would fake novelty every cycle.
    return {
      events: events.slice(0, MAX_OPENPHISH_PER_CYCLE),
      truncated: events.length > MAX_OPENPHISH_PER_CYCLE,
      totalInFeed: events.length,
      skipped,
      fileDateIso: null,
      fetchedAt: new Date(started).toISOString(),
    };
  },
};

export default provider;
