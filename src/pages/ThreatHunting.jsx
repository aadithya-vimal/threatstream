import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const SAVED_HUNTS = [
  { id: 1, name: 'LockBit Lateral Movement', analyst: 'J. Nakamura', results: 47, status: 'Active', bookmarked: true, lastRun: '2026-07-05 12:44' },
  { id: 2, name: 'Credential Harvesting via LSASS', analyst: 'A. Torres', results: 213, status: 'Completed', bookmarked: true, lastRun: '2026-07-05 10:12' },
  { id: 3, name: 'C2 Beaconing Pattern', analyst: 'R. Chen', results: 8, status: 'Active', bookmarked: false, lastRun: '2026-07-05 13:01' },
  { id: 4, name: 'PowerShell Obfuscation Hunt', analyst: 'M. Singh', results: 124, status: 'Completed', bookmarked: true, lastRun: '2026-07-04 18:35' },
  { id: 5, name: 'Data Exfiltration via DNS', analyst: 'K. Okafor', results: 0, status: 'Draft', bookmarked: false, lastRun: 'Never' },
];

const RECENT_SEARCHES = [
  { query: 'process.name == "lsass.exe" AND event.action == "network-connection"', ts: '13:01' },
  { query: 'destination.port IN (4444, 1337, 8080) AND network.direction == "outbound"', ts: '12:47' },
  { query: 'event.category == "authentication" AND event.outcome == "failure" | stats count by source.ip', ts: '12:33' },
  { query: 'process.name == "powershell.exe" AND process.args contains "-enc"', ts: '11:58' },
  { query: 'file.path matches "*\\\\AppData\\\\Roaming\\\\*.exe"', ts: '11:42' },
  { query: 'network.protocol == "dns" AND dns.question.name matches "*.*.*.onion"', ts: '11:15' },
  { query: 'registry.path contains "CurrentVersion\\\\Run"', ts: '10:50' },
  { query: 'process.parent.name == "winword.exe" AND process.name == "cmd.exe"', ts: '10:22' },
  { query: 'event.action == "scheduled-task-created" AND NOT user.name == "SYSTEM"', ts: '09:47' },
  { query: 'network.bytes_sent > 10000000 AND network.direction == "outbound"', ts: '09:12' },
];

const HUNT_RESULTS = [
  { ts: '2026-07-05 12:58:32', host: 'WIN-CORP-014', process: 'lsass.exe', user: 'SYSTEM', action: 'network-connection', src_ip: '10.0.14.21', dst_ip: '185.220.101.47', risk: 'critical' },
  { ts: '2026-07-05 12:57:44', host: 'WIN-CORP-014', process: 'cmd.exe', user: 'jsmith', action: 'process-spawned', src_ip: '10.0.14.21', dst_ip: '–', risk: 'high' },
  { ts: '2026-07-05 12:55:11', host: 'WIN-FS-002', process: 'net.exe', user: 'jsmith', action: 'smb-connect', src_ip: '10.0.14.21', dst_ip: '10.0.2.5', risk: 'high' },
  { ts: '2026-07-05 12:54:03', host: 'WIN-CORP-008', process: 'powershell.exe', user: 'akhan', action: 'script-executed', src_ip: '10.0.8.32', dst_ip: '–', risk: 'high' },
  { ts: '2026-07-05 12:52:49', host: 'WIN-CORP-022', process: 'mshta.exe', user: 'lrodriguez', action: 'download', src_ip: '10.0.22.15', dst_ip: '91.189.92.20', risk: 'critical' },
  { ts: '2026-07-05 12:51:27', host: 'WIN-DC-001', process: 'wmic.exe', user: 'domain_admin', action: 'remote-exec', src_ip: '10.0.1.10', dst_ip: '10.0.14.21', risk: 'critical' },
  { ts: '2026-07-05 12:49:00', host: 'WIN-CORP-031', process: 'certutil.exe', user: 'tpark', action: 'download-decode', src_ip: '10.0.31.88', dst_ip: '45.33.32.156', risk: 'high' },
  { ts: '2026-07-05 12:46:15', host: 'WIN-CORP-014', process: 'rundll32.exe', user: 'jsmith', action: 'dll-exec', src_ip: '10.0.14.21', dst_ip: '185.220.101.47', risk: 'critical' },
  { ts: '2026-07-05 12:44:38', host: 'LNX-WEB-003', process: 'bash', user: 'www-data', action: 'reverse-shell', src_ip: '10.0.50.3', dst_ip: '185.220.101.48', risk: 'critical' },
  { ts: '2026-07-05 12:43:11', host: 'WIN-CORP-008', process: 'svchost.exe', user: 'SYSTEM', action: 'dns-query', src_ip: '10.0.8.32', dst_ip: '8.8.8.8', risk: 'medium' },
  { ts: '2026-07-05 12:41:55', host: 'WIN-CORP-017', process: 'explorer.exe', user: 'mtanaka', action: 'file-write', src_ip: '10.0.17.44', dst_ip: '–', risk: 'medium' },
  { ts: '2026-07-05 12:39:28', host: 'WIN-CORP-009', process: 'regsvr32.exe', user: 'bwilson', action: 'network-connection', src_ip: '10.0.9.67', dst_ip: '91.189.92.20', risk: 'high' },
  { ts: '2026-07-05 12:37:04', host: 'WIN-DC-001', process: 'ntdsutil.exe', user: 'domain_admin', action: 'ntds-dump', src_ip: '10.0.1.10', dst_ip: '–', risk: 'critical' },
  { ts: '2026-07-05 12:35:59', host: 'WIN-CORP-025', process: 'taskkill.exe', user: 'jsmith', action: 'process-kill', src_ip: '10.0.25.12', dst_ip: '–', risk: 'medium' },
  { ts: '2026-07-05 12:33:42', host: 'WIN-CORP-014', process: 'vssadmin.exe', user: 'jsmith', action: 'shadow-delete', src_ip: '10.0.14.21', dst_ip: '–', risk: 'critical' },
  { ts: '2026-07-05 12:31:18', host: 'WIN-CORP-031', process: 'powershell.exe', user: 'tpark', action: 'network-connection', src_ip: '10.0.31.88', dst_ip: '185.220.101.47', risk: 'high' },
  { ts: '2026-07-05 12:29:03', host: 'WIN-CORP-004', process: 'wscript.exe', user: 'cgarcia', action: 'script-executed', src_ip: '10.0.4.99', dst_ip: '–', risk: 'high' },
  { ts: '2026-07-05 12:27:50', host: 'WIN-FS-002', process: 'xcopy.exe', user: 'jsmith', action: 'mass-file-copy', src_ip: '10.0.2.5', dst_ip: '10.0.14.21', risk: 'high' },
  { ts: '2026-07-05 12:25:11', host: 'WIN-CORP-014', process: 'WerFault.exe', user: 'jsmith', action: 'crash-report', src_ip: '10.0.14.21', dst_ip: '–', risk: 'low' },
  { ts: '2026-07-05 12:22:47', host: 'WIN-CORP-008', process: 'powershell.exe', user: 'akhan', action: 'amsi-bypass', src_ip: '10.0.8.32', dst_ip: '–', risk: 'critical' },
];

const TIMELINE_EVENTS = [
  { time: '12:22', action: 'AMSI bypass detected', host: 'WIN-CORP-008', color: '#ef4444' },
  { time: '12:29', action: 'VBA macro execution', host: 'WIN-CORP-004', color: '#f97316' },
  { time: '12:33', action: 'Shadow copies deleted', host: 'WIN-CORP-014', color: '#ef4444' },
  { time: '12:37', action: 'NTDS dump attempt', host: 'WIN-DC-001', color: '#ef4444' },
  { time: '12:44', action: 'Reverse shell spawned', host: 'LNX-WEB-003', color: '#ef4444' },
  { time: '12:46', action: 'Lateral movement via SMB', host: 'WIN-CORP-014', color: '#f97316' },
  { time: '12:51', action: 'Remote WMI execution', host: 'WIN-DC-001', color: '#ef4444' },
  { time: '12:52', action: 'MSHTA download payload', host: 'WIN-CORP-022', color: '#ef4444' },
  { time: '12:58', action: 'LSASS network connection', host: 'WIN-CORP-014', color: '#ef4444' },
];

const AFFECTED_ASSETS = [
  { host: 'WIN-CORP-014', type: 'Workstation', events: 8, risk: 'critical', user: 'jsmith', ip: '10.0.14.21' },
  { host: 'WIN-DC-001', type: 'Domain Controller', events: 3, risk: 'critical', user: 'domain_admin', ip: '10.0.1.10' },
  { host: 'WIN-CORP-008', type: 'Workstation', events: 3, risk: 'critical', user: 'akhan', ip: '10.0.8.32' },
  { host: 'LNX-WEB-003', type: 'Linux Server', events: 1, risk: 'critical', user: 'www-data', ip: '10.0.50.3' },
  { host: 'WIN-CORP-022', type: 'Workstation', events: 1, risk: 'critical', user: 'lrodriguez', ip: '10.0.22.15' },
  { host: 'WIN-FS-002', type: 'File Server', events: 2, risk: 'high', user: 'jsmith', ip: '10.0.2.5' },
  { host: 'WIN-CORP-031', type: 'Workstation', events: 2, risk: 'high', user: 'tpark', ip: '10.0.31.88' },
];

const EXTRACTED_IOCS = [
  { value: '185.220.101.47', type: 'IPv4', confidence: 94, tags: ['tor-exit', 'c2', 'lockbit'], pivots: 3 },
  { value: '185.220.101.48', type: 'IPv4', confidence: 91, tags: ['tor-exit', 'reverse-shell'], pivots: 2 },
  { value: '91.189.92.20', type: 'IPv4', confidence: 78, tags: ['malware-host', 'downloader'], pivots: 1 },
  { value: '45.33.32.156', type: 'IPv4', confidence: 65, tags: ['payload-host'], pivots: 1 },
  { value: 'lockbit3ouvrn4ot.onion', type: 'Domain', confidence: 98, tags: ['c2', 'ransomware', 'lockbit'], pivots: 4 },
  { value: 'update-service.net', type: 'Domain', confidence: 82, tags: ['phishing', 'dropper'], pivots: 2 },
];

const TOP_QUERIES = [
  { name: 'LSASS Network', count: 312 },
  { name: 'PowerShell Enc', count: 287 },
  { name: 'C2 Beaconing', count: 244 },
  { name: 'Cred Harvest', count: 198 },
  { name: 'DNS Exfil', count: 156 },
];

const MITRE_COVERAGE = [
  { tactic: 'Initial Access', count: 4, color: '#3b82f6' },
  { tactic: 'Execution', count: 8, color: '#8b5cf6' },
  { tactic: 'Persistence', count: 6, color: '#f97316' },
  { tactic: 'Priv Escalation', count: 3, color: '#ef4444' },
  { tactic: 'Defense Evasion', count: 11, color: '#eab308' },
  { tactic: 'Credential Access', count: 5, color: '#ef4444' },
  { tactic: 'Discovery', count: 7, color: '#10b981' },
  { tactic: 'Lateral Movement', count: 4, color: '#f97316' },
  { tactic: 'Collection', count: 3, color: '#8b5cf6' },
  { tactic: 'C2', count: 6, color: '#3b82f6' },
  { tactic: 'Exfiltration', count: 2, color: '#ef4444' },
  { tactic: 'Impact', count: 4, color: '#ef4444' },
];

// ─── Helper Components ────────────────────────────────────────────────────────

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

function StatusPill({ status }) {
  const map = {
    Active:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981',  border: 'rgba(16,185,129,0.25)' },
    Completed: { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6',  border: 'rgba(59,130,246,0.25)' },
    Draft:     { bg: 'rgba(107,114,128,0.1)', color: '#6b7280',  border: 'rgba(107,114,128,0.25)' },
  };
  const c = map[status] || map.Draft;
  return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{status}</span>;
}

const QUERY_TYPES = ['KQL', 'IOC', 'Process', 'Timeline', 'MITRE', 'Asset', 'Cross'];
const TIME_RANGES = ['Last 1H', 'Last 6H', 'Last 24H', 'Last 7D', 'Last 30D', 'Custom'];
const RESULT_TABS = ['Results', 'Timeline', 'Assets', 'IOC Pivots'];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function ThreatHunting() {
  const [bookmarks, setBookmarks] = useState({ 1: true, 2: true, 4: true });
  const [selectedHunt, setSelectedHunt] = useState(1);
  const [queryType, setQueryType] = useState('KQL');
  const [timeRange, setTimeRange] = useState('Last 24H');
  const [query, setQuery] = useState('process.name == "lsass.exe" AND event.action == "network-connection"\n| where source.ip not in ("10.0.0.0/8")\n| sort timestamp desc\n| limit 500');
  const [resultTab, setResultTab] = useState('Results');
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(true);

  const toggleBookmark = (id) => setBookmarks(prev => ({ ...prev, [id]: !prev[id] }));

  const runHunt = () => {
    setIsRunning(true);
    setTimeout(() => { setIsRunning(false); setHasResults(true); }, 1200);
  };

  const maxCount = Math.max(...TOP_QUERIES.map(q => q.count));

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', minHeight: 0 }}>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Threat Hunting</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Investigation console — KQL-powered adversary hunt platform</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-color)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10b981' }}>● Live</span>
            <button style={{ padding: '8px 16px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 5, color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ New Hunt</button>
          </div>
        </div>

        {/* Three-panel layout */}
        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>

          {/* LEFT PANEL – Saved Hunts */}
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

            {/* Hunt Analytics */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Hunt Analytics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['Total Hunts', 47, '#3b82f6'], ['Active', 3, '#10b981'], ['Bookmarked', 12, '#eab308'], ['Avg Results', 284, '#f97316']].map(([label, val, color]) => (
                  <div key={label} style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, padding: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Hunts */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved Hunts</div>
              {SAVED_HUNTS.map(hunt => (
                <div
                  key={hunt.id}
                  onClick={() => setSelectedHunt(hunt.id)}
                  style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', backgroundColor: selectedHunt === hunt.id ? 'rgba(59,130,246,0.07)' : 'transparent', borderLeft: selectedHunt === hunt.id ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all 0.15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <button
                      onClick={e => { e.stopPropagation(); toggleBookmark(hunt.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: bookmarks[hunt.id] ? '#eab308' : 'var(--text-muted)', padding: 0, lineHeight: 1 }}
                    >
                      {bookmarks[hunt.id] ? '★' : '☆'}
                    </button>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{hunt.name}</span>
                    <StatusPill status={hunt.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: 18 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>by {hunt.analyst}</span>
                    <span style={{ fontSize: 10, color: hunt.results > 0 ? '#f97316' : 'var(--text-muted)', fontWeight: 600 }}>{hunt.results} results</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, marginLeft: 18 }}>Last run: {hunt.lastRun}</div>
                </div>
              ))}
            </div>

            {/* Recent Searches */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Searches</div>
              {RECENT_SEARCHES.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setQuery(s.query)}
                  style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-start', gap: 8 }}
                >
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}>{s.ts}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.query}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER PANEL – Query Editor + Results */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Query Editor Box */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
              {/* Editor toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {QUERY_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setQueryType(t)}
                      style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 4, border: `1px solid ${queryType === t ? 'rgba(59,130,246,0.4)' : 'var(--border-color)'}`, backgroundColor: queryType === t ? 'rgba(59,130,246,0.1)' : 'transparent', color: queryType === t ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <select
                  value={timeRange}
                  onChange={e => setTimeRange(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 11, backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}
                >
                  {TIME_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Textarea */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', userSelect: 'none', zIndex: 1 }}>
                  {[1, 2, 3, 4].map(n => <div key={n} style={{ lineHeight: '20px' }}>{n}</div>)}
                </div>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  rows={4}
                  placeholder={'process.name == "lsass.exe" AND event.action == "network-connection"\n| where source.ip not in ("10.0.0.0/8")\n| sort timestamp desc\n| limit 500'}
                  style={{ width: '100%', padding: '10px 14px 10px 38px', fontFamily: 'monospace', fontSize: 12, color: '#a5f3fc', backgroundColor: '#0a0c10', border: 'none', outline: 'none', resize: 'none', lineHeight: '20px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <button
                  onClick={runHunt}
                  disabled={isRunning}
                  style={{ padding: '7px 20px', backgroundColor: isRunning ? 'rgba(59,130,246,0.3)' : '#2563eb', border: 'none', borderRadius: 5, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {isRunning ? '⟳ Running...' : '▶ Run Hunt'}
                </button>
                <button style={{ padding: '7px 14px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 5, color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>💾 Save Hunt</button>
                <button onClick={() => setQuery('')} style={{ padding: '7px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: 5, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>✕ Clear</button>
                <div style={{ flex: 1 }} />
                {hasResults && <span style={{ fontSize: 11, color: '#10b981' }}>✓ {HUNT_RESULTS.length} results — {timeRange}</span>}
              </div>
            </div>

            {/* Results Panel */}
            <div style={{ flex: 1, minHeight: 0, backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Result Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)', flexShrink: 0 }}>
                {RESULT_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setResultTab(tab)}
                    style={{ padding: '9px 18px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: resultTab === tab ? '2px solid #3b82f6' : '2px solid transparent', color: resultTab === tab ? '#3b82f6' : 'var(--text-muted)', transition: 'all 0.15s' }}
                  >
                    {tab}
                    {tab === 'Results' && <span style={{ marginLeft: 5, padding: '1px 5px', borderRadius: 8, fontSize: 10, backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>{HUNT_RESULTS.length}</span>}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Results Tab */}
                {resultTab === 'Results' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(0,0,0,0.25)', position: 'sticky', top: 0, zIndex: 1 }}>
                        {['Timestamp', 'Host', 'Process', 'User', 'Action', 'Source IP', 'Dest IP', 'Risk'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HUNT_RESULTS.map((row, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.ts}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap' }}>{row.host}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#10b981', whiteSpace: 'nowrap' }}>{row.process}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.user}</td>
                          <td style={{ padding: '8px 12px', color: '#f97316', whiteSpace: 'nowrap' }}>{row.action}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.src_ip}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: row.dst_ip !== '–' ? '#f97316' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.dst_ip}</td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}><RiskBadge risk={row.risk} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Timeline Tab */}
                {resultTab === 'Timeline' && (
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Attack timeline – {TIMELINE_EVENTS.length} key events — {timeRange}</div>
                    <div style={{ position: 'relative', paddingLeft: 80 }}>
                      <div style={{ position: 'absolute', left: 70, top: 14, bottom: 14, width: 2, backgroundColor: 'var(--border-color)' }} />
                      {TIMELINE_EVENTS.map((ev, i) => (
                        <div key={i} style={{ position: 'relative', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ position: 'absolute', left: -16, width: 12, height: 12, borderRadius: '50%', backgroundColor: ev.color, border: `2px solid ${ev.color}33`, boxShadow: `0 0 8px ${ev.color}66`, zIndex: 1 }} />
                          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', width: 40, textAlign: 'right', flexShrink: 0, marginLeft: -64 }}>{ev.time}</div>
                          <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, padding: '10px 14px', border: `1px solid ${ev.color}22` }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{ev.action}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Host: <span style={{ color: '#3b82f6' }}>{ev.host}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets Tab */}
                {resultTab === 'Assets' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(0,0,0,0.25)', position: 'sticky', top: 0, zIndex: 1 }}>
                        {['Host', 'Type', 'IP Address', 'User', 'Events', 'Risk'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {AFFECTED_ASSETS.map((a, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#3b82f6' }}>{a.host}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{a.type}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{a.ip}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{a.user}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f97316' }}>{a.events}</td>
                          <td style={{ padding: '10px 14px' }}><RiskBadge risk={a.risk} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* IOC Pivots Tab */}
                {resultTab === 'IOC Pivots' && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{EXTRACTED_IOCS.length} IOCs extracted from hunt results</div>
                    {EXTRACTED_IOCS.map((ioc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'transparent', borderRadius: 4, marginBottom: 4 }}>
                        <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', flexShrink: 0 }}>{ioc.type}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{ioc.value}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {ioc.tags.map(t => <span key={t} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>{t}</span>)}
                        </div>
                        <span style={{ fontSize: 11, color: '#eab308', fontWeight: 600 }}>{ioc.confidence}%</span>
                        <button style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>Pivot ({ioc.pivots})</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL – Analytics */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

            {/* Top Queries Chart */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Top Queries</div>
              {TOP_QUERIES.map((q, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{q.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>{q.count}</span>
                  </div>
                  <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(q.count / maxCount) * 100}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* MITRE Coverage */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>MITRE ATT&CK Coverage</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {MITRE_COVERAGE.map((t, i) => (
                  <div key={i} style={{ backgroundColor: `${t.color}12`, border: `1px solid ${t.color}25`, borderRadius: 4, padding: '6px 8px' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3, marginBottom: 3 }}>{t.tactic}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: t.color }}>{t.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Malware Families */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Top Malware Families</div>
              {[['LockBit 3.0', 14, '#ef4444'], ['Cobalt Strike', 9, '#f97316'], ['Emotet', 7, '#eab308'], ['Mimikatz', 6, '#8b5cf6'], ['IcedID', 4, '#3b82f6']].map(([name, count, color]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Most Queried Assets */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Most Queried Assets</div>
              {[['WIN-CORP-014', 8], ['WIN-DC-001', 3], ['WIN-CORP-008', 3], ['LNX-WEB-003', 1], ['WIN-FS-002', 2]].map(([host, count]) => (
                <div key={host} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: '#3b82f6', fontFamily: 'monospace' }}>{host}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ThreatHunting;
