import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const capabilities = [
  {
    title: 'Application context',
    description: 'Organize repositories, components, builds, artifacts, deployments, endpoints, and owners around the software product they belong to.'
  },
  {
    title: 'Scanner-neutral findings',
    description: 'Normalize security results into one evidence-backed lifecycle instead of making teams work scanner by scanner.'
  },
  {
    title: 'Code-to-runtime correlation',
    description: 'Determine whether a finding reached an environment and whether related suspicious runtime activity was observed.'
  },
  {
    title: 'Remediation verification',
    description: 'Track the fix from source change through rescan, rebuild, redeployment, and final verification.'
  }
];

export const Landing = () => (
  <div className="landing-page">
    <header className="public-header">
      <Link to="/" className="public-logo">
        <img src="/logo.svg" alt="ThreatStream Logo" style={{ width: '28px', height: '28px' }} />
        <span>THREAT<strong>STREAM</strong></span>
      </Link>
      <Link to="/overview" className="public-nav-btn">Open application</Link>
    </header>

    <main>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Open application security operations</div>
          <h1 className="hero-title">Connect security findings to the <span>applications running them</span></h1>
          <p className="hero-subtitle">
            ThreatStream is being built as a self-hostable operating layer connecting repositories, scanner evidence, deployments, runtime events, ownership, remediation, and verification.
          </p>
          <div className="cta-group">
            <Link to="/overview" className="cta-primary">View current platform</Link>
            <a href="https://github.com/aadithya-vimal/threatstream" target="_blank" rel="noreferrer" className="cta-secondary">View repository</a>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '18px' }}>
            The repository is under active rearchitecture. Planned capabilities are not presented as available features.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="features-header">
          <h2>The application is the security boundary</h2>
          <p>Every finding, deployment, runtime event, owner, and remediation record must resolve to an application or be explicitly unassigned.</p>
        </div>

        <div className="features-grid">
          {capabilities.map((capability) => (
            <article className="feature-card" key={capability.title}>
              <div className="feature-kicker">Target capability</div>
              <h3 className="feature-title">{capability.title}</h3>
              <p className="feature-description">{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="product-statement">
        <div>
          <span className="product-statement-label">Product direction</span>
          <h2>Repository and runtime correlation first.</h2>
        </div>
        <p>ThreatStream will integrate existing security engines. It will not pretend to be a SIEM, EDR, malware laboratory, or proprietary scanner.</p>
      </section>
    </main>

    <footer className="landing-footer">
      <p>ThreatStream — Application Security Operations</p>
      <p><Link to="/terms" style={{ color: 'var(--color-blue)', textDecoration: 'none' }}>Terms and project notice</Link></p>
    </footer>
  </div>
);

export default Landing;
