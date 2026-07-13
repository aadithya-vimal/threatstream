import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

export const Landing = () => {
  return (
    <div className="landing-page">
      {/* Public Header */}
      <header className="public-header">
        <Link to="/" className="public-logo">
          <img src="/logo.svg" alt="ThreatStream Logo" style={{ width: '28px', height: '28px' }} />
          <span>THREAT<strong>STREAM</strong></span>
        </Link>
        <Link to="/dashboard" className="public-nav-btn">
          Console login
        </Link>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Open-source cyber operations platform</div>
          <h1 className="hero-title">
            Next-Generation <span>Validation</span> Operations Console
          </h1>
          <p className="hero-subtitle">
            Track exposure, evidence, and workflow state in real-time. Built to help you validate findings, preserve context, and keep control of what matters.
          </p>
          <div className="cta-group">
            <Link to="/dashboard" className="cta-primary">
              Launch Console
            </Link>
            <a href="https://github.com/aadithya-vimal/threatstream" target="_blank" rel="noreferrer" className="cta-secondary">
              View Repository
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-header">
          <h2>Operational Modules</h2>
          <p>Explore modules designed to support detection, investigation, and response workflows.</p>
        </div>
        
        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3 className="feature-title">Live Threat Visualization</h3>
            <p className="feature-description">
              Observe live telemetry mapped geographically in real-time. Trace ingress sources and related entities directly to targets.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3 className="feature-title">Live Event Stream</h3>
            <p className="feature-description">
              Powered by database triggers for low-latency event updates. Keep operators informed with live logs and alerts.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3 className="feature-title">Deployed Sensors</h3>
            <p className="feature-description">
              Distributed sensors collect live traffic for profiling and correlation across exposed services.
            </p>
            <div className="targets-grid">
              <div className="target-box">
                <h4>Berlin</h4>
                <p>SSH / Mail</p>
              </div>
              <div className="target-box">
                <h4>San Francisco</h4>
                <p>Web Target</p>
              </div>
              <div className="target-box">
                <h4>Singapore</h4>
                <p>IoT Sensors</p>
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Exposure Management</h3>
            <p className="feature-description">
              Correlate vulnerabilities with asset inventory. Prioritize remediation based on current exposure and business context.
            </p>
            <div className="attack-types">
              <span className="attack-badge">Exposure Review</span>
              <span className="attack-badge">Control Gap</span>
              <span className="attack-badge">Remediation</span>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Threat Hunting</h3>
            <p className="feature-description">
              Execute structured queries over endpoint, network, and alert telemetry to find suspicious behavior fast.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="feature-card">
            <div className="feature-icon">🛠️</div>
            <h3 className="feature-title">Analysis & Verdicts</h3>
            <p className="feature-description">
              Execute suspicious artifacts inside controlled analysis workflows. Gather behavior, reputation, and verdict data.
            </p>
            <div className="tech-stats">
              <div className="stat">
                <div className="stat-value">60s</div>
                <div className="stat-label">Timeout</div>
              </div>
              <div className="stat">
                <div className="stat-value">Win10</div>
                <div className="stat-label">Host OS</div>
              </div>
              <div className="stat">
                <div className="stat-value">Score</div>
                <div className="stat-label">Verdicts</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>ThreatStream Cyber Operations Platform - Open-Source Validation Console</p>
        <p>© 2025 Aadithya Vimal. All rights reserved. | <Link to="/terms" style={{ color: 'var(--color-blue)', textDecoration: 'none' }}>Terms & Conditions</Link></p>
      </footer>
    </div>
  );
};

export default Landing;
