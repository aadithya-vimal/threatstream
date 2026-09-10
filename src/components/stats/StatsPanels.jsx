import React from "react";

/** Tiny dependency-free SVG bars. Every value comes from loaded events. */
export function BarList({ items, maxWidth = 220, onSelect = null, emptyText = "No data in current scope.", emptyHint = null }) {
  if (!items?.length) {
    return (
      <div>
        <p className="muted">{emptyText}</p>
        {emptyHint && <p className="muted bar-empty-hint">{emptyHint}</p>}
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="bar-list">
      {items.map((i) => (
        <li key={i.label}>
          <span className="bar-label mono" title={i.sub ?? i.label}>
            {onSelect ? (
              <button type="button" className="bar-label-btn" onClick={() => onSelect(i.label)} title={`Filter to ${i.label}${i.sub ? ` — ${i.sub}` : ""}`}>
                {i.label}
              </button>
            ) : (
              i.label
            )}
            {i.sub && <span className="bar-sub">{i.sub}</span>}
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max(3, (i.value / max) * 100)}%` }} />
          </span>
          <span className="bar-value mono">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function ActivityChart({ buckets }) {
  if (!buckets?.length) return <p className="muted">No timestamps in current scope.</p>;
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const W = 560;
  const H = 120;
  const bw = W / buckets.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="activity-chart" role="img" aria-label="Observation activity over loaded time span">
      {buckets.map((b, i) => {
        const h = Math.max(2, (b.count / max) * (H - 18));
        return (
          <rect
            key={i}
            x={i * bw + 1}
            y={H - 14 - h}
            width={Math.max(1, bw - 2)}
            height={h}
            rx={1}
          >
            <title>{`${b.count} observations`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function Metric({ label, value, sub }) {
  return (
    <div className="metric">
      <span className="metric-value mono">{value}</span>
      <span className="metric-label">{label}</span>
      {sub && <span className="metric-sub mono">{sub}</span>}
    </div>
  );
}
