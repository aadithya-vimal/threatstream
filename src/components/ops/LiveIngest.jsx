import React, { useEffect, useState } from "react";
import { formatClock, timeAgo } from "../../lib/format.js";
import { formatCountdown, nextCheckInMs } from "../../lib/providers/index.js";

/**
 * LIVE INGEST board — the honest replacement for historical replay.
 * Ticks every second (UI time only): per-provider countdowns derive from
 * lastAttempt + cadence, never from event timestamps. Shows real pipeline
 * facts; when nothing changed it says NO FEED CHANGES.
 */
function LiveIngest({ providers, health, diffTotals, lastUpdated, cycle }) {
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const now = Date.now();

  const rows = providers.map((p) => {
    const h = health[p.id];
    const lastAttempt = h?.lastAttempt ?? (h?.lastSuccess ? Date.parse(h.lastSuccess) : null);
    const dueIn = nextCheckInMs(lastAttempt, p.refreshIntervalMs, now);
    return {
      id: p.id,
      name: p.name,
      status: h?.status ?? "loading",
      lastAttempt,
      dueIn,
      lastSuccess: h?.lastSuccess ?? null,
    };
  });
  const okCount = rows.filter((r) => r.status === "ok").length;
  const nextDue = rows.length ? Math.min(...rows.map((r) => r.dueIn)) : 0;
  const noChanges =
    cycle > 0 &&
    (diffTotals.added ?? 0) === 0 &&
    (diffTotals.removed ?? 0) === 0 &&
    (diffTotals.changed ?? 0) === 0;

  return (
    <div className="ingest" aria-label="Live ingest activity" aria-live="polite">
      <div className="ingest-head">
        <span className="ingest-title">Live ingest</span>
        <span className="auto-pill" title="The browser automatically checks each source on its own cadence">
          <span className="live-dot" aria-hidden="true" /> Auto · Active
        </span>
      </div>
      <div className="ingest-meta mono">
        <span>Last cycle: {lastUpdated ? timeAgo(lastUpdated) : "never"}</span>
        <span aria-hidden="true">·</span>
        <span>Next check: {rows.length ? (nextDue <= 0 ? "due now" : formatCountdown(nextDue)) : "—"}</span>
        <span aria-hidden="true">·</span>
        <span>{okCount}/{rows.length} healthy</span>
      </div>
      <div className="ingest-diffs mono">
        <span>+{diffTotals.added ?? 0} new</span>
        <span>~{diffTotals.changed ?? 0} changed</span>
        <span>−{diffTotals.removed ?? 0} removed</span>
        <span>{diffTotals.unchanged ?? 0} unchanged</span>
      </div>
      {noChanges ? (
        <p className="ingest-note">No feed changes — sources re-fetched, datasets identical.</p>
      ) : (
        <p className="ingest-note">Latest cycle diff across enabled providers.</p>
      )}
      <ul className="ingest-next">
        {rows.map((n) => (
          <li key={n.id} className="mono ingest-row">
            <span className={`mini-dot mini-${n.status}`} aria-hidden="true" />
            <span className="ingest-name">{n.name}</span>
            <span className="ingest-times">
              fetched {n.lastSuccess ? formatClock(n.lastSuccess) : "—"}
              {" · "}next {n.dueIn <= 0 ? "due now" : formatCountdown(n.dueIn)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default React.memo(LiveIngest);
