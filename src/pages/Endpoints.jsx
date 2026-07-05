import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import EmptyState from '../components/EmptyState';
import { Icon } from '../components/Icons';
import { AssetService } from '../services/AssetService';
import { TelemetryService, MockEventGenerator } from '../services/TelemetryService';

const assetService = new AssetService();
const telemetryService = new TelemetryService();

export const Endpoints = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedHost, setSelectedHost] = useState('WIN10-DESK-294');
  const [endpointSubTab, setEndpointSubTab] = useState('processes');
  
  // Live Events Stream States
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedEvents, setStreamedEvents] = useState([]);
  const generatorRef = useRef(null);

  // Async States
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load assets on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const list = await assetService.getAssets();
        setAssets(list);
      } catch (err) {
        console.error('Failed to load asset directory:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const endpointsOnly = assets.filter(a => a.asset_type === 'Workstation' || a.hostname.includes('SRV'));

  // Feed live events stream handler
  useEffect(() => {
    if (isStreaming) {
      generatorRef.current = new MockEventGenerator((evt) => {
        setStreamedEvents(prev => [evt, ...prev].slice(0, 100)); // Cache max 100 events
      });
      generatorRef.current.start();
    } else {
      if (generatorRef.current) {
        generatorRef.current.stop();
        generatorRef.current = null;
      }
    }

    return () => {
      if (generatorRef.current) {
        generatorRef.current.stop();
      }
    };
  }, [isStreaming]);

  // Fetch host specific mock telemetry items
  const getHostTelemetry = (host, type) => {
    // Queries mock database using the search engine
    const query = `| where Hostname == "${host}"\n| where Type contains "${type}"`;
    return telemetryService.getTelemetryEventsSync(query);
  };

  const navTabStyle = (tabId) => ({
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

  // Columns for sub tab data tables
  const processColumns = [
    { header: 'Timestamp', accessor: 'timestamp', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{val.replace('T', ' ').replace('Z', '')}</span> },
    { header: 'Binary Name', accessor: 'processName', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { header: 'Parent Process', accessor: 'parentProcess', renderCell: (val) => <span style={{ color: 'var(--text-secondary)' }}>{val}</span> },
    { header: 'CommandLine Executed', accessor: 'details', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-blue-hover)', wordBreak: 'break-all' }}>{val}</span> }
  ];

  const authColumns = [
    { header: 'Timestamp', accessor: 'timestamp', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{val.replace('T', ' ').replace('Z', '')}</span> },
    { header: 'Account User', accessor: 'user', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { header: 'Logon Type / Details', accessor: 'details' },
    {
      header: 'Result',
      accessor: 'status',
      renderCell: (val) => <StatusBadge status={val === 'Success' ? 'low' : 'critical'} text={val} />
    }
  ];

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Endpoint EDR Telemetry" 
        description="Monitor deployed EDR software status, track process hierarchies, registry updates, and live command traces."
      />

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Total EDR Clients" value={endpointsOnly.length} status="info" subtitle="Within network groups" />
        <MetricCard title="Active Connections" value={endpointsOnly.filter(e => e.status === 'Online').length} status="low" subtitle="92% network availability" />
        <MetricCard title="Out of Sync Agents" value="1 Host" status="high" subtitle="MACOS-DEV-382 pending update" />
        <MetricCard title="Mitigation Actions Blocked" value="12 Blocks" status="critical" subtitle="In the last 48 hours" />
      </div>

      {/* Primary tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px' }}>
        <button style={navTabStyle('overview')} onClick={() => setActiveTab('overview')}>Endpoints Overview</button>
        <button style={navTabStyle('inspector')} onClick={() => setActiveTab('inspector')}>Endpoint Details & Telemetry</button>
        <button style={navTabStyle('live')} onClick={() => setActiveTab('live')}>Live Agent Stream</button>
      </div>

      {/* 1. ENDPOINTS OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <Panel title="Monitored Endpoint Health Directory">
          <DataTable 
            columns={[
              { header: 'Hostname', accessor: 'hostname', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
              { header: 'IP Address', accessor: 'ip', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
              { header: 'Operating System', accessor: 'os' },
              { header: 'Agent Group', accessor: 'owner' },
              {
                header: 'Security Level',
                accessor: 'criticality',
                renderCell: (val) => <StatusBadge status={val} text={val} />
              },
              {
                header: 'EDR Policy Sync',
                accessor: 'status',
                renderCell: (val, row) => {
                  let badgeSev = 'low';
                  let text = 'Compliant';
                  if (row.hostname === 'MACOS-DEV-382') {
                    badgeSev = 'high';
                    text = 'Outdated Version';
                  }
                  return <StatusBadge status={badgeSev} text={text} />;
                }
              }
            ]}
            data={endpointsOnly}
          />
        </Panel>
      )}

      {/* 2. ENDPOINT DETAILS & TELEMETRY TAB */}
      {activeTab === 'inspector' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 2.3fr)', gap: '24px' }}>
          
          {/* Left panel: Hosts selector */}
          <Panel title="Select Endpoint Host">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {endpointsOnly.map(ep => (
                <button
                  key={ep.hostname}
                  onClick={() => setSelectedHost(ep.hostname)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px',
                    border: '1px solid',
                    borderColor: selectedHost === ep.hostname ? 'var(--color-blue)' : 'var(--border-color)',
                    backgroundColor: selectedHost === ep.hostname ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-secondary)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast) ease'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{ep.hostname}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>IP: {ep.ip} | OS: {ep.os}</span>
                </button>
              ))}
            </div>
          </Panel>

          {/* Right panel: Sub tab categories log */}
          <Panel title={`${selectedHost} Logs Telemetry`}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '12px', paddingBottom: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { id: 'processes', name: 'Processes' },
                { id: 'auth', name: 'Logins' },
                { id: 'registry', name: 'Registry keys' },
                { id: 'scheduled', name: 'Tasks' },
                { id: 'dns', name: 'DNS Queries' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setEndpointSubTab(sub.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: endpointSubTab === sub.id ? 'var(--color-blue-hover)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    paddingBottom: '2px',
                    borderBottom: endpointSubTab === sub.id ? '2px solid var(--color-blue)' : '2px solid transparent'
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </div>

            {/* Sub content logs */}
            {endpointSubTab === 'processes' && (
              <DataTable 
                columns={processColumns} 
                data={getHostTelemetry(selectedHost, 'Process')} 
                emptyText="No process telemetry recorded for host."
              />
            )}

            {endpointSubTab === 'auth' && (
              <DataTable 
                columns={authColumns} 
                data={getHostTelemetry(selectedHost, 'Authentication')} 
                emptyText="No login telemetry recorded."
              />
            )}

            {endpointSubTab === 'registry' && (
              <DataTable 
                columns={[
                  { header: 'Timestamp', accessor: 'timestamp', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{val.replace('T', ' ').replace('Z', '')}</span> },
                  { header: 'SubKey Path', accessor: 'key', renderCell: (val) => <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{val}</span> },
                  { header: 'Action Event', accessor: 'action', renderCell: (val) => <StatusBadge status="warning" text={val} /> },
                  { header: 'Log details', accessor: 'details' }
                ]} 
                data={getHostTelemetry(selectedHost, 'Registry')} 
                emptyText="No registry modifications detected."
              />
            )}

            {endpointSubTab === 'scheduled' && (
              <DataTable 
                columns={[
                  { header: 'Timestamp', accessor: 'timestamp', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{val.replace('T', ' ').replace('Z', '')}</span> },
                  { header: 'Task Name', accessor: 'taskName', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
                  { header: 'Schedule Rate', accessor: 'trigger' },
                  { header: 'Log details', accessor: 'details' }
                ]}
                data={getHostTelemetry(selectedHost, 'Scheduled Task')}
                emptyText="No scheduled task actions detected."
              />
            )}

            {endpointSubTab === 'dns' && (
              <DataTable 
                columns={[
                  { header: 'Timestamp', accessor: 'timestamp', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{val.replace('T', ' ').replace('Z', '')}</span> },
                  { header: 'Domain Query', accessor: 'query', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{val}</span> },
                  { header: 'Resolved Host IP', accessor: 'resolvedIP', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
                  { header: 'Log details', accessor: 'details' }
                ]}
                data={getHostTelemetry(selectedHost, 'DNS')}
                emptyText="No outbound DNS queries captured."
              />
            )}
          </Panel>
        </div>
      )}

      {/* 3. LIVE AGENT STREAM TAB */}
      {activeTab === 'live' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '24px' }}>
          
          {/* Left panel: control connector */}
          <Panel title="Socket Streaming Controls">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>EDR Agent Live Hook</span>
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  style={{
                    backgroundColor: isStreaming ? 'var(--color-critical)' : 'var(--color-blue)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isStreaming ? 'Disconnect' : 'Connect Pipeline'}
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Pipeline Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot" style={{ backgroundColor: isStreaming ? 'var(--color-low)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    {isStreaming ? 'STREAMING ACTIVE' : 'PIPELINE DISCONNECTED'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <strong>Technical Detail:</strong> Once connected, EDR client daemons push JSON telemetry packets over WebSocket sockets, bypassing typical REST batch latency.
              </div>
            </div>
          </Panel>

          {/* Right panel: Live telemetry output */}
          <Panel title="Socket CLI Telemetry Log (Real-time)">
            <div style={{
              height: '350px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#34d399',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {streamedEvents.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '120px' }}>
                  {isStreaming ? 'Waiting for telemetry event packets...' : 'Click "Connect Pipeline" to initiate dynamic WebSocket telemetry flows.'}
                </div>
              ) : (
                streamedEvents.map((evt) => (
                  <div key={evt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: '#60a5fa' }}>[{evt.timestamp.split('T')[1].replace('Z', '')}]</span>{' '}
                    <span style={{ color: 'var(--color-high)' }}>({evt.hostname})</span>{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>[{evt.type}]</strong> {evt.details}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Endpoints;
