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
import openphish from "./openphish.js";
import cisaKev from "./cisaKev.js";
import { DISABLED_PROVIDERS, UNAVAILABLE_PROVIDERS } from "./disabled.js";

export const PROVIDER_LIST = [spamhausDrop, dshield, openphish, cisaKev];
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
 * No fake fallback, ever.
 */
export async function fetchProviders(ids = null) {
  const list = ids ? PROVIDER_LIST.filter((p) => ids.includes(p.id)) : PROVIDER_LIST;
  const settled = await Promise.all(
    list.map(async (p) => {
      const started = Date.now();
      try {
        const data = await p.fetchLatest();
        return {
          id: p.id,
          ok: true,
          latencyMs: Date.now() - started,
          fetchedAt: new Date().toISOString(),
          ...data,
        };
      } catch (err) {
        return {
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
    })
  );
  return settled;
}

/** Fetch every enabled provider. See fetchProviders. */
export async function fetchAllProviders() {
  return fetchProviders(null);
}
