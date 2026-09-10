/**
 * Normalization: provider payloads → ThreatEvents.
 *
 * Pure functions only: identical input always yields identical output.
 * No network, no clock, no randomness. Anything unparseable is skipped
 * (counted, never replaced with invented values).
 */
import {
  CLASSIFICATIONS,
  PROVIDERS,
  TIMESTAMP_KINDS,
  createThreatEvent,
} from "./model.js";

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isPublicIpv4(ip) {
  if (!IPV4_RE.test(ip)) return false;
  const [a, b] = ip.split(".").map(Number);
  if (a === 10) return false;
  if (a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 0 || a >= 224) return false;
  return true;
}

/**
 * Representative address for a CIDR block: the network address.
 * Labeled as a block representative everywhere it is shown — it stands in
 * for the listed range, it is not a confirmed malicious host.
 */
export function cidrToRepresentativeIp(cidr) {
  if (typeof cidr !== "string") return null;
  const trimmed = cidr.trim();
  const match = trimmed.match(
    /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/
  );
  if (!match) return null;
  const [, ip, prefixRaw] = match;
  const octets = ip.split(".").map(Number);
  if (octets.some((n) => n < 0 || n > 255)) return null;
  const prefix = prefixRaw == null ? 32 : Number(prefixRaw);
  if (prefix < 0 || prefix > 32) return null;
  const asInt =
    ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const net = (asInt & mask) >>> 0;
  return `${(net >>> 24) & 255}.${(net >>> 16) & 255}.${(net >>> 8) & 255}.${net & 255}`;
}

function parseDropFileDate(text) {
  const m = String(text)
    .split("\n")
    .slice(0, 30)
    .join("\n")
    .match(/Source File Date:\s*(.+)/);
  if (!m) return null;
  const d = new Date(m[1].trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Normalize one Spamhaus DROP line (CIDR) into a source-only ThreatEvent.
 * Returns null for comments, blanks, and malformed lines.
 */
export function normalizeDropLine(line, { fileDateIso = null, sourceUrl = null } = {}) {
  if (typeof line !== "string") return null;
  const cidr = line.split(";")[0].trim();
  if (!cidr || cidr.startsWith("#")) return null;
  const ip = cidrToRepresentativeIp(cidr);
  if (!ip || !isPublicIpv4(ip)) return null;
  const normalizedCidr = cidr.includes("/") ? cidr : `${ip}/32`;
  return createThreatEvent({
    provider: PROVIDERS.SPAMHAUS_DROP,
    recordId: normalizedCidr,
    timestamp: fileDateIso,
    timestampKind: fileDateIso
      ? TIMESTAMP_KINDS.LIST_PUBLICATION
      : TIMESTAMP_KINDS.RECEIVED,
    source: { ip, cidr: normalizedCidr },
    destination: null,
    classification: CLASSIFICATIONS.MALICIOUS_SOURCE,
    category: "reputation_blocklist",
    // Provider-level mapping, documented in Methodology: Spamhaus DROP lists
    // networks under hijacked / botnet-C&C control that should be blocked.
    severity: "high",
    confidence: "high",
    sourceUrl,
    observed: ["feed_record"],
    inferred: [],
    raw: { cidr: normalizedCidr },
  });
}

export function normalizeDropList(text, options = {}) {
  if (typeof text !== "string" || !text.length) {
    return { events: [], skipped: 0, fileDateIso: null };
  }
  const fileDateIso = parseDropFileDate(text);
  const opts = { ...options, fileDateIso: fileDateIso ?? options.fileDateIso ?? null };
  const events = [];
  let skipped = 0;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    const event = normalizeDropLine(trimmed, opts);
    if (event) events.push(event);
    else skipped += 1;
  }
  return { events, skipped, fileDateIso };
}

function asNonEmptyString(value) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

/**
 * Normalize one CISA KEV entry. KEV is vulnerability intelligence:
 * non-geographic by nature — source coordinates stay null and the globe
 * must not render it. Returns null for malformed entries.
 */
export function normalizeKevEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const cveId = asNonEmptyString(entry.cveID);
  if (!cveId || !/^CVE-\d{4}-\d+$/i.test(cveId)) return null;
  return createThreatEvent({
    provider: PROVIDERS.CISA_KEV,
    recordId: cveId.toUpperCase(),
    timestamp: entry.dateAdded ?? null,
    timestampKind: entry.dateAdded
      ? TIMESTAMP_KINDS.PUBLISHED
      : TIMESTAMP_KINDS.RECEIVED,
    source: {},
    destination: null,
    classification: CLASSIFICATIONS.VULNERABILITY,
    category: "known_exploited_vulnerability",
    // KEV carries no per-entry severity: stays unknown, never guessed.
    severity: "unknown",
    confidence: "high",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    observed: ["feed_record"],
    inferred: [],
    raw: {
      cveID: cveId.toUpperCase(),
      vendorProject: asNonEmptyString(entry.vendorProject),
      product: asNonEmptyString(entry.product),
      vulnerabilityName: asNonEmptyString(entry.vulnerabilityName),
      dateAdded: asNonEmptyString(entry.dateAdded),
      dueDate: asNonEmptyString(entry.dueDate),
      requiredAction: asNonEmptyString(entry.requiredAction),
      notes: asNonEmptyString(entry.notes),
    },
  });
}

export function normalizeKevCatalog(payload) {
  const list = payload?.vulnerabilities;
  if (!Array.isArray(list)) return { events: [], skipped: 0 };
  const events = [];
  let skipped = 0;
  for (const entry of list) {
    const event = normalizeKevEntry(entry);
    if (event) events.push(event);
    else skipped += 1;
  }
  return { events, skipped };
}
