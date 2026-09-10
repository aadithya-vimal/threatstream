import { describe, expect, it } from "vitest";
import { buildStarPositions } from "./starfield.js";

describe("deterministic starfield", () => {
  it("produces identical positions for the same seed", () => {
    const a = buildStarPositions({ seed: 11, count: 100 });
    const b = buildStarPositions({ seed: 11, count: 100 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(300);
  });

  it("differs across seeds and stays on the requested shell", () => {
    const a = buildStarPositions({ seed: 11, count: 50, radiusMin: 150, radiusMax: 260 });
    const b = buildStarPositions({ seed: 77, count: 50, radiusMin: 150, radiusMax: 260 });
    expect(a).not.toEqual(b);
    for (let i = 0; i < 50; i += 1) {
      const r = Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
      expect(r).toBeGreaterThanOrEqual(149);
      expect(r).toBeLessThanOrEqual(261);
    }
  });

  it("carries no threat semantics — positions only", () => {
    const a = buildStarPositions({ seed: 5, count: 10 });
    expect(a).toBeInstanceOf(Float32Array);
    expect(a).toHaveLength(30);
  });
});
