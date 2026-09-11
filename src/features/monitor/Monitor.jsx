import React, { useEffect, useMemo, useState } from "react";
import ThreatGlobe from "../../components/globe/ThreatGlobe.jsx";
import EventFeed from "../../components/feed/EventFeed.jsx";
import EventDetail from "../../components/detail/EventDetail.jsx";
import FilterPanel from "../../components/filters/FilterPanel.jsx";
import LiveIngest from "../../components/ops/LiveIngest.jsx";
import { ActivityChart, BarList, Metric } from "../../components/stats/StatsPanels.jsx";
import { DISABLED_PROVIDERS, UNAVAILABLE_PROVIDERS } from "../../lib/providers/disabled.js";
import { VIEWS } from "../../components/globe/globeViews.js";
import { hasSourceCoordinates } from "../../lib/threat/model.js";
import { EMPTY_FILTERS, applyFilters } from "../../lib/threat/filter.js";
import { computeStatistics } from "../../lib/threat/statistics.js";
import { formatClock } from "../../lib/format.js";
import { useThreatIntel } from "../../state/ThreatIntelContext.jsx";
import {
  EmptyState,
  HealthDot,
  LoadingState,
  Panel,
  UpdatedAgo,
} from "../../components/ui/Primitives.jsx";

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const p = (n) => String(n).padStart(2, "0");
  return (
    <span className="mono" title={now.toUTCString()} aria-label="Current UTC time">
      UTC {p(now.getUTCHours())}:{p(now.getUTCMinutes())}:{p(now.getUTCSeconds())}
    </span>
  );
}

export default function Monitor() {
  const {
    events,
    health,
    diffs,
    diffTotals,
    geoStats,
    newIds,
    changedIds,
    leaving,
    refreshProgress,
    providers,
    lastUpdated,
    initialLoading,
    refreshing,
    refresh,
    cycle,
    getEvent,
  } = useThreatIntel();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [masked, setMasked] = useState(false);
  const [globeView, setGlobeView] = useState("operations");
  const [showLabels, setShowLabels] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const globeBoxRef = React.useRef(null);

  const facets = useMemo(
    () => ({
      providers: [...new Set(events.map((e) => e.sourceProvider))].sort(),
      categories: [...new Set(events.map((e) => e.category))].sort(),
      classifications: [...new Set(events.map((e) => e.classification))].sort(),
      severities: [...new Set(events.map((e) => e.severity))].sort(),
      confidences: [...new Set(events.map((e) => e.confidence))].sort(),
      sourceCountries: [...new Set(events.map((e) => e.source?.countryCode).filter(Boolean))].sort(),
      asns: [...new Set(events.map((e) => (e.source?.asn != null ? `AS${e.source.asn}` : null)).filter(Boolean))].sort(),
    }),
    [events]
  );

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);
  const stats = useMemo(() => computeStatistics(filtered), [filtered]);
  const globeEvents = useMemo(() => filtered.filter(hasSourceCoordinates), [filtered]);
  const phishingCount = useMemo(() => filtered.filter((e) => e.classification === "phishing").length, [filtered]);
  const vulnCount = useMemo(() => filtered.filter((e) => e.classification === "vulnerability").length, [filtered]);
  const asnItems = useMemo(
    () => stats.byAsn.map((i) => ({ ...i, sub: stats.asnOrganizations?.[i.label] ?? "Organization unavailable" })),
    [stats]
  );
  const toggleAsnFilter = (label) => {
    setFilters((f) => {
      const list = f.asns ?? [];
      return { ...f, asns: list.includes(label) ? list.filter((v) => v !== label) : [...list, label] };
    });
  };
  const anyAsnAnywhere = useMemo(() => events.some((e) => e.source?.asn != null), [events]);
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
  const okCount = providers.filter((p) => health[p.id]?.status === "ok").length;
  const liveTone = initialLoading ? "" : okCount === providers.length && providers.length > 0 ? "" : okCount > 0 ? "degraded" : "down";
  const liveLabel = initialLoading ? "CONNECTING" : okCount === providers.length && providers.length > 0 ? "LIVE" : okCount > 0 ? "DEGRADED" : "OFFLINE";
  const lastDiffAt = Object.values(diffs).map((d) => d.at).filter(Boolean).sort().pop() ?? null;

  const toggleFullscreen = () => {
    const el = globeBoxRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    } else {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const providerDetail = selectedProvider ? providers.find((p) => p.id === selectedProvider) : null;

  const newSet = useMemo(() => new Set(newIds ?? []), [newIds]);
  const changedSet = useMemo(() => new Set(changedIds ?? []), [changedIds]);
  const newestNew = useMemo(() => {
    let best = null;
    for (const e of events) {
      if (!newSet.has(e.id) || !e.sessionFirstSeen) continue;
      if (!best || e.sessionFirstSeen > best.sessionFirstSeen) best = e;
    }
    return best;
  }, [events, newSet]);

  const focusNewActivity = () => {
    if (!newestNew) return;
    pick(newestNew.id);
    requestAnimationFrame(() => {
      document.getElementById(newestNew.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <div className="monitor">
      <div className="monitor-head">
        <p className="eyebrow">Global threat intelligence</p>
        <h1>Live indicators</h1>
        <p className="sub">
          Current malicious infrastructure, phishing, and vulnerability intelligence ·
          per-source refresh cadence · <UpdatedAgo iso={lastUpdated} />
        </p>
      </div>

      <div className="statusbar" role="status" aria-live="polite">
        <span className={`live-pill ${liveTone}`}>
          <span className={`live-dot${initialLoading || refreshing ? " pulsing" : ""}`} aria-hidden="true" />
          {refreshing
            ? (refreshProgress.total > 1 ? `REFRESHING · ${refreshProgress.done}/${refreshProgress.total}` : "REFRESHING")
            : liveLabel}
        </span>
        <span className="provider-dots" aria-label="Per-source status">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              className="provider-dot"
              title={`${p.name}: ${health[p.id]?.status ?? "loading"}`}
              aria-label={`${p.name} status ${health[p.id]?.status ?? "loading"} — show details`}
              onClick={() => setSelectedProvider(p.id)}
            >
              <HealthDot status={health[p.id]?.status ?? "loading"} />
            </button>
          ))}
        </span>
        <span className="mono">{filtered.length}/{events.length} indicators loaded</span>
        <span className="sep" aria-hidden="true">·</span>
        <span className="mono">{globeEvents.length} geolocated · {stats.genuineArcs} verified paths</span>
        <span className="sep" aria-hidden="true">·</span>
        {cycle > 0 && diffTotals.added === 0 && diffTotals.removed === 0 && diffTotals.changed === 0 ? (
          <span className="mono">No feed changes</span>
        ) : (
          <span className="mono">+{diffTotals.added} new −{diffTotals.removed} removed{lastDiffAt ? ` · ${formatClock(lastDiffAt)}` : ""}</span>
        )}
        {newestNew && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={focusNewActivity} title="Focus the latest genuinely new observation">
            New activity · {newSet.size}
          </button>
        )}
        <span className="spacer" />
        <UtcClock />
        <span className="statusbar-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={refreshing || initialLoading}>
            {refreshing ? "Refreshing…" : "⟳ Refresh now"}
          </button>
        </span>
      </div>

      {initialLoading ? (
        <LoadingState label="Establishing connections to live sources…" />
      ) : events.length === 0 ? (
        <EmptyState
          title="No live observations"
          hint={
            failing.length === providers.length && providers.length > 0
              ? `All providers failed (${failing.map((p) => p.name).join(", ")}). If this persists, an adblocker, DNS filter, or firewall blocking the feed hosts (e.g. raw.githubusercontent.com) is the usual cause — ThreatStream will not invent data to fill the silence.`
              : failing.length
                ? `Providers failed (${failing.map((p) => p.name).join(", ")}) and the rest returned no records. Check your connection and refresh — ThreatStream will not invent data to fill the silence.`
                : "Providers returned no records this cycle. Refresh to retry."
          }
          action={<button type="button" className="btn btn-primary" onClick={refresh}>Retry live fetch</button>}
        />
      ) : (
        <>
          <Panel
            title="Global threat intelligence"
            className="globe-panel"
            action={
              selected && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedId(null)}>
                  Clear selection
                </button>
              )
            }
          >
            <div className="globe-wrap" ref={globeBoxRef}>
              <ThreatGlobe
                events={globeEvents}
                newIds={newIds}
                changedIds={changedIds}
                leaving={leaving.filter((e) => e.source?.latitude != null && e.source?.longitude != null)}
                selectedId={selectedId}
                onSelect={pick}
                focusRequest={focusRequest}
                resetSignal={resetSignal}
                paused={paused}
                autoRotate={autoRotate}
                showLabels={showLabels}
                view={globeView}
              />
              <div className="globe-controls" role="toolbar" aria-label="Globe controls">
                <label className="view-select">
                  <span className="ctl-label">View</span>
                  <select
                    value={globeView}
                    onChange={(e) => setGlobeView(e.target.value)}
                    aria-label="Globe visualization view"
                  >
                    {VIEWS.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className={`btn btn-ghost btn-icon${autoRotate ? " active" : ""}`} onClick={() => setAutoRotate((v) => !v)} aria-pressed={autoRotate} title="Toggle auto-rotate">⟳</button>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setPaused((v) => !v)} aria-pressed={paused} title={paused ? "Resume rotation" : "Pause rotation"}>{paused ? "▶" : "⏸"}</button>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setResetSignal((n) => n + 1)} title="Reset view">⌂</button>
                <button type="button" className="btn btn-ghost btn-icon" onClick={toggleFullscreen} aria-pressed={isFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen globe"}>{isFullscreen ? "⤓" : "⤢"}</button>
                <label className="check-inline" title="Mask last IP octets">
                  <input type="checkbox" checked={masked} onChange={(e) => setMasked(e.target.checked)} /> Mask IPs
                </label>
                <label className="check-inline" title="Label selected and top observations">
                  <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Labels
                </label>
              </div>
            </div>
            <div className="globe-facts mono" aria-live="polite">
              <span>{globeEvents.length} geolocated</span>
              <span aria-hidden="true">·</span>
              <span>{filtered.length} intelligence records</span>
              <span aria-hidden="true">·</span>
              <span>{stats.genuineArcs} verified source → destination paths</span>
            </div>
            {stats.genuineArcs === 0 && (
              <p className="globe-note">
                Current browser-accessible feeds provide source infrastructure and
                intelligence records, but no verified victim endpoints — no attack
                paths are inferred.
              </p>
            )}
            <LiveIngest
              providers={providers}
              health={health}
              diffTotals={diffTotals}
              lastUpdated={lastUpdated}
              cycle={cycle}
            />
          </Panel>

          <div className="metrics-row" aria-label="Live metrics from loaded data">
            <Metric label="Live indicators" value={stats.total} sub="in memory" />
            <Metric label="New since fetch" value={`+${diffTotals.added}`} sub={`${diffTotals.removed} removed`} />
            <Metric label="Source countries" value={stats.sourceCountries} sub="geolocated" />
            <Metric label="Phishing" value={phishingCount} sub="intel records" />
            <Metric label="Vuln intel" value={vulnCount} sub="KEV records" />
            <Metric label="Confirmed paths" value={stats.genuineArcs} sub="both ends observed" />
          </div>

          <div className="monitor-cols">
            <Panel title={`Live intelligence feed · ${filtered.length}`}>
              {filtered.length === 0 ? (
                <EmptyState title="No observations match these filters." hint="Widen the scope — filters only narrow real data." />
              ) : (
                <EventFeed events={filtered} masked={masked} selectedId={selectedId} newIds={newIds} changedIds={changedIds} leavingEvents={leaving} onPick={pick} />
              )}
            </Panel>

            <div className="col-stack">
              <Panel
                title={selected ? `Event ${selected.id}` : "Event details"}
                action={selected && (
                  <a className="btn btn-ghost btn-sm" href={`/event/${encodeURIComponent(selected.id)}`}>Open full record →</a>
                )}
              >
                {selected ? (
                  <EventDetail event={selected} />
                ) : (
                  <EmptyState title="No event selected" hint="Select a globe marker or feed row to inspect the attributed record." />
                )}
              </Panel>
              <Panel title="Filters">
                <FilterPanel filters={filters} onChange={setFilters} facets={facets} resultCount={filtered.length} totalCount={events.length} />
              </Panel>
            </div>
          </div>

          <div className="stats-grid">
            <Panel title="Top source countries"><BarList items={stats.bySourceCountry} /></Panel>
            <Panel title={`ASN distribution · ${stats.asnBearing} bearing`}>
              <BarList
                items={asnItems}
                onSelect={toggleAsnFilter}
                emptyText="No ASN data in current scope."
                emptyHint={
                  anyAsnAnywhere
                    ? "None of the currently filtered observations expose ASN metadata — widen the filters."
                    : "ASN enrichment is not available for the currently visible observations — enrichment may still be resolving."
                }
              />
            </Panel>
            <Panel title="Categories"><BarList items={Object.entries(stats.byCategory).map(([label, value]) => ({ label, value }))} /></Panel>
            <Panel title="Provider distribution"><BarList items={Object.entries(stats.byProvider).map(([label, value]) => ({ label, value }))} /></Panel>
          </div>
          <Panel title="Activity over loaded span">
            <ActivityChart buckets={stats.activityOverTime} />
          </Panel>

          <Panel
            title="Source health"
            action={providerDetail && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedProvider(null)}>
                Close details
              </button>
            )}
          >
            {providerDetail && (
              <SourceDrawer
                provider={providerDetail}
                health={health[providerDetail.id]}
                diff={diffs[providerDetail.id]}
              />
            )}
            <ul className="health-list">
              {providers.map((p) => {
                const h = health[p.id];
                const d = diffs[p.id];
                return (
                  <li key={p.id}>
                    <HealthDot status={h?.status ?? "loading"} />
                    <div>
                      <button type="button" className="linklike" onClick={() => setSelectedProvider(p.id)}>
                        <strong>{p.name}</strong>
                      </button>
                      <span className="muted"> · {p.kind} · </span>
                      <a href={p.sourceUrl} target="_blank" rel="noreferrer">origin ↗</a>
                      <div className="mono health-meta">
                        {h?.status === "ok" || h?.status === "stale"
                          ? `${h.eventCount} this cycle${h.totalInFeed != null ? ` (feed: ${h.totalInFeed})` : ""} · ${h.latencyMs} ms · ${h.status}`
                          : h?.status === "error"
                            ? `failed: ${h.lastError}`
                            : "contacting…"}
                      </div>
                      <div className="mono health-meta">
                        fetched {h?.lastSuccess ? formatClock(h.lastSuccess) : "—"}
                        {" · "}source {h?.sourceUpdated ? formatClock(h.sourceUpdated) : "n/a"}
                        {d?.at ? ` · +${d.added} −${d.removed} ~${d.unchanged}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <details className="source-sublist">
              <summary>
                Geolocation enrichment ({geoStats.succeeded}/{geoStats.attempted} resolved
                {geoStats.failed > 0 ? ` · ${geoStats.failed} failed` : ""})
              </summary>
              <ul className="mono">
                <li>Lookups attempted: {geoStats.attempted} · resolved: {geoStats.succeeded} · failed: {geoStats.failed}</li>
                <li>Cached entries: {geoStats.cached} · awaiting retry: {geoStats.pendingRetry}</li>
                {Object.entries(geoStats.perEndpoint ?? {}).map(([name, s]) => (
                  <li key={name}>{name}: {s.ok} ok · {s.fail} failed · last: {s.lastStatus}</li>
                ))}
                <li>Last success: {geoStats.lastSuccessAt ? formatClock(geoStats.lastSuccessAt) : "never"}</li>
                {geoStats.lastError && <li>Last error: {geoStats.lastError}</li>}
              </ul>
              <p>
                Approximate ipwho.is → ipwhois.app lookups, in-memory cache only.
                Failures stay “pending” and retry automatically — coordinates are
                never invented.
              </p>
            </details>
            <details className="source-sublist">
              <summary>Unavailable sources ({UNAVAILABLE_PROVIDERS.length}) — not browser-compatible</summary>
              <ul>
                {UNAVAILABLE_PROVIDERS.map((d) => (
                  <li key={d.id}>
                    <strong>{d.name}</strong> — {d.reason} <a href={d.reference} target="_blank" rel="noreferrer">docs ↗</a>
                  </li>
                ))}
              </ul>
            </details>
            <details className="source-sublist">
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

function SourceDrawer({ provider, health, diff }) {
  return (
    <div className="source-drawer" aria-label={`Source details for ${provider.name}`}>
      <h3>{provider.name}</h3>
      <p className="muted">{provider.description}</p>
      <dl className="field-grid">
        <div className="field"><dt>Official source</dt><dd><a href={provider.sourceUrl} target="_blank" rel="noreferrer">{provider.sourceUrl} ↗</a></dd></div>
        <div className="field"><dt>Fetched endpoint</dt><dd className="mono">{provider.feedUrl ?? "—"}</dd></div>
        <div className="field"><dt>Attribution</dt><dd>{provider.attribution}</dd></div>
        <div className="field"><dt>Feed type</dt><dd>{provider.feedType ?? "—"}</dd></div>
        <div className="field"><dt>Update cadence</dt><dd>{provider.updateCadence ?? "—"}</dd></div>
        <div className="field"><dt>Browser compatible</dt><dd>{provider.browserCompatible ? "Yes — verified CORS" : "No"}</dd></div>
        <div className="field"><dt>Status</dt><dd>{health?.status ?? "loading"}</dd></div>
        <div className="field"><dt>Last fetched (client)</dt><dd className="mono">{health?.lastSuccess ? formatClock(health.lastSuccess) : "—"}</dd></div>
        <div className="field"><dt>Source updated</dt><dd className="mono">{health?.sourceUpdated ? formatClock(health.sourceUpdated) : "n/a"}</dd></div>
        <div className="field"><dt>Records loaded</dt><dd className="mono">{health?.eventCount ?? 0}{health?.totalInFeed != null ? ` of ${health.totalInFeed} in feed` : ""}</dd></div>
        <div className="field"><dt>Last cycle diff</dt><dd className="mono">{diff?.at ? `+${diff.added} added · −${diff.removed} removed · ~${diff.unchanged} unchanged` : "no cycle yet"}</dd></div>
        <div className="field"><dt>Known limitations</dt><dd>{provider.limitations ?? "—"}</dd></div>
      </dl>
    </div>
  );
}
