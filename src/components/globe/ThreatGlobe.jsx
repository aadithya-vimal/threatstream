/**
 * ThreatGlobe — Globe.GL Earth rendering real normalized observations.
 *
 * Honest rendering contract (unchanged by the visualization engine):
 * - ONE normalized ThreatEvent dataset feeds every view.
 * - Source-only intelligence → markers. No destination invented.
 * - Genuine source → destination (both endpoints observed) → animated arc.
 * - Inferred/enriched (geolocation) markers are visually distinct.
 * - Events without coordinates are listed in the feed, never on the globe.
 * - Heat/hex/rings are projections of the same real records (weight 1,
 *   bin counts from data, rings only for in-session new arrivals).
 *
 * Lifecycle: single Globe.GL instance, reactive data/theme/view updates,
 * ResizeObserver sizing, paused rendering when hidden, full disposal.
 */
import React, { useEffect, useMemo, useRef } from "react";
import Globe from "globe.gl";
import {
  MAX_ARCS,
  MAX_MARKERS,
  buildArcs,
  buildHexPoints,
  buildLabels,
  buildPoints,
  buildRings,
  isEnriched,
  labelText,
  paletteFor,
  pointColorFor,
  tooltipHtml,
} from "./globeViews.js";
import { useTheme } from "../../state/ThemeContext.jsx";

const HOME_POV = { lat: 18, lng: 0, altitude: 2.4 };
const FOCUS_ALTITUDE = 1.6;

const LEGENDS = {
  operations: "markers",
  imagery: "markers",
  minimal: "markers",
  heatmap: "heat",
  paths: "paths",
  rings: "rings",
  hex: "hex",
};

function textureFor(view, theme) {
  if (view === "imagery") return "/earth-day.jpg";
  return theme === "light" ? "/earth-day.jpg" : "/earth-night.jpg";
}

export const LIFECYCLE_MS = { enter: 800, changed: 1200, leave: 900 };

export default function ThreatGlobe({
  events = [],
  newIds = [],
  changedIds = [],
  leaving = [],
  selectedId = null,
  onSelect = () => {},
  focusRequest = null, // { lat, lon, nonce }
  resetSignal = 0,
  paused = false,
  autoRotate = true,
  showLabels = false,
  view = "operations",
  onHover = () => {},
}) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const { theme } = useTheme();
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const stateRef = useRef({ onSelect, onHover, paused, autoRotate });
  stateRef.current = { onSelect, onHover, paused, autoRotate };
  // Local arrival stamps for fade windows (records carry real arrival in
  // sessionFirstSeen; leaving/changed windows are UI-runtime only).
  const leaveAtRef = useRef(new Map());
  const changeAtRef = useRef(new Map());

  const points = useMemo(() => buildPoints(events, MAX_MARKERS), [events]);
  const leavingPoints = useMemo(
    () => buildPoints(leaving, MAX_MARKERS),
    [leaving]
  );
  const arcs = useMemo(() => buildArcs(events, MAX_ARCS), [events]);
  const rings = useMemo(() => buildRings(events, newIds), [events, newIds]);
  const labels = useMemo(
    () => (showLabels || selectedId ? buildLabels(events, selectedId) : []),
    [events, selectedId, showLabels]
  );

  const legend = LEGENDS[view] ?? "markers";
  const pal = paletteFor(theme);
  const labelColor = theme === "light" ? "#0b1222" : "#e6edf9";

  // Init once.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const globe = Globe({ animateIn: false })(mount);
    globeRef.current = globe;

    globe
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .showGraticules(true)
      .pointsMerge(true)
      .hexBinMerge(true)
      .hexBinResolution(3)
      .pointOfView(HOME_POV, 0);

    const st = stateRef.current;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.08;
    globe.controls().enablePan = false;
    globe.controls().minDistance = 160;
    globe.controls().maxDistance = 600;
    globe.controls().autoRotateSpeed = 0.55;
    globe.controls().autoRotate = st.autoRotate && !st.paused;

    globe.onPointClick((d) => {
      if (d?.id) stateRef.current.onSelect(d.id);
    });
    globe.onPointHover((d) => {
      stateRef.current.onHover(d ?? null);
    });
    globe.onArcClick((d) => {
      if (d?.id) stateRef.current.onSelect(d.id);
    });
    globe.onHexHover(() => {});

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      globe.width(w);
      globe.height(h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const onVis = () => {
      if (document.hidden) globe.pauseAnimation();
      else if (!stateRef.current.paused) globe.resumeAnimation();
    };
    document.addEventListener("visibilitychange", onVis);
    if (document.hidden) globe.pauseAnimation();

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      globe._destructor();
      globeRef.current = null;
      mount.replaceChildren();
    };
  }, []);

  // Lifecycle stamps (UI-runtime only): leaving arrivals + changed sightings.
  const leavingIds = useMemo(() => new Set(leavingPoints.map((e) => e.id)), [leavingPoints]);
  const changedSet = useMemo(() => new Set(changedIds ?? []), [changedIds]);
  useEffect(() => {
    const now = Date.now();
    for (const e of leavingPoints) {
      if (!leaveAtRef.current.has(e.id)) leaveAtRef.current.set(e.id, now);
    }
    for (const id of leaveAtRef.current.keys()) {
      if (!leavingIds.has(id)) leaveAtRef.current.delete(id);
    }
    for (const id of changedSet) {
      if (!changeAtRef.current.has(id)) changeAtRef.current.set(id, now);
    }
    for (const id of changeAtRef.current.keys()) {
      if (!changedSet.has(id)) changeAtRef.current.delete(id);
    }
  }, [leavingPoints, leavingIds, changedSet]);

  // Reactive layers: view + data + theme + selection.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const st = stateRef.current;
    const showPoints = view === "operations" || view === "imagery" || view === "minimal" || view === "rings" || view === "paths";
    const allPoints = showPoints ? [...points, ...leavingPoints] : [];

    const lifecycleOf = (d, now) => {
      if (leaveAtRef.current.has(d.id)) {
        const age = now - (leaveAtRef.current.get(d.id) ?? now);
        return { kind: "leaving", t: Math.min(1, age / LIFECYCLE_MS.leave) };
      }
      if (d.sessionFirstSeen) {
        const age = now - Date.parse(d.sessionFirstSeen);
        if (!Number.isNaN(age) && age < LIFECYCLE_MS.enter) {
          return { kind: "new", t: Math.max(0, age / LIFECYCLE_MS.enter) };
        }
      }
      const ch = changeAtRef.current.get(d.id);
      if (ch != null && now - ch < LIFECYCLE_MS.changed) {
        return { kind: "changed", t: (now - ch) / LIFECYCLE_MS.changed };
      }
      return { kind: "normal", t: 1 };
    };
    const baseRadius = (d) => (d.id === selectedId ? 0.55 : 0.34);

    globe
      .globeImageUrl(textureFor(view, theme))
      .bumpImageUrl("/earth-topology.png")
      .atmosphereColor(theme === "light" ? "#7fb3d5" : "#3fd8ff")
      .showGraticules(view !== "minimal")
      .backgroundColor("rgba(0,0,0,0)");

    globe.controls().autoRotate = st.autoRotate && !st.paused && !reduceMotion;
    if (st.paused || document.hidden) globe.pauseAnimation();
    else globe.resumeAnimation();

    // Points (operations family + paths context + grace-window leavers).
    globe
      .pointsData(allPoints)
      .pointLat((d) => d.source.latitude)
      .pointLng((d) => d.source.longitude)
      .pointColor((d) => {
        const lc = lifecycleOf(d, Date.now());
        if (lc.kind === "new") return "#7dffc8";
        if (lc.kind === "changed") return "#ffffff";
        return pointColorFor(d, theme, selectedId);
      })
      .pointAltitude(0.012)
      .pointRadius((d) => {
        const base = baseRadius(d);
        const lc = lifecycleOf(d, Date.now());
        if (lc.kind === "new") return 0.1 + (base - 0.1) * lc.t;
        if (lc.kind === "changed") return base * (1 + 0.45 * Math.sin(Math.PI * lc.t));
        if (lc.kind === "leaving") return Math.max(0.02, base * (1 - lc.t));
        return base;
      })
      .pointLabel((d) => tooltipHtml(d));

    // Heatmap: same records, constant weight 1.
    const heatOn = view === "heatmap";
    globe
      .heatmapsData(heatOn ? points : [])
      .heatmapPointLat((d) => d.source.latitude)
      .heatmapPointLng((d) => d.source.longitude)
      .heatmapPointWeight(() => 1);

    // Hex density: bin counts derived from the same records.
    const hexOn = view === "hex";
    globe
      .hexBinPointsData(hexOn ? buildHexPoints(points) : [])
      .hexBinPointLat((d) => d.source.latitude)
      .hexBinPointLng((d) => d.source.longitude)
      .hexBinPointWeight(() => 1)
      .hexTopColor(() => pal.hex)
      .hexSideColor(() => pal.hex)
      .hexAltitude(() => 0.02)
      .hexLabel((b) => `${b.points.length} source observations · approximate geography`);

    // Rings: only in-session new arrivals inside the bounded window.
    const ringsOn = view === "rings";
    globe
      .ringsData(ringsOn ? rings : [])
      .ringLat((d) => d.source.latitude)
      .ringLng((d) => d.source.longitude)
      .ringColor((d) => (isEnriched(d) ? pal.ring : pal.arc))
      .ringMaxRadius(3)
      .ringPropagationSpeed(1.6)
      .ringRepeatPeriod(2800);

    // Arcs: genuine both-endpoint observations only.
    globe
      .arcsData(arcs)
      .arcStartLat((d) => d.source.latitude)
      .arcStartLng((d) => d.source.longitude)
      .arcEndLat((d) => d.destination.latitude)
      .arcEndLng((d) => d.destination.longitude)
      .arcColor(() => pal.arc)
      .arcStroke(0.7)
      .arcDashLength(0.45)
      .arcDashGap(0.25)
      .arcDashAnimateTime(reduceMotion ? 0 : 2200);

    // Labels: selected event (+ small bounded set when enabled).
    globe
      .labelsData(labels)
      .labelLat((d) => d.source.latitude)
      .labelLng((d) => d.source.longitude)
      .labelText((d) => labelText(d))
      .labelColor(() => labelColor)
      .labelSize(1.15)
      .labelDotRadius(0.35);
  }, [view, points, leavingPoints, arcs, rings, labels, theme, selectedId, showLabels, paused, autoRotate, reduceMotion, pal, labelColor]);

  // Lifecycle ticker: re-evaluates point accessors while a transition is
  // active (entrance / pulse / fade-out), then goes quiet. Skipped under
  // reduced motion — state changes apply directly instead.
  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(() => {
      const globe = globeRef.current;
      if (!globe || document.hidden) return;
      const now = Date.now();
      let active = leavingPoints.length > 0;
      if (!active) {
        for (const p of points) {
          if (p.sessionFirstSeen) {
            const age = now - Date.parse(p.sessionFirstSeen);
            if (!Number.isNaN(age) && age < LIFECYCLE_MS.enter) { active = true; break; }
          }
        }
      }
      if (!active) {
        for (const at of changeAtRef.current.values()) {
          if (now - at < LIFECYCLE_MS.changed) { active = true; break; }
        }
      }
      if (!active) return;
      globe.pointsData([...points, ...leavingPoints]);
    }, 450);
    return () => clearInterval(id);
  }, [points, leavingPoints, reduceMotion]);

  // Camera: focus + reset.
  useEffect(() => {
    if (focusRequest) {
      globeRef.current?.pointOfView(
        { lat: focusRequest.lat, lng: focusRequest.lon, altitude: FOCUS_ALTITUDE },
        1200
      );
    }
  }, [focusRequest]);

  useEffect(() => {
    if (resetSignal > 0) globeRef.current?.pointOfView(HOME_POV, 1200);
  }, [resetSignal]);

  return (
    <div className="globe-wrap">
      <div ref={mountRef} className="globe-canvas" role="img" aria-label="3D globe showing geolocated malicious infrastructure observations" />
      <div className="globe-legend" aria-hidden="true">
        {legend === "markers" && (
          <>
            <span><i className="dot dot-source" /> Malicious infrastructure</span>
            <span><i className="dot dot-enriched" /> Approximate geolocation</span>
            <span><i className="dot dot-new" /> New this cycle</span>
            <span><i className="dot dot-changed" /> Changed</span>
          </>
        )}
        {legend === "heat" && <span>Observation density · 1 weight per loaded record</span>}
        {legend === "paths" && <span><i className="arc-sample" /> Confirmed observed path ({arcs.length} verified)</span>}
        {legend === "rings" && <span><i className="dot dot-enriched" /> Ring = first seen this session (≤3 min)</span>}
        {legend === "hex" && <span>Hex bins sized by loaded observation count</span>}
      </div>
      <div className="globe-count" aria-live="polite">
        {points.length} geolocated of {events.length} loaded · {arcs.length} confirmed paths
      </div>
    </div>
  );
}
