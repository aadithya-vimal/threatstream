import React from 'react'

const StatsCounters = ({ threatStats = { total: 0, critical: 0, high: 0, mediumLow: 0 } }) => {
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    padding: '30px 40px'
  }

  const boxBaseStyle = {
    flex: '1',
    maxWidth: '250px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  }

  const labelStyle = {
    fontSize: '12px',
    textTransform: 'uppercase',
    opacity: 0.8,
    marginBottom: '8px',
    color: '#cccccc'
  }

  const valueBaseStyle = {
    fontSize: '36px',
    fontWeight: 'bold'
  }

  const statBoxes = [
    {
      label: 'Total Threats',
      value: threatStats.total,
      borderColor: '#00d9ff',
      valueColor: '#00d9ff'
    },
    {
      label: 'Critical',
      value: threatStats.critical,
      borderColor: '#ff1493',
      valueColor: '#ff1493'
    },
    {
      label: 'High',
      value: threatStats.high,
      borderColor: '#ff0000',
      valueColor: '#ff0000'
    },
    {
      label: 'Medium/Low',
      value: threatStats.mediumLow,
      borderColor: '#ffa500',
      valueColor: '#ffa500'
    }
  ]

  return (
    <div style={containerStyle}>
      {statBoxes.map((box, index) => (
        <div
          key={index}
          style={{
            ...boxBaseStyle,
            border: `2px solid ${box.borderColor}`
          }}
        >
          <div style={labelStyle}>{box.label}</div>
          <div style={{ ...valueBaseStyle, color: box.valueColor }}>
            {box.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCounters
