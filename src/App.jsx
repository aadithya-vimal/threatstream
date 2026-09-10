import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import { ThreatIntelProvider } from "./state/ThreatIntelContext.jsx";
import { LoadingState } from "./components/ui/Primitives.jsx";
import "./styles.css";

const Landing = lazy(() => import("./features/landing/Landing.jsx"));
const Monitor = lazy(() => import("./features/monitor/Monitor.jsx"));
const EventPage = lazy(() => import("./features/events/EventPage.jsx"));
const Methodology = lazy(() => import("./features/methodology/Methodology.jsx"));

function NotFound() {
  return (
    <div className="notfound">
      <p className="eyebrow">404</p>
      <h1>Observation not found</h1>
      <p className="muted">
        ThreatStream serves <span className="mono">/</span>, <span className="mono">/monitor</span>,{" "}
        <span className="mono">/event/:id</span>, and <span className="mono">/methodology</span> only.
      </p>
      <p>
        <a className="btn btn-primary" href="/monitor">Open live monitor</a>
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThreatIntelProvider>
        <AppShell>
          <Suspense fallback={<LoadingState label="Loading view…" />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route path="/event/:id" element={<EventPage />} />
              <Route path="/methodology" element={<Methodology />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppShell>
      </ThreatIntelProvider>
    </Router>
  );
}
