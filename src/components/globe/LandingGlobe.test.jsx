import { describe, expect, it } from "vitest";
import { pickDecorativeArcs } from "./LandingGlobe.jsx";
import { createThreatEvent } from "../../lib/threat/model.js";

function geo(id, lat = 10, lon = 20) {
  return createThreatEvent({
    provider: "spamhaus-drop",
    recordId: id,
    source: { ip: "8.8.8.8", latitude: lat, longitude: lon },
  });
}

describe("landing decorative arcs (hero only — never analytical)", () => {
  it("pairs real plotted points deterministically", () => {
    const pts = [geo("a", 10, 20), geo("b", 30, 40), geo("c", -10, -20), geo("d", 50, 60)];
    const one = pickDecorativeArcs(pts, { count: 6, seed: 42 });
    const two = pickDecorativeArcs(pts, { count: 6, seed: 42 });
    expect(one).toEqual(two);
    expect(one.length).toBeGreaterThan(0);
    const lats = new Set(pts.map((p) => p.source.latitude));
    const lons = new Set(pts.map((p) => p.source.longitude));
    for (const a of one) {
      expect(lats.has(a.startLat)).toBe(true);
      expect(lons.has(a.startLng)).toBe(true);
      expect(lats.has(a.endLat)).toBe(true);
      expect(lons.has(a.endLng)).toBe(true);
    }
  });

  it("falls back to a bounded seeded set when no real points exist", () => {
    const arcs = pickDecorativeArcs([], { count: 10, seed: 7 });
    expect(arcs.length).toBeLessThanOrEqual(6);
    expect(pickDecorativeArcs([], { count: 10, seed: 7 })).toEqual(arcs);
  });

  it("emits no arcs for a single point", () => {
    expect(pickDecorativeArcs([geo("a")])).toEqual([]);
  });
});
