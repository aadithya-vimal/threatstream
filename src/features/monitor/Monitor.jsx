import React, { useMemo, useState } from "react";
import ThreatGlobe from "../../components/globe/ThreatGlobe.jsx";
import EventFeed from "../../components/feed/EventFeed.jsx";
import EventDetail from "../../components/detail/EventDetail.jsx";
import FilterPanel from "../../components/filters/FilterPanel.jsx";
import Timeline from "../../components/timeline/Timeline.jsx";
import { ActivityChart, BarList, Metric } from "../../components/stats/StatsPanels.jsx";
import { DISABLED_PROVIDERS } from "../../lib/providers/disabled.js";
import { hasSourceCoordinates } from "../../lib/threat/model.js";
import { EMPTY_FILTERS, applyFilters } from "../../lib/threat/filter.js";
import { computeStatistics } from "../../lib/threat/statistics.js";
import { useThreatIntel } from "../../state/ThreatIntelContext.jsx";
import {
  EmptyState,
  HealthDot,
  LoadingState,
  Panel,
  UpdatedAgo,
} from "../../components/ui/Primitives.jsx";

export default function Monitor() {
  const {
    events,
    health,
    providers,
    lastUpdated,
    initialLoading,
    refreshing,
    refresh,
    refreshIntervalMs,
    getEvent,
  } = useThreatIntel();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [selectedId, setSelectedId] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [masked, setMasked] = useState(false);

  const facets = useMemo(
    () => ({
      providers: [...new Set(events.map((e) => e.sourceProvider))].sort(),
      categories: [...new Set(events.map((e) => e.category))].sort(),
      classifications: [...new Set(events.map((e) => e.classification))].sort(),
      severities: [...new Set(events.map((e) => e.severity))].sort(),
      confidences: [...new Set(events.map((e) => e.confidence))].sort(),
      sourceCountries: [...new Set(events.map((e) => e.source?.countryCode).filter(Boolean))].sort(),
    }),
    [events]
  );

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);
  const stats = useMemo(() => computeStatistics(filtered), [filtered]);
  const globeEvents = useMemo(() => filtered.filter(hasSourceCoordinates), [filtered]);
  const selected = selectedId ? getEvent(selectedId) : null;

  const pick = (id, opts = {}) => {
    setSelectedId(id);
    if (!opts.suppressFocus) {
      const e = getEvent(id);
      if (e?.source?.latitude != null) {
        setFocusRequest({ lat: e.source.latitude, lon: e.source.longitude, nonce: Date.now() });
      }
    }
  };

  const failing = providers.filter((p) => health[p.id]?.status === "error");
  const anyOk = providers.some((p) => health[p.id]?.status === "ok" || health[p.id]?.status === "stale");

  return (
    <div className="monitor">
      <div className="monitor-toolbar">
        <div>
          <h1>Global Monitor</h1>
          <p className="muted">
            Live public observations · auto-refresh every {Math.round(refreshIntervalMs / 60000)} min from real
            provider data · <UpdatedAgo iso={lastUpdated} />
          </p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "⟳ Refresh now"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetSignal((n) => n + 1)}>
            Reset view
          </button>
          <label className="toggle"><input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} /> Rotate</label>
          <label className="toggle"><input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /> Pause motion</label>
          <label className="toggle"><input type="checkbox" checked={masked} onChange={(e) => setMasked(e.target.checked)} /> Mask IPs</label>
        </div>
      </div>

      {initialLoading ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <EmptyState
          title="No live observations currently available."
          hint={
            failing.length
              ? `All providers failed (${failing.map((p) => p.name).join(", ")}). Check your connection and refresh — ThreatStream will not invent data to fill the silence.`
              : "Providers returned no records this cycle. Refresh to retry."
          }
          action={<button type="button" className="btn btn-primary" onClick={refresh}>Retry live fetch</button>}
        />
      ) : (
        <>
          <div className="metrics-grid" aria-label="Live metrics from loaded data">
            <Metric label="Live observations" value={stats.total} sub="loaded in memory" />
            <Metric label="Active source IPs" value={stats.uniqueSourceIps} sub="distinct representatives" />
            <Metric label="Source countries" value={stats.sourceCountries} sub="geolocated only" />
            <Metric label="High-confidence" value={stats.highConfidence} sub="of loaded" />
            <Metric label="Confirmed paths" value={stats.genuineArcs} sub="both ends observed" />
            <Metric label="Pending geolocation" value={stats.pendingGeolocation} sub="feed-only for now" />
          </div>

          <div className="monitor-grid">
            <Panel
              title="Threat globe"
              className="globe-panel"
              action={
                selected && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedId(null)}>
                    Clear selection
                  </button>
                )
              }
            >
              <ThreatGlobe
                events={globeEvents}
                selectedId={selectedId}
                onSelect={pick}
                focusRequest={focusRequest}
                resetSignal={resetSignal}
                paused={paused}
                autoRotate={autoRotate}
              />
              <Timeline events={filtered} selectedId={selectedId} onPick={pick} />
            </Panel>

            <div className="side-col">
              <Panel title={`Live event feed (${filtered.length})`}>
                {filtered.length === 0 ? (
                  <EmptyState title="No observations match these filters." hint="Widen the scope — filters only narrow real data." />
                ) : (
                  <EventFeed events={filtered} masked={masked} selectedId={selectedId} onPick={pick} />
                )}
              </Panel>
            </div>
          </div>

          {selected && (
            <Panel title={`Event ${selected.id}`} action={<a className="btn btn-ghost btn-sm" href={`/event/${encodeURIComponent(selected.id)}`}>Open full record →</a>}>
              <EventDetail event={selected} />
            </Panel>
          )}

          <Panel title="Filters">
            <FilterPanel filters={filters} onChange={setFilters} facets={facets} resultCount={filtered.length} totalCount={events.length} />
          </Panel>

          <div className="stats-grid">
            <Panel title="Top source countries"><BarList items={stats.bySourceCountry} /></Panel>
            <Panel title="Categories"><BarList items={Object.entries(stats.byCategory).map(([label, value]) => ({ label, value }))} /></Panel>
            <Panel title="ASN distribution"><BarList items={stats.byAsn} /></Panel>
            <Panel title="Provider distribution"><BarList items={Object.entries(stats.byProvider).map(([label, value]) => ({ label, value }))} /></Panel>
            <Panel title="Activity over loaded span" className="span-2"><ActivityChart buckets={stats.activityOverTime} /></Panel>
          </div>

          <Panel title="Source health">
            <ul className="health-list">
              {providers.map((p) => {
                const h = health[p.id];
                return (
                  <li key={p.id}>
                    <HealthDot status={h?.status ?? "loading"} />
                    <div>
                      <strong>{p.name}</strong>
                      <span className="muted"> · {p.kind} · </span>
                      <a href={p.sourceUrl} target="_blank" rel="noreferrer">origin ↗</a>
                      <div className="mono health-meta">
                        {h?.status === "ok" || h?.status === "stale"
                          ? `${h.eventCount} events this cycle${h.totalInFeed != null ? ` (feed: ${h.totalInFeed})` : ""} · ${h.latencyMs} ms · ${h.status}`
                          : h?.status === "error"
                            ? `failed: ${h.lastError}`
                            : "contacting…"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {!anyOk && (
              <p className="warn-line">Partial-source state: every provider is failing. Showing the last loaded snapshot, if any.</p>
            )}
            <details className="disabled-sources">
              <summary>Disabled sources ({DISABLED_PROVIDERS.length}) — why they stay off</summary>
              <ul>
                {DISABLED_PROVIDERS.map((d) => (
                  <li key={d.id}>
                    <strong>{d.name}</strong> — {d.reason} <a href={d.reference} target="_blank" rel="noreferrer">docs ↗</a>
                  </li>
                ))}
              </ul>
            </details>
          </Panel>
        </>
      )}
    </div>
  );
}
