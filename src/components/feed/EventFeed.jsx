import React from "react";
import { Link } from "react-router-dom";
import { formatClock, maskIp, prettyLabel } from "../../lib/format.js";
import { relationshipKind } from "../../lib/threat/model.js";
import { ConfidenceBadge, SeverityBadge } from "../ui/Primitives.jsx";

function ProviderTag({ id }) {
  const label = id === "spamhaus-drop" ? "Spamhaus DROP" : id === "cisa-kev" ? "CISA KEV" : id;
  return <span className="provider-tag mono">{label}</span>;
}

export function EventCard({ event, masked = false, selected = false, onPick = null }) {
  const rel = relationshipKind(event);
  const ip = masked ? maskIp(event.source?.ip) : event.source?.ip;
  const body = (
    <>
      <div className="event-top">
        <span className="mono event-time">{formatClock(event.timestamp)}</span>
        <span className={`rel-pill rel-${rel}`}>
          {rel === "observed_path" ? "Observed path" : rel === "source_only" ? "Source intel" : "Intel record"}
        </span>
      </div>
      <div className="event-title">
        {event.classification === "vulnerability"
          ? event.raw?.cveID ?? "Vulnerability intel"
          : prettyLabel(event.category)}
      </div>
      {event.classification === "vulnerability" ? (
        <div className="event-route">
          <span>{event.raw?.vendorProject ?? "Unknown vendor"}</span>
          <span className="event-sep">·</span>
          <span>{event.raw?.product ?? "Unknown product"}</span>
        </div>
      ) : (
        <div className="event-route">
          <span className="mono">{ip ?? "Source pending"}</span>
          <span className="event-src-country">{event.source?.country ?? "Country pending"}</span>
          {event.destination?.ip ? (
            <>
              <span className="event-sep" aria-hidden="true">→</span>
              <span className="mono">{masked ? maskIp(event.destination.ip) : event.destination.ip}</span>
              <span className="event-src-country">{event.destination.country ?? ""}</span>
            </>
          ) : (
            <>
              <span className="event-sep" aria-hidden="true">→</span>
              <span className="event-dest-missing">Destination: not observed</span>
            </>
          )}
        </div>
      )}
      <div className="event-meta">
        {event.source?.asn != null && <span className="mono">AS{event.source.asn}</span>}
        {event.source?.organization && <span className="org">{event.source.organization}</span>}
        <SeverityBadge value={event.severity} />
        <ConfidenceBadge value={event.confidence} />
      </div>
      <div className="event-foot">
        <ProviderTag id={event.sourceProvider} />
        {event.sourceUrl && (
          <a href={event.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            Source ↗
          </a>
        )}
      </div>
    </>
  );

  if (onPick) {
    return (
      <button type="button" className={`event-card${selected ? " selected" : ""}`} onClick={() => onPick(event.id)}>
        {body}
      </button>
    );
  }
  return (
    <Link to={`/event/${encodeURIComponent(event.id)}`} className={`event-card${selected ? " selected" : ""}`}>
      {body}
    </Link>
  );
}

export default function EventFeed({ events, masked, selectedId, onPick, max = 120 }) {
  const visible = events.slice(0, max);
  return (
    <div className="event-feed" role="feed" aria-label="Live threat observation feed">
      {visible.map((e) => (
        <EventCard key={e.id} event={e} masked={masked} selected={e.id === selectedId} onPick={onPick} />
      ))}
    </div>
  );
}
