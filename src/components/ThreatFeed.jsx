import React from 'react'

const ThreatFeed = ({ threats = [] }) => {
  // Format timestamp to readable format: YYYY-MM-DD HH:MM:SS UTC
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp)
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      const seconds = String(date.getUTCSeconds()).padStart(2, '0')

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
    } catch (error) {
      return 'Invalid timestamp'
    }
  }

  const headerStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--color-primary-blue)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '15px'
  }

  const feedItemStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderLeft: '3px solid var(--color-primary-blue)',
    padding: '10px',
    marginBottom: '8px',
    fontSize: '12px',
    lineHeight: '1.6',
    color: 'var(--color-text-secondary)',
    transition: 'all 0.3s ease'
  }

  const emptyStateStyle = {
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: '20px'
  }

  // Display only latest 20 threats
  const displayThreats = threats.slice(0, 20)

  return (
    <div className="cyber-panel" style={{
      height: 'calc(100vh - 80px - 120px - 80px)',
      overflowY: 'auto'
    }}>
      <div style={headerStyle}>LIVE THREAT FEED</div>

      {displayThreats.length === 0 ? (
        <div style={emptyStateStyle}>Waiting for threat data...</div>
      ) : (
        displayThreats.map((threat, index) => {
          const key = `${threat.timestamp}-${threat.ip}-${index}`
          const countryCode = threat.country?.toUpperCase() || '??'
          const attackType = threat.attack_type || 'unknown'

          return (
            <div key={key} style={feedItemStyle}>
              [{attackType}] from {countryCode} • IP: {threat.ip} • {formatTimestamp(threat.timestamp)}
            </div>
          )
        })
      )}
    </div>
  )
}

export default ThreatFeed
