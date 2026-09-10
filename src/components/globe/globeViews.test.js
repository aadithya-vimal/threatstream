import { describe, expect, it } from "vitest";
import {
  MAX_ARCS,
  MAX_MARKERS,
  RING_WINDOW_MS,
  VIEWS,
  buildArcs,
  buildHeatPoints,
  buildHexPoints,
  buildLabels,
  buildPoints,
  buildRings,
  isValidView,
  labelText,
  pointColorFor,
  tooltipHtml,
} from "./globeViews.js";
import { createThreatEvent } from "../../lib/threat/model.js";

function geo(id, lat = 10, lon = 20, extra = {}) {
  return createThreatEvent({
    provider: "spamhaus-drop",
    recordId: id,
    source: { ip: "8.8.8.8", latitude: lat, longitude: lon },
    ...extra,
  });
}
function nongeo(id) {
  return createThreatEvent({ provider: "cisa-kev", recordId: id, classification: "vulnerability" });
}
function arc(id) {
  return createThreatEvent({
    provider: "p",
    recordId: id,
    source: { latitude: 10, longitude: 20 },
    destination: { latitude: 30, longitude: 40 },
  });
}

describe("globe view registry", () => {
  it("offers the documented view set", () => {
    expect(VIEWS.map((v) => v.id).sort()).toEqual(
      ["heatmap", "hex", "imagery", "minimal", "operations", "paths", "rings"].sort()
    );
    expect(isValidView("operations")).toBe(true);
    expect(isValidView("nope")).toBe(false);
  });
});

describe("operations points", () => {
  it("includes only real geolocated events, capped, ids preserved", () => {
    const evts = [geo("a"), nongeo("b"), geo("c")];
    const pts = buildPoints(evts);
    expect(pts.map((e) => e.id)).toEqual([evts[0].id, evts[2].id]);
    const many = Array.from({ length: MAX_MARKERS + 50 }, (_, i) => geo(`x${i}`));
    expect(buildPoints(many)).toHaveLength(MAX_MARKERS);
  });
});

describe("attack paths", () => {
  it("requires both endpoints — source-only never becomes an arc", () => {
    expect(buildArcs([geo("a"), nongeo("b")])).toEqual([]);
    const arcs = buildArcs([arc("z"), geo("a")]);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].id).toContain("z");
    const many = Array.from({ length: MAX_ARCS + 10 }, (_, i) => arc(`q${i}`));
    expect(buildArcs(many)).toHaveLength(MAX_ARCS);
  });
});

describe("heatmap + hex honesty", () => {
  it("uses constant weight 1 per real observation", () => {
    const heat = buildHeatPoints([geo("a"), nongeo("b")]);
    expect(heat).toHaveLength(1);
    expect(heat[0]).toEqual({ e: expect.objectContaining({ id: expect.stringContaining("a") }), w: 1 });
  });

  it("hex input is the same geolocated records, no synthesis", () => {
    const evts = [geo("a"), nongeo("b")];
    const hex = buildHexPoints(evts);
    expect(hex).toHaveLength(1);
    expect(evts.map((e) => e.id)).toContain(hex[0].id);
  });
});

describe("rings", () => {
  it("marks only in-window new arrivals with coordinates", () => {
    const now = Date.now();
    const fresh = { ...geo("a"), sessionFirstSeen: new Date(now - 60_000).toISOString() };
    const old = { ...geo("b"), sessionFirstSeen: new Date(now - RING_WINDOW_MS - 1000).toISOString() };
    const noGeo = { ...nongeo("c"), sessionFirstSeen: new Date(now - 1000).toISOString() };
    const rings = buildRings([fresh, old, noGeo], new Set([fresh.id, old.id, noGeo.id]), { now });
    expect(rings.map((e) => e.id)).toEqual([fresh.id]);
  });

  it("never rings records outside the new set", () => {
    const e = { ...geo("a"), sessionFirstSeen: new Date().toISOString() };
    expect(buildRings([e], new Set())).toEqual([]);
  });
});

describe("labels", () => {
  it("puts the selected event first and stays bounded", () => {
    const evts = [geo("a"), geo("b"), nongeo("c")];
    const labels = buildLabels(evts, evts[1].id, 2);
    expect(labels).toHaveLength(2);
    expect(labels[0].id).toBe(evts[1].id);
  });
});

describe("colors + text", () => {
  it("distinguishes enriched markers and selection per theme", () => {
    const plain = geo("a");
    const enriched = { ...plain, inferred: ["geolocation_approximate"] };
    expect(pointColorFor(plain, "dark")).not.toBe(pointColorFor(enriched, "dark"));
    expect(pointColorFor(plain, "dark")).not.toBe(pointColorFor(plain, "light"));
    expect(pointColorFor(plain, "dark", plain.id)).not.toBe(pointColorFor(plain, "dark"));
  });

  it("tooltips and labels name real record fields only", () => {
    const e = geo("a");
    expect(tooltipHtml(e)).toContain("Approximate infrastructure location");
    expect(labelText(e)).toContain("8.8.8.8");
  });
});
