/**
 * Pure geographic math (no Three.js dependency — returns plain arrays).
 * Arcs follow the surface: interpolated along the great circle and lifted
 * proportionally to endpoint distance. Never straight lines through the globe.
 */

export function latLonToVec3(lat, lon, radius = 1) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/** Great-circle interpolation between two lat/lon pairs. */
export function greatCirclePoints(a, b, segments = 48, lift = 0.28) {
  const va = latLonToVec3(a.lat, a.lon, 1);
  const vb = latLonToVec3(b.lat, b.lon, 1);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const angle = Math.acos(dot);
  const pts = [];
  if (angle < 1e-6) {
    for (let i = 0; i <= segments; i += 1) pts.push([...va]);
    return pts;
  }
  const sinA = Math.sin(angle);
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const k0 = Math.sin((1 - t) * angle) / sinA;
    const k1 = Math.sin(t * angle) / sinA;
    const p = [va[0] * k0 + vb[0] * k1, va[1] * k0 + vb[1] * k1, va[2] * k0 + vb[2] * k1];
    // Lift peaks mid-arc, scaled by angular distance (short hops stay low).
    const altitude = 1 + Math.sin(t * Math.PI) * lift * Math.min(angle, 1.6);
    const len = Math.hypot(p[0], p[1], p[2]) || 1;
    pts.push([(p[0] / len) * altitude, (p[1] / len) * altitude, (p[2] / len) * altitude]);
  }
  return pts;
}
