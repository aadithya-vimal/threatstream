import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';

const INITIAL_JOBS = [
  { id: 'job-001', name: 'Nmap Full Network Scan', type: 'scan', status: 'running', progress: 67, connector: 'nmap', priority: 2, created: '13:01:05', duration: '4m 23s' },
  { id: 'job-002', name: 'Nuclei CVE Template Scan', type: 'scan', status: 'running', progress: 34, connector: 'nuclei', priority: 2, created: '13:03:10', duration: '2m 01s' },
  { id: 'job-003', name: 'IOC Enrichment Batch', type: 'enrich', status: 'queued', progress: 0, connector: 'virustotal', priority: 3, created: '13:04:30', duration: '-' },
  { id: 'job-004', name: 'Full Platform Backup', type: 'backup', status: 'completed', progress: 100, connector: 'system', priority: 1, created: '12:00:00', duration: '8m 14s' },
  { id: 'job-005', name: 'Threat Feed Update', type: 'collect', status: 'completed', progress: 100, connector: 'otx', priority: 3, created: '12:30:00', duration: '1m 44s' },
  { id: 'job-006', name: 'Weekly Executive Report', type: 'report', status: 'queued', progress: 0, connector: 'system', priority: 5, created: '13:05:00', duration: '-' },
  { id: 'job-007', name: 'Old Log Cleanup', type: 'cleanup', status: 'failed', progress: 0, connector: 'system', priority: 8, created: '11:00:00', duration: '0m 02s', error: 'Permission denied: /var/log/archive' },
  { id: 'job-008', name: 'OSQuery Fleet Collect', type: 'collect', status: 'running', progress: 89, connector: 'osquery', priority: 2, created: '12:55:00', duration: '5m 12s' }
];

const INITIAL_SCHEDULED_TASKS = [
  { id: 'task-1', name: 'Daily Full Backup', cron: '0 2 * * *', lastRun: '2026-07-05 02:00:00', nextRun: '2026-07-06 02:00:00', status: 'Enabled', connector: 'system', runCount: 365 },
  { id: 'task-2', name: 'Nuclei Scan Every 6h', cron: '0 */6 * * *', lastRun: '2026-07-05 12:00:00', nextRun: '2026-07-05 18:00:00', status: 'Enabled', connector: 'nuclei', runCount: 1247 },
  { id: 'task-3', name: 'Hourly Feed Update', cron: '0 * * * *', lastRun: '2026-07-05 13:00:00', nextRun: '2026-07-05 14:00:00', status: 'Enabled', connector: 'otx', runCount: 8760 },
  { id: 'task-4', name: 'Weekly Executive Report', cron: '0 9 * * 1', lastRun: '2026-06-29 09:00:00', nextRun: '2026-07-06 09:00:00', status: 'Enabled', connector: 'system', runCount: 52 },
  { id: 'task-5', name: 'Zeek PCAP Collect', cron: '*/5 * * * *', lastRun: '2026-07-05 13:05:00', nextRun: '2026-07-05 13:10:00', status: 'Enabled', connector: 'zeek', runCount: 52848 },
  { id: 'task-6', name: 'OSQuery Fleet Poll', cron: '*/15 * * * *', lastRun: '2026-07-05 13:00:00', nextRun: '2026-07-05 13:15:00', status: 'Enabled', connector: 'osquery', runCount: 17616 }
];

const STREAMING_LOGS = [
  "WIN-SRV01 process_create cmd.exe spawned by Office process",
  "LINUX-WEB01 network_conn Outbound connection to 185.220.101.44:4444",
  "DC-01 auth_success Admin login from 10.0.5.44",
  "WIN-HR-04 file_write update_agent.exe written to C:\\Windows\\Temp",
  "NIDS suricata_alert Potential SQL injection on database gateway",
  "LINUX-DB01 process_create mysqldump initiated by db_admin",
  "WIN-DEV09 registry_mod RunOnce startup key hijacked",
  "NIDS zeek_flow Large exfiltration flow detected to dropzone.net",
  "DC-02 service_create Malicious service scheduler.exe registered",
  "WIN-SRV01 system_audit Privileged access token generated for user: backup_srv"
];

export const Operations = () => {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [scheduledTasks, setScheduledTasks] = useState(INITIAL_SCHEDULED_TASKS);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  const logRef = useRef([]);

  useEffect(() => {
    // Populate logs initial state
    const initialLogs = Array.from({ length: 6 }).map((_, idx) => {
      const time = new Date(Date.now() - (6 - idx) * 5000).toLocaleTimeString();
      return `[${time}] ${STREAMING_LOGS[idx]}`;
    });
    setLogs(initialLogs);
    logRef.current = initialLogs;

    // Set up logs stream simulation
    const interval = setInterval(() => {
      const time = new Date().toLocaleTimeString();
      const randomLog = STREAMING_LOGS[Math.floor(Math.random() * STREAMING_LOGS.length)];
      const newEntry = `[${time}] ${randomLog}`;
      
      const updatedLogs = [...logRef.current.slice(1), newEntry];
      logRef.current = updatedLogs;
      setLogs(updatedLogs);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleCancelJob = (id) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'failed', error: 'Cancelled by analyst' } : j));
  };

  const handleToggleTask = (id) => {
    setScheduledTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'Enabled' ? 'Disabled' : 'Enabled' } : t));
  };

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'all') return true;
    return job.status === activeTab;
  });

  return (
    <DashboardLayout>
      <SectionHeader 
        title="System Operations Control Center" 
        subtitle="Monitor system load, background queue tasks, agent logs ingestion metrics, and connector health status."
      />

      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <MetricCard title="Active Background Jobs" value="3" change="Running on 3 collectors" icon="play" />
        <MetricCard title="Completed (Today)" value="47" change="100% success rate" icon="check" />
        <MetricCard title="Network Events Log Stream" value="2,847 eps" change="Aggregated stream rate" icon="activity" />
        <MetricCard title="Database Latency" value="12ms" change="99.9% uptime" icon="database" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', marginBottom: '24px' }}>
        {/* Left Side: System Metrics Gauges */}
        <Panel title="System Performance Load Snapshot">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center', padding: '10px 0' }}>
            {/* CPU */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="var(--color-green)" strokeWidth="8" fill="none" 
                    strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 34) / 100}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '18px', fontWeight: '700' }}>34%</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>CPU Load</span>
            </div>

            {/* Memory */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="var(--color-orange)" strokeWidth="8" fill="none" 
                    strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 67) / 100}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '18px', fontWeight: '700' }}>67%</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>Memory Usage</span>
            </div>

            {/* Disk */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="var(--color-green)" strokeWidth="8" fill="none" 
                    strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 42) / 100}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '18px', fontWeight: '700' }}>42%</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>Disk Capacity</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Network In/Out:</span>
              <strong style={{ color: 'var(--text-primary)' }}>847 MB/s / 232 MB/s</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>API Average Latency:</span>
              <strong style={{ color: 'var(--text-primary)' }}>12ms</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>DB Query Exec time:</span>
              <strong style={{ color: 'var(--text-primary)' }}>8ms</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Daily Security Alerts:</span>
              <strong style={{ color: 'var(--text-primary)' }}>14</strong>
            </div>
          </div>
        </Panel>

        {/* Right Side: Logs stream */}
        <Panel title="Live Events Stream Ingest">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#05070c',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '11px',
            height: '180px',
            overflowY: 'auto'
          }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ 
                color: log.includes('auth_success') ? '#10b981' : 
                       log.includes('network_conn') || log.includes('suricata') ? '#f59e0b' : 
                       log.includes('file_write') ? '#ec4899' : '#9ca3af',
                lineHeight: '1.4'
              }}>
                {log}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Jobs Queue Panel */}
      <div style={{ marginBottom: '24px' }}>
        <Panel title="Background Job execution queue">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            {['all', 'running', 'queued', 'completed', 'failed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: activeTab === tab ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <DataTable
            headers={[
              { key: 'id', label: 'Job ID' },
              { key: 'name', label: 'Job Name' },
              { key: 'type', label: 'Type' },
              { key: 'status', label: 'Status' },
              { key: 'progress', label: 'Progress' },
              { key: 'connector', label: 'Connector' },
              { key: 'duration', label: 'Duration' },
              { key: 'actions', label: 'Actions' }
            ]}
            data={filteredJobs.map(job => ({
              ...job,
              id: <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{job.id}</span>,
              type: <span style={{ textTransform: 'uppercase', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)' }}>{job.type}</span>,
              status: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {job.status === 'running' && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      display: 'inline-block',
                      animation: 'pulse 1.5s infinite'
                    }}></span>
                  )}
                  <StatusBadge value={job.status} />
                </span>
              ),
              progress: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${job.progress}%`, 
                      height: '100%', 
                      backgroundColor: job.progress < 80 ? 'var(--color-green)' : (job.progress < 95 ? 'var(--color-orange)' : 'var(--color-red)') 
                    }}></div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', width: '28px' }}>{job.progress}%</span>
                </div>
              ),
              connector: <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{job.connector}</span>,
              actions: (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {job.status === 'running' && (
                    <button 
                      onClick={() => handleCancelJob(job.id)}
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
                      Cancel
                    </button>
                  )}
                  {job.status === 'failed' && (
                    <button 
                      onClick={() => {
                        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'queued', progress: 0, error: null } : j));
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--color-green)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )
            }))}
          />
        </Panel>
      </div>

      {/* Scheduled Tasks Panel */}
      <Panel title="Scheduler - Cron Automation Tasks">
        <DataTable
          headers={[
            { key: 'name', label: 'Task Name' },
            { key: 'cron', label: 'Cron Expression' },
            { key: 'lastRun', label: 'Last Execution' },
            { key: 'nextRun', label: 'Next Scheduled' },
            { key: 'connector', label: 'Agent Connector' },
            { key: 'runCount', label: 'Executions Count' },
            { key: 'status', label: 'Trigger Status' }
          ]}
          data={scheduledTasks.map(task => ({
            ...task,
            cron: <span style={{ fontFamily: 'monospace', color: 'var(--color-blue)' }}>{task.cron}</span>,
            connector: <span style={{ fontFamily: 'monospace' }}>{task.connector}</span>,
            status: (
              <button
                onClick={() => handleToggleTask(task.id)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: task.status === 'Enabled' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                  color: task.status === 'Enabled' ? 'var(--color-green)' : 'var(--text-secondary)',
                  border: `1px solid ${task.status === 'Enabled' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(156, 163, 175, 0.2)'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {task.status}
              </button>
            )
          }))}
        />
      </Panel>
    </DashboardLayout>
  );
};

export default Operations;
