import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ThreatIntelProvider, useThreatIntel } from "./ThreatIntelContext.jsx";

const DROP_TEXT = [
  "# hdr",
  "# Source File Date: Tue Sep  8 10:58:27 UTC 2026",
  "1.10.16.0/20",
  "9.9.9.0/24",
].join("\n");

const KEV_JSON = {
  catalogVersion: "2026.09.09",
  dateReleased: "2026-09-09T19:00:50.2591Z",
  vulnerabilities: [
    { cveID: "CVE-2024-0001", vendorProject: "A", product: "P1", dateAdded: "2024-01-01" },
  ],
};

const ISC_JSON = [
  { ip: "91.191.209.198", attacks: 8153, count: 157503, firstseen: "2022-06-13", lastseen: "2026-09-10" },
];

const GEO_JSON = {
  success: true,
  latitude: 37.77,
  longitude: -122.41,
  country: "United States",
  country_code: "US",
  city: "San Francisco",
  connection: { asn: 13335, org: "Cloudflare", isp: "Cloudflare" },
};

function routeFetch(url) {
  const u = String(url);
  const text = async () => {
    if (u.includes("openphish")) return "http://example.com/a\nhttp://example.org/b\n";
    return DROP_TEXT;
  };
  const json = async () => {
    if (u.includes("kev-data")) return KEV_JSON;
    if (u.includes("isc.sans.edu")) return ISC_JSON;
    if (u.includes("ipwho")) return GEO_JSON;
    throw new Error(`unexpected json url ${u}`);
  };
  return { ok: true, status: 200, text, json };
}

function Probe() {
  const { events, health, diffs, cycle } = useThreatIntel();
  const healthy = Object.values(health).filter((h) => h.status === "ok").length;
  return (
    <div>
      <span data-testid="healthy">{healthy}</span>
      <span data-testid="events">{events.length}</span>
      <span data-testid="diffs">{Object.keys(diffs).length}</span>
      <span data-testid="cycle">{cycle}</span>
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url) => routeFetch(url)));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ThreatIntelProvider refresh cycle", () => {
  it("publishes events AND health AND diffs after a successful cycle", async () => {
    render(
      <ThreatIntelProvider>
        <Probe />
      </ThreatIntelProvider>
    );
    // Regression guard: rendered data must never strand health/diffs empty.
    // (A prior refactor gated setEvents on changes but dropped the
    // setHealth/setDiffs calls, freezing the UI at OFFLINE 0/6 forever.)
    await waitFor(
      () => {
        expect(screen.getByTestId("cycle").textContent).not.toBe("0");
        expect(Number(screen.getByTestId("events").textContent)).toBeGreaterThan(0);
        expect(screen.getByTestId("healthy").textContent).toBe("6");
        expect(screen.getByTestId("diffs").textContent).toBe("6");
      },
      { timeout: 15000, interval: 200 }
    );
  }, 20000);

  it("records failed providers in health instead of dropping the cycle", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("dshield")) throw new TypeError("Failed to fetch");
        return routeFetch(url);
      })
    );
    render(
      <ThreatIntelProvider>
        <Probe />
      </ThreatIntelProvider>
    );
    await waitFor(
      () => {
        expect(screen.getByTestId("cycle").textContent).not.toBe("0");
        expect(Number(screen.getByTestId("events").textContent)).toBeGreaterThan(0);
        // 5 healthy + health entries for all (failures recorded, not dropped).
        expect(screen.getByTestId("healthy").textContent).toBe("5");
        expect(screen.getByTestId("diffs").textContent).toBe("5");
      },
      { timeout: 20000, interval: 200 }
    );
  }, 25000);
});
