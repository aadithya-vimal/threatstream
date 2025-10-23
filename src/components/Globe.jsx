import React, { useEffect, useState, useRef } from 'react';
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
  // State for attack arcs & pulses (from Firebase)
  const [arcs, setArcs] = useState([]);
  const [pulses, setPulses] = useState([]);

  // *** NEW: State for random background arcs ***
  const [randomArcs, setRandomArcs] = useState([]);

  // State for globe dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const globeRef = useRef();
  const containerRef = useRef();

  // Static victim markers (remain the same)
  const victimMarkers = [
    { ...VICTIM_LOCATIONS.berlin, radius: 0.4 },
    { ...VICTIM_LOCATIONS.sanfrancisco, radius: 0.4 },
    { ...VICTIM_LOCATIONS.singapore, radius: 0.4 }
  ];

  // Update globe dimensions when container resizes (remains the same)
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        setDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // *** NEW: Generate random background arcs on component mount ***
  useEffect(() => {
    const N_ARCS = 20; // Number of random arcs
    const gData = [...Array(N_ARCS).keys()].map(() => ({
      startLat: (Math.random() - 0.5) * 180,
      startLng: (Math.random() - 0.5) * 360,
      endLat: (Math.random() - 0.5) * 180,
      endLng: (Math.random() - 0.5) * 360,
      color: 'rgba(255, 255, 255, 0.3)', // Faint white color
      id: `random-${Math.random()}` // Unique ID to differentiate
    }));
    setRandomArcs(gData);
    console.log("Generated random background arcs.");
  }, []); // Empty dependency array runs only once

  // Get victim location based on attack type (remains the same)
  const getVictimLocation = (attackType) => {
    const type = attackType?.toLowerCase() || 'unknown';
    return ATTACK_TYPE_TO_VICTIM[type] || VICTIM_LOCATIONS.sanfrancisco;
  };

  // Get arc color based on attack type (remains the same)
  const getArcColor = (attackType) => {
    // ----> OPTIONAL: Uncomment the line below to make ALL attack arcs RED <----
    // return '#FF0000';

    // Default: Use color mapping
    const type = attackType?.toLowerCase() || 'unknown';
    return ATTACK_TYPE_COLORS[type] || ATTACK_TYPE_COLORS.unknown;
  };

  // Process new threats from props and create arcs/pulses (updated)
  useEffect(() => {
    // Only process if there are threats and the newest one is different from the last processed one
    // (This check prevents reprocessing if the parent component re-renders without new data)
    if (threats.length === 0 || (arcs.length > 0 && threats[0].timestamp === arcs[0].originalTimestamp)) {
        return;
    }

    const latestThreat = threats[0]; // Assuming newest threat is always at index 0

    // Validate coordinates (remains the same)
    if (
      typeof latestThreat.lat !== 'number' || typeof latestThreat.lon !== 'number' ||
      latestThreat.lat < -90 || latestThreat.lat > 90 ||
      latestThreat.lon < -180 || latestThreat.lon > 180
    ) {
      console.warn('Invalid coordinates for threat:', latestThreat);
      return;
    }

    const victim = getVictimLocation(latestThreat.attack_type);
    // *** Use the getArcColor function to determine the color for BOTH arc and pulse ***
    const color = getArcColor(latestThreat.attack_type);
    const startTime = Date.now();
    const id = `${latestThreat.timestamp}-${latestThreat.ip}-${Math.random()}`;

    // Create new arc object - *** ADDED color property directly ***
    const newArc = {
      id,
      startLat: latestThreat.lat,
      startLng: latestThreat.lon,
      endLat: victim.lat,
      endLng: victim.lon,
      color: color, // Set color directly
      startTime,
      originalTimestamp: latestThreat.timestamp // Store original timestamp for comparison
    };

    // Create new pulse object - *** Use the SAME color as the arc ***
    const newPulse = {
      id,
      lat: latestThreat.lat,
      lng: latestThreat.lon,
      color: color, // Set color directly
      startTime,
      radius: 0.6
    };

    // Add new arc (limit to 50)
    setArcs(prevArcs => [newArc, ...prevArcs].slice(0, 50));

    // Add new pulse (limit to 50)
    setPulses(prevPulses => [newPulse, ...prevPulses].slice(0, 50));

    // Set timeout to remove arc and pulse after 15 seconds (remains the same)
    setTimeout(() => {
      setArcs(prevArcs => prevArcs.filter(arc => arc.id !== id));
      setPulses(prevPulses => prevPulses.filter(pulse => pulse.id !== id));
    }, 15000);

  // IMPORTANT: Depend only on the threats array object itself, not its length
  }, [threats]);

  // Combine static victims with active pulses for points data (remains the same)
  const allPoints = [...victimMarkers, ...pulses];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // *** UPDATED Arcs configuration to handle both types ***
        arcsData={[...arcs, ...randomArcs]} // Combine real and random arcs
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.color} // Use the color property directly
        // Apply different styles based on ID prefix
        arcDashLength={d => d.id.startsWith('random-') ? 0.6 : 0.4}
        arcDashGap={d => d.id.startsWith('random-') ? 0.6 : 0.2}
        arcDashAnimateTime={d => d.id.startsWith('random-') ? 8000 : 2000} // Slower animation for random
        arcStroke={d => d.id.startsWith('random-') ? 0.2 : 0.6} // Thinner stroke for random
        arcAltitude={d => d.id.startsWith('random-') ? 0.15 : 0.3} // Lower altitude for random

        // Points configuration (victims + pulses - remains the same)
        pointsData={allPoints}
        pointLat={d => d.lat}
        pointLng={d => d.lng || d.lon} // Handles both 'lon' and 'lng' keys
        pointColor={d => d.color}
        pointAltitude={0}
        pointRadius={d => d.radius}
        pointLabel={d => d.label || ''}

        // Globe appearance (remains the same)
        showAtmosphere={true}
        atmosphereColor="#00a3ff"
        atmosphereAltitude={0.15}

        // Controls (remains the same)
        enablePointerInteraction={true}
      />
    </div>
  );
};

export default GlobeComponent;
