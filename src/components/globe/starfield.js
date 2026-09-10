/**
 * Deterministic starfield layers (pure scene decoration — NEVER threat data).
 * Seeded PRNG ⇒ identical output every render; viewport units keep stars
 * responsive without JS resize handling.
 */

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a CSS box-shadow star list.
 * colorVar references a theme-aware CSS variable so one markup works in
 * both dark and light modes.
 */
export function starShadows({ seed = 1, count = 120, colorVar = "--star-1", brightEvery = 9 } = {}) {
  const rand = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const x = (rand() * 100).toFixed(2);
    const y = (rand() * 100).toFixed(2);
    const bright = i % brightEvery === 0;
    const size = bright ? 2 : 1;
    parts.push(`${x}vw ${y}vh 0 ${size}px var(${colorVar})`);
  }
  return parts.join(",");
}

export const STAR_THEMES = ["dark", "light"];
