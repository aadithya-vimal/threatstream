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

function hasGeo(p) {
  return typeof p?.latitude === "number" && typeof p?.longitude === "number";
}

export default function EventDetail({ event }) {
  if (!event) return null;
  const rel = relationshipKind(event);
  const observed = event.observed ?? [];
  const inferred = event.inferred ?? [];
  const isVuln = event.classification === "vulnerability";

  return (
    <div className="event-detail">
      <Section title="Event overview" tone="observed">
        <Field label="Event ID" mono>{event.id}</Field>
        <Field label="First observed">
          {formatUtc(event.timestamp)}
          <small className="field-note">({timestampKindLabel(event.timestampKind)} — not an attack time)</small>
        </Field>
        {event.sessionFirstSeen && (
          <Field label="First seen this session" mono>
            {formatUtc(event.sessionFirstSeen)}
            <small className="field-note">(client fetch cycle — display only, not source evidence)</small>
          </Field>
        )}
        <Field label="Classification">{prettyLabel(event.classification)}</Field>
        <Field label="Category">{prettyLabel(event.category)}</Field>
        <Field label="Severity"><SeverityBadge value={event.severity} /></Field>
        <Field label="Confidence"><ConfidenceBadge value={event.confidence} /></Field>
        <Field label="Relationship">
          {rel === "observed_path"
            ? "Source → destination (both endpoints observed)"
            : rel === "source_only"
              ? "Source-only intelligence (no destination observed)"
              : "Non-geographic intelligence record"}
        </Field>
        {event.raw?.cveID && <Field label="CVE" mono>{event.raw.cveID}</Field>}
      </Section>

      <Section title="Source infrastructure" tone="observed">
        {event.source?.ip ? (
          <>
            <Field label="Source network" mono>{event.source.cidr ?? event.source.ip}</Field>
            <Field label="Block representative" mono>
              {event.source.ip}
              <small className="field-note">(stands in for the listed range — not a confirmed single host)</small>
            </Field>
          </>
        ) : (
          <Field label="Source">Non-geographic record — no source IP in this feed</Field>
        )}
        {event.raw?.vendorProject && <Field label="Vendor / project">{event.raw.vendorProject}</Field>}
        {event.raw?.product && <Field label="Product">{event.raw.product}</Field>}
        {event.raw?.url && <Field label="Phishing URL" mono>{event.raw.url}</Field>}
        {event.raw?.domain && <Field label="Domain" mono>{event.raw.domain}</Field>}
        {event.raw?.vulnerabilityName && <Field label="Vulnerability">{event.raw.vulnerabilityName}</Field>}
        {event.raw?.requiredAction && <Field label="Required action">{event.raw.requiredAction}</Field>}
        <Field label="Country">{event.source?.country ?? "Not yet resolved"}</Field>
        <Field label="City">{event.source?.city ?? "—"}</Field>
        <Field label="ASN" mono>{event.source?.asn != null ? `AS${event.source.asn}` : "—"}</Field>
        <Field label="Organization">{event.source?.organization ?? "—"}</Field>
      </Section>

      <Section title="Destination" tone="destination">
        {event.destination?.ip ? (
          <>
            <Field label="Destination" mono>{event.destination.ip}</Field>
            <Field label="Country">{event.destination.country ?? "—"}</Field>
            <Field label="City">{event.destination.city ?? "—"}</Field>
            <Field label="ASN" mono>{event.destination.asn != null ? `AS${event.destination.asn}` : "—"}</Field>
            <Field label="Organization">{event.destination.organization ?? "—"}</Field>
          </>
        ) : (
          <Field label="Destination">Not observed — this source names no victim or target</Field>
        )}
      </Section>

      <Section title="Evidence — observed facts" tone="observed">
        <Field label="Observed markers">{observed.length ? observed.join(", ") : "—"}</Field>
        <Field label="Source record" mono>{event.sourceRecordId}</Field>
        <Field label="Coordinates" mono>
          {hasGeo(event.source)
            ? `${event.source.latitude.toFixed(3)}, ${event.source.longitude.toFixed(3)}`
            : "Pending"}
          <small className="field-note">(approximate — city/ISP level at best, never exact)</small>
        </Field>
      </Section>

      <Section title="Enrichment — approximate metadata" tone="enriched">
        <Field label="Inferred markers">{inferred.length ? inferred.join(", ") : "None — shown exactly as published"}</Field>
        <Field label="Country code" mono>{event.source?.countryCode ?? "—"}</Field>
        <Field label="Geolocation basis">Third-party GeoIP lookup in your browser (ipwho.is)</Field>
      </Section>

      <Section title="Assessment — what this proves" tone="inferred">
        <Field label="Proves">
          {isVuln
            ? "That this CVE is federally listed as exploited in the wild. It does not describe any specific attack event."
            : event.classification === "phishing"
              ? "That this URL appears in the OpenPhish community phishing feed. It is phishing intelligence, not a confirmed attack."
              : "That this network range appears on a public malicious-infrastructure blocklist."}
        </Field>
        <Field label="Does NOT prove">
          {isVuln
            ? "Any specific attack, victim, time, or targeting."
            : event.classification === "phishing"
              ? "Victims, clicks, credential theft, or targeting — only that the URL was reported as phishing."
              : "Victims, attack times, ports, payloads, or targets."}
        </Field>
      </Section>

      <Section title="Source — attribution" tone="observed">
        <Field label="Provider" mono>{event.sourceProvider}</Field>
        <Field label="Attribution">
          {event.sourceUrl ? <a href={event.sourceUrl} target="_blank" rel="noreferrer">Provider source ↗</a> : "—"}
        </Field>
      </Section>
    </div>
  );
}
