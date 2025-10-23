import React from 'react'

const Header = () => {
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '80px',
    padding: '20px 40px',
    backgroundColor: '#1a1a1a',
    borderBottom: '2px solid #00d9ff'
  }

  const leftSideStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  }

  const logoStyle = {
    width: '40px',
    height: '40px',
    display: 'block'
  }

  const titleStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#00d9ff',
    margin: 0
  }

  const buttonStyle = {
    backgroundColor: '#00d9ff',
    color: '#0a0a0a',
    padding: '10px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer'
  }

  return (
    <header style={headerStyle}>
      <div style={leftSideStyle}>
        <img src="/logo.svg" alt="ThreatStream Logo" style={logoStyle} />
        <h1 style={titleStyle}>ThreatStream</h1>
      </div>
      <button style={buttonStyle}>Dashboard</button>
    </header>
  )
}

export default Header
