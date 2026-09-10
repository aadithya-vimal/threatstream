import { describe, expect, it } from "vitest";
import { starShadows } from "./starfield.js";

describe("deterministic starfield", () => {
  it("produces identical output for the same seed", () => {
    const a = starShadows({ seed: 1337, count: 50 });
    const b = starShadows({ seed: 1337, count: 50 });
    expect(a).toBe(b);
    expect(a.split(",")).toHaveLength(50);
  });

  it("differs across seeds and carries no threat semantics", () => {
    const a = starShadows({ seed: 1, count: 20 });
    const b = starShadows({ seed: 2, count: 20 });
    expect(a).not.toBe(b);
    expect(a).not.toContain("attack");
    expect(a).toMatch(/vw.*vh/);
  });
});
