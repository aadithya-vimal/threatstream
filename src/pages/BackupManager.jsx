import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const INITIAL_BACKUPS = [
  { id: 'bak-1', name: 'ts_backup_20260705_0200', type: 'full', status: 'completed', size: '847 MB', tables: '44 tables', created: '2026-07-05 02:00:00', expires: '2026-08-04' },
  { id: 'bak-2', name: 'ts_backup_20260704_0200', type: 'full', status: 'completed', size: '831 MB', tables: '44 tables', created: '2026-07-04 02:00:00', expires: '2026-08-03' },
  { id: 'bak-3', name: 'ts_backup_20260705_1300', type: 'incremental', status: 'running', size: '-', tables: '-', created: '2026-07-05 13:00:00', expires: '2026-07-12' },
  { id: 'bak-4', name: 'ts_backup_20260703_0200', type: 'full', status: 'completed', size: '812 MB', tables: '44 tables', created: '2026-07-03 02:00:00', expires: '2026-08-02' },
  { id: 'bak-5', name: 'ts_config_20260705', type: 'config', status: 'completed', size: '24 KB', tables: 'connectors, config', created: '2026-07-05 09:00:00', expires: '2026-10-03' }
];

const VERSION_HISTORY = [
  { version: 'v2.0.0 (Current)', date: '2026-07-05', channel: 'Production', features: 'Threat Analysis Platform, YARA Platform, IOC Enrichment, Graph Investigation' },
  { version: 'v1.9.0', date: '2026-06-28', channel: 'Production', features: 'Incident Response, Case Management, Forensics, Playbooks' },
  { version: 'v1.8.0', date: '2026-06-21', channel: 'Production', features: 'Endpoint Telemetry, Detection Engineering, Alert Lifecycle' },
  { version: 'v1.7.0', date: '2026-06-14', channel: 'Production', features: 'Asset Intelligence, Attack Surface Management, Risk Engine' },
  { version: 'v1.6.0', date: '2026-06-07', channel: 'Production', features: 'Threat Intelligence Platform, IOC Explorer, MITRE Integration' },
  { version: 'v1.0.0', date: '2026-05-01', channel: 'Production', features: 'Initial release - Dashboard, Globe, Live Feed' }
];

export const BackupManager = () => {
  const [backups, setBackups] = useState(INITIAL_BACKUPS);
  const [activeTab, setActiveTab] = useState('backups');
  
  // Restore flow states
  const [selectedBackupId, setSelectedBackupId] = useState('');
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoringStatus, setRestoringStatus] = useState('');

  // Schedule settings
  const [scheduleType, setScheduleType] = useState('daily');
  const [retentionDays, setRetentionDays] = useState(30);

  const handleCreateBackup = (type) => {
    const timeStr = new Date().toISOString().slice(0, 10).replace(/-/g, '') + '_' + new Date().toTimeString().slice(0, 5).replace(/:/g, '');
    const newBak = {
      id: `bak-${Date.now()}`,
      name: `ts_${type}_${timeStr}_manual`,
      type,
      status: 'completed',
      size: type === 'config' ? '12 KB' : '848 MB',
      tables: type === 'config' ? 'connectors, config' : '44 tables',
      created: new Date().toISOString().replace('T', ' ').slice(0, 19),
      expires: new Date(Date.now() + retentionDays * 86400000).toISOString().slice(0, 10)
    };
    setBackups([newBak, ...backups]);
  };

  const handleDeleteBackup = (id) => {
    setBackups(prev => prev.filter(b => b.id !== id));
  };

  const handleTriggerRestore = () => {
    if (restoreConfirmText !== 'RESTORE') return;
    setRestoringStatus('running');
    setTimeout(() => {
      setRestoringStatus('completed');
    }, 2000);
  };

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Backup, Recovery & Version Lifecycle Manager" 
        subtitle="Manage secure backup archives, restore configurations, schedule auto-backups, and monitor software updates."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <MetricCard title="Last Backup Done" value="2 hours ago" change="Auto-backup daily" icon="check" />
        <MetricCard title="Next Scheduled Backup" value="In 22 hours" change="At 02:00 AM UTC" icon="clock" />
        <MetricCard title="Total Backups Count" value="47" change="2.4 GB storage used" icon="database" />
        <MetricCard title="Retention Limit" value="30 Days" change="Auto-cleanup configured" icon="filter" />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '20px',
        gap: '16px'
      }}>
        {['backups', 'restore', 'versions', 'schedule'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Backup tab */}
      {activeTab === 'backups' && (
        <Panel title="Platform Archive Backups">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button 
              onClick={() => handleCreateBackup('full')}
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              Trigger Full Backup
            </button>
            <button 
              onClick={() => handleCreateBackup('config')}
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              Backup Config Only
            </button>
          </div>

          <DataTable
            headers={[
              { key: 'name', label: 'Backup Archive Name' },
              { key: 'type', label: 'Type' },
              { key: 'status', label: 'Status' },
              { key: 'size', label: 'Size' },
              { key: 'tables', label: 'Tables' },
              { key: 'created', label: 'Created At' },
              { key: 'expires', label: 'Expires' },
              { key: 'actions', label: 'Actions' }
            ]}
            data={backups.map(b => ({
              ...b,
              name: <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{b.name}</span>,
              type: <span style={{ textTransform: 'uppercase', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)' }}>{b.type}</span>,
              status: <StatusBadge value={b.status} />,
              actions: (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {b.status === 'completed' && (
                    <>
                      <button style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}>
                        Download
                      </button>
                      <button 
                        onClick={() => handleDeleteBackup(b.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--color-red)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {b.status === 'running' && (
                    <button style={{
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      cursor: 'not-allowed',
                      fontSize: '11px'
                    }} disabled>
                      Processing...
                    </button>
                  )}
                </div>
              )
            }))}
          />
        </Panel>
      )}

      {/* Restore tab */}
      {activeTab === 'restore' && (
        <div style={{ maxWidth: '600px' }}>
          <Panel title="Restore Platform Database Configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--color-red)',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                ⚠️ <strong>CRITICAL WARNING:</strong> Restoring database contents will overwrite all active system configurations, incidents lists, asset histories, and telemetry logs. This cannot be undone.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Select Target Backup Archive</label>
                <select
                  value={selectedBackupId}
                  onChange={(e) => setSelectedBackupId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                >
                  <option value="">-- Choose Completed Backup --</option>
                  {backups.filter(b => b.status === 'completed').map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.size})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Confirm Actions: Type <strong>RESTORE</strong> below to proceed
                </label>
                <input
                  type="text"
                  placeholder="RESTORE"
                  value={restoreConfirmText}
                  onChange={(e) => setRestoreConfirmText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>

              <button
                onClick={handleTriggerRestore}
                disabled={restoreConfirmText !== 'RESTORE' || !selectedBackupId || restoringStatus === 'running'}
                style={{
                  padding: '12px',
                  backgroundColor: restoreConfirmText === 'RESTORE' && selectedBackupId ? 'var(--color-red)' : 'var(--bg-tertiary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: restoreConfirmText === 'RESTORE' && selectedBackupId ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: '700',
                  textAlign: 'center'
                }}
              >
                {restoringStatus === 'running' ? 'Restoring Database...' : 'Execute Database Restore'}
              </button>

              {restoringStatus === 'completed' && (
                <span style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: 'var(--color-green)' }}>
                  ✅ Database restore completed successfully. Platform refreshed.
                </span>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Versions tab */}
      {activeTab === 'versions' && (
        <Panel title="Platform Release History">
          <DataTable
            headers={[
              { key: 'version', label: 'Platform Version' },
              { key: 'date', label: 'Release Date' },
              { key: 'channel', label: 'Update Channel' },
              { key: 'features', label: 'Modules & Feature Notes' }
            ]}
            data={VERSION_HISTORY.map(v => ({
              ...v,
              version: <strong style={{ color: 'var(--accent)' }}>{v.version}</strong>
            }))}
          />
        </Panel>
      )}

      {/* Schedule tab */}
      {activeTab === 'schedule' && (
        <div style={{ maxWidth: '600px' }}>
          <Panel title="Auto-Backup Schedule Configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Schedule Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['hourly', 'daily', 'weekly'].map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="radio" 
                        name="schedule" 
                        value={t} 
                        checked={scheduleType === t} 
                        onChange={() => setScheduleType(t)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Backup Retention: <strong>{retentionDays} Days</strong>
                </label>
                <input
                  type="range"
                  min="7"
                  max="90"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  alignSelf: 'start'
                }}
              >
                Save Schedule Settings
              </button>
            </div>
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BackupManager;
