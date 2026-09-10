import React from "react";
import { Link } from "react-router-dom";
import { useThreatIntel } from "../../state/ThreatIntelContext.jsx";

export default function Landing() {
  const { events, initialLoading, health } = useThreatIntel();
  const okProviders = Object.values(health).filter((h) => h.status === "ok").length;

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Public threat-intelligence visualization</p>
          <h1>
            Live Cyber Threat Intelligence, <span className="gradient-text">Visualized.</span>
          </h1>
          <p className="lede">
            ThreatStream aggregates current threat observations from public sources, enriches
            infrastructure metadata in your browser, and renders global activity on an
            interactive 3D globe — distinguishing observed activity from inference, always
            with source attribution.
          </p>
          <div className="hero-actions">
            <Link to="/monitor" className="btn btn-primary">Open Live Monitor →</Link>
            <Link to="/methodology" className="btn btn-secondary">How we stay honest</Link>
          </div>
          <div className="hero-live mono" aria-live="polite">
            {initialLoading ? (
              <span>Contacting live sources…</span>
            ) : (
              <span>
                {events.length} live observations in memory · {okProviders} source(s) healthy · no fabricated events, ever
              </span>
            )}
          </div>
        </div>
        <div className="hero-globe" aria-hidden="true">
          <img src="/earth-night.jpg" alt="" />
          <div className="hero-orbit"><i /><i /><i /></div>
        </div>
      </section>

      <section className="landing-grid">
        <article className="panel">
          <h2>What it shows</h2>
          <ul>
            <li>Blocklisted malicious infrastructure as <strong>source markers</strong> — never invented victims</li>
            <li>Genuine source → destination arcs <strong>only</strong> when a source proves both ends</li>
            <li>Actively exploited vulnerabilities (CISA KEV) as attributed intel records</li>
            <li>Live counts derived from the data actually loaded — 27 means 27</li>
          </ul>
        </article>
        <article className="panel">
          <h2>What it refuses to do</h2>
          <ul>
            <li>No random attacks, IPs, coordinates, timestamps, or severity</li>
            <li>No mock fallback when a source is down — honest empty states instead</li>
            <li>No private API keys in the browser bundle</li>
            <li>No database, no accounts, no tracking — refresh resets the session</li>
          </ul>
        </article>
        <article className="panel">
          <h2>How to read the globe</h2>
          <ul>
            <li><span className="dot dot-source" /> red marker — observed malicious source</li>
            <li><span className="dot dot-enriched" /> amber marker — geolocation added (approximate)</li>
            <li><span className="arc-sample" /> arc — confirmed path, both endpoints observed</li>
            <li>Click any marker for the full attributed record</li>
          </ul>
        </article>
      </section>

      <section className="landing-sources panel">
        <h2>Live sources</h2>
        <p>
          <strong>Spamhaus DROP</strong> (malicious infrastructure, geolocated in-browser) and{" "}
          <strong>CISA KEV</strong> (exploited vulnerabilities, non-geographic) — both public,
          keyless, and fetched live from your browser. Sources that require secret keys
          (URLhaus, ThreatFox, AbuseIPDB, GreyNoise, OTX) stay disabled and documented.
        </p>
        <Link to="/methodology" className="btn btn-ghost">Read the methodology →</Link>
      </section>
    </div>
  );
}
