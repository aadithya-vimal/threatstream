import React from "react";
import { Link } from "react-router-dom";
import { useThreatIntel } from "../../state/ThreatIntelContext.jsx";

export default function Landing() {
  const { events, initialLoading, health, providers } = useThreatIntel();
  const okProviders = Object.values(health).filter((h) => h.status === "ok").length;
  const geolocatedEvents = events.filter(
    (e) => typeof e.source?.latitude === "number" && typeof e.source?.longitude === "number"
  );
  const geolocated = geolocatedEvents.length;
  // Real plotted markers only: equirectangular projection of actual
  // coordinates onto the decorative disc. No synthetic positions.
  const heroDots = geolocatedEvents.slice(0, 12).map((e) => ({
    id: e.id,
    x: ((e.source.longitude + 180) / 360) * 100,
    y: ((90 - e.source.latitude) / 180) * 100,
    label: `${e.source.ip ?? e.id} · ${e.source.country ?? "Country pending"}`,
  }));

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ThreatStream · Public threat-intelligence visualization</p>
          <h1>
            <span className="thin">LIVE CYBER THREAT INTELLIGENCE</span>
            Visualized<span className="glow">.</span>
          </h1>
          <p className="lede">
            ThreatStream transforms continuously updated public threat-intelligence feeds
            into an interactive geographic view of malicious infrastructure, phishing
            indicators, and vulnerability intelligence — with transparent attribution
            and a strict observed-vs-inferred distinction. No fabricated attacks, ever.
          </p>
          <div className="hero-actions">
            <Link to="/monitor" className="btn btn-primary">Enter live monitor →</Link>
            <Link to="/methodology" className="btn btn-secondary">Methodology</Link>
          </div>
          <div className="hero-live mono" aria-live="polite">
            <span className={`live-dot${initialLoading ? " pulsing" : ""}`} aria-hidden="true" />
            {initialLoading ? (
              <span>Contacting live sources…</span>
            ) : (
              <span>
                {events.length} observations in memory · {okProviders}/{providers.length} source(s) healthy
              </span>
            )}
          </div>
          {!initialLoading && events.length > 0 && (
            <div className="hero-facts" aria-label="Currently loaded data">
              <div className="hero-fact"><b>{events.length}</b><span>Observations</span></div>
              <div className="hero-fact"><b>{geolocated}</b><span>Geolocated</span></div>
              <div className="hero-fact"><b>{okProviders}/{providers.length}</b><span>Sources live</span></div>
            </div>
          )}
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="css-globe">
            <span className="css-globe-ring r1" />
            <span className="css-globe-ring r2" />
            {heroDots.map((d) => (
              <span
                key={d.id}
                className="hero-dot"
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                title={d.label}
              />
            ))}
          </div>
          <span className="css-globe-tag" style={{ top: "12%", right: "8%" }}>DROP · live</span>
          <span className="css-globe-tag" style={{ bottom: "14%", left: "6%" }}>in-memory · no tracking</span>
        </div>
      </section>

      <section className="landing-grid">
        <article className="panel"><div className="panel-body">
          <h2>What it shows</h2>
          <ul>
            <li>Blocklisted malicious infrastructure as <strong>source markers</strong> — never invented victims</li>
            <li>Genuine source → destination arcs <strong>only</strong> when a source proves both ends</li>
            <li>Live counts derived from the data actually loaded — 27 means 27</li>
          </ul>
        </div></article>
        <article className="panel"><div className="panel-body">
          <h2>What it refuses to do</h2>
          <ul>
            <li>No random attacks, IPs, coordinates, timestamps, or severity</li>
            <li>No mock fallback when a source is down — honest empty states instead</li>
            <li>No private API keys in the browser bundle</li>
            <li>No database, no accounts, no tracking — refresh resets the session</li>
          </ul>
        </div></article>
        <article className="panel"><div className="panel-body">
          <h2>How to read the globe</h2>
          <ul>
            <li><span className="dot dot-source" /> red marker — observed malicious source</li>
            <li><span className="dot dot-enriched" /> amber marker — geolocation added (approximate)</li>
            <li><span className="arc-sample" /> arc — confirmed path, both endpoints observed</li>
            <li>Click any marker for the full attributed record</li>
          </ul>
        </div></article>
      </section>

      <section className="panel landing-sources">
        <div className="panel-body">
          <h2>Live sources</h2>
          <p>
            <strong>Spamhaus DROP</strong> (blocklisted infrastructure) and{" "}
            <strong>DShield</strong> (recent attack sources) — geolocated in-browser;{" "}
            <strong>OpenPhish</strong> (phishing URLs) and <strong>CISA KEV</strong>{" "}
            (exploited vulnerabilities, via the official GitHub mirror) as attributed
            intel records. Every source is public, keyless, and fetched live from your
            browser on its own cadence. Feodo Tracker stays <strong>unavailable</strong>{" "}
            (CORS-blocked + stale), and secret-key sources stay disabled and documented.
          </p>
          <Link to="/methodology" className="btn btn-ghost btn-sm">Read the methodology →</Link>
        </div>
      </section>
    </div>
  );
}
