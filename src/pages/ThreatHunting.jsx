import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';
import { TelemetryService } from '../services/TelemetryService';

const telemetryService = new TelemetryService();

export const ThreatHunting = () => {
  const [activeTab, setActiveTab] = useState('console');
  
  // Query Editor States
  const [queryText, setQueryText] = useState(
    '// Query all host event telemetry logs\nProcess\n| where Hostname == "WIN10-DESK-294"\n| order by Timestamp desc'
  );
  const [searchResults, setSearchResults] = useState(telemetryService.getTelemetryEventsSync('Process\n| where Hostname == "WIN10-DESK-294"'));
  const [queryError, setQueryError] = useState(null);

  // Detection Rules Async State
  const [selectedRuleId, setSelectedRuleId] = useState('rule-001');
  const [rules, setRules] = useState([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);

  // Load rules on mount
  React.useEffect(() => {
    const fetchRules = async () => {
      setIsLoadingRules(true);
      try {
        const list = await telemetryService.getRules();
        setRules(list);
      } catch (err) {
        console.error('Failed to load rules:', err);
      } finally {
        setIsLoadingRules(false);
      }
    };
    fetchRules();
  }, []);

  const executeSearchQuery = () => {
    setQueryError(null);
    try {
      const results = telemetryService.getTelemetryEventsSync(queryText);
      setSearchResults(results);
    } catch (err) {
      setQueryError(err.message);
    }
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

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      renderCell: (val) => (
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
          {val.replace('T', ' ').replace('Z', '')}
        </span>
      )
    },
    { header: 'Host', accessor: 'hostname', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { header: 'User', accessor: 'user', renderCell: (val) => <span style={{ color: 'var(--text-secondary)' }}>{val}</span> },
    {
      header: 'Event Type',
      accessor: 'type',
      renderCell: (val) => {
        let status = 'info';
        if (val.includes('Process')) status = 'low';
        else if (val.includes('Auth')) status = 'medium';
        else if (val.includes('Registry')) status = 'warning';
        return <StatusBadge status={status} text={val} />;
      }
    },
    { header: 'Telemetry Log Details', accessor: 'details', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>{val}</span> }
  ];

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Threat Hunting Console" 
        description="Search global security telemetry networks, run KQL queries, and manage Sigma/YARA detection rules."
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px' }}>
        <button style={navTabStyle('console')} onClick={() => setActiveTab('console')}>Query Console</button>
        <button style={navTabStyle('rules')} onClick={() => setActiveTab('rules')}>Detection Rules (Sigma / YARA)</button>
      </div>

      {/* 1. QUERY CONSOLE TAB */}
      {activeTab === 'console' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Query Editor */}
          <Panel 
            title="Telemetry Search Console (KQL Engine)"
            actions={
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setQueryText('// Select outbound DNS requests\nDNS\n| where Query contains "ru"\n| limit 10')}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Template
                </button>
                <button
                  onClick={executeSearchQuery}
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
                  className="btn-primary-hover"
                >
                  <Icon name="terminal" size={12} /> Execute Query
                </button>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                style={{
                  height: '160px',
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
                  Error parsing query: {queryError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Use standard pipeline syntax (| where, | limit, | order by)</span>
                <span>Active index: host-telemetry-*</span>
              </div>
            </div>
          </Panel>

          {/* Search results */}
          <Panel title={`Query Results (${searchResults.length} events matching)`}>
            <DataTable columns={columns} data={searchResults} emptyText="No events found matching the search query." />
          </Panel>
        </div>
      )}

      {/* 2. DETECTION RULES TAB */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: '24px' }}>
          
          {/* Rules directory list */}
          <Panel title="Active Detections Library">
            <DataTable
              columns={[
                { header: 'Rule Name', accessor: 'name', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
                {
                  header: 'Rule Type',
                  accessor: 'type',
                  renderCell: (val) => <StatusBadge status="info" text={val} />
                },
                {
                  header: 'Severity',
                  accessor: 'severity',
                  renderCell: (val) => <StatusBadge status={val} text={val} />
                },
                {
                  header: 'MITRE Mapping',
                  accessor: 'mitreMapping',
                  renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{val.id}</span>
                },
                {
                  header: 'Status',
                  accessor: 'status',
                  renderCell: (val) => <StatusBadge status={val === 'Active' ? 'low' : 'medium'} text={val} />
                }
              ]}
              data={rules}
              onRowClick={(row) => setSelectedRuleId(row.id)}
            />
          </Panel>

          {/* Rule editor / viewer details */}
          {selectedRuleId && (
            <Panel
              title="Rule Configuration & Mapping Profile"
              actions={
                <button
                  onClick={() => alert('Rule editing locked. Deploy rule updates via CI/CD pipelines.')}
                  style={{
                    backgroundColor: 'var(--color-blue)',
                    border: 'none',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{rule.name}</h3>
                        <StatusBadge status={rule.severity} text={rule.severity} />
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                        {rule.description}
                      </p>
                    </div>

                    {/* MITRE Map indicator */}
                    <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>MITRE ATT&CK Technique: {rule.mitreMapping.name}</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--color-blue-hover)' }}>{rule.mitreMapping.id}</span>
                      </div>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Tactic: {rule.mitreMapping.tactic}
                      </span>
                    </div>

                    {/* Code rule definition */}
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>RULE FILE DEFINITION</span>
                      <pre style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        padding: '12px',
                        overflowX: 'auto',
                        lineHeight: '1.4',
                        maxHeight: '300px'
                      }}>
                        {rule.definition}
                      </pre>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Author: <strong>{rule.author}</strong> | Created Date: <strong>{rule.created}</strong>
                    </div>
                  </div>
                );
              })()}
            </Panel>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ThreatHunting;
