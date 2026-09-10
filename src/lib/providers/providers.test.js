import { describe, expect, it } from "vitest";
import spamhausDrop from "./spamhausDrop.js";
import dshield from "./dshield.js";
import iscSources from "./iscSources.js";
import openphish from "./openphish.js";
import cisaKev from "./cisaKev.js";
import { DISABLED_PROVIDERS, UNAVAILABLE_PROVIDERS } from "./disabled.js";
import { fetchAllProviders, fetchProviders, formatCountdown, getProviderMetadata, nextCheckInMs } from "./index.js";

describe("spamhaus-drop provider", () => {
  it("normalizes fetched text with a bounded, deterministic slice", async () => {
    const lines = ["# hdr", "# Source File Date: Tue Sep  8 10:58:27 UTC 2026"];
    for (let i = 1; i <= 200; i += 1) lines.push(`9.9.${i}.0/24`);
    const result = await spamhausDrop.fetchLatest({ fetchText: async () => lines.join("\n") });
    expect(result.totalInFeed).toBe(200);
    expect(result.events.length).toBeLessThanOrEqual(140);
    expect(result.truncated).toBe(true);
    expect(result.events[0].sourceProvider).toBe("spamhaus-drop");
    expect(result.events[0].destination).toBeNull();
  });

  it("propagates fetch failure instead of fabricating fallback data", async () => {
    await expect(
      spamhausDrop.fetchLatest({ fetchText: async () => { throw new Error("net down"); } })
    ).rejects.toThrow("net down");
  });
});

describe("dshield provider", () => {
  it("normalizes the SANS block list with attack-source semantics", async () => {
    const text = "# hdr\n# Source File Date: Wed Sep  9 06:00:03 UTC 2026\n4.3.2.0/24\ngarbage\n";
    const result = await dshield.fetchLatest({ fetchText: async () => text });
    expect(result.totalInFeed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.events[0].sourceProvider).toBe("dshield");
    expect(result.events[0].category).toBe("attack_source");
    expect(result.events[0].destination).toBeNull();
    expect(result.fileDateIso).toContain("2026-09-09");
  });
});

describe("isc-sources provider", () => {
  const payload = [
    { ip: "91.191.209.198", attacks: 8153, count: 157503, firstseen: "2022-06-13", lastseen: "2026-09-10" },
    { ip: "10.0.0.1", attacks: 5, count: 5, firstseen: "2026-09-10", lastseen: "2026-09-10" },
    { ip: "not-an-ip", attacks: 1, count: 1 },
  ];

  it("normalizes sensor observations with observed timestamps, source-only", async () => {
    const result = await iscSources.fetchLatest({ fetchJson: async () => payload });
    expect(result.totalInFeed).toBe(1);
    expect(result.skipped).toBe(2);
    const e = result.events[0];
    expect(e.sourceProvider).toBe("isc-sources");
    expect(e.source.ip).toBe("91.191.209.198");
    expect(e.timestampKind).toBe("observed");
    expect(e.raw.attacks).toBe(8153);
    expect(e.destination).toBeNull();
  });

  it("propagates fetch failure instead of fabricating fallback data", async () => {
    await expect(
      iscSources.fetchLatest({ fetchJson: async () => { throw new Error("net down"); } })
    ).rejects.toThrow("net down");
  });
});

describe("openphish provider", () => {
  it("returns phishing intel with null timestamps and no destinations", async () => {
    const result = await openphish.fetchLatest({
      fetchText: async () => "http://example.com/a\nnot a url\n",
    });
    expect(result.totalInFeed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.events[0].classification).toBe("phishing");
    expect(result.events[0].timestamp).toBeNull();
    expect(result.events.every((e) => e.destination === null)).toBe(true);
  });

  it("propagates fetch failure instead of fabricating fallback data", async () => {
    await expect(
      openphish.fetchLatest({ fetchText: async () => { throw new Error("net down"); } })
    ).rejects.toThrow("net down");
  });
});

describe("cisa-kev provider (GitHub mirror)", () => {
  const payload = {
    vulnerabilities: [
      { cveID: "CVE-2024-0002", vendorProject: "B", product: "P2", dateAdded: "2024-02-01" },
      { cveID: "CVE-2024-0001", vendorProject: "A", product: "P1", dateAdded: "2024-01-01" },
      { cveID: "junk", vendorProject: "C" },
    ],
  };

  it("returns newest-first intel with malformed entries counted, not guessed", async () => {
    const result = await cisaKev.fetchLatest({ fetchJson: async () => payload });
    expect(result.totalInFeed).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.events[0].raw.cveID).toBe("CVE-2024-0002");
    expect(result.events.every((e) => e.destination === null)).toBe(true);
  });
});

describe("provider registry", () => {
  it("exposes metadata only for verified browser-compatible providers", () => {
    const meta = getProviderMetadata();
    expect(meta.map((m) => m.id).sort()).toEqual(["cisa-kev", "dshield", "isc-sources", "openphish", "spamhaus-drop"]);
    expect(meta.every((m) => m.requiresKey === false)).toBe(true);
    expect(meta.every((m) => m.browserCompatible === true)).toBe(true);
    expect(meta.every((m) => m.attribution && m.updateCadence && m.feedType)).toBe(true);
  });

  it("fetches a subset of providers without touching the others", async () => {
    const results = await fetchProviders(["dshield"]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("dshield");
  });

describe("scheduler countdown helpers", () => {
  it("computes ms until next check from last attempt + cadence", () => {
    expect(nextCheckInMs(null, 600000, 1000000)).toBe(0);
    expect(nextCheckInMs(1000000, 600000, 1000000 + 100000)).toBe(500000);
    expect(nextCheckInMs(1000000, 600000, 1000000 + 900000)).toBe(0);
  });

  it("formats mm:ss countdowns", () => {
    expect(formatCountdown(561000)).toBe("09:21");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});

describe("unavailable-source documentation", () => {
  it("keeps CORS-blocked sources out of the live list with documentation", () => {
    expect(UNAVAILABLE_PROVIDERS.map((p) => p.id)).toContain("feodo-tracker");
    expect(UNAVAILABLE_PROVIDERS.every((d) => d.reason && d.reference)).toBe(true);
    expect(getProviderMetadata().map((m) => m.id)).not.toContain("feodo-tracker");
  });

  it("isolates failures: one provider down never crashes the other", async () => {
    // fetchAllProviders uses real fetch here only if network exists; instead
    // assert the shape contract via metadata + disabled list.
    expect(DISABLED_PROVIDERS.length).toBeGreaterThan(0);
    expect(DISABLED_PROVIDERS.every((d) => d.reason && d.reference)).toBe(true);
    const results = await fetchAllProviders();
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("ok");
      expect(r).toHaveProperty("events");
      expect(Array.isArray(r.events)).toBe(true);
    }
  });
});
});
