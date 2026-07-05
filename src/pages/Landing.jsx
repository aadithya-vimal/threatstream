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
          <div className="hero-badge">Enterprise SecOps platform</div>
          <h1 className="hero-title">
            Next-Generation <span>Security Operations Center</span> Console
          </h1>
          <p className="hero-subtitle">
            Ingest, visualize, and remediate network intrusions in real-time. Built with interactive 3D telemetry visualization, global honeypots, and integrated endpoint response.
          </p>
          <div className="cta-group">
            <Link to="/dashboard" className="cta-primary">
              Launch SOC Console
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
          <h2>Enterprise Security Modules</h2>
          <p>Explore modules designed to support security teams at global scale.</p>
        </div>
        
        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3 className="feature-title">3D Threat Visualization</h3>
            <p className="feature-description">
              Observe incoming network attacks mapped geographically in real-time. Trace ingress source vectors directly to targets.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3 className="feature-title">Real-time Stream</h3>
            <p className="feature-description">
              Powered by database triggers for microsecond event notifications. Keep security operators updated with low-latency logs.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3 className="feature-title">Strategic Targets</h3>
            <p className="feature-description">
              Permanent distributed honeypot systems routing simulated SSH, Mail, and Web payloads for traffic profiling.
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
            <h3 className="feature-title">Vulnerability Auditing</h3>
            <p className="feature-description">
              Correlate Common Vulnerabilities and Exposures (CVEs) with asset catalogs. Prioritize security patches based on CVSS scoring.
            </p>
            <div className="attack-types">
              <span className="attack-badge">CVE-2024-3094</span>
              <span className="attack-badge">Log4Shell</span>
              <span className="attack-badge">libwebp</span>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Proactive Threat Hunting</h3>
            <p className="feature-description">
              Execute Kusto (KQL) and SQL syntax queries over high-fidelity container logs, process actions, and registry modifications.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="feature-card">
            <div className="feature-icon">🛠️</div>
            <h3 className="feature-title">Sandboxing & Verdicts</h3>
            <p className="feature-description">
              Execute suspicious executables inside multi-OS virtual sandboxes. Gather process runtimes and threat scores.
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
        <p>ThreatStream Security Operations Platform - Enterprise Dashboard Console</p>
        <p>© 2025 Aadithya Vimal. All rights reserved. | <Link to="/terms" style={{ color: 'var(--color-blue)', textDecoration: 'none' }}>Terms & Conditions</Link></p>
      </footer>
    </div>
  );
};

export default Landing;
