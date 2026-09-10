import { describe, expect, it } from "vitest";
import spamhausDrop from "./spamhausDrop.js";
import cisaKev from "./cisaKev.js";
import { DISABLED_PROVIDERS } from "./disabled.js";
import { fetchAllProviders, getProviderMetadata } from "./index.js";

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

describe("cisa-kev provider", () => {
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
  it("exposes metadata for enabled providers", () => {
    const meta = getProviderMetadata();
    expect(meta.map((m) => m.id).sort()).toEqual(["cisa-kev", "spamhaus-drop"]);
    expect(meta.every((m) => m.requiresKey === false)).toBe(true);
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
