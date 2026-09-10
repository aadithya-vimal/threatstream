/**
 * Provider registry: fetchLatest / normalize / getMetadata / getSourceHealth.
 * One provider failing degrades gracefully — it never crashes the app and
 * never poisons other providers' data.
 *
 * Only genuinely browser-compatible sources belong in PROVIDER_LIST
 * (verified Access-Control-Allow-Origin on the fetched endpoint).
 * Feodo Tracker is public but CORS-blocked + stale (see UNAVAILABLE_PROVIDERS)
 * and is therefore NOT fetched live.
 */
import spamhausDrop from "./spamhausDrop.js";
import dshield from "./dshield.js";
import iscSources from "./iscSources.js";
import openphish from "./openphish.js";
import cisaKev from "./cisaKev.js";
import { DISABLED_PROVIDERS, UNAVAILABLE_PROVIDERS } from "./disabled.js";

export const PROVIDER_LIST = [spamhausDrop, dshield, iscSources, openphish, cisaKev];
export { DISABLED_PROVIDERS, UNAVAILABLE_PROVIDERS };

export function getProviderMetadata() {
  return PROVIDER_LIST.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    description: p.description,
    sourceUrl: p.sourceUrl,
    feedUrl: p.feedUrl ?? null,
    attribution: p.attribution ?? p.name,
    updateCadence: p.updateCadence ?? null,
    feedType: p.feedType ?? null,
    browserCompatible: p.browserCompatible ?? false,
    limitations: p.limitations ?? null,
    refreshIntervalMs: p.refreshIntervalMs,
    requiresKey: p.requiresKey,
    enabled: true,
  }));
}

/**
 * Fetch a subset of providers by id (default: all enabled).
 * Always resolves — per-provider results carry ok/data or ok:false/error.
 * No fake fallback, ever. onSettled(result) fires as each provider finishes,
 * enabling honest per-provider progress (counts only, never synthetic data).
 */
export async function fetchProviders(ids = null, { onSettled = null } = {}) {
  const list = ids ? PROVIDER_LIST.filter((p) => ids.includes(p.id)) : PROVIDER_LIST;
  const settled = await Promise.all(
    list.map(async (p) => {
      const started = Date.now();
      let result;
      try {
        const data = await p.fetchLatest();
        result = {
          id: p.id,
          ok: true,
          latencyMs: Date.now() - started,
          fetchedAt: new Date().toISOString(),
          ...data,
        };
      } catch (err) {
        result = {
          id: p.id,
          ok: false,
          latencyMs: Date.now() - started,
          fetchedAt: new Date().toISOString(),
          events: [],
          error:
            err?.name === "AbortError"
              ? "Request timed out"
              : err?.message ?? "Unknown provider error",
        };
      }
      try {
        onSettled?.(result);
      } catch {
        /* progress callback must never break ingestion */
      }
      return result;
    })
  );
  return settled;
}

/** Fetch every enabled provider. See fetchProviders. */
export async function fetchAllProviders() {
  return fetchProviders(null);
}

/**
 * Milliseconds until a provider's next scheduled check, derived from its
 * last attempt wall-clock + cadence. Pure UI-time helper for countdowns —
 * never touches event timestamps. Returns 0 when due now.
 */
export function nextCheckInMs(lastAttemptMs, refreshIntervalMs, nowMs = Date.now()) {
  if (lastAttemptMs == null || Number.isNaN(lastAttemptMs)) return 0;
  return Math.max(0, refreshIntervalMs - (nowMs - lastAttemptMs));
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(m)}:${p(r)}`;
}
