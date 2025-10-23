import React from 'react'

const StatsCounters = ({ threatStats = { total: 0, critical: 0, high: 0, mediumLow: 0 } }) => {
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    padding: '30px 40px'
  }

  const statBoxes = [
    {
      label: 'Total Threats',
      value: threatStats.total,
      borderColor: 'var(--color-primary-blue)',
      valueColor: 'var(--color-primary-blue)'
    },
    {
      label: 'Critical',
      value: threatStats.critical,
      borderColor: 'var(--color-critical-pink)',
      valueColor: 'var(--color-critical-pink)'
    },
    {
      label: 'High',
      value: threatStats.high,
      borderColor: 'var(--color-high-red)',
      valueColor: 'var(--color-high-red)'
    },
    {
      label: 'Medium/Low',
      value: threatStats.mediumLow,
      borderColor: 'var(--color-warning-orange)',
      valueColor: 'var(--color-warning-orange)'
    }
  ]

  return (
    <div style={containerStyle}>
      {statBoxes.map((box, index) => (
        <div
          key={index}
          className="stat-card"
          style={{
            flex: '1',
            maxWidth: '250px',
            borderColor: box.borderColor
          }}
        >
          <div style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            opacity: 0.8,
            marginBottom: '8px',
            color: 'var(--color-text-secondary)',
            letterSpacing: '1px'
          }}>
            {box.label}
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: box.valueColor
          }}>
            {box.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCounters