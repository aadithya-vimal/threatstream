import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  __geoInternals,
  clearGeoCache,
  enrichEvents,
  getGeoDiagnostics,
  isQueryableIpv4,
} from "./geoEnrichment.js";
import { createThreatEvent } from "../threat/model.js";

const IPWHO_JSON = {
  success: true,
  latitude: 37.7749,
  longitude: -122.4194,
  country: "United States",
  country_code: "US",
  city: "San Francisco",
  connection: { asn: 13335, org: "Cloudflare", isp: "Cloudflare" },
};

const IPWHOIS_JSON = {
  success: true,
  latitude: 51.5,
  longitude: -0.12,
  country: "United Kingdom",
  country_code: "GB",
  city: "London",
  asn: "AS13335",
  org: "Cloudflare",
  isp: "Cloudflare",
};

function jsonResponse(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function evt(ip) {
  return createThreatEvent({ provider: "spamhaus-drop", recordId: `${ip}/24`, source: { ip, cidr: `${ip}/24` } });
}

beforeEach(() => {
  clearGeoCache();
  __geoInternals.diagnostics.attempted = 0;
  __geoInternals.diagnostics.succeeded = 0;
  __geoInternals.diagnostics.failed = 0;
  __geoInternals.diagnostics.perEndpoint = {};
  __geoInternals.diagnostics.lastError = null;
  __geoInternals.diagnostics.lastSuccessAt = null;
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ip query guard", () => {
  it("rejects private, reserved, documentation, and malformed IPs", () => {
    expect(isQueryableIpv4("10.0.0.1")).toBe(false);
    expect(isQueryableIpv4("192.168.1.1")).toBe(false);
    expect(isQueryableIpv4("127.0.0.1")).toBe(false);
    expect(isQueryableIpv4("203.0.113.1")).toBe(false);
    expect(isQueryableIpv4("198.51.100.7")).toBe(false);
    expect(isQueryableIpv4("not-an-ip")).toBe(false);
    expect(isQueryableIpv4("8.8.8.8")).toBe(true);
  });
});

describe("enrichment success", () => {
  it("merges real coordinates and marks inferred, preserving the event", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(IPWHO_JSON)));
    const { events, resolved } = await enrichEvents([evt("8.8.8.8")]);
    expect(resolved).toBe(1);
    expect(events[0].source.latitude).toBe(37.7749);
    expect(events[0].source.countryCode).toBe("US");
    expect(events[0].source.asn).toBe(13335);
    expect(events[0].inferred).toContain("geolocation_approximate");
    expect(events[0].destination).toBeNull();
    const d = getGeoDiagnostics();
    expect(d.succeeded).toBe(1);
    expect(d.lastSuccessAt).not.toBeNull();
  });

  it("falls back to the secondary endpoint when the primary fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        String(url).includes("ipwho.is")
          ? jsonResponse({ success: false }, 200)
          : jsonResponse(IPWHOIS_JSON)
      )
    );
    const { events, resolved } = await enrichEvents([evt("1.1.1.1")]);
    expect(resolved).toBe(1);
    expect(events[0].source.city).toBe("London");
    expect(getGeoDiagnostics().perEndpoint["ipwhois.app"].ok).toBe(1);
  });
});

describe("enrichment failure", () => {
  it("leaves coordinates null and records diagnostics when all endpoints fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("net down"); }));
    const { events, resolved } = await enrichEvents([evt("8.8.8.8")]);
    expect(resolved).toBe(0);
    expect(events[0].source.latitude).toBeNull();
    const d = getGeoDiagnostics();
    expect(d.failed).toBe(1);
    expect(d.lastError).toContain("8.8.8.8");
  });

  it("rejects (0,0) Null-Island responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ ...IPWHO_JSON, latitude: 0, longitude: 0 })));
    const { events, resolved } = await enrichEvents([evt("8.8.8.8")]);
    expect(resolved).toBe(0);
    expect(events[0].source.latitude).toBeNull();
  });

  it("never queries unqueryable IPs", async () => {
    const spy = vi.fn(async () => jsonResponse(IPWHO_JSON));
    vi.stubGlobal("fetch", spy);
    const { resolved } = await enrichEvents([evt("10.0.0.1")]);
    expect(resolved).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it("retries failures after the TTL instead of poisoning forever", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("net down"); }));
    await enrichEvents([evt("8.8.8.8")]);
    expect(getGeoDiagnostics().attempted).toBe(1);
    // Second cycle within TTL: no new attempt.
    await enrichEvents([evt("8.8.8.8")]);
    expect(getGeoDiagnostics().attempted).toBe(1);
    // Backdate the failure past the TTL: retried.
    for (const entry of __geoInternals.cache.values()) entry.at = 0;
    await enrichEvents([evt("8.8.8.8")]);
    expect(getGeoDiagnostics().attempted).toBe(2);
  });

  it("respects the per-cycle budget", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(IPWHO_JSON)));
    const evts = ["8.8.8.1", "8.8.8.2", "8.8.8.3"].map(evt);
    const { lookedUp } = await enrichEvents(evts, { budget: 2 });
    expect(lookedUp).toBe(2);
  });
});
