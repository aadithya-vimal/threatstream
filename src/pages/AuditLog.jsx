import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';

const INITIAL_AUDIT_LOGS = [
  { id: 'aud-001', timestamp: '2026-07-05 13:04:12', user_email: 'admin@acme.com', action: 'config_change', resource_type: 'connector', resource_id: 'nmap', resource_name: 'Nmap Scanner', ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0 (Windows NT 10.0)', severity: 'warning', details: { modified_fields: ['target_range', 'scan_speed'], reason: 'Network expansion' } },
  { id: 'aud-002', timestamp: '2026-07-05 13:02:44', user_email: 'analyst@acme.com', action: 'update', resource_type: 'incident', resource_id: 'inc-984', resource_name: 'LockBit 3.0 Ransomware Activity', ip_address: '10.0.12.98', user_agent: 'Mozilla/5.0 (Macintosh)', severity: 'info', details: { status: 'Mitigated', comments_added: 'Containment completed on target server.' } },
  { id: 'aud-003', timestamp: '2026-07-05 12:44:12', user_email: 'admin@acme.com', action: 'api_key_created', resource_type: 'user', resource_id: 'usr-1', resource_name: 'SOC Automation Key', ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0 (Windows NT 10.0)', severity: 'warning', details: { scope: ['read:intel', 'write:intel', 'read:incidents'], key_prefix: 'ts_live_ab12' } },
  { id: 'aud-004', timestamp: '2026-07-05 12:00:00', user_email: 'system', action: 'backup_complete', resource_type: 'backup', resource_id: 'ts_backup_20260705_0200', resource_name: 'Daily Auto-Backup', ip_address: '127.0.0.1', user_agent: 'ThreatStream System Daemon', severity: 'info', details: { size_bytes: 888127393, checksum: 'sha256:e3b0c442...' } },
  { id: 'aud-005', timestamp: '2026-07-05 11:30:15', user_email: 'hunter@acme.com', action: 'export', resource_type: 'ioc', resource_id: null, resource_name: 'Active C2 Domains', ip_address: '10.0.12.63', user_agent: 'Mozilla/5.0 (X11; Linux x86_64)', severity: 'info', details: { format: 'csv', count: 124 } },
  { id: 'aud-006', timestamp: '2026-07-05 10:45:00', user_email: 'hacker_attempts@xyz.com', action: 'login_failed', resource_type: 'user', resource_id: null, resource_name: 'admin', ip_address: '185.220.101.44', user_agent: 'Python-urllib/3.10', severity: 'warning', details: { failure_reason: 'Invalid password credential', attempt_count: 3 } },
  { id: 'aud-007', timestamp: '2026-07-05 09:15:30', user_email: 'admin@acme.com', action: 'admin_escalation', resource_type: 'user', resource_id: 'usr-4', resource_name: 'analyst@acme.com', ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0', severity: 'critical', details: { granted_roles: ['Global Administrator'], approved_by: 'admin@acme.com' } },
  { id: 'aud-008', timestamp: '2026-07-05 08:30:00', user_email: 'admin@acme.com', action: 'delete', resource_type: 'rule', resource_id: 'rule-7a1b', resource_name: 'Temporary_Mimikatz_Hunt', ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0', severity: 'warning', details: { deleted_rule_hash: '2fa9e8b7c' } }
];

export const AuditLog = () => {
  const [logs, setLogs] = useState(INITIAL_AUDIT_LOGS);
  const [selectedLog, setSelectedLog] = useState(INITIAL_AUDIT_LOGS[0]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesUser = userSearch === '' || log.user_email.toLowerCase().includes(userSearch.toLowerCase());
    return matchesSeverity && matchesAction && matchesUser;
  });

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Immutable Platform Audit Trail" 
        subtitle="Review security administration operations, configuration drift histories, database updates, and export logs."
      />

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <Panel title="Logs (Today)">
          <strong style={{ fontSize: '24px', color: 'var(--accent)' }}>1,247</strong>
        </Panel>
        <Panel title="Warnings">
          <strong style={{ fontSize: '24px', color: 'var(--color-orange)' }}>14</strong>
        </Panel>
        <Panel title="Critical Events">
          <strong style={{ fontSize: '24px', color: 'var(--color-red)' }}>2</strong>
        </Panel>
        <Panel title="Unique Operators">
          <strong style={{ fontSize: '24px', color: 'var(--color-blue)' }}>8 users</strong>
        </Panel>
      </div>

      {/* Filter panel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        marginBottom: '20px',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <option value="all">All Actions</option>
            <option value="config_change">Config Change</option>
            <option value="update">Update</option>
            <option value="api_key_created">API Key Create</option>
            <option value="backup_complete">Backup Complete</option>
            <option value="export">Export</option>
            <option value="login_failed">Login Failed</option>
            <option value="admin_escalation">Admin Escalation</option>
            <option value="delete">Delete</option>
          </select>

          <input
            type="text"
            placeholder="Search by operator email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              width: '220px'
            }}
          />
        </div>

        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px'
        }}>
          <Icon name="download" size={14} /> Export CSV
        </button>
      </div>

      {/* Main Content Area: Left list, Right inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', height: 'calc(100vh - 350px)', minHeight: '500px' }}>
        <div style={{ overflowY: 'auto' }}>
          <Panel title="Audit Records Grid">
            <DataTable
              headers={[
                { key: 'timestamp', label: 'Timestamp' },
                { key: 'severity', label: 'Severity' },
                { key: 'user_email', label: 'Operator' },
                { key: 'action', label: 'Action' },
                { key: 'resource_type', label: 'Resource' },
                { key: 'resource_name', label: 'Target Name' }
              ]}
              data={filteredLogs.map(log => ({
                ...log,
                timestamp: (
                  <span 
                    onClick={() => setSelectedLog(log)} 
                    style={{ color: 'var(--accent)', cursor: 'pointer', fontFamily: 'monospace', fontWeight: '600' }}
                  >
                    {log.timestamp}
                  </span>
                ),
                severity: <StatusBadge value={log.severity} />,
                action: <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{log.action}</span>,
                resource_type: <span style={{ textTransform: 'uppercase', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)' }}>{log.resource_type}</span>
              }))}
            />
          </Panel>
        </div>

        {/* Selected Log JSON Details */}
        <div>
          {selectedLog ? (
            <Panel title="Event Details Inspector">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Event UUID: {selectedLog.id}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <strong style={{ fontSize: '14px' }}>{selectedLog.action.replace('_', ' ').toUpperCase()}</strong>
                    <StatusBadge value={selectedLog.severity} />
                  </div>
                </div>

                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Operator:</span>
                    <strong>{selectedLog.user_email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>IP Address:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{selectedLog.ip_address}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>User Agent:</span>
                    <strong style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }} title={selectedLog.user_agent}>
                      {selectedLog.user_agent}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Resource Class:</span>
                    <strong style={{ textTransform: 'uppercase' }}>{selectedLog.resource_type}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Target Name:</span>
                    <strong>{selectedLog.resource_name}</strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Audit Log Details Payload</h4>
                  <pre style={{
                    margin: 0,
                    padding: '12px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#10b981',
                    fontFamily: 'monospace',
                    overflowX: 'auto'
                  }}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel title="Event Details Inspector">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-secondary)' }}>
                <Icon name="auditlog" size={24} style={{ marginBottom: '8px' }} />
                <span>Select an audit record to inspect details.</span>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLog;
