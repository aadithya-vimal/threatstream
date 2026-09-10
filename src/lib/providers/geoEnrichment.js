/**
 * Browser-side IP geolocation enrichment (free, keyless, CORS-enabled).
 * Primary: ipwho.is — fallback: ipwhois.app. Both verified 2026-09-10:
 * HTTP 200, `Access-Control-Allow-Origin: *`, lat/lon + country/ASN/org,
 * clean `{success:false}` failure shapes, no key required.
 *
 * Enrichment is approximate metadata — always labeled as inferred
 * (`geolocation_approximate`), never as an observed fact.
 *
 * Protections:
 * - In-memory cache only (Map). No localStorage / IndexedDB / persistence.
 * - Bounded lookups per refresh cycle, bounded concurrency (free-tier friendly).
 * - Failures cached with a TTL (retryable with backoff) — never poisoned forever.
 * - Private/reserved/malformed IPs never queried.
 * - Any failure → event keeps null coordinates (honest "pending" state).
 * - Diagnostics counters expose attempted/succeeded/failed + last error,
 *   so enrichment health is observable instead of opaque.
 */

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isQueryableIpv4(ip) {
  if (typeof ip !== "string" || !IPV4_RE.test(ip)) return false;
  const [a, b] = ip.split(".").map(Number);
  if (a === 10) return false;
  if (a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 0 || a >= 224) return false;
  // Documentation / test ranges are never real infrastructure.
  if (a === 192 && b === 0) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && Number(ip.split(".")[2]) === 100) return false;
  if (a === 203 && b === 0 && Number(ip.split(".")[2]) === 113) return false;
  return true;
}

/** Max NEW lookups per refresh cycle — cached IPs cost nothing. */
export const MAX_GEO_LOOKUPS_PER_CYCLE = 30;
export const GEO_CONCURRENCY = 2;
export const GEO_TIMEOUT_MS = 8000;
/** Failed lookups become retryable after this long (backoff, not poison). */
export const GEO_FAIL_TTL_MS = 10 * 60 * 1000;
/** Bound the in-memory cache (oldest entries evicted first). */
export const GEO_CACHE_MAX = 2000;

function parseIpwhoIs(data) {
  if (!data || data.success === false) return null;
  const lat = Number(data.latitude);
  const lon = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null;
  return {
    latitude: lat,
    longitude: lon,
    country: data.country ?? null,
    countryCode: data.country_code ?? null,
    city: data.city ?? null,
    asn: data.connection?.asn ?? null,
    organization: data.connection?.org ?? data.connection?.isp ?? null,
  };
}

function parseIpwhoisApp(data) {
  if (!data || data.success === false) return null;
  const lat = Number(data.latitude);
  const lon = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null;
  const asnRaw = data.asn ?? null;
  const asn =
    typeof asnRaw === "string" && asnRaw.toUpperCase().startsWith("AS")
      ? Number(asnRaw.slice(2)) || null
      : typeof asnRaw === "number"
        ? asnRaw
        : null;
  return {
    latitude: lat,
    longitude: lon,
    country: data.country ?? null,
    countryCode: data.country_code ?? null,
    city: data.city ?? null,
    asn,
    organization: data.org ?? data.isp ?? null,
  };
}

const ENDPOINTS = [
  {
    name: "ipwho.is",
    url: (ip) =>
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=ip,country,country_code,region,city,latitude,longitude,asn,org`,
    parse: parseIpwhoIs,
  },
  {
    name: "ipwhois.app",
    url: (ip) => `https://ipwhois.app/json/${encodeURIComponent(ip)}`,
    parse: parseIpwhoisApp,
  },
];

// ip -> { at, geo|null, fails }. geo null = failed (retryable after TTL).
const cache = new Map();

const diagnostics = {
  attempted: 0,
  succeeded: 0,
  failed: 0,
  perEndpoint: {},
  lastError: null,
  lastSuccessAt: null,
};

function noteEndpoint(name, ok, status) {
  const e = diagnostics.perEndpoint[name] ?? { ok: 0, fail: 0, lastStatus: null };
  if (ok) e.ok += 1;
  else e.fail += 1;
  e.lastStatus = status;
  diagnostics.perEndpoint[name] = e;
}

export function getGeoDiagnostics() {
  let pendingRetry = 0;
  const now = Date.now();
  for (const entry of cache.values()) {
    if (!entry.geo && now - entry.at < GEO_FAIL_TTL_MS) pendingRetry += 1;
  }
  return {
    attempted: diagnostics.attempted,
    succeeded: diagnostics.succeeded,
    failed: diagnostics.failed,
    cached: cache.size,
    pendingRetry,
    perEndpoint: JSON.parse(JSON.stringify(diagnostics.perEndpoint)),
    lastError: diagnostics.lastError,
    lastSuccessAt: diagnostics.lastSuccessAt,
  };
}

export function geoCacheSize() {
  return cache.size;
}

export function clearGeoCache() {
  cache.clear();
}

function getCached(ip, now) {
  const entry = cache.get(ip);
  if (!entry) return undefined;
  if (entry.geo) return entry.geo;
  // Failed entries are retryable once the TTL expires.
  if (now - entry.at < GEO_FAIL_TTL_MS) return null;
  return undefined;
}

function setCached(ip, geo, now) {
  if (cache.size >= GEO_CACHE_MAX && !cache.has(ip)) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(ip, { at: now, geo, fails: geo ? 0 : (cache.get(ip)?.fails ?? 0) + 1 });
}

async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { ok: false, status: `HTTP ${res.status}`, data: null };
    return { ok: true, status: `HTTP ${res.status}`, data: await res.json() };
  } catch (err) {
    return {
      ok: false,
      status: err?.name === "AbortError" ? "timeout" : (err?.message ?? "network error"),
      data: null,
    };
  } finally {
    clearTimeout(t);
  }
}

async function lookupOne(ip) {
  const now = Date.now();
  const cached = getCached(ip, now);
  if (cached !== undefined) return cached;
  if (!isQueryableIpv4(ip)) {
    setCached(ip, null, now);
    return null;
  }
  diagnostics.attempted += 1;
  let lastStatus = "no endpoint tried";
  for (const ep of ENDPOINTS) {
    const res = await fetchJson(ep.url(ip), GEO_TIMEOUT_MS);
    if (res.ok) {
      const geo = ep.parse(res.data);
      if (geo) {
        noteEndpoint(ep.name, true, res.status);
        setCached(ip, geo, Date.now());
        diagnostics.succeeded += 1;
        diagnostics.lastSuccessAt = new Date().toISOString();
        return geo;
      }
      lastStatus = `${ep.name}: no coordinates in response`;
      noteEndpoint(ep.name, false, res.status);
    } else {
      lastStatus = `${ep.name}: ${res.status}`;
      noteEndpoint(ep.name, false, res.status);
    }
  }
  setCached(ip, null, Date.now());
  diagnostics.failed += 1;
  diagnostics.lastError = `${ip}: ${lastStatus}`;
  return null;
}

/**
 * Enrich events with real geolocation. Returns { events, lookedUp, resolved }.
 * Input events are never mutated; enriched copies carry inferred: [geo...].
 */
export async function enrichEvents(events, { budget = MAX_GEO_LOOKUPS_PER_CYCLE } = {}) {
  const targets = [];
  const now = Date.now();
  for (const e of events) {
    const ip = e?.source?.ip;
    if (!ip) continue;
    if (e.source.latitude != null && e.source.longitude != null) continue;
    const cached = getCached(ip, now);
    if (cached) {
      targets.push({ event: e, cached });
    } else if (cached === undefined && budget > 0 && isQueryableIpv4(ip)) {
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

export const __geoInternals = { cache, diagnostics, ENDPOINTS, lookupOne };
