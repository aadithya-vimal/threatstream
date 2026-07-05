import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const PROVIDERS = [
  { id: 'vt',         name: 'VirusTotal',      status: 'active',    icon: '🛡' },
  { id: 'ha',         name: 'Hybrid Analysis', status: 'active',    icon: '🔬' },
  { id: 'anyrun',     name: 'Any.Run',          status: 'inactive',  icon: '▶' },
  { id: 'abuseipdb',  name: 'AbuseIPDB',        status: 'active',    icon: '🚫' },
  { id: 'greynoise',  name: 'GreyNoise',        status: 'active',    icon: '📡' },
  { id: 'shodan',     name: 'Shodan',           status: 'inactive',  icon: '🔍' },
  { id: 'censys',     name: 'Censys',           status: 'inactive',  icon: '📊' },
  { id: 'urlhaus',    name: 'URLHaus',          status: 'active',    icon: '🔗' },
  { id: 'otx',        name: 'OTX AlienVault',   status: 'active',    icon: '👽' },
  { id: 'misp',       name: 'MISP',             status: 'inactive',  icon: '🗂' },
  { id: 'opencti',    name: 'OpenCTI',          status: 'inactive',  icon: '🕸' },
];

const IOC_HISTORY = [
  { ioc: '185.220.101.47', type: 'IPv4',   providers: 6, verdict: 'malicious', confidence: 97, date: '2026-07-05 12:58', risk: 'critical' },
  { ioc: 'lockbit3ouvrn4ot.onion', type: 'Domain', providers: 5, verdict: 'malicious', confidence: 99, date: '2026-07-05 11:33', risk: 'critical' },
  { ioc: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', type: 'SHA256', providers: 4, verdict: 'malicious', confidence: 95, date: '2026-07-05 10:44', risk: 'critical' },
  { ioc: 'update-service.net', type: 'Domain', providers: 5, verdict: 'suspicious', confidence: 72, date: '2026-07-05 09:21', risk: 'high' },
  { ioc: '91.189.92.20', type: 'IPv4',   providers: 4, verdict: 'suspicious', confidence: 63, date: '2026-07-05 08:50', risk: 'high' },
  { ioc: 'b14a7b8059d9c055954c92674ce60032', type: 'MD5',    providers: 3, verdict: 'malicious', confidence: 88, date: '2026-07-04 22:14', risk: 'high' },
  { ioc: 'https://update-service.net/payload/stage2.exe', type: 'URL', providers: 5, verdict: 'malicious', confidence: 91, date: '2026-07-04 20:55', risk: 'critical' },
  { ioc: '45.33.32.156', type: 'IPv4',   providers: 3, verdict: 'suspicious', confidence: 54, date: '2026-07-04 18:40', risk: 'medium' },
  { ioc: 'analytics.supercleaner-api.com', type: 'Domain', providers: 4, verdict: 'suspicious', confidence: 68, date: '2026-07-04 16:22', risk: 'high' },
  { ioc: '098f6bcd4621d373cade4e832627b4f6', type: 'MD5',    providers: 3, verdict: 'malicious', confidence: 82, date: '2026-07-04 14:08', risk: 'high' },
];

const PROVIDER_RESULTS_MOCK = {
  vt:        { verdict: 'Malicious', confidence: 94, score: 78, findings: ['57/72 AV detections', 'C2 communication detected', 'Tor exit node confirmed', 'LockBit 3.0 family match'] },
  ha:        { verdict: 'Malicious', confidence: 91, score: 72, findings: ['Confirmed C2 server activity', 'High threat level', 'Associated with LockBit campaign', 'No sandbox evasion'] },
  abuseipdb: { verdict: 'Malicious', confidence: 97, score: 82, findings: ['Abuse confidence 97%', '1,284 abuse reports', 'Tor exit node', 'Last reported 2 hours ago'] },
  greynoise: { verdict: 'Malicious', confidence: 89, score: 65, findings: ['Internet scanner activity', 'Shodan crawler tag', 'Offensive tool activity', 'Seen in 47 countries'] },
  urlhaus:   { verdict: 'Malicious', confidence: 85, score: 70, findings: ['Active malware URL', 'Hosting LockBit payloads', 'First seen 14 days ago', 'Currently online'] },
  otx:       { verdict: 'Malicious', confidence: 92, score: 75, findings: ['Tagged in 8 threat pulses', 'LockBit 3.0 IoC', 'C2 infrastructure', 'APT group association'] },
};

const RELATED_IOCS = [
  { value: '185.220.101.48',  type: 'IPv4', rel: 'Same ASN', confidence: 87 },
  { value: '185.220.101.33',  type: 'IPv4', rel: 'Same /24 subnet', confidence: 82 },
  { value: 'lockbit3ouvrn4ot.onion', type: 'Domain', rel: 'C2 domain', confidence: 99 },
  { value: 'e3b0c44298fc1c...', type: 'SHA256', rel: 'Payload dropper', confidence: 95 },
  { value: 'update-service.net', type: 'Domain', rel: 'Stage 2 host', confidence: 72 },
];

const THREAT_ACTORS = [
  { name: 'LockBit Group', type: 'Ransomware TA', confidence: 93, origin: 'Russia/RaaS' },
  { name: 'UNC2165', type: 'Cybercrime', confidence: 68, origin: 'Unknown' },
];

const ENRICHMENT_TIMELINE = [
  { ts: '12:58', provider: 'VirusTotal', verdict: 'Malicious', ms: 842 },
  { ts: '12:58', provider: 'AbuseIPDB', verdict: 'Malicious', ms: 1102 },
  { ts: '12:58', provider: 'GreyNoise', verdict: 'Malicious', ms: 920 },
  { ts: '12:58', provider: 'OTX AlienVault', verdict: 'Malicious', ms: 1340 },
  { ts: '12:58', provider: 'Hybrid Analysis', verdict: 'Malicious', ms: 2104 },
  { ts: '12:58', provider: 'URLHaus', verdict: 'Malicious', ms: 750 },
];

// ─── Detect IOC type ──────────────────────────────────────────────────────────
function detectIOCType(value) {
  if (!value.trim()) return null;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value.trim())) return 'IPv4';
  if (/^[0-9a-fA-F]{64}$/.test(value.trim())) return 'SHA256';
  if (/^[0-9a-fA-F]{40}$/.test(value.trim())) return 'SHA1';
  if (/^[0-9a-fA-F]{32}$/.test(value.trim())) return 'MD5';
  if (/^https?:\/\//i.test(value.trim())) return 'URL';
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) return 'Domain';
  return 'Unknown';
}

// ─── Helper Components ────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const map = {
    malicious:  { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    suspicious: { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', border: 'rgba(234,179,8,0.3)' },
    clean:      { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    unknown:    { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
  };
  const c = map[verdict?.toLowerCase()] || map.unknown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.color }} />
      {verdict}
    </span>
  );
}

function RiskBadge({ risk }) {
  const map = {
    critical: { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
    high:     { bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
    medium:   { bg: 'rgba(234,179,8,0.1)',  color: '#eab308' },
    low:      { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  };
  const c = map[risk] || { bg: 'rgba(100,100,100,0.1)', color: '#9ca3af' };
  return <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color }}>{risk}</span>;
}

function TypeBadge({ type }) {
  const map = {
    IPv4:   { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
    Domain: { bg: 'rgba(139,92,246,0.1)',  color: '#8b5cf6' },
    SHA256: { bg: 'rgba(249,115,22,0.1)',  color: '#f97316' },
    MD5:    { bg: 'rgba(249,115,22,0.1)',  color: '#f97316' },
    SHA1:   { bg: 'rgba(249,115,22,0.1)',  color: '#f97316' },
    URL:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
    Unknown:{ bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' },
  };
  const c = map[type] || map.Unknown;
  return <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color }}>{type}</span>;
}

function ScoreRing({ score, label }) {
  const color = score >= 70 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 30 ? '#eab308' : '#10b981';
  const circ = 2 * Math.PI * 18;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 24 24)"
        />
        <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
      </svg>
      {label && <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>}
    </div>
  );
}

function ConfidenceBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', backgroundColor: color || '#3b82f6', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: color || '#3b82f6', width: 32 }}>{value}%</span>
    </div>
  );
}

const RESULT_TABS = ['Provider Results', 'Relationships', 'Timeline'];

// ─── Main Page ────────────────────────────────────────────────────────────────
export function IOCEnrichment() {
  const [iocInput, setIocInput] = useState('');
  const [detectedType, setDetectedType] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [resultTab, setResultTab] = useState('Provider Results');
  const [historyFilter, setHistoryFilter] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setDetectedType(detectIOCType(iocInput));
    setEnriched(false);
  }, [iocInput]);

  const handleEnrich = () => {
    if (!iocInput.trim()) return;
    setEnriching(true);
    setTimeout(() => { setEnriching(false); setEnriched(true); }, 1800);
  };

  const handleClear = () => {
    setIocInput('');
    setDetectedType(null);
    setEnriched(false);
    inputRef.current?.focus();
  };

  const filteredHistory = IOC_HISTORY.filter(h =>
    h.ioc.toLowerCase().includes(historyFilter.toLowerCase()) ||
    h.type.toLowerCase().includes(historyFilter.toLowerCase())
  );

  const activeProviders = PROVIDERS.filter(p => p.status === 'active');
  const inactiveProviders = PROVIDERS.filter(p => p.status === 'inactive');

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0 }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>IOC Enrichment</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Multi-source threat intelligence enrichment for IPs, domains, hashes, and URLs</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)', backgroundColor: 'var(--panel-bg)' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>{activeProviders.length}</span> active · <span style={{ color: 'var(--text-muted)' }}>{inactiveProviders.length}</span> not configured
            </div>
            <button style={{ padding: '7px 14px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 5, color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⚙ Configure Providers</button>
          </div>
        </div>

        {/* IOC Input Section */}
        <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={inputRef}
                value={iocInput}
                onChange={e => setIocInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnrich()}
                placeholder="Enter IP, domain, hash, or URL to enrich... (e.g. 185.220.101.47)"
                style={{ width: '100%', padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${iocInput ? 'rgba(59,130,246,0.4)' : 'var(--border-color)'}`, borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              />
              {detectedType && iocInput && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <TypeBadge type={detectedType} />
                </div>
              )}
            </div>
            <button
              onClick={handleEnrich}
              disabled={enriching || !iocInput.trim()}
              style={{ padding: '12px 24px', backgroundColor: enriching ? 'rgba(37,99,235,0.4)' : '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', opacity: !iocInput.trim() ? 0.5 : 1 }}
            >
              {enriching ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Enriching...</> : '⚡ Enrich'}
            </button>
            <button onClick={handleClear} style={{ padding: '12px 16px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>✕ Clear</button>
          </div>

          {/* Provider Status Grid */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Provider Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PROVIDERS.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 5, border: `1px solid ${p.status === 'active' ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`, backgroundColor: p.status === 'active' ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.15)' }}>
                  <span style={{ fontSize: 13 }}>{p.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: p.status === 'active' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: p.status === 'active' ? '#10b981' : '#f97316' }}>{p.status === 'active' ? '✅' : '⚠️'}</span>
                  <span style={{ fontSize: 9, color: p.status === 'active' ? '#10b981' : '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{p.status === 'active' ? 'Active' : 'Not Configured'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>

          {/* LEFT – Results Section */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Enrichment Results */}
            {(enriched || enriching) && (
              <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                {/* Aggregate verdict */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Aggregate Verdict — {iocInput}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <VerdictBadge verdict="Malicious" />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{activeProviders.length}/{activeProviders.length} providers agree · Confidence 93%</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <ScoreRing score={78} label="Risk Score" />
                </div>

                {/* Result tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                  {RESULT_TABS.map(tab => (
                    <button key={tab} onClick={() => setResultTab(tab)} style={{ padding: '9px 18px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: resultTab === tab ? '2px solid #3b82f6' : '2px solid transparent', color: resultTab === tab ? '#3b82f6' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                      {tab}
                    </button>
                  ))}
                </div>

                <div style={{ padding: 16, overflowY: 'auto', maxHeight: 320 }}>
                  {enriching && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {activeProviders.map((p, i) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 18 }}>{p.icon}</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                          <div style={{ width: 80, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', backgroundColor: '#3b82f6', borderRadius: 3, width: `${Math.min(100, (Date.now() % 1000) / 10)}%`, animation: 'none' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Querying...</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {enriched && resultTab === 'Provider Results' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {activeProviders.map(p => {
                        const res = PROVIDER_RESULTS_MOCK[p.id] || { verdict: 'Malicious', confidence: 85, score: 68, findings: ['Threat identified', 'Active at time of query'] };
                        const color = res.verdict === 'Malicious' ? '#ef4444' : res.verdict === 'Suspicious' ? '#eab308' : '#10b981';
                        return (
                          <div key={p.id} style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 14, border: `1px solid ${color}20` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <span style={{ fontSize: 16 }}>{p.icon}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{p.name}</span>
                              <VerdictBadge verdict={res.verdict} />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Confidence</div>
                              <ConfidenceBar value={res.confidence} color={color} />
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 14 }}>
                              {res.findings.map((f, i) => <li key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{f}</li>)}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {enriched && resultTab === 'Relationships' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Related IOCs</div>
                        {RELATED_IOCS.map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <TypeBadge type={r.type} />
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-primary)', flex: 1 }}>{r.value}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.rel}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#eab308' }}>{r.confidence}%</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Threat Actors</div>
                        {THREAT_ACTORS.map((a, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: 5, border: '1px solid rgba(239,68,68,0.1)', marginBottom: 6 }}>
                            <span style={{ fontSize: 16 }}>🎭</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{a.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.type} · Origin: {a.origin}</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{a.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {enriched && resultTab === 'Timeline' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Enrichment query timeline — all {activeProviders.length} active providers queried simultaneously</div>
                      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', height: 60, padding: '0 4px', borderBottom: '1px solid var(--border-color)' }}>
                        {ENRICHMENT_TIMELINE.map((e, i) => (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: '60%', backgroundColor: '#3b82f6', borderRadius: '2px 2px 0 0', height: Math.min(56, (e.ms / 2500) * 56) }} title={`${e.ms}ms`} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 0 }}>
                        {ENRICHMENT_TIMELINE.map((e, i) => (
                          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text-muted)' }}>{e.provider.split(' ')[0]}</div>
                        ))}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        {ENRICHMENT_TIMELINE.map((e, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{e.provider}</span>
                            <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{e.ms}ms</span>
                            <VerdictBadge verdict={e.verdict} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IOC History Table */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrichment History</span>
                <span style={{ flex: 1 }} />
                <input
                  value={historyFilter}
                  onChange={e => setHistoryFilter(e.target.value)}
                  placeholder="Filter..."
                  style={{ padding: '5px 10px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 11, outline: 'none', width: 160 }}
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                      {['IOC Value', 'Type', 'Providers', 'Verdict', 'Confidence', 'Risk', 'Date'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                        <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ioc}</td>
                        <td style={{ padding: '9px 14px' }}><TypeBadge type={row.type} /></td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', textAlign: 'center' }}>{row.providers}</td>
                        <td style={{ padding: '9px 14px' }}><VerdictBadge verdict={row.verdict} /></td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 50, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${row.confidence}%`, height: '100%', backgroundColor: row.confidence >= 80 ? '#ef4444' : '#eab308' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{row.confidence}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 14px' }}><RiskBadge risk={row.risk} /></td>
                        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR – Stats */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Today's Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Enrichments', 47, '#3b82f6'], ['Malicious', 31, '#ef4444'], ['Suspicious', 9, '#eab308'], ['Clean', 7, '#10b981'], ['Avg Response', '1.2s', '#8b5cf6']].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>IOC Type Distribution</div>
              {[['IPv4', 18, '#3b82f6'], ['Domain', 12, '#8b5cf6'], ['SHA256', 9, '#f97316'], ['URL', 5, '#ef4444'], ['MD5', 3, '#eab308']].map(([type, count, color]) => (
                <div key={type} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{type}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{count}</span>
                  </div>
                  <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / 18) * 100}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Top Threat Actors</div>
              {[['LockBit Group', 14, '#ef4444'], ['Emotet TA', 8, '#f97316'], ['APT29', 5, '#8b5cf6'], ['UNC2165', 3, '#eab308']].map(([name, count, color]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default IOCEnrichment;
