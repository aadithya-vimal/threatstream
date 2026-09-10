import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useThreatIntel } from "../../state/ThreatIntelContext.jsx";
import { timeAgo } from "../../lib/format.js";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="ThreatStream home">
      <span className="brand-mark" aria-hidden="true">◈</span>
      <span>
        Threat<strong>Stream</strong>
      </span>
    </Link>
  );
}

function TopStatus() {
  const { events, health, providers, lastUpdated, initialLoading } = useThreatIntel();
  const states = providers.map((p) => health[p.id]?.status ?? "loading");
  const ok = states.filter((s) => s === "ok").length;
  const tone = initialLoading ? "" : ok === providers.length && providers.length > 0 ? "" : ok > 0 ? "degraded" : "down";
  const label = initialLoading ? "CONNECTING" : ok === providers.length && providers.length > 0 ? "LIVE" : ok > 0 ? "DEGRADED" : "OFFLINE";
  return (
    <span className="topbar-status" aria-live="polite">
      <span className={`live-pill ${tone}`}>
        <span className={`live-dot${initialLoading ? " pulsing" : ""}`} aria-hidden="true" />
        {label}
      </span>
      <span className="topbar-updated mono" title={lastUpdated ? new Date(lastUpdated).toUTCString() : "No fetch yet"}>
        {initialLoading ? "contacting sources…" : `${events.length} obs · ${lastUpdated ? `updated ${timeAgo(lastUpdated)}` : "never updated"}`}
      </span>
    </span>
  );
}

export default function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <Brand />
        <nav aria-label="Primary" className={menuOpen ? "open" : ""}>
          <NavLink to="/monitor" onClick={() => setMenuOpen(false)}>Monitor</NavLink>
          <NavLink to="/methodology" onClick={() => setMenuOpen(false)}>Methodology</NavLink>
        </nav>
        <TopStatus />
        <button
          type="button"
          className="menu-btn"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>
      <main id="main" className="main">{children}</main>
      <footer className="footer">
        <span>ThreatStream visualizes public threat observations with source attribution.</span>
        <span className="mono">Observed facts ≠ inferred context. Never fabricated.</span>
      </footer>
    </div>
  );
}
