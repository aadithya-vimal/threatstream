import { useEffect, useMemo, useRef } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import { buildStarPositions } from "./starfield.js";

/**
 * LandingGlobe — cinematic, NON-INTERACTIVE hero globe for the landing page.
 * Separate from the monitor's ThreatGlobe (which must not change).
 *
 * Markers are REAL geolocated observations from the live dataset when
 * available. The sweeping arcs are pure landing-page decoration: seeded,
 * stable, and explicitly not threat telemetry. They never appear in the
 * monitor, feed, statistics, or any analytical surface.
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

function hasCoords(e) {
  return (
    !!e?.source &&
    typeof e.source.latitude === "number" &&
    Number.isFinite(e.source.latitude) &&
    typeof e.source.longitude === "number" &&
    Number.isFinite(e.source.longitude) &&
    !(e.source.latitude === 0 && e.source.longitude === 0)
  );
}

/**
 * Decorative arc pairings for the landing hero ONLY.
 * Pairs real plotted points when at least 2 exist; otherwise falls back to
 * seeded positions so the hero never renders empty. Deterministic per input.
 */
export function pickDecorativeArcs(points, { count = 10, seed = 42 } = {}) {
  const rand = mulberry32(seed);
  const arcs = [];
  if (points.length >= 2) {
    const order = [...points].sort(() => rand() - 0.5);
    for (let i = 0; i < count; i += 1) {
      const a = order[i % order.length];
      const b = order[(i * 5 + 3) % order.length];
      if (a === b) continue;
      arcs.push({
        startLat: a.source.latitude,
        startLng: a.source.longitude,
        endLat: b.source.latitude,
        endLng: b.source.longitude,
      });
    }
    return arcs;
  }
  if (points.length === 1) return [];
  for (let i = 0; i < Math.min(count, 6); i += 1) {
    arcs.push({
      startLat: rand() * 120 - 60,
      startLng: rand() * 360 - 180,
      endLat: rand() * 120 - 60,
      endLng: rand() * 360 - 180,
    });
  }
  return arcs;
}

export default function LandingGlobe({ events = [] }) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const points = useMemo(() => events.filter(hasCoords).slice(0, 120), [events]);
  const arcs = useMemo(() => pickDecorativeArcs(points), [points]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const globe = Globe({ animateIn: false })(mount);
    globeRef.current = globe;

    globe
      .backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl("/earth-night.jpg")
      .bumpImageUrl("/earth-topology.png")
      .showAtmosphere(true)
      .atmosphereColor("#3fd8ff")
      .showGraticules(true)
      .pointsMerge(true)
      .pointsTransitionDuration(800)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.1 }, 0);

    globe.controls().enableDamping = true;
    globe.controls().enablePan = false;
    globe.controls().enableZoom = false;
    globe.controls().enableRotate = false;
    globe.controls().autoRotate = !reduceMotion;
    globe.controls().autoRotateSpeed = 0.5;

    globe
      .pointLat((d) => d.source.latitude)
      .pointLng((d) => d.source.longitude)
      .pointColor((d) => ((d.inferred ?? []).length > 0 ? "#ff9f43" : "#ff4d5e"))
      .pointAltitude(0.012)
      .pointRadius(0.4);

    globe
      .arcStartLat((d) => d.startLat)
      .arcStartLng((d) => d.startLng)
      .arcEndLat((d) => d.endLat)
      .arcEndLng((d) => d.endLng)
      .arcColor(() => ["#ff4d5e", "#38e1ff"])
      .arcStroke(0.6)
      .arcDashLength(0.4)
      .arcDashGap(0.25)
      .arcDashAnimateTime(reduceMotion ? 0 : 2600);

    const scene = globe.scene();
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(buildStarPositions({ seed: 9, count: 500, radiusMin: 260, radiusMax: 640 }), 3)
    );
    const starMat = new THREE.PointsMaterial({
      color: 0x9db8e8,
      size: 1.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const resize = () => {
      globe.width(mount.clientWidth || 1);
      globe.height(mount.clientHeight || 1);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const onVis = () => {
      if (document.hidden) globe.pauseAnimation();
      else globe.resumeAnimation();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      scene.remove(stars);
      starGeo.dispose();
      starMat.dispose();
      globe._destructor();
      globeRef.current = null;
      mount.replaceChildren();
    };
  }, [reduceMotion]);

  // Reactive data only — the instance stays alive across refreshes.
  useEffect(() => {
    globeRef.current?.pointsData(points);
    globeRef.current?.arcsData(arcs);
  }, [points, arcs]);

  return <div ref={mountRef} className="landing-globe" aria-hidden="true" />;
}
