import React from 'react'

const Header = () => {
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '80px',
    padding: '20px 40px',
    backgroundColor: 'var(--color-bg-header)',
    borderBottom: '1px solid var(--color-border)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 50
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
    color: 'var(--color-primary-blue)',
    margin: 0
  }

  const buttonStyle = {
    backgroundColor: 'var(--color-primary-blue)',
    color: 'var(--color-bg-near-black)',
    padding: '10px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 10px rgba(0, 163, 255, 0.3)'
  }

  return (
    <header style={headerStyle}>
      <div style={leftSideStyle}>
        <img src="/logo.svg" alt="ThreatStream Logo" style={logoStyle} />
        <h1 style={titleStyle} className="glitch-text">ThreatStream</h1>
      </div>
      <button style={buttonStyle}>Dashboard</button>
    </header>
  )
}

export default Header
