import React from "react";
import { Link, NavLink } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="ThreatStream home">
      <img src="/logo.svg" alt="" width={26} height={26} />
      <span>
        Threat<strong>Stream</strong>
      </span>
    </Link>
  );
}

export default function AppShell({ children }) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <Brand />
        <nav aria-label="Primary">
          <NavLink to="/monitor">Live Monitor</NavLink>
          <NavLink to="/methodology">Methodology</NavLink>
        </nav>
        <span className="topbar-note mono">frontend-only · in-memory · no tracking</span>
      </header>
      <main id="main" className="main">{children}</main>
      <footer className="footer">
        <span>ThreatStream visualizes public threat observations with source attribution.</span>
        <span className="mono">Observed facts ≠ inferred context. Never fabricated.</span>
      </footer>
    </div>
  );
}
