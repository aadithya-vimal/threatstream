import React from 'react';
import { Link } from 'react-router-dom';
import './Terms.css';

export const Terms = () => {
  return (
    <div className="terms-page">
      <div className="terms-container">
        <div style={{ marginBottom: '24px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--color-blue)', fontWeight: 600, fontSize: '13px' }}>
            <img src="/logo.svg" alt="ThreatStream Logo" style={{ width: '20px', height: '20px' }} />
            <span>THREAT<strong>STREAM</strong></span>
          </Link>
        </div>
        
        <h1 className="terms-title">Terms & Conditions</h1>
        <p className="terms-updated">Last Updated: January 23, 2025</p>

        <section className="terms-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using ThreatStream ("the Service"), you agree to be bound by these Terms and Conditions.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section className="terms-section">
          <h2>2. Description of Service</h2>
          <p>
            ThreatStream is a cyber operations management console and threat telemetry platform. Live threat data is routed and visualised on an interactive 3D globe.
          </p>
        </section>

        <section className="terms-section">
          <h2>3. Use License</h2>
          <p>
            Permission is granted to temporarily access and view the materials on ThreatStream for personal,
            non-commercial viewing only. Under this license you may not:
          </p>
          <ul>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or public display</li>
            <li>Attempt to reverse engineer any software contained on ThreatStream</li>
            <li>Remove any copyright or proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>4. Data Accuracy and Availability</h2>
          <p>
            The threat intelligence data displayed on ThreatStream is provided "as is" without warranties of any kind.
            We do not guarantee the accuracy, completeness, or timeliness of the threat data. The Service may experience
            downtime or interruptions without notice.
          </p>
        </section>

        <section className="terms-section">
          <h2>5. Privacy and Data Collection</h2>
          <p>
            ThreatStream does not collect, store, or process any personal information from users. The Service operates
            as a visualization platform. We do not use cookies or analytics that track individual users.
          </p>
        </section>

        <section className="terms-section">
          <h2>6. Disclaimer of Warranties</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, expressed or implied,
            and hereby disclaim and negate all other warranties including, without limitation, implied warranties or
            conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
          </p>
        </section>

        <section className="terms-section">
          <h2>7. Limitation of Liability</h2>
          <p>
            In no event shall Aadithya Vimal or ThreatStream be liable for any damages (including, without limitation,
            damages for loss of data or profit, or due to business interruption) arising out of the use or inability to
            use the Service.
          </p>
        </section>

        <div className="terms-footer">
          <p>© 2025 Aadithya Vimal. All rights reserved.</p>
          <Link to="/" className="back-home-link">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Terms;
