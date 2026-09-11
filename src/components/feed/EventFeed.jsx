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
  if (event.category === "compromised_infrastructure") return "Compromised host";
  if (event.category === "reputation_blocklist") return "Malicious infrastructure";
  return prettyLabel(event.category);
}

function kindShort(kind) {
  if (kind === "published") return "published";
  if (kind === "list_publication") return "list updated";
  if (kind === "observed") return "observed";
  if (kind === "received") return "feed received";
  return "time unknown";
}

export function EventCard({ event, masked = false, selected = false, isNew = false, isChanged = false, isLeaving = false, onPick = null }) {
  const rel = relationshipKind(event);
  const ip = masked ? maskIp(event.source?.ip) : event.source?.ip;
  const cls = `event-card${selected ? " selected" : ""}${isNew ? " is-new" : ""}${isChanged ? " is-changed" : ""}${isLeaving ? " is-leaving" : ""}`;
  const body = (
    <>
      <div className="event-top">
        <span className="mono event-time" title={event.timestamp ? `${new Date(event.timestamp).toUTCString()} (${kindShort(event.timestampKind)})` : "This feed provides no timestamp"}>
          {formatClock(event.timestamp)} · {event.timestamp ? kindShort(event.timestampKind) : "no time"}
        </span>
        <span className="event-pills">
          {isNew && <span className="rel-pill rel-new">New</span>}
          {isLeaving && <span className="rel-pill rel-leaving">Removed upstream</span>}
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

  if (onPick && !isLeaving) {
    return (
      <button type="button" id={event.id} className={cls} onClick={() => onPick(event.id)}>
        {body}
      </button>
    );
  }
  if (isLeaving) {
    return (
      <div id={event.id} className={cls} aria-label="Removed upstream record">
        {body}
      </div>
    );
  }
  return (
    <Link id={event.id} to={`/event/${encodeURIComponent(event.id)}`} className={cls}>
      {body}
    </Link>
  );
}

export default function EventFeed({ events, masked, selectedId, newIds, changedIds, leavingEvents, onPick, max = 120 }) {
  const visible = events.slice(0, max);
  const fresh = newIds instanceof Set ? newIds : new Set(newIds ?? []);
  const changed = changedIds instanceof Set ? changedIds : new Set(changedIds ?? []);
  const gone = (leavingEvents ?? []).slice(0, 8);
  return (
    <div className="event-feed" role="feed" aria-label="Live threat observation feed">
      {gone.map((e) => (
        <EventCard key={`leaving-${e.id}`} event={e} masked={masked} isLeaving onPick={null} />
      ))}
      {visible.map((e) => (
        <EventCard key={e.id} event={e} masked={masked} selected={e.id === selectedId} isNew={fresh.has(e.id)} isChanged={changed.has(e.id)} onPick={onPick} />
      ))}
    </div>
  );
}
