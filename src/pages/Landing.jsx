import React from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title glitch-text">ThreatStream</h1>
          <p className="hero-subtitle">
            Real-time cyber threat visualization platform with interactive 3D globe and live threat feed
          </p>
          <Link to="/dashboard" className="cta-button">
            Launch Dashboard
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="container">

          {/* Feature 1: 3D Visualization */}
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h2 className="feature-title">3D Visualization</h2>
            <p className="feature-description">
              Interactive globe showing threat locations and attack vectors in real-time
            </p>
          </div>

          {/* Feature 2: Live Updates */}
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h2 className="feature-title">Live Updates</h2>
            <p className="feature-description">
              Firebase-powered real-time data streaming for instant threat detection
            </p>
          </div>

          {/* Feature 3: Threat Analysis */}
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h2 className="feature-title">Threat Analysis</h2>
            <p className="feature-description">
              Comprehensive threat feed with severity levels and detailed information
            </p>
          </div>

          {/* Feature 4: Animated Attack Arcs */}
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h2 className="feature-title">Attack Visualization</h2>
            <p className="feature-description">
              Watch cyber attacks travel across the globe with stunning animated arcs color-coded by attack type
            </p>
            <div className="attack-types">
              <span className="attack-badge" style={{borderColor: '#00FFFF'}}>SSH</span>
              <span className="attack-badge" style={{borderColor: '#00FF00'}}>FTP</span>
              <span className="attack-badge" style={{borderColor: '#FF0000'}}>Apache</span>
              <span className="attack-badge" style={{borderColor: '#8A2BE2'}}>IMAP</span>
              <span className="attack-badge" style={{borderColor: '#FFA500'}}>SIP</span>
              <span className="attack-badge" style={{borderColor: '#FF1493'}}>Bots</span>
            </div>
          </div>

          {/* Feature 5: Strategic Targets */}
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h2 className="feature-title">Strategic Targets</h2>
            <p className="feature-description">
              Three permanent honeypot targets across key global locations with intelligent routing
            </p>
            <div className="targets-grid">
              <div className="target-box">
                <h4 style={{color: '#00FFFF'}}>Berlin</h4>
                <p>SSH/IMAP</p>
              </div>
              <div className="target-box">
                <h4 style={{color: '#FF0000'}}>San Francisco</h4>
                <p>Web Services</p>
              </div>
              <div className="target-box">
                <h4 style={{color: '#00FF00'}}>Singapore</h4>
                <p>IoT Devices</p>
              </div>
            </div>
          </div>

          {/* Feature 6: Real-Time Stats */}
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h2 className="feature-title">Real-Time Statistics</h2>
            <p className="feature-description">
              Live threat counters providing instant insights into attack patterns and severity distribution
            </p>
            <div className="tech-stats">
              <div className="stat">
                <div className="stat-value">100</div>
                <div className="stat-label">Max Threats</div>
              </div>
              <div className="stat">
                <div className="stat-value">50</div>
                <div className="stat-label">Concurrent Arcs</div>
              </div>
              <div className="stat">
                <div className="stat-value">60 FPS</div>
                <div className="stat-label">Performance</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="glitch-text">Ready to Monitor Global Threats?</h2>
          <p>Experience real-time cyber threat visualization like never before</p>
          <Link to="/dashboard" className="cta-button">
            Launch Dashboard Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>ThreatStream - Real-time cyber threat intelligence visualization</p>
        <p>Built with React, Three.js, and Firebase</p>
      </footer>
    </div>
  )
}

export default Landing
