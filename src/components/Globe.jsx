import React, { useEffect, useMemo, useState, useRef } from 'react';
import Globe from 'react-globe.gl';

// --- Constants (remain the same) ---
const VICTIM_LOCATIONS = {
  berlin: { lat: 52.5200, lon: 13.4050, label: 'SSH/IMAP Target', color: '#00FFFF' },
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
  ssh: '#00FFFF',      // Cyan
  ftp: '#00FF00',      // Green
  apache: '#FF0000',    // Red
  imap: '#8A2BE2',    // Purple
  sip: '#FFA500',      // Orange
  bots: '#FF1493',    // Pink
  strongips: '#FFFFFF', // White
  all: '#FFFF00',      // Yellow
  unknown: '#FFFF00'   // Yellow
};
// --- End Constants ---

const GlobeComponent = ({ threats = [] }) => {
  // State for attack arcs & pulses (from live telemetry stream)
  const [arcs, setArcs] = useState([]);
  const [pulses, setPulses] = useState([]);

  // State for globe dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const globeRef = useRef();
  const containerRef = useRef();

  const sourceLabel = 'Live threat arcs only';

  const victimMarkers = useMemo(() => ([
    { ...VICTIM_LOCATIONS.berlin, radius: 0.45 },
    { ...VICTIM_LOCATIONS.sanfrancisco, radius: 0.45 },
    { ...VICTIM_LOCATIONS.singapore, radius: 0.45 }
  ]), []);

  const globeSize = useMemo(() => {
    const devicePixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    return {
      width: Math.max(320, Math.floor(dimensions.width * devicePixelRatio)),
      height: Math.max(320, Math.floor(dimensions.height * devicePixelRatio))
    };
  }, [dimensions.width, dimensions.height]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(320, Math.floor(width)),
          height: Math.max(320, Math.floor(height))
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getVictimLocation = (attackType) => {
    const type = attackType?.toLowerCase() || 'unknown';
    return ATTACK_TYPE_TO_VICTIM[type] || VICTIM_LOCATIONS.sanfrancisco;
  };

  const getArcColor = (attackType) => {
    const type = attackType?.toLowerCase() || 'unknown';
    return ATTACK_TYPE_COLORS[type] || ATTACK_TYPE_COLORS.unknown;
  };

  useEffect(() => {
    if (threats.length === 0 || (arcs.length > 0 && threats[0].timestamp === arcs[0].originalTimestamp)) {
        return;
    }

    const latestThreat = threats[0];

    if (
      typeof latestThreat.lat !== 'number' || typeof latestThreat.lon !== 'number' ||
      latestThreat.lat < -90 || latestThreat.lat > 90 ||
      latestThreat.lon < -180 || latestThreat.lon > 180
    ) {
      console.warn('Invalid coordinates for threat:', latestThreat);
      return;
    }

    const victim = getVictimLocation(latestThreat.attack_type);
    const color = getArcColor(latestThreat.attack_type);
    const startTime = Date.now();
    const id = `${latestThreat.timestamp}-${latestThreat.ip}-${Math.random()}`;

    const newArc = {
      id,
      startLat: latestThreat.lat,
      startLng: latestThreat.lon,
      endLat: victim.lat,
      endLng: victim.lon,
      color: color, // Set color directly
      startTime,
      originalTimestamp: latestThreat.timestamp
    };

    const newPulse = {
      id,
      lat: latestThreat.lat,
      lng: latestThreat.lon,
      color: color, // Set color directly
      startTime,
      radius: 0.6
    };

    setArcs(prevArcs => [newArc, ...prevArcs].slice(0, 50));
    setPulses(prevPulses => [newPulse, ...prevPulses].slice(0, 50));

    setTimeout(() => {
      setArcs(prevArcs => prevArcs.filter(arc => arc.id !== id));
      setPulses(prevPulses => prevPulses.filter(pulse => pulse.id !== id));
    }, 15000);

  }, [threats]);

  const allPoints = [...victimMarkers, ...pulses];

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, rgba(4, 24, 37, 0.35) 0%, rgba(0, 0, 0, 0.98) 72%)'
      }}
    >
      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2, fontSize: '11px', fontWeight: 700, color: '#9be7ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {sourceLabel}
      </div>
      <Globe
        ref={globeRef}
        width={globeSize.width}
        height={globeSize.height}
        globeImageUrl="/earth-day.jpg"
        bumpImageUrl="/earth-topology.png"
        backgroundImageUrl="/night-sky.png"
        resolution={3}
        specularColor="rgba(255,255,255,0.25)"
        specularSize={8}
        showGlobe={true}
        rendererConfig={{ antialias: true, alpha: true, preserveDrawingBuffer: true, precision: 'highp', powerPreference: 'high-performance' }}
        showGraticules={true}
        graticuleColor="rgba(155, 231, 255, 0.025)"
        onGlobeReady={() => {
          if (globeRef.current) {
            globeRef.current.pointOfView({ lat: 22, lng: 15, altitude: 2.9 }, 0);
          }
        }}
        animateIn={true}
        autoRotate={true}
        autoRotateSpeed={0.09}
        arcsData={arcs}
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.color}
        arcDashLength={0.28}
        arcDashGap={0.22}
        arcDashAnimateTime={1800}
        arcStroke={0.45}
        arcAltitude={0.22}
        pointsData={allPoints}
        pointLat={d => d.lat}
        pointLng={d => d.lng || d.lon}
        pointColor={d => d.color}
        pointAltitude={0}
        pointRadius={d => d.radius * 0.8}
        pointLabel={d => d.label || ''}
        showAtmosphere={true}
        atmosphereColor="rgba(59, 130, 246, 0.22)"
        atmosphereAltitude={0.08}
        enablePointerInteraction={true}
      />
    </div>
  );
};

export default GlobeComponent;
