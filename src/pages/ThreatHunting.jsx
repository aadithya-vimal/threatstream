import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { TelemetryService } from '../services/TelemetryService';

const telemetryService = new TelemetryService();

function RiskBadge({ risk }) {
  const map = {
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    high: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    medium: { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
    low: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
  };
  const c = map[risk] || map.low;
  return <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color }}>{risk}</span>;
}

export function ThreatHunting() {
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('process.name == "lsass.exe" AND event.action == "network-connection"\n| where source.ip not in ("10.0.0.0/8")\n| sort timestamp desc\n| limit 500');
  const [resultTab, setResultTab] = useState('Results');
  const [isRunning, setIsRunning] = useState(false);
  const [rules, setRules] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [bookmarks, setBookmarks] = useState({});

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [ruleRows, eventRows, alertRows] = await Promise.all([
          telemetryService.getRules(),
          telemetryService.getTelemetryEvents(query),
          telemetryService.getAlerts()
        ]);
        setRules(ruleRows || []);
        setEvents(eventRows || []);
        setAlerts(alertRows || []);
      } catch (err) {
        console.error('Failed to load threat hunting data.', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const hunts = useMemo(() => (rules || []).map((rule, idx) => ({
    id: rule.id || idx,
    name: rule.name,
    analyst: rule.author || 'ThreatStream Detection Engineering',
    results: rule.execution_count || 0,
    status: rule.status || 'Draft',
    bookmarked: !!rule.bookmarked,
    lastRun: rule.last_triggered || 'Never'
  })), [rules]);

  const topQueries = useMemo(() => {
    const counts = new Map();
    (events || []).forEach((evt) => {
      const key = (evt.processName || evt.type || 'Event').toString();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count })).slice(0, 5);
  }, [events]);

  const huntResults = events.slice(0, 20).map((evt) => ({
    ts: evt.timestamp || new Date().toISOString(),
    host: evt.hostname || 'UNKNOWN',
    process: evt.processName || evt.type || 'event',
    user: evt.user || 'SYSTEM',
    action: evt.category || evt.type || 'event',
    src_ip: evt.raw_event?.src_ip || evt.ip_address || '—',
    dst_ip: evt.raw_event?.dst_ip || evt.remoteIP || '—',
    risk: evt.severity || 'low'
  }));

  const affectedAssets = useMemo(() => {
    const counts = new Map();
    (events || []).forEach((evt) => {
      const host = evt.hostname || 'UNKNOWN';
      const current = counts.get(host) || { host, type: evt.type || 'Host', events: 0, risk: evt.severity || 'low', user: evt.user || 'SYSTEM', ip: evt.raw_event?.ip || evt.raw_event?.src_ip || '—' };
      current.events += 1;
      counts.set(host, current);
    });
    return [...counts.values()].slice(0, 7);
  }, [events]);

  const extractedIOCs = useMemo(() => {
    const iocs = [];
    (alerts || []).forEach((alert) => {
      if (alert.ioc_value) {
        iocs.push({
          value: alert.ioc_value,
          type: alert.ioc_value.includes('.') && !alert.ioc_value.startsWith('http') ? 'IPv4' : 'Domain',
          confidence: 90,
          tags: [alert.mitre_name || alert.severity || 'alert'],
          pivots: 1
        });
      }
    });
    return iocs.slice(0, 6);
  }, [alerts]);

  const maxCount = Math.max(1, ...topQueries.map(q => q.count));
  const toggleBookmark = (id) => setBookmarks(prev => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return <DashboardLayout><LoadingState message="Loading live threat hunting data..." /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Threat Hunting</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Live hunting across telemetry, alerts, and detection rules</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-color)', backgroundColor: 'rgba(16,185,129,0.05)', color: '#10b981' }}>● Live</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Hunt Analytics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['Total Hunts', hunts.length, '#3b82f6'], ['Active', hunts.filter(h => h.status === 'Active').length, '#10b981'], ['Bookmarked', hunts.filter(h => h.bookmarked).length, '#eab308'], ['Alerts', alerts.length, '#f97316']].map(([label, val, color]) => (
                  <div key={label} style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, padding: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved Hunts</div>
              {hunts.length > 0 ? hunts.map(hunt => (
                <div key={hunt.id} onClick={() => {}} style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent', borderLeft: '3px solid transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(hunt.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: bookmarks[hunt.id] || hunt.bookmarked ? '#eab308' : 'var(--text-muted)', padding: 0, lineHeight: 1 }}>{bookmarks[hunt.id] || hunt.bookmarked ? '★' : '☆'}</button>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{hunt.name}</span>
                    <StatusBadge status={hunt.status} text={hunt.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: 18 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>by {hunt.analyst}</span>
                    <span style={{ fontSize: 10, color: hunt.results > 0 ? '#f97316' : 'var(--text-muted)', fontWeight: 600 }}>{hunt.results} results</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, marginLeft: 18 }}>Last run: {new Date(hunt.lastRun).toLocaleString()}</div>
                </div>
              )) : <EmptyState title="No hunts found" description="Live rules will appear here once detections are populated." />}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.15)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }} />
                <button onClick={() => setIsRunning(true)} disabled={isRunning} style={{ padding: '7px 20px', backgroundColor: isRunning ? 'rgba(59,130,246,0.3)' : '#2563eb', border: 'none', borderRadius: 5, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{isRunning ? 'Running...' : 'Run Hunt'}</button>
              </div>
              <div style={{ padding: 14 }}>
                <textarea value={query} onChange={e => setQuery(e.target.value)} rows={4} style={{ width: '100%', padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#a5f3fc', backgroundColor: '#0a0c10', border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical', lineHeight: '20px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)', flexShrink: 0 }}>
                {['Results', 'Assets', 'IOC Pivots'].map(tab => (
                  <button key={tab} onClick={() => setResultTab(tab)} style={{ padding: '9px 18px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: resultTab === tab ? '2px solid #3b82f6' : '2px solid transparent', color: resultTab === tab ? '#3b82f6' : 'var(--text-muted)' }}>{tab}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {resultTab === 'Results' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>{['Timestamp', 'Host', 'Process', 'User', 'Action', 'Risk'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {huntResults.map((row, i) => <tr key={i}><td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{row.ts}</td><td style={{ padding: '8px 12px', color: '#3b82f6' }}>{row.host}</td><td style={{ padding: '8px 12px', color: '#10b981' }}>{row.process}</td><td style={{ padding: '8px 12px' }}>{row.user}</td><td style={{ padding: '8px 12px', color: '#f97316' }}>{row.action}</td><td style={{ padding: '8px 12px' }}><RiskBadge risk={row.risk} /></td></tr>)}
                    </tbody>
                  </table>
                )}
                {resultTab === 'Assets' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>{['Host', 'Type', 'IP Address', 'User', 'Events', 'Risk'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                    <tbody>{affectedAssets.map((a, i) => <tr key={i}><td style={{ padding: '10px 14px', fontWeight: 700, color: '#3b82f6' }}>{a.host}</td><td style={{ padding: '10px 14px' }}>{a.type}</td><td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{a.ip}</td><td style={{ padding: '10px 14px' }}>{a.user}</td><td style={{ padding: '10px 14px', fontWeight: 700, color: '#f97316' }}>{a.events}</td><td style={{ padding: '10px 14px' }}><RiskBadge risk={a.risk} /></td></tr>)}</tbody>
                  </table>
                )}
                {resultTab === 'IOC Pivots' && (
                  <div style={{ padding: 16 }}>
                    {extractedIOCs.length > 0 ? extractedIOCs.map((ioc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'transparent', borderRadius: 4, marginBottom: 4 }}>
                        <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', flexShrink: 0 }}>{ioc.type}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{ioc.value}</span>
                        <span style={{ fontSize: 11, color: '#eab308', fontWeight: 600 }}>{ioc.confidence}%</span>
                      </div>
                    )) : <EmptyState title="No IOC pivots yet" description="Alerts will populate pivotable indicators." />}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Top Queries</div>
              {topQueries.length > 0 ? topQueries.map((q, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{q.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>{q.count}</span>
                  </div>
                  <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(q.count / maxCount) * 100}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: 3 }} />
                  </div>
                </div>
              )) : <EmptyState title="No query data" description="Run a live hunt to populate query activity." />}
            </div>
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Live Alert Count</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{alerts.length}</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ThreatHunting;
