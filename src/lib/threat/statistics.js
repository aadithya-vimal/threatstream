/**
 * Statistics derived ONLY from the currently loaded normalized events.
 * No external counters, no placeholder series. Small datasets are
 * reported honestly (27 observations renders as 27).
 */
import { hasSourceCoordinates } from "./model.js";

export function computeStatistics(events) {
  const total = events.length;
  const byProvider = countBy(events, (e) => e.sourceProvider ?? "unknown");
  const byCategory = countBy(events, (e) => e.category ?? "unknown");
  const byClassification = countBy(events, (e) => e.classification ?? "unknown");
  const bySeverity = countBy(events, (e) => e.severity ?? "unknown");
  const byConfidence = countBy(events, (e) => e.confidence ?? "unknown");
  const bySourceCountry = countBy(
    events.filter((e) => e.source?.countryCode),
    (e) => e.source.countryCode
  );
  const byAsn = countBy(
    events.filter((e) => e.source?.asn != null),
    (e) => `AS${e.source.asn}`
  );

  const geolocated = events.filter(hasSourceCoordinates).length;
  const withArc = events.filter(
    (e) =>
      hasSourceCoordinates(e) &&
      e.destination &&
      typeof e.destination.latitude === "number" &&
      typeof e.destination.longitude === "number"
  ).length;
  const uniqueSourceIps = new Set(
    events.map((e) => e.source?.ip).filter(Boolean)
  ).size;
  const highConfidence = events.filter((e) => e.confidence === "high").length;
  const asnBearing = events.filter((e) => e.source?.asn != null).length;
  const asnOrganizations = {};
  for (const e of events) {
    if (e.source?.asn != null && e.source.organization && asnOrganizations[`AS${e.source.asn}`] == null) {
      asnOrganizations[`AS${e.source.asn}`] = e.source.organization;
    }
  }

  return {
    total,
    uniqueSourceIps,
    sourceCountries: Object.keys(bySourceCountry).length,
    geolocated,
    pendingGeolocation: total - geolocated,
    genuineArcs: withArc,
    highConfidence,
    asnBearing,
    asnOrganizations,
    byProvider,
    byCategory,
    byClassification,
    bySeverity,
    byConfidence,
    bySourceCountry: topEntries(bySourceCountry, 8),
    byAsn: topEntries(byAsn, 8),
    activityOverTime: bucketizeByTime(events, 24),
  };
}

function countBy(events, keyFn) {
  const out = {};
  for (const e of events) {
    const k = keyFn(e) ?? "unknown";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function topEntries(counts, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

/**
 * Honest activity histogram: buckets cover ONLY the span of loaded
 * event timestamps. Empty when timestamps are absent.
 */
export function bucketizeByTime(events, bucketCount = 24) {
  const times = events
    .map((e) => (e.timestamp ? Date.parse(e.timestamp) : NaN))
    .filter((t) => !Number.isNaN(t));
  if (!times.length || bucketCount < 1) return [];
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 1);
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    start: min + (span * i) / bucketCount,
    end: min + (span * (i + 1)) / bucketCount,
    count: 0,
  }));
  for (const t of times) {
    const idx = Math.min(
      bucketCount - 1,
      Math.floor(((t - min) / span) * bucketCount)
    );
    buckets[idx].count += 1;
  }
  return buckets;
}
