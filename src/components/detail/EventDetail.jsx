import React from "react";
import { formatUtc, prettyLabel, timestampKindLabel } from "../../lib/format.js";
import { relationshipKind } from "../../lib/threat/model.js";
import { ConfidenceBadge, Field, SeverityBadge } from "../ui/Primitives.jsx";

function Section({ title, tone, children }) {
  return (
    <div className={`detail-section detail-${tone}`}>
      <h3>{title}</h3>
      <dl className="field-grid">{children}</dl>
    </div>
  );
}

export default function EventDetail({ event }) {
  if (!event) return null;
  const rel = relationshipKind(event);
  const observed = event.observed ?? [];
  const inferred = event.inferred ?? [];
  return (
    <div className="event-detail">
      <Section title="Observed data — stated by the source" tone="observed">
        <Field label="Event ID" mono>{event.id}</Field>
        <Field label="First observed">
          {formatUtc(event.timestamp)}
          <small className="field-note">({timestampKindLabel(event.timestampKind)} — not an attack time)</small>
        </Field>
        <Field label="Classification">{prettyLabel(event.classification)}</Field>
        <Field label="Category">{prettyLabel(event.category)}</Field>
        <Field label="Source provider" mono>{event.sourceProvider}</Field>
        <Field label="Source record" mono>{event.sourceRecordId}</Field>
        <Field label="Attribution">
          {event.sourceUrl ? <a href={event.sourceUrl} target="_blank" rel="noreferrer">Provider source ↗</a> : "—"}
        </Field>
        {event.source?.ip && <Field label="Source network" mono>{event.source.cidr ?? event.source.ip}</Field>}
        {event.source?.ip && (
          <Field label="Block representative" mono>
            {event.source.ip}
            <small className="field-note">(stands in for the listed range — not a confirmed single host)</small>
          </Field>
        )}
        {event.destination?.ip && <Field label="Destination" mono>{event.destination.ip}</Field>}
        {event.raw?.cveID && <Field label="CVE" mono>{event.raw.cveID}</Field>}
        {event.raw?.vulnerabilityName && <Field label="Vulnerability">{event.raw.vulnerabilityName}</Field>}
        {event.raw?.vendorProject && <Field label="Vendor / project">{event.raw.vendorProject}</Field>}
        {event.raw?.product && <Field label="Product">{event.raw.product}</Field>}
        {event.raw?.requiredAction && <Field label="Required action">{event.raw.requiredAction}</Field>}
        <Field label="Relationship">
          {rel === "observed_path" ? "Source → destination (both endpoints observed)" : rel === "source_only" ? "Source-only intelligence (no destination observed)" : "Non-geographic intelligence record"}
        </Field>
        <Field label="Observed markers">{observed.length ? observed.join(", ") : "—"}</Field>
      </Section>

      <Section title="Enriched data — approximate, third-party lookup" tone="enriched">
        <Field label="Source country">{event.source?.country ?? "Not yet resolved"}</Field>
        <Field label="Country code" mono>{event.source?.countryCode ?? "—"}</Field>
        <Field label="City">{event.source?.city ?? "—"}</Field>
        <Field label="Coordinates" mono>
          {event.source?.latitude != null ? `${event.source.latitude.toFixed(3)}, ${event.source.longitude.toFixed(3)}` : "Pending"}
          <small className="field-note">(approximate — city/ISP level at best, never exact)</small>
        </Field>
        <Field label="ASN" mono>{event.source?.asn != null ? `AS${event.source.asn}` : "—"}</Field>
        <Field label="Organization">{event.source?.organization ?? "—"}</Field>
      </Section>

      <Section title="Assessment — how to read this record" tone="inferred">
        <Field label="Severity"><SeverityBadge value={event.severity} /></Field>
        <Field label="Confidence"><ConfidenceBadge value={event.confidence} /></Field>
        <Field label="Inferred markers">{inferred.length ? inferred.join(", ") : "None — shown exactly as published"}</Field>
        <Field label="What this proves">
          {event.classification === "vulnerability"
            ? "That this CVE is federally listed as exploited in the wild. It does not describe any specific attack event."
            : "That this network range appears on a public malicious-infrastructure blocklist. It does not identify victims, attack times, or targets."}
        </Field>
      </Section>
    </div>
  );
}
