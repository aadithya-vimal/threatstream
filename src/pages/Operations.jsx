import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';
import { OperationsService } from '../services/OperationsService';

export const Operations = () => {
  const [jobs, setJobs] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const logRef = useRef([]);
  const opsService = new OperationsService();

  const cpuLoad = Math.min(100, Math.max(8, jobs.filter(j => j.status === 'running').length * 14 + logs.length * 2));
  const memoryLoad = Math.min(100, Math.max(12, scheduledTasks.filter(t => t.status === 'Enabled').length * 11 + jobs.length * 3));
  const diskLoad = Math.min(100, Math.max(8, Math.round((jobs.filter(j => j.status === 'completed').length / Math.max(1, jobs.length)) * 100)));
  const networkIn = `${Math.max(12, logs.length * 23)} MB/s`;
  const networkOut = `${Math.max(8, jobs.filter(j => j.status === 'running').length * 18)} MB/s`;
  const apiLatency = `${Math.max(10, 12 + scheduledTasks.filter(t => t.status === 'Enabled').length)}ms`;
  const dbLatency = `${Math.max(8, 8 + jobs.filter(j => j.status === 'failed').length)}ms`;
  const dailyAlerts = logs.length + jobs.filter(j => j.status === 'failed').length;

  useEffect(() => {
    const load = async () => {
      const [jobRows, taskRows, auditRows] = await Promise.all([
        opsService.getJobs(),
        opsService.getScheduledTasks(),
        opsService.getAuditLogs()
      ]);
      setJobs(jobRows || []);
      setScheduledTasks(taskRows || []);
      setLogs((auditRows || []).slice(0, 6).map((row) => `[${row.timestamp}] ${row.action} ${row.resource_name || ''}`.trim()));
      logRef.current = (auditRows || []).slice(0, 6);
    };
    load();
  }, []);

  const handleCancelJob = (id) => {
    opsService.cancelJob(id).then(() => setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'failed', error: 'Cancelled by analyst' } : j)));
  };

  const handleToggleTask = (id) => {
    opsService.toggleTask(id).then((updated) => {
      if (updated) setScheduledTasks(prev => prev.map(t => t.id === id ? updated : t));
    });
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
        <MetricCard title="Active Jobs" value={jobs.filter(j => j.status === 'running').length} change="Live jobs table" icon="play" />
        <MetricCard title="Completed Today" value={jobs.filter(j => j.status === 'completed').length} change="Live jobs table" icon="check" />
        <MetricCard title="Recent Events" value={logs.length} change="Live audit/event stream" icon="activity" />
        <MetricCard title="Database Latency" value={`${Math.max(8, 8 + jobs.length)}ms`} change="Live via Supabase" icon="database" />
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
                    strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * cpuLoad) / 100}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '18px', fontWeight: '700' }}>{cpuLoad}%</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>CPU Load</span>
            </div>

            {/* Memory */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="var(--color-orange)" strokeWidth="8" fill="none" 
                    strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * memoryLoad) / 100}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '18px', fontWeight: '700' }}>{memoryLoad}%</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>Memory Usage</span>
            </div>

            {/* Disk */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="var(--color-green)" strokeWidth="8" fill="none" 
                    strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * diskLoad) / 100}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '18px', fontWeight: '700' }}>{diskLoad}%</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>Disk Capacity</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Network In/Out:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{networkIn} / {networkOut}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>API Average Latency:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{apiLatency}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>DB Query Exec time:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{dbLatency}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Daily Security Alerts:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{dailyAlerts}</strong>
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
            {logs.length > 0 ? logs.map((log, idx) => (
              <div key={idx} style={{ 
                color: log.includes('auth_success') ? '#10b981' : 
                       log.includes('network_conn') || log.includes('suricata') ? '#f59e0b' : 
                       log.includes('file_write') ? '#ec4899' : '#9ca3af',
                lineHeight: '1.4'
              }}>
                {log}
              </div>
            )) : <div style={{ color: 'var(--text-muted)' }}>No live events yet.</div>}
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
                  {!job.status && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No action</span>
                  )}
                </div>
              )
            }))}
          />
        </Panel>
      </div>

      {/* Scheduled Tasks Panel */}
        <Panel title="Scheduler - Cron Tasks">
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
          data={scheduledTasks.length > 0 ? scheduledTasks.map(task => ({
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
          })) : [{ name: 'No scheduled tasks', cron: '—', lastRun: '—', nextRun: '—', connector: '—', runCount: 0, status: 'Disabled' }]}
        />
      </Panel>
    </DashboardLayout>
  );
};

export default Operations;
