/**
 * ThreatGlobe — Three.js Earth rendering real normalized observations.
 *
 * Honest rendering contract:
 * - Source-only intelligence → single marker (●). No destination invented.
 * - Genuine source → destination (both endpoints observed) → animated arc.
 * - Inferred/enriched (geolocation) markers render with a distinct ring.
 * - Events without coordinates are listed in the feed, never on the globe.
 *
 * Performance: instanced markers, capped arc/pulse counts, rAF paused when
 * the tab is hidden, full disposal on unmount.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { greatCirclePoints, latLonToVec3 } from "../../lib/geo/coordinates.js";
import { hasSourceCoordinates, hasArc } from "../../lib/threat/model.js";

const GLOBE_RADIUS = 1;
const MAX_MARKERS = 600;
const MAX_ARCS = 40;

const COLORS = {
  malicious: 0xff4d5e,
  maliciousEnriched: 0xff9f43,
  destination: 0x38e1ff,
  selected: 0xffffff,
  arc: 0xff6b81,
  arcInferred: 0xff9f43,
};

function markerColor(event) {
  const enriched = (event.inferred ?? []).length > 0;
  return enriched ? COLORS.maliciousEnriched : COLORS.malicious;
}

export default function ThreatGlobe({
  events = [],
  selectedId = null,
  onSelect = () => {},
  focusRequest = null, // { lat, lon, nonce }
  resetSignal = 0,
  paused = false,
  autoRotate = true,
  onHover = () => {},
}) {
  const mountRef = useRef(null);
  const tooltipRef = useRef(null);
  const [hover, setHover] = useState(null);
  const apiRef = useRef({ focusLatLon: () => {}, reset: () => {} });
  const stateRef = useRef({ events, selectedId, onSelect, onHover, paused, autoRotate });
  stateRef.current = { events, selectedId, onSelect, onHover, paused, autoRotate };
  const focusRef = useRef(focusRequest);

  const renderable = useMemo(() => {
    const geo = events.filter(hasSourceCoordinates).slice(0, MAX_MARKERS);
    const arcs = events.filter(hasArc).slice(0, MAX_ARCS);
    return { markers: geo, arcs };
  }, [events]);

  const renderRef = useRef(renderable);
  renderRef.current = renderable;

  useEffect(() => {
    focusRef.current = focusRequest;
    if (focusRequest) apiRef.current.focusLatLon(focusRequest.lat, focusRequest.lon);
  }, [focusRequest]);

  useEffect(() => {
    if (resetSignal > 0) apiRef.current.reset();
  }, [resetSignal]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    camera.position.set(0, 0.6, 3.1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.autoRotate = stateRef.current.autoRotate && !reduceMotion;
    controls.autoRotateSpeed = 0.55;

    const globe = new THREE.Group();
    scene.add(globe);

    // Earth
    const texLoader = new THREE.TextureLoader();
    const earthMat = new THREE.MeshStandardMaterial({
      roughness: 1,
      metalness: 0,
      color: 0xffffff,
    });
    texLoader.load(
      "/earth-night.jpg",
      (tex) => {
        if (disposed) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );
    const earth = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 72, 72), earthMat);
    globe.add(earth);

    // Atmosphere rim
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.14, 48, 48),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.,0.,1.)), 3.5); gl_FragColor = vec4(0.25,0.55,1.0,1.0) * i; }`,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      })
    );
    scene.add(atmo);

    scene.add(new THREE.AmbientLight(0x8fa3c7, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-2.5, 0.8, 2.2);
    scene.add(sun);

    // Starfield — deterministic layout (fixed seed): pure scene dressing,
    // never threat data. No Math.random anywhere in the data path.
    const starGeo = new THREE.BufferGeometry();
    {
      const n = 900;
      const pos = new Float32Array(n * 3);
      let seed = 0x2f6e2b1;
      const rand = () => {
        seed = (seed + 0x6d2b79f5) >>> 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      for (let i = 0; i < n; i += 1) {
        const r = 30 + rand() * 40;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.cos(ph);
        pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    }
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8fb4ff, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.8 })));

    // Markers (instanced)
    const markerGeo = new THREE.SphereGeometry(0.011, 10, 10);
    const markerMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const markers = new THREE.InstancedMesh(markerGeo, markerMat, MAX_MARKERS);
    markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    globe.add(markers);
    const markerIndex = []; // instanceId -> event
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();

    // Selection ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.028, 40),
      new THREE.MeshBasicMaterial({ color: COLORS.selected, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false })
    );
    ring.visible = false;
    globe.add(ring);

    // Arcs + pulses
    const arcGroup = new THREE.Group();
    globe.add(arcGroup);
    let pulses = []; // { mesh, pts, t, speed }

    function rebuildOverlays() {
      const { markers: list, arcs } = renderRef.current;
      markerIndex.length = 0;
      for (let i = 0; i < MAX_MARKERS; i += 1) {
        const e = list[i];
        if (!e) {
          dummy.position.set(0, 0, 0);
          dummy.scale.setScalar(0.0001);
        } else {
          const [x, y, z] = latLonToVec3(e.source.latitude, e.source.longitude, GLOBE_RADIUS * 1.004);
          dummy.position.set(x, y, z);
          dummy.scale.setScalar(e.id === stateRef.current.selectedId ? 1.9 : 1);
          markerIndex[i] = e;
        }
        dummy.updateMatrix();
        markers.setMatrixAt(i, dummy.matrix);
        markers.setColorAt(i, tmpColor.set(e ? markerColor(e) : 0x000000));
      }
      markers.instanceMatrix.needsUpdate = true;
      if (markers.instanceColor) markers.instanceColor.needsUpdate = true;

      // Selection ring follows selected marker
      const sel = list.find((e) => e.id === stateRef.current.selectedId);
      if (sel && hasSourceCoordinates(sel)) {
        const [x, y, z] = latLonToVec3(sel.source.latitude, sel.source.longitude, GLOBE_RADIUS * 1.006);
        ring.position.set(x, y, z);
        ring.lookAt(0, 0, 0);
        ring.visible = true;
      } else {
        ring.visible = false;
      }

      // Rebuild arcs
      while (arcGroup.children.length) {
        const c = arcGroup.children.pop();
        c.geometry?.dispose?.();
        c.material?.dispose?.();
      }
      pulses = [];
      arcs.forEach((e, ai) => {
        const pts = greatCirclePoints(
          { lat: e.source.latitude, lon: e.source.longitude },
          { lat: e.destination.latitude, lon: e.destination.longitude }
        ).map(([x, y, z]) => new THREE.Vector3(x * GLOBE_RADIUS, y * GLOBE_RADIUS, z * GLOBE_RADIUS));
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(
          g,
          new THREE.LineBasicMaterial({ color: COLORS.arc, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        arcGroup.add(line);
        const pulse = new THREE.Mesh(
          new THREE.SphereGeometry(0.009, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
        );
        arcGroup.add(pulse);
        pulses.push({ mesh: pulse, pts, t: (ai * 0.61803398875) % 1, speed: 0.12 + ((ai * 0.37) % 0.12) });
      });
    }

    // Camera helpers
    let camTween = null;
    function tweenCam(toPos, lookAt = new THREE.Vector3(0, 0, 0)) {
      camTween = { from: camera.position.clone(), to: toPos.clone(), lookAt, t: 0 };
    }
    apiRef.current.focusLatLon = (lat, lon) => {
      const [x, y, z] = latLonToVec3(lat, lon, 1);
      const dir = new THREE.Vector3(x, y, z).normalize();
      tweenCam(dir.multiplyScalar(2.1));
    };
    apiRef.current.reset = () => tweenCam(new THREE.Vector3(0, 0.6, 3.1));

    // Picking
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    function pick(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObject(markers);
      if (!hits.length) return null;
      return markerIndex[hits[0].instanceId] ?? null;
    }
    function projectToScreen(e) {
      const [x, y, z] = latLonToVec3(e.source.latitude, e.source.longitude, GLOBE_RADIUS * 1.01);
      const v = new THREE.Vector3(x, y, z).applyMatrix4(globe.matrixWorld).project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height, behind: v.z > 1 };
    }

    const onMove = (ev) => {
      const hit = pick(ev.clientX, ev.clientY);
      setHover(hit);
      stateRef.current.onHover(hit);
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      const tip = tooltipRef.current;
      if (tip) {
        if (hit) {
          const p = projectToScreen(hit);
          tip.style.display = p.behind ? "none" : "block";
          tip.style.left = `${p.x - mount.getBoundingClientRect().left + 14}px`;
          tip.style.top = `${p.y - mount.getBoundingClientRect().top - 10}px`;
        } else {
          tip.style.display = "none";
        }
      }
    };
    const onClick = (ev) => {
      const hit = pick(ev.clientX, ev.clientY);
      if (hit) stateRef.current.onSelect(hit.id);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("click", onClick);

    // Resize
    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const clock = new THREE.Clock();
    let raf = 0;
    function frame() {
      raf = requestAnimationFrame(frame);
      if (disposed || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const st = stateRef.current;
      controls.autoRotate = st.autoRotate && !st.paused && !reduceMotion;
      controls.update();
      if (camTween) {
        camTween.t = Math.min(1, camTween.t + dt * 1.4);
        const k = 1 - Math.pow(1 - camTween.t, 3);
        camera.position.lerpVectors(camTween.from, camTween.to, k);
        camera.lookAt(camTween.lookAt);
        if (camTween.t >= 1) camTween = null;
      }
      if (!st.paused && !reduceMotion) {
        for (const p of pulses) {
          p.t = (p.t + dt * p.speed) % 1;
          const idx = Math.min(p.pts.length - 1, Math.floor(p.t * p.pts.length));
          p.mesh.position.copy(p.pts[idx]);
        }
        if (ring.visible) {
          const s = 1 + Math.sin(performance.now() / 420) * 0.12;
          ring.scale.setScalar(s);
        }
      }
      rebuildOverlaysThrottled();
      renderer.render(scene, camera);
    }

    let lastRebuild = 0;
    let needsRebuild = true;
    function rebuildOverlaysThrottled() {
      const now = performance.now();
      if (needsRebuild || now - lastRebuild > 900) {
        rebuildOverlays();
        needsRebuild = false;
        lastRebuild = now;
      }
    }
    const markDirty = () => {
      needsRebuild = true;
    };
    const dirtyInterval = setInterval(markDirty, 1200);

    rebuildOverlays();
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(dirtyInterval);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material?.dispose?.();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="globe-wrap">
      <div ref={mountRef} className="globe-canvas" role="img" aria-label="3D globe showing geolocated threat observations" />
      <div ref={tooltipRef} className="globe-tooltip" style={{ display: "none" }}>
        {hover && (
          <>
            <strong className="mono">{hover.source?.ip ?? hover.raw?.cveID ?? hover.id}</strong>
            <span>{hover.source?.country ?? "Country pending"} · {hover.category}</span>
          </>
        )}
      </div>
      <div className="globe-legend" aria-hidden="true">
        <span><i className="dot dot-source" /> Observed source</span>
        <span><i className="dot dot-enriched" /> Geolocation (approximate)</span>
        <span><i className="arc-sample" /> Confirmed path (both ends observed)</span>
      </div>
      <div className="globe-count" aria-live="polite">
        {renderable.markers.length} geolocated of {events.length} loaded · {renderable.arcs.length} confirmed paths
      </div>
    </div>
  );
}
