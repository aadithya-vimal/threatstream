import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

const VICTIM_LOCATIONS = {
  berlin: { lat: 52.52, lon: 13.405, label: 'SSH/IMAP Target', color: '#00FFFF' },
  sanfrancisco: { lat: 37.7749, lon: -122.4194, label: 'Web Target', color: '#FF0000' },
  singapore: { lat: 1.3521, lon: 103.8198, label: 'IoT Target', color: '#00FF00' }
};

const ATTACK_TYPE_TO_VICTIM = {
  ssh: VICTIM_LOCATIONS.berlin,
  imap: VICTIM_LOCATIONS.berlin,
  apache: VICTIM_LOCATIONS.sanfrancisco,
  ftp: VICTIM_LOCATIONS.singapore,
  sip: VICTIM_LOCATIONS.singapore,
  bots: VICTIM_LOCATIONS.singapore,
  strongips: VICTIM_LOCATIONS.singapore,
  all: VICTIM_LOCATIONS.sanfrancisco,
  unknown: VICTIM_LOCATIONS.sanfrancisco
};

const ATTACK_TYPE_COLORS = {
  ssh: '#00FFFF',
  ftp: '#00FF00',
  apache: '#FF0000',
  imap: '#8A2BE2',
  sip: '#FFA500',
  bots: '#FF1493',
  strongips: '#FFFFFF',
  all: '#FFFF00',
  unknown: '#FFFF00'
};

const textureLoaderUrls = [
  '/earth-day.jpg',
  '/earth-night.jpg',
  '/earth-topology.png',
  '/night-sky.png'
];

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const toVector3 = (lat, lon, radius = 1.01) => {
  const phi = toRadians(90 - lat);
  const theta = toRadians(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

const GlobeSurface = ({ onReady }) => {
  const [dayMap, nightMap, bumpMap] = useLoader(THREE.TextureLoader, textureLoaderUrls.slice(0, 3));
  const globeRef = useRef();
  const atmosphereRef = useRef();

  useEffect(() => {
    [dayMap, nightMap, bumpMap].forEach((texture) => {
      if (!texture) return;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 16;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    });
  }, [dayMap, nightMap, bumpMap]);

  useFrame((state, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.03;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.012;
    }
    if (onReady) onReady(state);
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-5, -2, -4]} intensity={0.2} color="#335577" />
      <mesh ref={globeRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial
          map={dayMap}
          roughness={0.95}
          metalness={0.02}
          bumpMap={bumpMap}
          bumpScale={0.02}
          emissiveMap={nightMap}
          emissive={new THREE.Color('#0d1b2a')}
          emissiveIntensity={0.13}
        />
      </mesh>
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1.03, 128, 128]} />
        <meshBasicMaterial
          color="#2aa8ff"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
};

const AttackArc = ({ start, end, color }) => {
  const curve = useMemo(() => {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(1.22);
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(60), [curve]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.85} />
    </line>
  );
};

const LivePulse = ({ position, color }) => {
  const pulseRef = useRef();

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const scale = 0.03 + Math.sin(clock.elapsedTime * 5.5) * 0.01;
    pulseRef.current.scale.setScalar(1 + scale);
  });

  return (
    <mesh ref={pulseRef} position={position}>
      <sphereGeometry args={[0.03, 24, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.95} />
    </mesh>
  );
};

const GlobeScene = ({ threats }) => {
  const [arcs, setArcs] = useState([]);
  const [pulses, setPulses] = useState([]);
  const lastTimestampRef = useRef(null);

  const makeThreatPoint = (lat, lon) => toVector3(lat, lon, 1.02);

  useEffect(() => {
    if (!threats?.length) return;
    const latest = threats[0];
    if (latest.timestamp === lastTimestampRef.current) return;
    lastTimestampRef.current = latest.timestamp;

    if (
      typeof latest.lat !== 'number' || typeof latest.lon !== 'number' ||
      latest.lat < -90 || latest.lat > 90 ||
      latest.lon < -180 || latest.lon > 180
    ) {
      return;
    }

    const victim = ATTACK_TYPE_TO_VICTIM[latest.attack_type?.toLowerCase() || 'unknown'] || VICTIM_LOCATIONS.sanfrancisco;
    const color = ATTACK_TYPE_COLORS[latest.attack_type?.toLowerCase() || 'unknown'] || ATTACK_TYPE_COLORS.unknown;
    const id = `${latest.timestamp}-${latest.ip}-${Math.random()}`;

    const newArc = {
      id,
      start: makeThreatPoint(latest.lat, latest.lon),
      end: makeThreatPoint(victim.lat, victim.lon),
      color
    };

    const newPulse = {
      id,
      position: makeThreatPoint(latest.lat, latest.lon),
      color
    };

    setArcs((prev) => [newArc, ...prev].slice(0, 24));
    setPulses((prev) => [newPulse, ...prev].slice(0, 24));

    const timeout = setTimeout(() => {
      setArcs((prev) => prev.filter((item) => item.id !== id));
      setPulses((prev) => prev.filter((item) => item.id !== id));
    }, 12000);

    return () => clearTimeout(timeout);
  }, [threats]);

  return (
    <group position={[0, 0.16, 0]}>
      <Suspense fallback={null}>
        <GlobeSurface />
      </Suspense>
      <Stars radius={120} depth={60} count={7000} factor={3.5} saturation={0} fade speed={0.3} />
      {arcs.map((arc) => (
        <AttackArc key={arc.id} start={arc.start} end={arc.end} color={arc.color} />
      ))}
      {pulses.map((pulse) => (
        <LivePulse key={pulse.id} position={pulse.position} color={pulse.color} />
      ))}
    </group>
  );
};

const Globe = ({ threats = [] }) => {
  const [globeKey, setGlobeKey] = useState(0);
  const controlsRef = useRef();

  const centerGlobe = () => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(0, 0.16, 0);
    controlsRef.current.update();
  };

  const resetGlobe = () => {
    if (!controlsRef.current) return;
    controlsRef.current.reset();
    controlsRef.current.target.set(0, 0.16, 0);
    controlsRef.current.update();
    setGlobeKey((value) => value + 1);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
      <div style={controlsStyle}>
        <button type="button" onClick={resetGlobe} title="Reset globe rotation and zoom" style={controlButtonStyle}>Reset</button>
        <button type="button" onClick={centerGlobe} title="Center the globe in view" style={controlButtonStyle}>Center</button>
      </div>
      <Canvas
        key={globeKey}
        style={{ width: '100%', height: '100%' }}
        dpr={[1, 2]}
        camera={{ position: [0, 0.12, 4.8], fov: 32, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#040a12']} />
        <fog attach="fog" args={['#040a12', 4, 8]} />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          minDistance={3.4}
          maxDistance={6.0}
          rotateSpeed={0.4}
          zoomSpeed={0.8}
          target={[0, 0.16, 0]}
        />
        <GlobeScene threats={threats} />
      </Canvas>
    </div>
  );
};

const controlsStyle = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  zIndex: 5,
  display: 'flex',
  gap: '8px',
  pointerEvents: 'auto'
};

const controlButtonStyle = {
  border: '1px solid rgba(155, 231, 255, 0.18)',
  backgroundColor: 'rgba(3, 10, 16, 0.82)',
  color: '#d6f7ff',
  borderRadius: '999px',
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.28)'
};

export default Globe;
