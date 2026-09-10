import React from "react";
import { Link } from "react-router-dom";
import { formatClock, maskIp, prettyLabel } from "../../lib/format.js";
import { relationshipKind } from "../../lib/threat/model.js";
import { ConfidenceBadge, SeverityBadge } from "../ui/Primitives.jsx";

const PROVIDER_LABELS = {
  "spamhaus-drop": "Spamhaus DROP",
  "dshield": "DShield",
  "openphish": "OpenPhish",
  "cisa-kev": "CISA KEV",
};

function ProviderTag({ id }) {
  return <span className="provider-tag mono">{PROVIDER_LABELS[id] ?? id}</span>;
}

function titleFor(event) {
  if (event.classification === "vulnerability") return event.raw?.cveID ?? "Vulnerability intel";
  if (event.classification === "phishing") return "Phishing intelligence";
  if (event.category === "attack_source") return "Recent attack source";
  if (event.category === "reputation_blocklist") return "Malicious infrastructure";
  return prettyLabel(event.category);
}

function kindShort(kind) {
  if (kind === "published") return "published";
  if (kind === "list_publication") return "list updated";
  if (kind === "received") return "feed received";
  return "time unknown";
}

export function EventCard({ event, masked = false, selected = false, isNew = false, onPick = null }) {
  const rel = relationshipKind(event);
  const ip = masked ? maskIp(event.source?.ip) : event.source?.ip;
  const body = (
    <>
      <div className="event-top">
        <span className="mono event-time" title={event.timestamp ? `${new Date(event.timestamp).toUTCString()} (${kindShort(event.timestampKind)})` : "This feed provides no timestamp"}>
          {formatClock(event.timestamp)} · {event.timestamp ? kindShort(event.timestampKind) : "no time"}
        </span>
        <span className="event-pills">
          {isNew && <span className="rel-pill rel-new">New</span>}
          <span className={`rel-pill rel-${rel}`}>
            {rel === "observed_path" ? "Observed path" : rel === "source_only" ? "Source intel" : "Intel record"}
          </span>
        </span>
      </div>
      <div className="event-title">{titleFor(event)}</div>
      {event.classification === "vulnerability" ? (
        <div className="event-route">
          <span>{event.raw?.vendorProject ?? "Unknown vendor"}</span>
          <span className="event-sep">·</span>
          <span>{event.raw?.product ?? "Unknown product"}</span>
        </div>
      ) : event.classification === "phishing" ? (
        <div className="event-route">
          <span className="mono">{event.raw?.domain ?? "Unknown domain"}</span>
          <span className="event-dest-missing">Non-geographic · feed only</span>
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

export default function EventFeed({ events, masked, selectedId, newIds, onPick, max = 120 }) {
  const visible = events.slice(0, max);
  const fresh = newIds instanceof Set ? newIds : new Set(newIds ?? []);
  return (
    <div className="event-feed" role="feed" aria-label="Live threat observation feed">
      {visible.map((e) => (
        <EventCard key={e.id} event={e} masked={masked} selected={e.id === selectedId} isNew={fresh.has(e.id)} onPick={onPick} />
      ))}
    </div>
  );
}
