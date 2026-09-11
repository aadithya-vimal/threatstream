import React from "react";
import { DISABLED_PROVIDERS, UNAVAILABLE_PROVIDERS } from "../../lib/providers/disabled.js";
import { Panel } from "../../components/ui/Primitives.jsx";

const SECTIONS = [
  ["m-what", "What ThreatStream is"],
  ["m-sources", "Live sources"],
  ["m-coverage", "Coverage notes"],
  ["m-classes", "Observed vs enriched vs inferred"],
  ["m-geo", "IP geolocation"],
  ["m-attribution", "Source attribution"],
  ["m-dedup", "Event deduplication"],
  ["m-refresh", "Refresh model"],
  ["m-limits", "Source limitations"],
  ["m-privacy", "Privacy"],
  ["m-notclaims", "What ThreatStream does NOT claim"],
  ["m-retention", "Session model"],
];

function SourceDef({ name, status, statusTone, children }) {
  return (
    <>
      <dt>
        {name} <span className={`badge badge-${statusTone}`}>{status}</span>
      </dt>
      <dd>{children}</dd>
    </>
  );
}

export default function Methodology() {
  return (
    <div className="methodology">
      <p className="eyebrow">Methodology &amp; transparency</p>
      <h1>How ThreatStream stays honest</h1>
      <p className="lede">
        ThreatStream shows only what its sources actually state. This page documents every
        source, every transformation, and every limitation — so any claim on the globe can
        be traced back to evidence.
      </p>
      <nav aria-label="Methodology sections">
        <ol className="toc">
          {SECTIONS.map(([id, label]) => (
            <li key={id}><a href={`#${id}`}>{label}</a></li>
          ))}
        </ol>
      </nav>

      <Panel id="m-what" title="01 · What ThreatStream is">
        <p>
          ThreatStream is a live cyber-threat-intelligence monitor. It acquires
          supported public intelligence directly from configured source endpoints,
          normalizes it into an attributed analytical model, enriches approximate
          geography, and presents it as an operational global view with a live feed,
          filters, statistics, and event-level inspection.
        </p>
      </Panel>

      <Panel id="m-sources" title="02 · Live sources">
        <dl className="source-defs">
          <SourceDef name="Spamhaus DROP · FireHOL mirror" status="Live" statusTone="success">
            Network ranges under the control of spammers or hijacked infrastructure. Each
            CIDR becomes one source-only observation; the file&apos;s own{" "}
            <em>Source File Date</em> header becomes each event&apos;s timestamp, labeled as a{" "}
            <strong>list-publication time</strong>, never an attack time. Origin refresh ~12h;
            Polled every 20 sec.
          </SourceDef>
          <SourceDef name="DShield (SANS) · FireHOL mirror" status="Live" statusTone="success">
            The top ~20 attacking /24 subnets SANS sensors saw over the last three days
            (maintainer Category: attacks, ~10 min file refresh). FireHOL is only the
            CORS-compatible mirror — attribution names SANS DShield as the origin.
            Recent attack sources, still source-only: no victims, no per-event times.
            Polled every 20 sec.
          </SourceDef>
          <SourceDef name="ISC Attack Sources (SANS, direct API)" status="Live" statusTone="success">
            Attacker source IPs its sensors observed, with per-record attack counts and{" "}
            <strong>first/last seen dates</strong> — genuine source observation times
            (labeled <span className="mono">observed</span>), the only per-record event
            times any live source provides. Still source-only: the API publishes no
            victim IPs, so no arcs are drawn. Polled every 20 sec.
          </SourceDef>
          <SourceDef name="OpenPhish Community Feed" status="Live" statusTone="success">
            Reported phishing URLs (one per line) via OpenPhish&apos;s own raw GitHub
            mirror. Phishing intelligence, <strong>not</strong> attack telemetry and{" "}
            <strong>not</strong> geographic: URLs carry no IPs and no timestamps, so records
            appear in feed/stats only, never as globe markers. Timestamps stay{" "}
            <span className="mono">null</span> with kind <span className="mono">received</span>.
            Polled every 20 sec.
          </SourceDef>
          <SourceDef name="CISA KEV · official GitHub mirror" status="Live" statusTone="success">
            CVEs confirmed exploited in the wild. The canonical cisa.gov endpoint sends no
            CORS headers and is unusable from browsers — so ThreatStream fetches the official
            CISA-maintained mirror (<span className="mono">cisagov/kev-data</span>), verified
            identical in shape. Non-geographic by design, severity stays{" "}
            <span className="mono">unknown</span>. Updated weekdays; polled every 20 sec.
          </SourceDef>
          <SourceDef name="GeoIP enrichment · ipwho.is → ipwhois.app" status="Enrichment" statusTone="info">
            Block representatives resolved to country/city/ASN/organization/coarse
            coordinates via free keyless services, at most ~30 new lookups per cycle with
            bounded concurrency, cached in-memory. Failures stay{" "}
            <span className="mono">null</span> (“pending”), retry automatically after a
            backoff window, and are counted in diagnostics — coordinates are never invented.
          </SourceDef>
        </dl>
      </Panel>

      <Panel id="m-coverage" title="03 · Coverage notes">
        <h3>Unavailable (not browser-compatible)</h3>
        <ul>
          {UNAVAILABLE_PROVIDERS.map((d) => (
            <li key={d.id}><strong>{d.name}</strong> — {d.reason}</li>
          ))}
        </ul>
        <p>
          Feodo Tracker publishes a botnet-C2 blocklist, but its download endpoint sends
          no CORS headers (verified 2026-09-10), so browsers block the fetch; the public
          list was also stale-dated with 5 entries at verification time, and API access
          now requires a personal Auth-Key. ThreatStream lists it as{" "}
          <strong>unavailable</strong> rather than pretending it loads.
        </p>
        <h3>Disabled (secret keys required)</h3>
        <ul>
          {DISABLED_PROVIDERS.map((d) => (
            <li key={d.id}><strong>{d.name}</strong> — {d.reason}</li>
          ))}
        </ul>
      </Panel>

      <Panel id="m-classes" title="04 · Observed vs enriched vs inferred">
        <ul>
          <li><strong>Observed</strong> — stated directly by the provider (blocklist membership, list dates).</li>
          <li><strong>Enriched</strong> — approximate IP metadata (country, city, ASN, organization, coarse coordinates) resolved in-browser via keyless GeoIP services.</li>
          <li><strong>Inferred</strong> — currently only the <span className="mono">geolocation_approximate</span> marker. No victim guessing, no attack-path fabrication, no severity invention.</li>
        </ul>
        <p>Every event detail panel separates these classes under explicit headings.</p>
      </Panel>

      <Panel id="m-geo" title="05 · IP geolocation">
        <p>
          Each listed CIDR contributes its <strong>network address as a block
          representative</strong> — a stand-in for the range, not a confirmed malicious
          host. GeoIP maps infrastructure registration, not physical machines: accuracy is
          city/ISP level at best. Country/city metadata is enrichment,{" "}
          <strong>not proof of a human attacker</strong>, and never implies an exact
          physical or headquarters location. Unresolvable lookups leave coordinates{" "}
          <strong>null</strong> — the event stays in feed and statistics but never appears
          on the globe, and the enrichment diagnostics say exactly how many lookups were
          attempted, resolved, and failed. Coordinates of <span className="mono">0, 0</span> are rejected outright.
          Private, reserved, documentation, and malformed addresses are never queried.
        </p>
      </Panel>

      <Panel id="m-attribution" title="06 · Source attribution">
        <p>
          Every event carries its provider id, source record id, and a link to the
          provider origin. Feed rows, detail panels, and the source-health list all surface
          attribution; nothing is shown without naming where it came from.
        </p>
      </Panel>

      <Panel id="m-dedup" title="07 · Event deduplication">
        <p>
          Events key on stable provider-derived ids (<span className="mono">provider:record</span>),
          so unchanged refresh data merges silently instead of appearing as new attacks —
          even when a feed republishes with a new file date. Each cycle diffs the live
          snapshot by id membership (<span className="mono">+added −removed ~unchanged</span>)
          and reports the real counts; records a source drops leave the in-memory window
          after a short fade-out grace period.
          Enrichment merges preservingly: a refresh payload without geography never wipes
          previously resolved coordinates.
        </p>
      </Panel>

      <Panel id="m-refresh" title="08 · Refresh model">
        <p>
          Each source re-fetches on a <strong>~20-second heartbeat</strong> (a 5-second scheduler checks what is due), pausing while the tab is hidden and refetching due sources when
          you return. “Updated N seconds ago” reflects the last real client fetch — kept
          distinct from the <strong>source-update time</strong> (e.g. a feed&apos;s file
          date), which is shown separately in Source health. If nothing changed, the UI
          says so — it never simulates traffic to look busy. The ingest board counts
          down each source&apos;s next check (<span className="mono">mm:ss</span>, UI time
          from last attempt + cadence) so quiet periods are visibly alive.
        </p>
        <p>
          Between provider cycles the app progressively enriches the remaining
          backlog in small bounded idle batches (cache makes repeats free) — real
          acquisition that grows geolocated/ASN coverage over time without hammering
          free GeoIP tiers.
        </p>
        <p>
          <strong>LIVE</strong> means at least one enabled provider completed a successful
          fetch within its expected freshness window — <strong>not</strong> “a new attack
          every second”. Most public feeds change over minutes to days, so long quiet
          stretches with “No feed changes” are normal and honest.{" "}
          <strong>DEGRADED</strong> means some providers are healthy while others failed
          or went stale; <strong>OFFLINE</strong> means no enabled provider has a recent
          successful fetch.
        </p>
      </Panel>

      <Panel id="m-limits" title="09 · Source limitations">
        <ul>
          <li>DROP covers listed ranges only — absence from the list proves nothing about an address.</li>
          <li>Only the first ~140 DROP subnets per cycle enter the pipeline; the rest wait honestly as pending. DShield&apos;s feed is natively tiny (~20).</li>
          <li>OpenPhish URLs carry no timestamps — records show “unknown” time rather than a stamped fetch time that would fake novelty.</li>
          <li>KEV comes from the official GitHub mirror (verified identical); the canonical endpoint stays CORS-blocked.</li>
          <li>No provider currently supplies victim destinations — the globe shows source markers, and the UI says there are zero confirmed paths rather than drawing arcs. Investigated 2026-09-10: ISC&apos;s API exposes sources + counts only (per-IP detail returns no victim data); Feodo&apos;s endpoint is CORS-blocked. No keyless browser-compatible victim-endpoint feed was found.</li>
          <li>Arrivals fade in with rings, removals fade out after a short grace window, changes pulse — all driven by real snapshot diffs. Unchanged markers stay still; there is no replay, no scrubbing, no simulated traffic.</li>
          <li>abuse.ch feeds (URLhaus, ThreatFox) require personal Auth-Keys; Feodo&apos;s endpoint is CORS-blocked and stale — all stay out of the live path.</li>
        </ul>
      </Panel>

      <Panel id="m-notclaims" title="10 · What ThreatStream does NOT claim">
        <ul>
          <li>No “Country A attacked Country B” — sources name blocklisted infrastructure, not victims.</li>
          <li>No exact attacker locations — geolocation is approximate infrastructure metadata.</li>
          <li>No attack times — timestamps are list-publication, observation, or receipt times, labeled as such.</li>
          <li>No victim, port, payload, or breach claims of any kind.</li>
        </ul>
      </Panel>

      <Panel id="m-privacy" title="11 · Privacy">
        <p>
          All fetching and enrichment run against public endpoints from your own
          session. ThreatStream creates no account, stores no personal data, and
          performs no cross-session tracking.
        </p>
      </Panel>

      <Panel id="m-retention" title="12 · Session model">
        <p>
          The monitor presents the <strong>active intelligence snapshot</strong>,
          refreshed continuously from upstream providers. State is held for the
          current session only — returning later re-acquires the latest data
          rather than replaying stored history.
        </p>
      </Panel>
    </div>
  );
}

