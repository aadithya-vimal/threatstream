import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';
import { OperationsService } from '../services/OperationsService';

export const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const opsService = new OperationsService();

  useEffect(() => {
    const loadLogs = async () => {
      const rows = await opsService.getAuditLogs();
      setLogs(rows || []);
      setSelectedLog((rows || [])[0] || null);
    };
    loadLogs();
  }, []);

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
        <Panel title="Logs">
          <strong style={{ fontSize: '24px', color: 'var(--accent)' }}>{logs.length}</strong>
        </Panel>
        <Panel title="Warnings">
          <strong style={{ fontSize: '24px', color: 'var(--color-orange)' }}>{logs.filter(l => l.severity === 'warning').length}</strong>
        </Panel>
        <Panel title="Critical Events">
          <strong style={{ fontSize: '24px', color: 'var(--color-red)' }}>{logs.filter(l => l.severity === 'critical').length}</strong>
        </Panel>
        <Panel title="Unique Operators">
          <strong style={{ fontSize: '24px', color: 'var(--color-blue)' }}>{new Set(logs.map(l => l.user_email)).size} users</strong>
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
