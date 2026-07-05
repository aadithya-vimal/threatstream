import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';

export const Administration = () => {
  const [activeTab, setActiveTab] = useState('users');

  // API Key Management Mock State
  const [apiKeys, setApiKeys] = useState([
    { id: 'key-1', name: 'EDR-Agent-Collect-Token', key: 'ts_live_a71f...8b2c', scope: 'Ingest Logs', status: 'Active', created: '2026-06-15' },
    { id: 'key-2', name: 'SOAR-Playbook-Auth', key: 'ts_live_d294...f0a1', scope: 'Read/Write Incidents', status: 'Active', created: '2026-07-01' }
  ]);
  const [newKeyName, setNewKeyName] = useState('');

  // Connectors Mock State
  const [connectors, setConnectors] = useState([
    { name: 'AbuseIPDB Integration', type: 'Reputation Feed', active: true, key: '••••••••••••••••' },
    { name: 'AlienVault OTX PulseSync', type: 'Community IOCs', active: true, key: '••••••••••••••••' },
    { name: 'VirusTotal API Hash Lookup', type: 'Scanner Aggregator', active: true, key: '••••••••••••••••' },
    { name: 'GreyNoise Noise Filtering', type: 'Internet Noise Scanner', active: false, key: '' },
    { name: 'URLhaus Malware List', type: 'Payload URL Feed', active: true, key: '••••••••••••••••' },
    { name: 'CISA advisories XML Feed', type: 'Government Alerts', active: false, key: '' }
  ]);

  // System Stats
  const systemHealth = {
    fastApiLoad: '4.2%',
    redisState: 'Online',
    redisMemory: '124.8 MB',
    websocketCount: 28,
    celeryQueueSize: 2,
    celeryWorkerStatus: '3 Workers Active',
    postgresStorage: '4.8 GB of 20 GB',
    influxLogsCount: '12,845,910 records'
  };

  const usersList = [
    { name: 'Aadithya Vimal', email: 'aadit@threatstream.io', role: 'Global Administrator', status: 'Active', lastLogin: '2 mins ago' },
    { name: 'Jane Doe', email: 'jane.doe@threatstream.io', role: 'Incident Responder (Tier 2)', status: 'Active', lastLogin: '2 hours ago' },
    { name: 'Alex Chen', email: 'alex.chen@threatstream.io', role: 'Security Analyst (Tier 1)', status: 'Active', lastLogin: '1 day ago' },
    { name: 'Contractor Audit', email: 'external.auditor@threatstream.io', role: 'Read-Only Auditor', status: 'Suspended', lastLogin: '3 weeks ago' }
  ];

  const toggleConnector = (idx) => {
    const updated = [...connectors];
    updated[idx].active = !updated[idx].active;
    if (updated[idx].active && !updated[idx].key) {
      updated[idx].key = '••••••••••••••••';
    }
    setConnectors(updated);
  };

  const generateApiKey = (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const newKey = {
      id: `key-${Math.random()}`,
      name: newKeyName,
      key: `ts_live_${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
      scope: 'Ingest Logs',
      status: 'Active',
      created: new Date().toISOString().split('T')[0]
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
  };

  const revokeApiKey = (id) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
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

  return (
    <DashboardLayout>
      <SectionHeader 
        title="SOC Portal Administration" 
        description="Configure access keys, monitor FastAPI/Celery backend workers, manage threat feeds connectors, and review self-hosted deployment documentation."
      />

      {/* Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>Identity & Access</button>
        <button style={tabStyle('connectors')} onClick={() => setActiveTab('connectors')}>Threat Connectors</button>
        <button style={tabStyle('system')} onClick={() => setActiveTab('system')}>System Monitoring</button>
        <button style={tabStyle('deployment')} onClick={() => setActiveTab('deployment')}>Self-Hosted Deployment</button>
      </div>

      {/* 1. IDENTITY & ACCESS TAB */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* User management */}
          <Panel title="Authorized Security Operations Personnel">
            <DataTable 
              columns={[
                { header: 'Full Name', accessor: 'name', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
                { header: 'Email Address', accessor: 'email', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
                { header: 'Assigned Role', accessor: 'role' },
                {
                  header: 'Account Status',
                  accessor: 'status',
                  renderCell: (val) => <StatusBadge status={val === 'Active' ? 'low' : 'critical'} text={val} />
                },
                { header: 'Last Login', accessor: 'lastLogin' }
              ]} 
              data={usersList} 
            />
          </Panel>

          {/* API Key management */}
          <Panel title="API Credentials Tokens">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <form onSubmit={generateApiKey} style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Enter API key descriptive label..."
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--color-blue)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  className="btn-primary-hover"
                >
                  Generate Key
                </button>
              </form>

              <DataTable
                columns={[
                  { header: 'Key Label', accessor: 'name', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
                  { header: 'API Token Value', accessor: 'key', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
                  { header: 'Scope', accessor: 'scope' },
                  { header: 'Created Date', accessor: 'created' },
                  {
                    header: 'Status',
                    accessor: 'status',
                    renderCell: (val) => <StatusBadge status="low" text={val} />
                  },
                  {
                    header: 'Action',
                    accessor: 'id',
                    renderCell: (val) => (
                      <button 
                        onClick={() => revokeApiKey(val)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-critical)', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Revoke
                      </button>
                    )
                  }
                ]}
                data={apiKeys}
              />
            </div>
          </Panel>
        </div>
      )}

      {/* 2. THREAT CONNECTORS TAB */}
      {activeTab === 'connectors' && (
        <Panel title="Third-Party Intelligence Pipelines">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {connectors.map((conn, idx) => (
              <div 
                key={conn.name}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{conn.name}</span>
                    <StatusBadge status={conn.active ? 'low' : 'muted'} text={conn.active ? 'CONNECTED' : 'DISABLED'} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type: {conn.type}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>API AUTH TOKEN</label>
                  <input
                    type="password"
                    disabled={!conn.active}
                    value={conn.key}
                    placeholder="Enter integration token..."
                    style={{
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <button
                    onClick={() => toggleConnector(idx)}
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
                    {conn.active ? 'Disable Feed' : 'Activate Feed'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 3. SYSTEM HEALTH TAB */}
      {activeTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
          
          {/* Queues and background tasks logs */}
          <Panel title="Broker Queue & Telemetry Processing health">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>FastAPI Engine CPU</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-low)' }}>{systemHealth.fastApiLoad}</span>
                </div>
                <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Redis Memory state</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-low)' }}>{systemHealth.redisState} ({systemHealth.redisMemory})</span>
                </div>
                <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Active WebSockets</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-blue-hover)' }}>{systemHealth.websocketCount} Clients</span>
                </div>
                <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Worker Queue (Celery)</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-low)' }}>{systemHealth.celeryQueueSize} tasks queued</span>
                </div>
              </div>

              <div style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>BACKGROUND JOBS DAEMON</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{systemHealth.celeryWorkerStatus} (Executing honeypot queries hourly)</span>
              </div>
            </div>
          </Panel>

          {/* Database & Logs storage allocations */}
          <Panel title="Storage & Logging Statistics">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>PostgreSQL DB Storage Usage:</span>
                  <strong>{systemHealth.postgresStorage}</strong>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '24%', height: '100%', backgroundColor: 'var(--color-blue)' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Telemetry Log Indexes (InfluxDB):</span>
                  <strong>{systemHealth.influxLogsCount}</strong>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Retention policy: 90 days automatic log deletion</span>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* 4. SELF-HOSTED DEPLOYMENT TAB */}
      {activeTab === 'deployment' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }}>
          
          {/* Docker Compose YAML code */}
          <Panel title="Docker Compose Architecture Spec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Deploy ThreatStream locally using standard self-hosted containers.
              </span>
              <pre style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '12px',
                overflowX: 'auto',
                lineHeight: '1.4',
                maxHeight: '400px'
              }}>
{`version: '3.8'

services:
  # Web API & WebSocket Server
  api:
    image: threatstream/api:latest
    build: ./api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://threat_user:ts_pass@postgres:5432/threatstream
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  # Background Ingestion Workers
  worker:
    image: threatstream/api:latest
    command: celery -A workers.tasks worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://threat_user:ts_pass@postgres:5432/threatstream
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  # State Cache Broker
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Core Relational Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: threat_user
      POSTGRES_PASSWORD: ts_pass
      POSTGRES_DB: threatstream
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:`}
              </pre>
            </div>
          </Panel>

          {/* Deployment guidelines */}
          <Panel title="Deployment Guidelines">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>1. Environment Configuration</strong>
                <span>Create a local <code>.env</code> file containing details for PostgreSQL DB credentials and Redis cache endpoints. Connect threat APIs inside the Connectors panel.</span>
              </div>
              
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>2. Initialize Database Schema</strong>
                <span>Migrate tables using Alembic CLI tools:</span>
                <pre style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-blue-hover)', marginTop: '4px' }}>
                  docker-compose exec api alembic upgrade head
                </pre>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>3. Network Security Boundary</strong>
                <span>Bind the main FastAPI server to localhost or run under Nginx reverse proxy using SSL certificates. Restrict ingress ports of database engines to internal networks.</span>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Administration;
