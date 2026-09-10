/**
 * Provider registry: fetchLatest / normalize / getMetadata / getSourceHealth.
 * One provider failing degrades gracefully — it never crashes the app and
 * never poisons other providers' data.
 */
import spamhausDrop from "./spamhausDrop.js";
import cisaKev from "./cisaKev.js";
import { DISABLED_PROVIDERS } from "./disabled.js";

export const PROVIDER_LIST = [spamhausDrop, cisaKev];
export { DISABLED_PROVIDERS };

export function getProviderMetadata() {
  return PROVIDER_LIST.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    description: p.description,
    sourceUrl: p.sourceUrl,
    refreshIntervalMs: p.refreshIntervalMs,
    requiresKey: p.requiresKey,
    enabled: true,
  }));
}

/**
 * Fetch every enabled provider. Always resolves — per-provider results
 * carry ok/data or ok:false/error. No fake fallback, ever.
 */
export async function fetchAllProviders() {
  const settled = await Promise.all(
    PROVIDER_LIST.map(async (p) => {
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
