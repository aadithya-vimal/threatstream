import React from "react";
import { DISABLED_PROVIDERS, UNAVAILABLE_PROVIDERS } from "../../lib/providers/disabled.js";
import { Panel } from "../../components/ui/Primitives.jsx";

const SECTIONS = [
  ["what", "What ThreatStream is"],
  ["sources", "Data sources"],
  ["classes", "Observed vs enriched vs inferred"],
  ["geo", "IP geolocation"],
  ["attribution", "Source attribution"],
  ["dedup", "Event deduplication"],
  ["refresh", "Refresh model"],
  ["limits", "Source limitations"],
  ["privacy", "Privacy"],
  ["notclaims", "What ThreatStream does NOT claim"],
  ["retention", "No persistence · No accounts"],
];

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
        <ul className="toc">
          {SECTIONS.map(([id, label]) => (
            <li key={id}><a href={`#m-${id}`}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <Panel title="What ThreatStream is">
        <p id="m-what">
          A <strong>frontend-only</strong> threat-observation viewer. It fetches public
          blocklist data in your browser, normalizes it into attributed observations,
          enriches approximate geography, and renders it on a 3D globe with a live feed,
          filters, statistics, and per-event inspection. There is no backend, no database,
          no account system, and no stored history.
        </p>
      </Panel>

      <Panel title="Data sources">
        <div id="m-sources">
          <h3>Live: Spamhaus DROP via FireHOL mirror</h3>
          <p>
            The <strong>Spamhaus Don&apos;t Route Or Peer (DROP) list</strong> names network ranges
            under the control of spammers or hijacked infrastructure. ThreatStream fetches the
            FireHOL-maintained mirror (<span className="mono">spamhaus_drop.netset</span>) from{" "}
            <span className="mono">raw.githubusercontent.com</span> — public, keyless, and
            CORS-compatible. Each CIDR becomes one source-only observation; the file&apos;s own{" "}
            <em>Source File Date</em> header becomes each event&apos;s timestamp, labeled as a{" "}
            <strong>list-publication time</strong>, never an attack time. Origin refresh ~12h;
            polled every 10 min.
          </p>
          <h3>Live: DShield (SANS) via FireHOL mirror</h3>
          <p>
            The SANS Internet Storm Center <strong>DShield block list</strong> names the top
            ~20 attacking /24 subnets its sensors saw over the last three days
            (maintainer Category: attacks, ~10 min file refresh). ThreatStream fetches the
            FireHOL mirror (<span className="mono">dshield.netset</span>); FireHOL is only
            the CORS-compatible mirror — attribution names SANS DShield as the origin
            (<span className="mono">dshield.org</span>). Recent attack sources, still
            source-only: no victims, no per-event times. Polled every 10 min.
          </p>
          <h3>Live: ISC Attack Sources (SANS, direct API)</h3>
          <p>
            The SANS Internet Storm Center <strong>sources API</strong> reports attacker
            source IPs its sensors observed, with per-record attack counts and{" "}
            <strong>first/last seen dates</strong> — genuine source observation times
            (labeled <span className="mono">observed</span>), the only per-record event
            times any live source provides. Still source-only: the API publishes no
            victim IPs, so no arcs are drawn. Polled every 30 min.
          </p>
          <h3>Live: OpenPhish Community Feed</h3>
          <p>
            The <strong>OpenPhish community feed</strong> publishes reported phishing URLs
            (one per line). ThreatStream fetches OpenPhish&apos;s own raw GitHub mirror
            directly (CORS-compatible) — phishing intelligence, <strong>not</strong> attack
            telemetry and <strong>not</strong> geographic: URLs carry no IPs and no
            timestamps, so records appear in feed/stats only, never as globe markers.
            Timestamps stay <span className="mono">null</span> with kind{" "}
            <span className="mono">received</span>. Polled every 30 min.
          </p>
          <h3>Live: CISA KEV via official GitHub mirror</h3>
          <p>
            The <strong>CISA Known Exploited Vulnerabilities catalog</strong> lists CVEs
            confirmed exploited in the wild. The canonical cisa.gov endpoint sends no CORS
            headers and is unusable from browsers — so ThreatStream fetches the official
            CISA-maintained mirror (<span className="mono">cisagov/kev-data</span>), verified
            identical in shape (same catalogVersion/count). Vulnerability intelligence:
            non-geographic by design, severity stays{" "}
            <span className="mono">unknown</span> (the catalog has no severity field).
            Updated weekdays on catalog change; polled every 60 min.
          </p>
          <h3>Enrichment: keyless in-browser GeoIP (ipwho.is → ipwhois.app)</h3>
          <p>
            Block representatives are resolved to country/city/ASN/organization/coarse
            coordinates via free keyless services (primary ipwho.is, fallback ipwhois.app),
            at most ~30 new lookups per cycle with bounded concurrency, cached in-memory.
            Failures stay <span className="mono">null</span> (“pending”), retry automatically
            after a backoff window, and are counted in the Source-health diagnostics —
            coordinates are never invented.
          </p>
          <h3>Unavailable: Feodo Tracker</h3>
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
          <h3>Unavailable (not browser-compatible)</h3>
          <ul>
            {UNAVAILABLE_PROVIDERS.map((d) => (
              <li key={d.id}><strong>{d.name}</strong> — {d.reason}</li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Observed vs enriched vs inferred">
        <div id="m-classes">
          <ul>
            <li><strong>Observed</strong> — stated directly by the provider (blocklist membership, list dates).</li>
            <li><strong>Enriched</strong> — approximate IP metadata (country, city, ASN, organization, coarse coordinates) resolved in-browser via keyless GeoIP services.</li>
            <li><strong>Inferred</strong> — currently only the <span className="mono">geolocation_approximate</span> marker. No victim guessing, no attack-path fabrication, no severity invention.</li>
          </ul>
          <p>Every event detail panel separates these classes under explicit headings.</p>
        </div>
      </Panel>

      <Panel title="IP geolocation">
        <p id="m-geo">
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

      <Panel title="Source attribution">
        <p id="m-attribution">
          Every event carries its provider id, source record id, and a link to the
          provider origin. Feed rows, detail panels, and the source-health list all surface
          attribution; nothing is shown without naming where it came from.
        </p>
      </Panel>

      <Panel title="Event deduplication">
        <p id="m-dedup">
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

      <Panel title="Refresh model">
        <p id="m-refresh">
          Each source re-fetches on <strong>its own cadence</strong> (DROP/DShield every
          10 min, OpenPhish every 30 min, KEV every 60 min; a 60-second scheduler checks
          what is due), pausing while the tab is hidden and refetching due sources when
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

      <Panel title="Source limitations">
        <div id="m-limits">
          <ul>
            <li>DROP covers listed ranges only — absence from the list proves nothing about an address.</li>
            <li>Only the first ~140 DROP subnets per cycle enter the pipeline; the rest wait honestly as pending. DShield&apos;s feed is natively tiny (~20).</li>
            <li>OpenPhish URLs carry no timestamps — records show “unknown” time rather than a stamped fetch time that would fake novelty.</li>
            <li>KEV comes from the official GitHub mirror (verified identical); the canonical endpoint stays CORS-blocked.</li>
            <li>No provider currently supplies victim destinations — the globe shows source markers, and the UI says there are zero confirmed paths rather than drawing arcs. Investigated 2026-09-10: ISC&apos;s API exposes sources + counts only (per-IP detail returns no victim data); Feodo&apos;s endpoint is CORS-blocked. No keyless browser-compatible victim-endpoint feed was found.</li>
            <li>Arrivals fade in with rings, removals fade out after a short grace window, changes pulse — all driven by real snapshot diffs. Unchanged markers stay still; there is no replay, no scrubbing, no simulated traffic.</li>
            <li>abuse.ch feeds (URLhaus, ThreatFox) require personal Auth-Keys; Feodo&apos;s endpoint is CORS-blocked and stale — all stay out of the live path.</li>
          </ul>
        </div>
      </Panel>

      <Panel title="Privacy">
        <p id="m-privacy">
          All fetching and enrichment happen in your browser against public endpoints.
          ThreatStream sets no cookies, uses no browser storage, creates no account, and
          sends your activity nowhere — there is no server to send it to.
        </p>
      </Panel>

      <Panel title="What ThreatStream does NOT claim">
        <div id="m-notclaims">
          <ul>
            <li>No “Country A attacked Country B” — sources name blocklisted infrastructure, not victims.</li>
            <li>No exact attacker locations — geolocation is approximate infrastructure metadata.</li>
            <li>No attack times — timestamps are list-publication or receipt times, labeled as such.</li>
            <li>No victim, port, payload, or breach claims of any kind.</li>
          </ul>
        </div>
      </Panel>

      <Panel title="No persistence · No accounts">
        <p id="m-retention">
          All state is <strong>in-memory</strong>: a full page refresh intentionally resets
          the session. No localStorage, sessionStorage, IndexedDB, cookies, or server
          storage is used. No login, no workspace, no tracking.
        </p>
      </Panel>
    </div>
  );
}
