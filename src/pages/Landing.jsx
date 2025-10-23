import React from 'react'
import { Link } from 'react-router-dom'

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

          {/* Feature 1: Interactive 3D Globe */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">🌍</div>
            <h2 className="feature-title">Interactive 3D Globe Visualization</h2>
            <p className="feature-description">
              Experience cyber threats in a stunning three-dimensional view of Earth. The globe is built using WebGL technology, providing smooth 60fps performance even under heavy threat loads.
            </p>
            <ul className="feature-list">
              <li><strong>Full 360° Rotation</strong> - Click and drag to rotate the globe in any direction</li>
              <li><strong>Zoom Control</strong> - Scroll to zoom in on specific regions or zoom out for global overview</li>
              <li><strong>Pan Navigation</strong> - Multi-touch and mouse pan support for precise positioning</li>
              <li><strong>Night Lights Texture</strong> - Realistic Earth texture showing city lights at night</li>
              <li><strong>Atmospheric Glow</strong> - Beautiful blue atmospheric layer surrounding the planet</li>
              <li><strong>Performance Optimized</strong> - Handles up to 50 concurrent animated arcs without lag</li>
            </ul>
          </div>

          {/* Feature 2: Animated Attack Arcs */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">⚡</div>
            <h2 className="feature-title">Animated Attack Arcs</h2>
            <p className="feature-description">
              Watch cyber attacks travel across the globe in real-time with stunning animated arcs that connect attackers to their targets.
            </p>
            <ul className="feature-list">
              <li><strong>Dynamic Path Generation</strong> - Arcs automatically calculate the optimal curved path</li>
              <li><strong>Color-Coded by Attack Type</strong> - Each attack type has a unique, vibrant color</li>
              <li><strong>Smooth Animation</strong> - Arcs animate from origin to destination over 2 seconds</li>
              <li><strong>Glow Effect</strong> - Bright, glowing appearance makes arcs highly visible</li>
              <li><strong>Auto-Fade</strong> - Arcs gracefully fade out after 15 seconds to prevent visual clutter</li>
            </ul>
            <div className="attack-types">
              <span className="attack-badge" style={{borderColor: '#00FFFF'}}>SSH</span>
              <span className="attack-badge" style={{borderColor: '#00FF00'}}>FTP</span>
              <span className="attack-badge" style={{borderColor: '#FF0000'}}>Apache</span>
              <span className="attack-badge" style={{borderColor: '#8A2BE2'}}>IMAP</span>
              <span className="attack-badge" style={{borderColor: '#FFA500'}}>SIP</span>
              <span className="attack-badge" style={{borderColor: '#FF1493'}}>Bots</span>
            </div>
          </div>

          {/* Feature 3: Strategic Target Locations */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">🎯</div>
            <h2 className="feature-title">Strategic Target Locations</h2>
            <p className="feature-description">
              Three permanent honeypot targets are marked on the globe, representing real-world attack destinations based on attack type.
            </p>
            <div className="targets-grid">
              <div className="target-box">
                <h4 style={{color: '#00FFFF'}}>Berlin, Germany</h4>
                <p>SSH/IMAP Target</p>
                <small>European data center hub</small>
              </div>
              <div className="target-box">
                <h4 style={{color: '#FF0000'}}>San Francisco, USA</h4>
                <p>Web Target</p>
                <small>Silicon Valley infrastructure</small>
              </div>
              <div className="target-box">
                <h4 style={{color: '#00FF00'}}>Singapore</h4>
                <p>IoT Target</p>
                <small>Asia-Pacific IoT hub</small>
              </div>
            </div>
          </div>

          {/* Feature 4: Real-Time Statistics Dashboard */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">📊</div>
            <h2 className="feature-title">Real-Time Statistics Dashboard</h2>
            <p className="feature-description">
              Live threat counters provide instant insights into attack patterns and severity distribution.
            </p>
            <ul className="feature-list">
              <li><strong className="text-blue">Total Threats</strong> - Displays cumulative count of all threats received</li>
              <li><strong className="text-pink">Critical Threats</strong> - Bots and StrongIPs requiring immediate attention</li>
              <li><strong className="text-red">High Severity</strong> - SSH and Apache attacks on common services</li>
              <li><strong className="text-orange">Medium/Low</strong> - FTP, IMAP, SIP, and other tracked threats</li>
            </ul>
          </div>

          {/* Feature 5: Live Threat Feed */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">📡</div>
            <h2 className="feature-title">Live Threat Feed</h2>
            <p className="feature-description">
              A continuously updating feed displays the latest 20 threats with complete details, providing a detailed event log.
            </p>
            <ul className="feature-list">
              <li><strong>Attack Type</strong> - Displayed in brackets [ssh], [apache], etc.</li>
              <li><strong>Origin Country</strong> - 2-letter ISO country code (US, DE, CN, etc.)</li>
              <li><strong>Attacker IP</strong> - Full IPv4 or IPv6 address</li>
              <li><strong>Timestamp</strong> - Precise time in UTC format</li>
              <li><strong>Newest First</strong> - Latest threats appear at the top</li>
            </ul>
            <div className="feed-example">
              [ssh] from DE • IP: 203.0.113.45 • 2025-01-23 14:32:18 UTC
            </div>
          </div>

          {/* Feature 6: Cyberpunk Visual Theme */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">🎨</div>
            <h2 className="feature-title">Blue Cyberpunk Visual Theme</h2>
            <p className="feature-description">
              A stunning dark theme with animated elements creates an immersive cyber security operations center aesthetic.
            </p>
            <ul className="feature-list">
              <li><strong>Animated Grid Background</strong> - Glowing blue grid lines with smooth scrolling motion</li>
              <li><strong>Glitch Text Effects</strong> - Cyberpunk-style text animations</li>
              <li><strong>Glassmorphism</strong> - Backdrop blur effects on panels</li>
              <li><strong>Scan Line Animations</strong> - Retro-futuristic visual effects</li>
              <li><strong>Custom Scrollbars</strong> - Dark theme compatible with blue highlights</li>
            </ul>
          </div>

          {/* Feature 7: Real-Time Data Streaming */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">🔥</div>
            <h2 className="feature-title">Real-Time Data Streaming</h2>
            <p className="feature-description">
              ThreatStream connects to Firebase Realtime Database for instant threat data delivery with zero polling.
            </p>
            <ul className="feature-list">
              <li><strong>WebSocket Protocol</strong> - Real-time updates with &lt;100ms latency</li>
              <li><strong>Automatic Reconnection</strong> - Reliable connection on network interruption</li>
              <li><strong>Data Validation</strong> - All threats validated before visualization</li>
              <li><strong>Memory Management</strong> - Automatic pruning prevents memory leaks</li>
            </ul>
          </div>

          {/* Feature 8: Performance Optimizations */}
          <div className="feature-card cyber-panel">
            <div className="feature-icon">⚙️</div>
            <h2 className="feature-title">Performance Optimizations</h2>
            <p className="feature-description">
              Built for 24/7 operation in security operations centers with rock-solid stability.
            </p>
            <ul className="feature-list">
              <li><strong>WebGL Hardware Acceleration</strong> - 60fps maintained with 50 active arcs</li>
              <li><strong>Efficient State Management</strong> - React virtual DOM optimization</li>
              <li><strong>Smart Data Limits</strong> - Maximum 100 threats, 50 arcs, 50 pulses</li>
              <li><strong>Bundle Optimization</strong> - Minified JavaScript (~2.1MB, gzipped: 596KB)</li>
            </ul>
            <div className="tech-stats">
              <div className="stat">
                <div className="stat-value">60 FPS</div>
                <div className="stat-label">Frame Rate</div>
              </div>
              <div className="stat">
                <div className="stat-value">&lt;100ms</div>
                <div className="stat-label">Data Latency</div>
              </div>
              <div className="stat">
                <div className="stat-value">&lt;150MB</div>
                <div className="stat-label">Memory Usage</div>
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
