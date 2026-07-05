/**
 * src/pages/ThreatHunting.jsx
 * Enterprise EDR Telemetry Platform & Detection Engineering Console
 */
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { Icon } from '../components/Icons';
import { TelemetryService } from '../services/TelemetryService';

const telemetryService = new TelemetryService();

export const ThreatHunting = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, explorer, rules, connectors
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [telemetry, setTelemetry] = useState([]);
  const [rules, setRules] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Telemetry Explorer States
  const [queryText, setQueryText] = useState(
    '// Filter all high risk EDR telemetry logs\nwhere Severity == "high"\n| order by Timestamp desc'
  );
  const [explorerResults, setExplorerResults] = useState([]);
  const [queryError, setQueryError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Rule Library States
  const [selectedRuleId, setSelectedRuleId] = useState(null);

  // Connectors Status List (Forwarder plugins directory)
  const [connectors, setConnectors] = useState([
    { id: 'sysmon', name: 'Windows Sysmon forwarder', type: 'Host Agent', status: 'Connected', eps: 45, active: true },
    { id: 'auditd', name: 'Linux Auditd sync', type: 'Host Agent', status: 'Connected', eps: 12, active: true },
    { id: 'zeek', name: 'Zeek Network Ingress', type: 'Network Agent', status: 'Connected', eps: 120, active: true },
    { id: 'suricata', name: 'Suricata Alert Collector', type: 'Network Agent', status: 'Standby', eps: 0, active: false },
    { id: 'crowdstrike', name: 'CrowdStrike Falcon Event Stream', type: 'API Ingest', status: 'Connected', eps: 210, active: true },
    { id: 'defender', name: 'Microsoft Defender XDR API', type: 'API Ingest', status: 'Unconfigured', eps: 0, active: false }
  ]);

  useEffect(() => {
    const loadPlatformTelemetry = async () => {
      setIsLoading(true);
      try {
        const [fetchedEvents, fetchedRules, fetchedAlerts] = await Promise.all([
          telemetryService.getTelemetryEvents(),
          telemetryService.getRules(),
          telemetryService.getAlerts()
        ]);
        setTelemetry(fetchedEvents);
        setRules(fetchedRules);
        setAlerts(fetchedAlerts);
        setExplorerResults(fetchedEvents); // Initial explorer snapshot
      } catch (err) {
        console.error('Failed to resolve EDR Telemetry registry:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlatformTelemetry();
  }, []);

  const handleExecuteQuery = () => {
    setQueryError(null);
    try {
      const filtered = telemetryService.getTelemetryEventsSync(queryText);
      setExplorerResults(filtered);
    } catch (err) {
      setQueryError(err.message);
    }
  };

  const handleToggleConnector = (id) => {
    setConnectors(prev => prev.map(c => 
      c.id === id ? { ...c, active: !c.active, status: !c.active ? 'Connected' : 'Standby' } : c
    ));
  };

  const tabStyle = (tabId) => ({
    padding: '10px 16px',
    backgroundColor: activeTab === tabId ? 'var(--panel-bg)' : 'transparent',
    border: '1px solid',
    borderColor: activeTab === tabId ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
    color: activeTab === tabId ? 'var(--color-blue)' : 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginBottom: '-1px'
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Connecting to EDR telemetry index..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Detection Engineering & Telemetry" 
        description="Monitor real-time host events, query normalized logs using KQL, and configure Sigma matching rule repositories."
      />

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <MetricCard title="Telemetry Event Log Count" value={telemetry.length} status="info" subtitle="Normalized records in index" />
        <MetricCard title="Active Alerts Generated" value={alerts.length} status="critical" subtitle="Triggered rules requiring triage" />
        <MetricCard title="Rules Repository" value={rules.length} status="low" subtitle="Sigma & YARA signatures loaded" />
        <MetricCard title="Global Event Stream EPS" value={connectors.reduce((acc, c) => acc + (c.active ? c.eps : 0), 0)} status="high" subtitle="Aggregate Ingest rate / sec" />
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        <button style={tabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Live Operations Dashboard</button>
        <button style={tabStyle('explorer')} onClick={() => setActiveTab('explorer')}>Telemetry Explorer ({explorerResults.length})</button>
        <button style={tabStyle('rules')} onClick={() => setActiveTab('rules')}>Rule Library ({rules.length})</button>
        <button style={tabStyle('connectors')} onClick={() => setActiveTab('connectors')}>Forwarder Connectors</button>
      </div>

      {/* TAB: LIVE OPERATIONS DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }} className="dashboard-grid-layout">
            {/* Recent alerts table */}
            <Panel title="Recent Threat Detections Alerts">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alerts.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>MITRE: {a.mitre_name}</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>IOC: {a.ioc_value || 'None'} • Score: {a.risk_score}/100</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={a.severity} text={a.severity.toUpperCase()} />
                      <StatusBadge status="warning" text={a.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Event logs distribution stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Panel title="MITRE ATT&CK Tactics Coverage">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 0' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>EXECUTION</span>
                      <span>50%</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                      <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--color-blue)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>PERSISTENCE</span>
                      <span>35%</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                      <div style={{ width: '35%', height: '100%', backgroundColor: 'var(--color-high)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>COMMAND & CONTROL</span>
                      <span>15%</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                      <div style={{ width: '15%', height: '100%', backgroundColor: 'var(--color-critical)' }} />
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Top Active Systems Mapped">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>WIN10-DESK-294</span>
                    <strong>70% Events</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>MACOS-DEV-382</span>
                    <strong>20% Events</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>PRD-APP-SRV-02</span>
                    <strong>10% Events</strong>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TELEMETRY EXPLORER */}
      {activeTab === 'explorer' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? 'minmax(0, 1.2fr) minmax(0, 0.8fr)' : '1fr', gap: '24px', alignItems: 'stretch' }} className="dashboard-grid-layout">
          
          {/* Query console and events table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Panel 
              title="KQL Query Console Editor"
              actions={
                <button
                  onClick={handleExecuteQuery}
                  style={{
                    backgroundColor: 'var(--color-blue)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Icon name="terminal" size={12} /> Execute Query
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  style={{
                    height: '110px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--color-blue-hover)',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    padding: '12px',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: '1.5'
                  }}
                />
                {queryError && (
                  <div style={{ color: 'var(--color-critical)', fontSize: '11px', fontWeight: 600 }}>
                    Error parsing KQL: {queryError}
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Explorer Logs Result Set">
              <DataTable 
                columns={[
                  { header: 'Timestamp', accessor: 'timestamp', renderCell: (val) => <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{val.replace('T', ' ').replace('Z', '')}</span> },
                  { header: 'Hostname', accessor: 'hostname', renderCell: (val) => <span style={{ fontWeight: 700 }}>{val}</span> },
                  { header: 'Source', accessor: 'source' },
                  { header: 'Type', accessor: 'type', renderCell: (val) => <StatusBadge status={val === 'Process' ? 'low' : val === 'Registry' ? 'warning' : 'info'} text={val} /> },
                  { header: 'Details', accessor: 'details', renderCell: (val) => <span style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{val}</span> }
                ]}
                data={explorerResults}
                onRowClick={(row) => setSelectedEvent(row)}
              />
            </Panel>
          </div>

          {/* Side Inspector Panel */}
          {selectedEvent && (
            <Panel 
              title="Event Analysis Dossier"
              actions={
                <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  ×
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-blue)', wordBreak: 'break-all' }}>{selectedEvent.type} Event</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <StatusBadge status={selectedEvent.severity} text={`Severity: ${selectedEvent.severity}`} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>Host: <strong>{selectedEvent.hostname}</strong></span>
                  </div>
                </div>

                {/* Parent Process / Process Tree visual */}
                {selectedEvent.pid && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>PARENT/CHILD PROCESS TREE</span>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        📁 {selectedEvent.parentProcess || 'explorer.exe'} (PPID: {selectedEvent.ppid})
                      </div>
                      <div style={{ paddingLeft: '14px', borderLeft: '2px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600 }}>
                        ↳ 📄 {selectedEvent.processName || 'powershell.exe'} (PID: {selectedEvent.pid})
                      </div>
                    </div>
                  </div>
                )}

                {/* MITRE ATT&CK Mapping context */}
                {selectedEvent.mitre_id && (
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>MITRE ATT&CK REFERENCE</span>
                    <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>{selectedEvent.mitre_id} ({selectedEvent.mitre_name})</span>
                      <StatusBadge status="info" text={selectedEvent.mitre_tactic} />
                    </div>
                  </div>
                )}

                {/* Raw Event JSON payload display */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>RAW TELEMETRY ATTRIBUTES</div>
                  <pre style={{
                    padding: '10px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    overflowX: 'auto',
                    margin: 0
                  }}>
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* TAB: RULE LIBRARY */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }}>
          
          <Panel title="Active Rule Catalog Directory">
            <DataTable 
              columns={[
                { header: 'Rule Name', accessor: 'name', renderCell: (val) => <span style={{ fontWeight: 700 }}>{val}</span> },
                { header: 'Type', accessor: 'type', renderCell: (val) => <StatusBadge status="info" text={val} /> },
                { header: 'Severity', accessor: 'severity', renderCell: (val) => <StatusBadge status={val} text={val.toUpperCase()} /> },
                { header: 'Tactic Focus', accessor: 'mitreMapping', renderCell: (val) => val?.tactic || 'Execution' },
                { header: 'Execution Count', accessor: 'execution_count', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val || 3} triggers</span> }
              ]}
              data={rules}
              onRowClick={(row) => setSelectedRuleId(row.id)}
            />
          </Panel>

          {/* Rule editor drawer */}
          <div>
            {selectedRuleId ? (
              <Panel 
                title="Rule Definition Profile"
                actions={
                  <button onClick={() => alert('Sigma/YARA deployment is managed via GitOps integration.')} style={{ backgroundColor: 'var(--color-blue)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    Deploy Update
                  </button>
                }
              >
                {(() => {
                  const rule = rules.find(r => r.id === selectedRuleId);
                  if (!rule) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{rule.name}</span>
                          <StatusBadge status={rule.severity} text={rule.severity} />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{rule.description}</p>
                      </div>

                      {rule.mitreMapping && (
                        <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px' }}>
                          <strong>MITRE ATT&CK: {rule.mitreMapping.id}</strong> • Tactic: {rule.mitreMapping.tactic}
                        </div>
                      )}

                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>SIGMA YAML CONFIGURATION</div>
                        <pre style={{
                          padding: '10px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#34d399',
                          backgroundColor: 'var(--bg-primary)',
                          overflowX: 'auto',
                          margin: 0,
                          lineHeight: '1.4'
                        }}>
                          {rule.definition}
                        </pre>
                      </div>

                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Author: {rule.author} | Last triggered: {rule.last_triggered || 'N/A'}</span>
                    </div>
                  );
                })()}
              </Panel>
            ) : (
              <Panel title="Rule Definition Profile">
                <EmptyState title="No rule selected" description="Select a Sigma/YARA configuration file from the directory registry to inspect its parser parameters." />
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* TAB: FORWARDER CONNECTORS */}
      {activeTab === 'connectors' && (
        <Panel title="EDR Log Forwarders (Telemetry Pipeline Adapters)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {connectors.map(conn => (
              <div 
                key={conn.id} 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  padding: '16px', 
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{conn.name}</span>
                    <StatusBadge status={conn.active ? 'low' : 'muted'} text={conn.status} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type: {conn.type} • EPS Ingest: {conn.eps}/s</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <button
                    onClick={() => handleToggleConnector(conn.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: conn.active ? 'var(--color-critical)' : 'var(--color-blue)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {conn.active ? 'Deactivate Ingest' : 'Activate Ingest'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </DashboardLayout>
  );
};

export default ThreatHunting;
