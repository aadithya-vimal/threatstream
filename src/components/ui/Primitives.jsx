import React from "react";
import { timeAgo } from "../../lib/format.js";

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-head">
          <h2>{title}</h2>
          {action}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Badge({ tone = "muted", children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function SeverityBadge({ value }) {
  const tone =
    value === "critical" ? "critical" : value === "high" ? "danger" : value === "medium" ? "warning" : value === "low" ? "info" : "muted";
  return <Badge tone={tone}>{value ?? "unknown"}</Badge>;
}

export function ConfidenceBadge({ value }) {
  const tone = value === "high" ? "success" : value === "medium" ? "warning" : value === "low" ? "info" : "muted";
  return <Badge tone={tone}>{`${value ?? "unknown"} confidence`}</Badge>;
}

export function HealthDot({ status }) {
  const tone = status === "ok" ? "ok" : status === "stale" ? "warn" : status === "loading" ? "info" : "bad";
  return <span className={`health-dot health-${tone}`} title={status} aria-label={`provider status: ${status}`} />;
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="empty-state" role="status">
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading live observations…" }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function UpdatedAgo({ iso }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 5000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return <span className="mono">Never updated</span>;
  return <span className="mono" title={new Date(iso).toUTCString()}>Updated {timeAgo(iso)}</span>;
}

export function Field({ label, children, mono = false }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd className={mono ? "mono" : ""}>{children ?? "—"}</dd>
    </div>
  );
}
