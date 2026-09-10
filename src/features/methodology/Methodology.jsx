import React from "react";
import { DISABLED_PROVIDERS } from "../../lib/providers/disabled.js";
import { Panel } from "../../components/ui/Primitives.jsx";

export default function Methodology() {
  return (
    <div className="methodology">
      <h1>Methodology &amp; Transparency</h1>
      <p className="lede">
        ThreatStream shows only what its sources actually state. This page documents every
        source, every transformation, and every limitation — so any claim on the globe can
        be traced back to evidence.
      </p>

      <Panel title="1 · Where data comes from">
        <h3>Spamhaus DROP via FireHOL mirror</h3>
        <p>
          The <strong>Spamhaus Don't Route Or Peer (DROP) list</strong> names network ranges
          under the control of spammers or hijacked infrastructure. ThreatStream fetches the
          FireHOL-maintained mirror (<span className="mono">spamhaus_drop.netset</span>) from{" "}
          <span className="mono">raw.githubusercontent.com</span> — public, keyless, and
          browser-fetchable. Each CIDR becomes one source-only observation; the file's own{" "}
          <em>Source File Date</em> header becomes each event's timestamp, labeled as a{" "}
          <strong>list-publication time</strong>, never an attack time.
        </p>
        <h3>CISA Known Exploited Vulnerabilities (KEV)</h3>
        <p>
          The <strong>CISA KEV catalog</strong> lists CVEs confirmed exploited in the wild,
          with affected products and remediation due dates. It contains no IPs and no
          geography, so KEV events are <strong>non-geographic by design</strong>: full feed,
          filter, and statistics coverage, zero globe markers.
        </p>
        <h3>Disabled sources</h3>
        <ul>
          {DISABLED_PROVIDERS.map((d) => (
            <li key={d.id}>
              <strong>{d.name}</strong> — {d.reason}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="2 · What each record represents">
        <p>
          A DROP observation proves exactly one thing: <em>this range appears on a public
          malicious-infrastructure blocklist</em>. It does not name victims, attack times,
          ports, payloads, or targets. A KEV record proves a CVE is federally listed as
          exploited — not that any specific attack occurred. The UI labels these{" "}
          <strong>source intel</strong> and <strong>intel record</strong> respectively, and
          the globe renders source-only markers (●), never destinations.
        </p>
      </Panel>

      <Panel title="3 · Observed vs inferred vs enriched">
        <ul>
          <li><strong>Observed</strong> — stated directly by the provider (blocklist membership, CVE fields, list dates).</li>
          <li><strong>Enriched</strong> — approximate IP metadata (country, city, ASN, organization, coarse coordinates) resolved in-browser via the keyless ipwho.is service.</li>
          <li><strong>Inferred</strong> — currently only the <span className="mono">geolocation_approximate</span> marker. ThreatStream performs no other inference: no victim guessing, no attack-path fabrication, no severity invention.</li>
        </ul>
        <p>Every event detail panel separates these three classes under explicit headings.</p>
      </Panel>

      <Panel title="4 · How IP geolocation works (and why it is approximate)">
        <p>
          Each listed CIDR contributes its <strong>network address as a block
          representative</strong> — a stand-in for the range, not a confirmed malicious
          host. Representatives are resolved to country/city/ASN via ipwho.is lookups that
          run in your browser against public GeoIP databases. GeoIP maps infrastructure
          registration, not physical machines: accuracy is city/ISP level at best. Failed
          or unresolvable lookups leave coordinates <strong>null</strong> — the event stays
          in the feed and statistics but never appears on the globe. Coordinates of{" "}
          <span className="mono">0, 0</span> are rejected outright.
        </p>
      </Panel>

      <Panel title="5 · Confidence, timestamps, deduplication">
        <ul>
          <li><strong>Confidence high</strong> on both live providers reflects authoritative publishers (Spamhaus, CISA) — not per-event verification.</li>
          <li><strong>Timestamps</strong> are labeled by kind: provider publication (KEV <span className="mono">dateAdded</span>), list publication (DROP file date), or receipt time. None is an attack time.</li>
          <li><strong>Deduplication</strong> keys on provider + record + timestamp, so unchanged refresh data merges silently instead of appearing as new attacks. Counters of added/updated are real.</li>
          <li><strong>Refresh</strong> re-fetches provider data every 10 minutes (pausing while the tab is hidden). “Updated N seconds ago” reflects the last real fetch.</li>
        </ul>
      </Panel>

      <Panel title="6 · Provider limitations & known constraints">
        <ul>
          <li>DROP covers listed ranges only — absence from the list proves nothing about an address.</li>
          <li>Only the first ~140 subnets per cycle enter the pipeline and at most ~25 new geolocation lookups run per cycle (free-tier protection); the remainder wait honestly as “pending”.</li>
          <li>KEV has no severity field — severity stays <strong>unknown</strong> rather than guessed.</li>
          <li>abuse.ch feeds (URLhaus, ThreatFox, Feodo) now require personal Auth-Keys and are therefore disabled in this keyless frontend.</li>
          <li>All state is in-memory: refresh resets everything. No accounts, no storage, no tracking.</li>
        </ul>
      </Panel>
    </div>
  );
}
