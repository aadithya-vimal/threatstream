import React from 'react'
import { Link } from 'react-router-dom'
import './Terms.css'

const Terms = () => {
  return (
    <div className="terms-page">
      <div className="terms-container">
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
            ThreatStream is a real-time cyber threat visualization platform that displays public threat intelligence data
            on an interactive 3D globe interface. The Service is provided for informational and educational purposes only.
          </p>
        </section>

        <section className="terms-section">
          <h2>3. Use License</h2>
          <p>
            Permission is granted to temporarily access and view the materials on ThreatStream for personal,
            non-commercial viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
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
            as a read-only visualization platform with no user authentication or tracking. We do not use cookies or
            analytics that track individual users.
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
            use the Service, even if we have been notified of the possibility of such damage.
          </p>
        </section>

        <section className="terms-section">
          <h2>8. Accuracy of Information</h2>
          <p>
            The threat intelligence information displayed on ThreatStream is derived from third-party sources and
            honeypot sensors. While we strive to provide accurate information, we make no representations or warranties
            about the accuracy, reliability, or completeness of the threat data.
          </p>
        </section>

        <section className="terms-section">
          <h2>9. Third-Party Services</h2>
          <p>
            ThreatStream utilizes third-party services including Firebase Realtime Database for data streaming and
            CDN services for asset delivery. These services are subject to their own terms and conditions.
          </p>
        </section>

        <section className="terms-section">
          <h2>10. Intellectual Property</h2>
          <p>
            All content, features, and functionality of ThreatStream, including but not limited to text, graphics,
            logos, icons, images, and software, are the exclusive property of Aadithya Vimal and are protected by
            international copyright laws.
          </p>
        </section>

        <section className="terms-section">
          <h2>11. Prohibited Uses</h2>
          <p>You agree not to use ThreatStream:</p>
          <ul>
            <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
            <li>To violate any international, federal, or local regulations</li>
            <li>To harm or exploit minors in any way</li>
            <li>To impersonate or attempt to impersonate the Service, another user, or any other person or entity</li>
            <li>To engage in any automated use of the system, such as scripts or bots</li>
            <li>To interfere with or disrupt the Service or servers or networks connected to the Service</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>12. External Links</h2>
          <p>
            ThreatStream may contain links to external websites that are not provided or maintained by us.
            We do not guarantee the accuracy, relevance, or completeness of any information on these external websites.
          </p>
        </section>

        <section className="terms-section">
          <h2>13. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately
            upon posting to the Service. Your continued use of ThreatStream following any changes indicates your
            acceptance of the modified terms.
          </p>
        </section>

        <section className="terms-section">
          <h2>14. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to its
            conflict of law provisions.
          </p>
        </section>

        <section className="terms-section">
          <h2>15. Contact Information</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us through the repository
            issues page on GitHub.
          </p>
        </section>

        <div className="terms-footer">
          <p>© 2025 Aadithya Vimal. All rights reserved.</p>
          <Link to="/" className="back-home-link">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}

export default Terms
