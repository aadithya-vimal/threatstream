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

          {/* Feature 7: Threat Intelligence Feeds */}
          <div className="feature-card">
            <div className="feature-icon">📡</div>
            <h2 className="feature-title">Threat Intelligence Feeds</h2>
            <p className="feature-description">
              Aggregate and correlate data from multiple threat intelligence sources including commercial feeds, open-source intelligence, and custom integrations
            </p>
          </div>

          {/* Feature 8: Custom Alerts */}
          <div className="feature-card">
            <div className="feature-icon">🔔</div>
            <h2 className="feature-title">Custom Alerts</h2>
            <p className="feature-description">
              Configure intelligent notifications for specific threat patterns, severity thresholds, and geographic regions with multi-channel delivery
            </p>
          </div>

          {/* Feature 9: Historical Analytics */}
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h2 className="feature-title">Historical Analytics</h2>
            <p className="feature-description">
              Deep-dive into historical threat data with trend analysis, pattern recognition, and predictive insights for proactive defense
            </p>
          </div>

          {/* Feature 10: API Integration */}
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h2 className="feature-title">API Integration</h2>
            <p className="feature-description">
              Seamlessly connect with your existing security infrastructure including SIEM platforms, firewalls, and incident response tools
            </p>
            <div className="attack-types">
              <span className="attack-badge" style={{borderColor: '#00A3FF'}}>Splunk</span>
              <span className="attack-badge" style={{borderColor: '#00FF00'}}>QRadar</span>
              <span className="attack-badge" style={{borderColor: '#8A2BE2'}}>ServiceNow</span>
              <span className="attack-badge" style={{borderColor: '#FFA500'}}>PagerDuty</span>
            </div>
          </div>

          {/* Feature 11: Automated Response */}
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h2 className="feature-title">Automated Response</h2>
            <p className="feature-description">
              Execute predefined playbooks automatically based on threat severity and type to minimize response time and human error
            </p>
            <div className="targets-grid">
              <div className="target-box">
                <p>Block IP addresses</p>
              </div>
              <div className="target-box">
                <p>Quarantine endpoints</p>
              </div>
              <div className="target-box">
                <p>Alert security team</p>
              </div>
            </div>
          </div>

          {/* Feature 12: Export & Reporting */}
          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h2 className="feature-title">Export & Reporting</h2>
            <p className="feature-description">
              Generate comprehensive threat intelligence reports with customizable templates and export to multiple formats for stakeholder distribution
            </p>
            <div className="tech-stats">
              <div className="stat">
                <div className="stat-value">PDF</div>
                <div className="stat-label">Reports</div>
              </div>
              <div className="stat">
                <div className="stat-value">CSV</div>
                <div className="stat-label">Data</div>
              </div>
              <div className="stat">
                <div className="stat-value">JSON</div>
                <div className="stat-label">API</div>
              </div>
              <div className="stat">
                <div className="stat-value">Excel</div>
                <div className="stat-label">Sheets</div>
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
        <p>© 2025 Aadithya Vimal. All rights reserved. | <Link to="/terms" style={{color: 'var(--color-primary-blue)', textDecoration: 'none'}}>Terms & Conditions</Link></p>
      </footer>
    </div>
  )
}

export default Landing
