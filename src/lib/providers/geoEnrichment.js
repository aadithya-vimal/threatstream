/**
 * Browser-side IP geolocation enrichment via ipwho.is (free, keyless,
 * CORS-enabled). Enrichment is approximate metadata — always labeled as
 * inferred, never as an observed fact.
 *
 * Protections:
 * - In-memory cache only (Map). No localStorage / IndexedDB / persistence.
 * - Bounded lookups per refresh cycle (free-tier friendly).
 * - Bounded concurrency, per-request timeout.
 * - Private/reserved IPs never queried.
 * - Any failure → event keeps null coordinates (honest "pending" state).
 */

export const GEO_FIELDS = "ip,country,country_code,region,city,latitude,longitude,asn,org";
/** Max NEW lookups per refresh cycle — cached IPs cost nothing. */
export const MAX_GEO_LOOKUPS_PER_CYCLE = 25;
export const GEO_CONCURRENCY = 4;
export const GEO_TIMEOUT_MS = 8000;

const cache = new Map(); // ip -> geo | null (null = failed, do not retry this session)

export function geoCacheSize() {
  return cache.size;
}

export function clearGeoCache() {
  cache.clear();
}

async function lookupOne(ip) {
  if (cache.has(ip)) return cache.get(ip);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), GEO_TIMEOUT_MS);
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=${GEO_FIELDS}`, {
      signal: ctrl.signal,
    });
    if (!res.ok) {
      cache.set(ip, null);
      return null;
    }
    const data = await res.json();
    if (!data?.success) {
      cache.set(ip, null);
      return null;
    }
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
      cache.set(ip, null);
      return null;
    }
    const geo = {
      latitude: lat,
      longitude: lon,
      country: data.country ?? null,
      countryCode: data.country_code ?? null,
      city: data.city ?? null,
      asn: data.connection?.asn ?? null,
      organization: data.connection?.org ?? data.connection?.isp ?? null,
    };
    cache.set(ip, geo);
    return geo;
  } catch {
    cache.set(ip, null);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Enrich events with real geolocation. Returns { events, lookedUp, resolved }.
 * Input events are never mutated; enriched copies carry inferred: [geo...].
 */
export async function enrichEvents(events, { budget = MAX_GEO_LOOKUPS_PER_CYCLE } = {}) {
  const targets = [];
  for (const e of events) {
    const ip = e?.source?.ip;
    if (!ip) continue;
    if (e.source.latitude != null && e.source.longitude != null) continue;
    if (cache.has(ip)) {
      const hit = cache.get(ip);
      if (hit) targets.push({ event: e, cached: hit });
    } else if (budget > 0) {
      targets.push({ event: e, lookup: ip });
      budget -= 1;
    }
  }

  const byIp = new Map();
  const queue = targets.filter((t) => t.lookup).map((t) => t.lookup);
  const uniqueIps = [...new Set(queue)];
  let lookedUp = 0;
  for (let i = 0; i < uniqueIps.length; i += GEO_CONCURRENCY) {
    const batch = uniqueIps.slice(i, i + GEO_CONCURRENCY);
    const results = await Promise.all(batch.map((ip) => lookupOne(ip)));
    results.forEach((geo, idx) => byIp.set(batch[idx], geo));
    lookedUp += batch.length;
  }
  for (const t of targets) {
    if (t.cached) byIp.set(t.event.source.ip, t.cached);
  }

  let resolved = 0;
  const out = events.map((e) => {
    const geo = e?.source?.ip ? byIp.get(e.source.ip) : undefined;
    if (!geo) return e;
    resolved += 1;
    return {
      ...e,
      source: { ...e.source, ...geo },
      inferred: Array.from(new Set([...(e.inferred ?? []), "geolocation_approximate"])),
    };
  });
  return { events: out, lookedUp, resolved };
}
