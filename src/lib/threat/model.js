/**
 * ThreatStream normalized event model (frontend-only, in-memory).
 *
 * Data-truth rules enforced here:
 * - Unknown information stays `null` / `"unknown"`. Never defaulted.
 * - Coordinates are NEVER synthesized. `null` until real geolocation arrives.
 *   In particular there is no `(0, 0)` fallback (Null Island is a lie).
 * - `destination` is `null` unless the provider genuinely supplies one.
 * - `observed` lists what the source directly states.
 *   `inferred` lists what ThreatStream derived (e.g. geolocation).
 */

/** Stable provider identifiers for enabled (live) providers. */
export const PROVIDERS = {
  SPAMHAUS_DROP: "spamhaus-drop",
  DSHIELD: "dshield",
  OPENPHISH: "openphish",
  CISA_KEV: "cisa-kev",
};

/** How the event timestamp should be read. Never presented as an attack time. */
export const TIMESTAMP_KINDS = {
  /** Provider published this exact record at this time (e.g. KEV dateAdded). */
  PUBLISHED: "published",
  /** Entry comes from a list published at this time (e.g. DROP file date). */
  LIST_PUBLICATION: "list_publication",
  /** Only the fetch time is known. */
  RECEIVED: "received",
};

/** What the record fundamentally is. Controls globe + feed rendering. */
export const CLASSIFICATIONS = {
  /** Malicious infrastructure published by a reputation feed. Source-only. */
  MALICIOUS_SOURCE: "malicious_source",
  /** Phishing URL intelligence. Non-geographic — never a globe marker. */
  PHISHING: "phishing",
  /** Actively-exploited vulnerability intelligence. Non-geographic. */
  VULNERABILITY: "vulnerability",
};

export const SEVERITY_LEVELS = ["critical", "high", "medium", "low", "unknown"];
export const CONFIDENCE_LEVELS = ["high", "medium", "low", "unknown"];

/**
 * Create a normalized ThreatEvent. Missing values stay null.
 * This factory never invents data: it only copies what it is given.
 */
export function createThreatEvent({
  provider,
  recordId,
  timestamp,
  timestampKind = TIMESTAMP_KINDS.RECEIVED,
  source = {},
  destination = null,
  classification = CLASSIFICATIONS.MALICIOUS_SOURCE,
  category = "unknown",
  severity = "unknown",
  confidence = "unknown",
  sourceUrl = null,
  observed = [],
  inferred = [],
  raw = null,
}) {
  if (!provider || !recordId) {
    throw new Error("createThreatEvent requires provider and recordId");
  }
  const id = `${provider}:${recordId}`;
  const parsedTimestamp = parseTimestamp(timestamp);
  return {
    id,
    timestamp: parsedTimestamp,
    timestampKind,
    source: {
      ip: source.ip ?? null,
      cidr: source.cidr ?? null,
      latitude: source.latitude ?? null,
      longitude: source.longitude ?? null,
      country: source.country ?? null,
      countryCode: source.countryCode ?? null,
      city: source.city ?? null,
      asn: source.asn ?? null,
      organization: source.organization ?? null,
    },
    destination: destination
      ? {
          ip: destination.ip ?? null,
          latitude: destination.latitude ?? null,
          longitude: destination.longitude ?? null,
          country: destination.country ?? null,
          countryCode: destination.countryCode ?? null,
          city: destination.city ?? null,
          asn: destination.asn ?? null,
          organization: destination.organization ?? null,
        }
      : null,
    classification,
    category,
    severity: SEVERITY_LEVELS.includes(severity) ? severity : "unknown",
    confidence: CONFIDENCE_LEVELS.includes(confidence) ? confidence : "unknown",
    sourceProvider: provider,
    sourceRecordId: String(recordId),
    sourceUrl,
    observed: Array.isArray(observed) ? observed : [],
    inferred: Array.isArray(inferred) ? inferred : [],
    raw,
  };
}

/**
 * Parse a timestamp honestly. Returns an ISO string or null.
 * Never substitutes "now" for a missing value — callers decide whether
 * the fetch time is an acceptable stand-in and must label it RECEIVED.
 */
export function parseTimestamp(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/** An event can be placed on the globe only with real numeric coordinates. */
export function hasSourceCoordinates(event) {
  return (
    !!event?.source &&
    typeof event.source.latitude === "number" &&
    Number.isFinite(event.source.latitude) &&
    typeof event.source.longitude === "number" &&
    Number.isFinite(event.source.longitude) &&
    Math.abs(event.source.latitude) <= 90 &&
    Math.abs(event.source.longitude) <= 180 &&
    !(event.source.latitude === 0 && event.source.longitude === 0)
  );
}

/** A genuine source → destination arc needs real coordinates on both ends. */
export function hasDestinationCoordinates(event) {
  return (
    !!event?.destination &&
    typeof event.destination.latitude === "number" &&
    Number.isFinite(event.destination.latitude) &&
    typeof event.destination.longitude === "number" &&
    Number.isFinite(event.destination.longitude) &&
    !(event.destination.latitude === 0 && event.destination.longitude === 0)
  );
}

export function hasArc(event) {
  return hasSourceCoordinates(event) && hasDestinationCoordinates(event);
}

/** Visual relationship state — always explicit, never implied. */
export function relationshipKind(event) {
  if (hasArc(event)) return "observed_path";
  if (hasSourceCoordinates(event)) return "source_only";
  return "intel_only";
}
