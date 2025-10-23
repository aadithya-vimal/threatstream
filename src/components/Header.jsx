import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Header = () => {
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard'

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
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--color-primary-blue)',
    margin: 0,
    textDecoration: 'none'
  }

  const navStyle = {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }

  const buttonStyle = {
    backgroundColor: 'var(--color-primary-blue)',
    color: 'var(--color-bg-near-black)',
    padding: '10px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 10px rgba(0, 163, 255, 0.3)',
    textDecoration: 'none',
    display: 'inline-block'
  }

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-blue)',
    border: '2px solid var(--color-primary-blue)',
    boxShadow: 'none'
  }

  return (
    <header style={headerStyle}>
      <div style={leftSideStyle}>
        <img src="/logo.svg" alt="ThreatStream Logo" style={logoStyle} />
        <Link to="/" style={titleStyle}>
          <h1 className="glitch-text" style={{ margin: 0 }}>ThreatStream</h1>
        </Link>
      </div>
      <nav style={navStyle}>
        {isDashboard ? (
          <Link to="/" style={secondaryButtonStyle}>Home</Link>
        ) : (
          <>
            <Link to="/dashboard" style={buttonStyle}>Dashboard</Link>
          </>
        )}
      </nav>
    </header>
  )
}

export default Header
