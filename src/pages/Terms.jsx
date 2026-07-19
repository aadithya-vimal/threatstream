import React from 'react';
import { Link } from 'react-router-dom';
import './Terms.css';

export const Terms = () => (
  <div className="terms-page">
    <div className="terms-container">
      <div style={{ marginBottom: '24px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--color-blue)', fontWeight: 600, fontSize: '13px' }}><img src="/logo.svg" alt="ThreatStream Logo" style={{ width: '20px', height: '20px' }} /><span>THREAT<strong>STREAM</strong></span></Link>
      </div>

      <h1 className="terms-title">Project Notice</h1>
      <p className="terms-updated">Last updated: July 18, 2026</p>

      <section className="terms-section">
        <h2>Current status</h2>
        <p>ThreatStream is under active development. The current repository provides an authenticated React application, a FastAPI service foundation, PostgreSQL persistence, and an application-owned authorization model. It is not production ready.</p>
      </section>

      <section className="terms-section">
        <h2>Intended product</h2>
        <p>ThreatStream is intended to become a self-hostable Application Security Operations platform connecting repositories, scanner findings, deployments, runtime security events, ownership, remediation, and verification.</p>
      </section>

      <section className="terms-section">
        <h2>Security data</h2>
        <p>Scanner output, source metadata, credentials, runtime events, and evidence may contain sensitive information. Operators are responsible for deploying the software securely, limiting access, and using only systems and repositories they are authorized to assess.</p>
      </section>

      <section className="terms-section">
        <h2>No fabricated assurance</h2>
        <p>A page, connector, scanner wrapper, or status label does not prove that a security workflow is operational. Consult the repository documentation for verified behavior, known limitations, and test evidence.</p>
      </section>

      <section className="terms-section">
        <h2>License status</h2>
        <p>The project intends to be open source, but this repository does not yet contain a license file. Until a license is added, no additional rights should be inferred from source availability.</p>
      </section>

      <div className="terms-footer">
        <Link to="/" className="back-home-link">← Back to home</Link>
      </div>
    </div>
  </div>
);

export default Terms;
