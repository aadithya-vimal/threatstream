/**
 * Deterministic star-shell positions for the globe scene (pure visual
 * scene dressing — NEVER threat data, never read by any data pipeline).
 * Seeded PRNG ⇒ identical output every load; sizes/counts are fixed.
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
 * Positions for `count` stars distributed on a spherical shell.
 * Returns a Float32Array of xyz triples with radius in [radiusMin, radiusMax].
 * Every Nth star (brightEvery) is pushed slightly inward — depth layering
 * comes from radius + size, never from threat state.
 */
export function buildStarPositions({ seed = 1, count = 600, radiusMin = 28, radiusMax = 70 } = {}) {
  const rand = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = radiusMin + rand() * (radiusMax - radiusMin);
    const theta = rand() * Math.PI * 2;
    const z = rand() * 2 - 1;
    const s = Math.sqrt(Math.max(0, 1 - z * z));
    pos[i * 3] = r * s * Math.cos(theta);
    pos[i * 3 + 1] = r * z;
    pos[i * 3 + 2] = r * s * Math.sin(theta);
  }
  return pos;
}
