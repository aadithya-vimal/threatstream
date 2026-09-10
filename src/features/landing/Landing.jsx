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
          <p className="eyebrow">Global cyber threat intelligence</p>
          <h1>
            <span className="thin">LIVE THREAT INTELLIGENCE</span>
            Visualized<span className="glow">.</span>
          </h1>
          <p className="lede">
            A continuously updated operational view of global cyber-threat
            intelligence, malicious infrastructure, phishing indicators,
            vulnerability intelligence, and verified relationships.
          </p>
          <div className="hero-actions">
            <Link to="/monitor" className="btn btn-primary">Open Live Monitor →</Link>
            <Link to="/methodology" className="btn btn-secondary">Methodology</Link>
          </div>
          <div className="hero-live mono" aria-live="polite">
            <span className={`live-dot${initialLoading ? " pulsing" : ""}`} aria-hidden="true" />
            {initialLoading ? (
              <span>Contacting live sources…</span>
            ) : (
              <span>
                ● Live · {events.length} intelligence records · {geolocated} geolocated · {providers.length} sources
              </span>
            )}
          </div>
          {!initialLoading && events.length > 0 && (
            <div className="hero-facts" aria-label="Currently loaded data">
              <div className="hero-fact"><b>{events.length}</b><span>Intelligence records</span></div>
              <div className="hero-fact"><b>{geolocated}</b><span>Geolocated</span></div>
              <div className="hero-fact"><b>{okProviders}/{providers.length}</b><span>Sources healthy</span></div>
            </div>
          )}
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="css-globe">
            <span className="css-globe-stars" />
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
          <span className="css-globe-tag" style={{ top: "12%", right: "8%" }}>Live intelligence</span>
          <span className="css-globe-tag" style={{ bottom: "14%", left: "6%" }}>{providers.length} sources</span>
        </div>
      </section>

      <section className="landing-grid">
        <article className="panel"><div className="panel-body">
          <h2>Live intelligence</h2>
          <p>Continuously refreshed public threat-intelligence feeds — malicious infrastructure, phishing indicators, and vulnerability activity.</p>
        </div></article>
        <article className="panel"><div className="panel-body">
          <h2>Global visibility</h2>
          <p>Approximate geographic context for infrastructure indicators, with observed facts kept separate from enrichment.</p>
        </div></article>
        <article className="panel"><div className="panel-body">
          <h2>Analyst context</h2>
          <p>Source attribution, enrichment detail, provider health, and event-level inspection for every record.</p>
        </div></article>
      </section>

      <section className="panel landing-sources">
        <div className="panel-body">
          <h2>Data provenance</h2>
          <div className="landing-grid">
            <div>
              <h3>Attributed sources</h3>
              <p>Every intelligence record remains attributable to its source — Spamhaus DROP, DShield, SANS ISC, OpenPhish, and CISA KEV.</p>
            </div>
            <div>
              <h3>Observed vs enriched</h3>
              <p>Provider facts are distinguished from geographic enrichment, which is always labeled approximate.</p>
            </div>
            <div>
              <h3>Verified relationships</h3>
              <p>Source → destination paths render only when the underlying evidence supports both endpoints.</p>
            </div>
          </div>
          <p><Link to="/methodology" className="btn btn-ghost btn-sm">Read the methodology →</Link></p>
        </div>
      </section>
    </div>
  );
}
