import React, { useEffect, useState, useRef } from 'react'
import Globe from 'react-globe.gl'

// Static victim locations
const VICTIM_LOCATIONS = {
  berlin: { lat: 52.5200, lon: 13.4050, label: 'SSH/IMAP Target', color: '#00FFFF' },
  sanfrancisco: { lat: 37.7749, lon: -122.4194, label: 'Web Target', color: '#FF0000' },
  singapore: { lat: 1.3521, lon: 103.8198, label: 'IoT Target', color: '#00FF00' }
}

// Attack type to victim routing mapping
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
}

// Attack type to arc color mapping
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
}

const GlobeComponent = ({ threats = [] }) => {
  const [arcs, setArcs] = useState([])
  const [pulses, setPulses] = useState([])
  const globeRef = useRef()

  // Static victim markers
  const victimMarkers = [
    { ...VICTIM_LOCATIONS.berlin, radius: 0.4 },
    { ...VICTIM_LOCATIONS.sanfrancisco, radius: 0.4 },
    { ...VICTIM_LOCATIONS.singapore, radius: 0.4 }
  ]

  // Get victim location based on attack type
  const getVictimLocation = (attackType) => {
    const type = attackType?.toLowerCase() || 'unknown'
    return ATTACK_TYPE_TO_VICTIM[type] || VICTIM_LOCATIONS.sanfrancisco
  }

  // Get arc color based on attack type
  const getArcColor = (attackType) => {
    const type = attackType?.toLowerCase() || 'unknown'
    return ATTACK_TYPE_COLORS[type] || ATTACK_TYPE_COLORS.unknown
  }

  // Process new threats and create arcs/pulses
  useEffect(() => {
    if (threats.length === 0) return

    const latestThreat = threats[0]

    // Validate coordinates
    if (
      typeof latestThreat.lat !== 'number' ||
      typeof latestThreat.lon !== 'number' ||
      latestThreat.lat < -90 ||
      latestThreat.lat > 90 ||
      latestThreat.lon < -180 ||
      latestThreat.lon > 180
    ) {
      console.warn('Invalid coordinates for threat:', latestThreat)
      return
    }

    const victim = getVictimLocation(latestThreat.attack_type)
    const color = getArcColor(latestThreat.attack_type)
    const startTime = Date.now()
    const id = `${latestThreat.timestamp}-${latestThreat.ip}-${Math.random()}`

    // Create new arc
    const newArc = {
      id,
      startLat: latestThreat.lat,
      startLng: latestThreat.lon,
      endLat: victim.lat,
      endLng: victim.lon,
      color,
      startTime
    }

    // Create new pulse at attacker location
    const newPulse = {
      id,
      lat: latestThreat.lat,
      lng: latestThreat.lon,
      color,
      startTime,
      radius: 0.6
    }

    // Add new arc (limit to 50)
    setArcs(prevArcs => {
      const updated = [newArc, ...prevArcs]
      return updated.slice(0, 50)
    })

    // Add new pulse (limit to 50)
    setPulses(prevPulses => {
      const updated = [newPulse, ...prevPulses]
      return updated.slice(0, 50)
    })

    // Set timeout to remove arc and pulse after 15 seconds
    setTimeout(() => {
      setArcs(prevArcs => prevArcs.filter(arc => arc.id !== id))
      setPulses(prevPulses => prevPulses.filter(pulse => pulse.id !== id))
    }, 15000)
  }, [threats])

  // Combine static victims with active pulses for points data
  const allPoints = [...victimMarkers, ...pulses]

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Globe
        ref={globeRef}
        width={800}
        height={600}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // Arcs configuration
        arcsData={arcs}
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.color}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcStroke={0.6}
        arcAltitude={0.3}

        // Points configuration (victims + pulses)
        pointsData={allPoints}
        pointLat={d => d.lat}
        pointLng={d => d.lng || d.lon}
        pointColor={d => d.color}
        pointAltitude={0}
        pointRadius={d => d.radius}
        pointLabel={d => d.label || ''}

        // Globe appearance
        showAtmosphere={true}
        atmosphereColor="#00a3ff"
        atmosphereAltitude={0.15}

        // Controls
        enablePointerInteraction={true}
      />
    </div>
  )
}

export default GlobeComponent
