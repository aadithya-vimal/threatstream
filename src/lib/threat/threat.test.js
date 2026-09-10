import { describe, expect, it } from "vitest";
import {
  createThreatEvent,
  hasArc,
  hasSourceCoordinates,
  parseTimestamp,
  relationshipKind,
} from "./model.js";
import {
  cidrToRepresentativeIp,
  normalizeDshieldLine,
  normalizeDropLine,
  normalizeDropList,
  normalizeIscSource,
  normalizeIscSources,
  normalizeKevCatalog,
  normalizeKevEntry,
  normalizeOpenphishFeed,
  normalizeOpenphishUrl,
} from "./normalize.js";
import { diffIdSets, mergeEvents, sameObservable } from "./dedup.js";
import { applyFilters } from "./filter.js";
import { bucketizeByTime, computeStatistics } from "./statistics.js";

const DROP_OPTS = { fileDateIso: "2026-09-08T10:58:27.000Z", sourceUrl: "https://example.invalid/drop" };

describe("DROP normalization", () => {
  it("turns a CIDR line into a source-only event with null coordinates", () => {
    const e = normalizeDropLine("1.10.16.0/20", DROP_OPTS);
    expect(e).not.toBeNull();
    expect(e.sourceProvider).toBe("spamhaus-drop");
    expect(e.source.ip).toBe("1.10.16.0");
    expect(e.source.cidr).toBe("1.10.16.0/20");
    expect(e.source.latitude).toBeNull();
    expect(e.source.longitude).toBeNull();
    expect(e.destination).toBeNull();
    expect(e.observed).toContain("feed_record");
    expect(e.inferred).toEqual([]);
    expect(e.timestampKind).toBe("list_publication");
    expect(relationshipKind(e)).toBe("intel_only");
    expect(hasSourceCoordinates(e)).toBe(false);
    expect(hasArc(e)).toBe(false);
  });

  it("computes the network address as block representative", () => {
    expect(cidrToRepresentativeIp("2.56.192.0/22")).toBe("2.56.192.0");
    expect(cidrToRepresentativeIp("  45.3.62.10/24  ")).toBe("45.3.62.0");
  });

  it("skips comments, blanks, garbage, and non-public IPs without inventing data", () => {
    expect(normalizeDropLine("# comment", DROP_OPTS)).toBeNull();
    expect(normalizeDropLine("", DROP_OPTS)).toBeNull();
    expect(normalizeDropLine("not-a-cidr", DROP_OPTS)).toBeNull();
    expect(normalizeDropLine("10.0.0.0/8", DROP_OPTS)).toBeNull();
    expect(normalizeDropLine("192.168.1.0/24", DROP_OPTS)).toBeNull();
    expect(normalizeDropLine("999.1.1.0/24", DROP_OPTS)).toBeNull();
  });

  it("is pure: identical input yields identical output (no clock, no randomness)", () => {
    const a = normalizeDropLine("5.42.92.0/24", DROP_OPTS);
    const b = normalizeDropLine("5.42.92.0/24", DROP_OPTS);
    expect(a).toEqual(b);
  });

  it("parses file date from header and counts skipped lines", () => {
    const text = "# spamhaus_drop\n# Source File Date: Tue Sep  8 10:58:27 UTC 2026\n1.10.16.0/20\ngarbage-line\n";
    const { events, skipped, fileDateIso } = normalizeDropList(text, { sourceUrl: "x" });
    expect(events).toHaveLength(1);
    expect(skipped).toBe(1);
    expect(fileDateIso).toContain("2026-09-08");
  });
});

describe("KEV normalization", () => {
  const entry = {
    cveID: "CVE-2024-1234",
    vendorProject: "Example",
    product: "Widget",
    vulnerabilityName: "Widget RCE",
    dateAdded: "2024-01-02",
    dueDate: "2024-01-23",
    requiredAction: "Apply updates.",
  };

  it("creates a non-geographic vulnerability event, severity stays unknown", () => {
    const e = normalizeKevEntry(entry);
    expect(e.sourceProvider).toBe("cisa-kev");
    expect(e.classification).toBe("vulnerability");
    expect(e.severity).toBe("unknown");
    expect(e.source.ip).toBeNull();
    expect(e.destination).toBeNull();
    expect(hasSourceCoordinates(e)).toBe(false);
    expect(relationshipKind(e)).toBe("intel_only");
    expect(e.timestampKind).toBe("published");
  });

  it("rejects malformed entries instead of repairing them with guesses", () => {
    expect(normalizeKevEntry(null)).toBeNull();
    expect(normalizeKevEntry({})).toBeNull();
    expect(normalizeKevEntry({ cveID: "not-a-cve" })).toBeNull();
    expect(normalizeKevEntry([])).toBeNull();
    expect(normalizeKevCatalog({})).toEqual({ events: [], skipped: 0, catalogVersion: null, dateReleased: null });
    expect(normalizeKevCatalog(null)).toEqual({ events: [], skipped: 0, catalogVersion: null, dateReleased: null });
  });
});

describe("timestamps", () => {
  it("parses real dates and returns null for garbage — never substitutes now", () => {
    expect(parseTimestamp("2026-09-08T10:58:27Z")).toBe("2026-09-08T10:58:27.000Z");
    expect(parseTimestamp("2024-01-02")).toContain("2024-01-02");
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("not-a-date")).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
  });
});

describe("coordinate guards", () => {
  it("rejects nulls and (0,0) Null-Island fallbacks", () => {
    const base = createThreatEvent({ provider: "p", recordId: "r", source: {} });
    expect(hasSourceCoordinates(base)).toBe(false);
    const zero = createThreatEvent({
      provider: "p",
      recordId: "r",
      source: { latitude: 0, longitude: 0 },
    });
    expect(hasSourceCoordinates(zero)).toBe(false);
    const real = createThreatEvent({
      provider: "p",
      recordId: "r",
      source: { latitude: 12.97, longitude: 77.59 },
    });
    expect(hasSourceCoordinates(real)).toBe(true);
    expect(relationshipKind(real)).toBe("source_only");
  });

  it("requires both endpoints for an arc", () => {
    const e = createThreatEvent({
      provider: "p",
      recordId: "r",
      source: { latitude: 12.97, longitude: 77.59 },
      destination: { latitude: 51.5, longitude: -0.12 },
    });
    expect(hasArc(e)).toBe(true);
    expect(relationshipKind(e)).toBe("observed_path");
  });
});

describe("deduplication", () => {
  it("merges unchanged refreshes silently and preserves enrichment", () => {
    const e = normalizeDropLine("1.10.16.0/20", DROP_OPTS);
    const first = mergeEvents(new Map(), [e]);
    expect(first.added).toBe(1);
    const again = mergeEvents(first.map, [normalizeDropLine("1.10.16.0/20", DROP_OPTS)]);
    expect(again.added).toBe(0);
    expect(again.updated).toBe(0);
    // Refresh payload without geo must not wipe enriched coordinates.
    const enriched = {
      ...e,
      source: { ...e.source, latitude: 1, longitude: 2, country: "X", countryCode: "XX" },
      inferred: ["geolocation_approximate"],
    };
    const withGeo = mergeEvents(first.map, [enriched]);
    expect(withGeo.updated).toBe(1);
    const wiped = mergeEvents(withGeo.map, [normalizeDropLine("1.10.16.0/20", DROP_OPTS)]);
    expect(wiped.map.get(e.id).source.latitude).toBe(1);
  });
});

describe("filtering", () => {
  const evts = [
    createThreatEvent({ provider: "spamhaus-drop", recordId: "1.1.1.0/24", source: { ip: "1.1.1.0", countryCode: "US", country: "United States", asn: 13335, organization: "Cloudflare" }, category: "reputation_blocklist", classification: "malicious_source", severity: "high", confidence: "high", timestamp: "2026-09-08T10:00:00Z" }),
    createThreatEvent({ provider: "cisa-kev", recordId: "CVE-2024-1234", classification: "vulnerability", category: "known_exploited_vulnerability", severity: "unknown", confidence: "high", timestamp: "2024-01-02", raw: { cveID: "CVE-2024-1234", vendorProject: "Example", product: "Widget" } }),
  ];

  it("filters by provider, category, severity, confidence, country, relationship", () => {
    expect(applyFilters(evts, { providers: ["cisa-kev"] })).toHaveLength(1);
    expect(applyFilters(evts, { categories: ["reputation_blocklist"] })).toHaveLength(1);
    expect(applyFilters(evts, { severities: ["high"] })).toHaveLength(1);
    expect(applyFilters(evts, { sourceCountries: ["US"] })).toHaveLength(1);
    expect(applyFilters(evts, { asns: ["AS13335"] })).toHaveLength(1);
    expect(applyFilters(evts, { asns: ["AS99999"] })).toHaveLength(0);
    expect(applyFilters(evts, { relationship: "intel_only" })).toHaveLength(2);
    expect(applyFilters(evts, { relationship: "source_only" })).toHaveLength(0);
  });

  it("searches IP, ASN, org, CVE, country", () => {
    expect(applyFilters(evts, { query: "1.1.1" })).toHaveLength(1);
    expect(applyFilters(evts, { query: "13335" })).toHaveLength(1);
    expect(applyFilters(evts, { query: "as13335" })).toHaveLength(1);
    expect(applyFilters(evts, { query: "cloudflare" })).toHaveLength(1);
    expect(applyFilters(evts, { query: "cve-2024-1234" })).toHaveLength(1);
    expect(applyFilters(evts, { query: "no-such-thing" })).toHaveLength(0);
  });

  it("time window narrows honestly", () => {
    const now = Date.parse("2026-09-08T12:00:00Z");
    expect(applyFilters(evts, { hours: 24 }, now)).toHaveLength(1);
    expect(applyFilters(evts, { hours: 0 }, now)).toHaveLength(2);
  });
});

describe("statistics", () => {
  it("derives counts only from loaded events — small stays small", () => {
    const evts = [
      createThreatEvent({ provider: "spamhaus-drop", recordId: "1.1.1.0/24", source: { ip: "1.1.1.0", countryCode: "US", latitude: 37, longitude: -97 }, confidence: "high" }),
      createThreatEvent({ provider: "spamhaus-drop", recordId: "2.2.2.0/24", source: { ip: "2.2.2.0" }, confidence: "high" }),
    ];
    const s = computeStatistics(evts);
    expect(s.total).toBe(2);
    expect(s.uniqueSourceIps).toBe(2);
    expect(s.sourceCountries).toBe(1);
    expect(s.geolocated).toBe(1);
    expect(s.pendingGeolocation).toBe(1);
    expect(s.genuineArcs).toBe(0);
    expect(s.byProvider["spamhaus-drop"]).toBe(2);
  });

  it("counts ASN-bearing observations and maps first-seen organizations", () => {
    const withAsn = createThreatEvent({ provider: "spamhaus-drop", recordId: "3.3.3.0/24", source: { ip: "3.3.3.0", asn: 14061, organization: "DigitalOcean" } });
    const noAsn = createThreatEvent({ provider: "spamhaus-drop", recordId: "4.4.4.0/24", source: { ip: "4.4.4.0" } });
    const s = computeStatistics([withAsn, noAsn]);
    expect(s.asnBearing).toBe(1);
    expect(s.byAsn).toEqual([{ label: "AS14061", value: 1 }]);
    expect(s.asnOrganizations).toEqual({ AS14061: "DigitalOcean" });
    expect(computeStatistics([noAsn]).byAsn).toEqual([]);
  });

  it("returns empty buckets when no timestamps exist", () => {
    expect(bucketizeByTime([{ timestamp: null }])).toEqual([]);
    expect(computeStatistics([]).total).toBe(0);
  });
});

describe("dshield normalization", () => {
  it("produces source-only attack-source events with DShield identity", () => {
    const e = normalizeDshieldLine("4.3.2.0/24", { fileDateIso: "2026-09-09T06:00:03.000Z", sourceUrl: "https://www.dshield.org/block.html" });
    expect(e).not.toBeNull();
    expect(e.sourceProvider).toBe("dshield");
    expect(e.category).toBe("attack_source");
    expect(e.destination).toBeNull();
    expect(e.source.ip).toBe("4.3.2.0");
    expect(relationshipKind(e)).toBe("intel_only");
    expect(hasArc(e)).toBe(false);
  });
});

describe("openphish normalization", () => {
  it("turns URL lines into non-geographic phishing intel with null timestamps", () => {
    const e = normalizeOpenphishUrl("http://example.com/login");
    expect(e).not.toBeNull();
    expect(e.sourceProvider).toBe("openphish");
    expect(e.classification).toBe("phishing");
    expect(e.destination).toBeNull();
    expect(e.timestamp).toBeNull();
    expect(e.timestampKind).toBe("received");
    expect(e.raw.domain).toBe("example.com");
    expect(hasSourceCoordinates(e)).toBe(false);
    expect(hasArc(e)).toBe(false);
  });

  it("skips blanks, comments, and malformed URLs without inventing data", () => {
    expect(normalizeOpenphishUrl("")).toBeNull();
    expect(normalizeOpenphishUrl("# comment")).toBeNull();
    expect(normalizeOpenphishUrl("not a url")).toBeNull();
    expect(normalizeOpenphishUrl("http://nodot")).toBeNull();
    const { events, skipped } = normalizeOpenphishFeed("http://a.com/x\nhttp://a.com/x\njunk\n");
    expect(events).toHaveLength(1);
    expect(skipped).toBe(1);
  });
});

describe("snapshot diffing", () => {
  it("computes added/removed/unchanged by stable id, ignoring order", () => {
    const d = diffIdSets(["a", "b", "c"], ["c", "a", "d"]);
    expect(d.added).toEqual(["d"]);
    expect(d.removed).toEqual(["b"]);
    expect(d.unchanged.sort()).toEqual(["a", "c"]);
  });

  it("reports no changes for identical snapshots", () => {
    const d = diffIdSets(["a"], ["a"]);
    expect(d).toEqual({ added: [], removed: [], unchanged: ["a"] });
  });
});

describe("no fabricated destinations", () => {
  it("a source-only record cannot become a source→destination path", () => {
    const drop = normalizeDropLine("1.10.16.0/20", DROP_OPTS);
    const dshield = normalizeDshieldLine("4.3.2.0/24", DROP_OPTS);
    const phish = normalizeOpenphishUrl("http://example.com/login");
    const isc = normalizeIscSource({ ip: "91.191.209.198", attacks: 8153, count: 1, firstseen: "2022-06-13", lastseen: "2026-09-10" });
    for (const e of [drop, dshield, phish, isc]) {
      expect(e.destination).toBeNull();
      expect(hasArc(e)).toBe(false);
      expect(relationshipKind(e)).not.toBe("observed_path");
    }
  });
});

describe("isc-sources normalization", () => {
  it("keeps genuine observation timestamps and counts, skips private IPs", () => {
    const e = normalizeIscSource({ ip: "91.191.209.198", attacks: 8153, count: 157503, firstseen: "2022-06-13", lastseen: "2026-09-10" });
    expect(e.timestampKind).toBe("observed");
    expect(e.timestamp).toContain("2026-09-10");
    expect(e.raw.reports).toBe(157503);
    expect(normalizeIscSource({ ip: "10.0.0.1", attacks: 1 })).toBeNull();
    expect(normalizeIscSource(null)).toBeNull();
    const { events, skipped } = normalizeIscSources([
      { ip: "91.191.209.198", attacks: 1 },
      { ip: "91.191.209.198", attacks: 1 },
      { ip: "junk", attacks: 1 },
    ]);
    expect(events).toHaveLength(1);
    expect(skipped).toBe(1);
  });
});

describe("merge lifecycle ids", () => {
  it("reports added and updated ids for visuals without touching records", () => {
    const a = normalizeDropLine("1.10.16.0/20", DROP_OPTS);
    const first = mergeEvents(new Map(), [a]);
    expect(first.addedIds).toEqual([a.id]);
    expect(first.updatedIds).toEqual([]);
    const enriched = { ...a, source: { ...a.source, latitude: 1, longitude: 2 }, inferred: ["geolocation_approximate"] };
    const second = mergeEvents(first.map, [enriched]);
    expect(second.updatedIds).toEqual([a.id]);
    expect(second.map.get(a.id).sessionFirstSeen).toBeUndefined();
  });

  it("treats an identical refresh as zero-change, not an update", () => {
    const a = normalizeDropLine("1.10.16.0/20", DROP_OPTS);
    const enriched = { ...a, source: { ...a.source, latitude: 1, longitude: 2, country: "X" }, inferred: ["geolocation_approximate"] };
    const first = mergeEvents(new Map(), [enriched]);
    const repeat = mergeEvents(first.map, [normalizeDropLine("1.10.16.0/20", DROP_OPTS)]);
    expect(repeat.added).toBe(0);
    expect(repeat.updated).toBe(0);
    expect(repeat.updatedIds).toEqual([]);
    expect(sameObservable(first.map.get(a.id), repeat.map.get(a.id))).toBe(true);
  });
});
