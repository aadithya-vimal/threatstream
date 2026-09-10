import React from "react";
import { formatClock, timeAgo } from "../../lib/format.js";

/**
 * LIVE INGEST strip — the honest replacement for historical replay.
 * Shows only real pipeline facts: last fetch, next scheduled checks,
 * per-cycle snapshot diffs. When nothing changed it says so.
 */
export default function LiveIngest({ providers, health, diffTotals, lastUpdated, cycle }) {
  const now = Date.now();
  const nextChecks = providers.map((p) => {
    const last = health[p.id]?.lastSuccess ? Date.parse(health[p.id].lastSuccess) : null;
    const dueIn = last == null ? 0 : Math.max(0, p.refreshIntervalMs - (now - last));
    return { id: p.id, name: p.name, dueIn, status: health[p.id]?.status ?? "loading" };
  });
  const noChanges =
    cycle > 0 &&
    (diffTotals.added ?? 0) === 0 &&
    (diffTotals.removed ?? 0) === 0 &&
    (diffTotals.changed ?? 0) === 0;

  return (
    <div className="ingest" aria-label="Live ingest activity" aria-live="polite">
      <div className="ingest-head">
        <span className="ingest-title">Live ingest</span>
        <span className="mono ingest-updated">
          Last successful fetch: {lastUpdated ? `${timeAgo(lastUpdated)} (${formatClock(lastUpdated)})` : "never"}
        </span>
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
        {nextChecks.map((n) => (
          <li key={n.id} className="mono">
            <span className={`mini-dot mini-${n.status}`} aria-hidden="true" />
            {n.name} · next check {n.dueIn <= 0 ? "due now" : `in ${Math.max(1, Math.round(n.dueIn / 60000))} min`}
          </li>
        ))}
      </ul>
    </div>
  );
}
