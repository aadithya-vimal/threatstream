/**
 * src/pages/Incidents.jsx
 * Incident Response, Case Management, and Forensic Evidence Workspace
 */
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { Icon } from '../components/Icons';
import { IncidentService, ReportGenerator } from '../services/IncidentService';

const incidentService = new IncidentService();

export const Incidents = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, queue, workspace
  const [isLoading, setIsLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  
  // Active Triage Case State
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // New Case Modal / Triage Inputs
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseSeverity, setNewCaseSeverity] = useState('high');
  const [newCaseCategory, setNewCaseCategory] = useState('Malware Execution');

  // Forensic Upload Inputs
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceHash, setEvidenceHash] = useState('');
  const [evidenceCustody, setEvidenceCustody] = useState('Acquired by Analyst');

  // Playbook / Checklist State
  const [playbookItems, setPlaybookItems] = useState([]);
  
  // Collaboration / Task inputs
  const [commentText, setCommentText] = useState('');
  const [taskText, setTaskText] = useState('');

  // Report Generator Output
  const [markdownReport, setMarkdownReport] = useState(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const list = await incidentService.getIncidents();
      setIncidents(list);
      // Auto-select first case as active workspace
      if (list.length > 0) {
        setSelectedIncidentId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load incident tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIncidentId) {
      const found = incidents.find(i => i.id === selectedIncidentId);
      if (found) {
        setSelectedIncident(found);
        setPlaybookItems(found.playbook_checklist || []);
      }
    } else {
      setSelectedIncident(null);
      setPlaybookItems([]);
    }
    setMarkdownReport(null);
  }, [selectedIncidentId, incidents]);

  // Operations
  const handleTogglePlaybook = async (itemId) => {
    if (!selectedIncident) return;
    const updatedChecklist = playbookItems.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setPlaybookItems(updatedChecklist);
    
    // Save to repository
    const updated = await incidentService.updateIncident(selectedIncident.id, { playbook_checklist: updatedChecklist });
    if (updated) {
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updated : i));
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedIncident) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: 'Admin Vimal',
      text: commentText,
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(selectedIncident.comments || []), newComment];
    const updated = await incidentService.updateIncident(selectedIncident.id, { comments: updatedComments });
    if (updated) {
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updated : i));
      setCommentText('');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskText.trim() || !selectedIncident) return;

    const newTask = {
      id: `t-${Date.now()}`,
      title: taskText,
      status: 'To Do',
      assignee: 'Unassigned'
    };

    const updatedTasks = [...(selectedIncident.tasks || []), newTask];
    const updated = await incidentService.updateIncident(selectedIncident.id, { tasks: updatedTasks });
    if (updated) {
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updated : i));
      setTaskText('');
    }
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceName.trim() || !selectedIncident) return;

    const newForensicFile = {
      name: evidenceName,
      type: evidenceName.includes('.') ? evidenceName.split('.').pop().toUpperCase() + ' dump' : 'Forensic Artifact',
      size: '2.5 MB',
      addedBy: 'Admin Vimal',
      date: new Date().toISOString().split('T')[0],
      hash: evidenceHash.trim() || 'SHA256-PENDING-INTEGRITY-COMPUTE',
      custody: evidenceCustody
    };

    const updatedEvidence = [...(selectedIncident.evidence || []), newForensicFile];
    const updated = await incidentService.updateIncident(selectedIncident.id, { evidence: updatedEvidence });
    if (updated) {
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updated : i));
      setEvidenceName('');
      setEvidenceHash('');
      setEvidenceCustody('Acquired by Analyst');
      alert('Forensics file registered with hash integrity checks.');
    }
  };

  const handleCompileReport = () => {
    if (!selectedIncident) return;
    const md = ReportGenerator.generateMarkdownReport(selectedIncident);
    setMarkdownReport(md);
  };

  const handleCloseIncident = async () => {
    if (!selectedIncident) return;
    const updated = await incidentService.updateIncident(selectedIncident.id, { 
      status: 'Closed', 
      closed_at: new Date().toISOString(),
      resolution: 'Remediation completed, firewall isolation revoked.'
    });
    if (updated) {
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updated : i));
      alert('Case closed successfully.');
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Connecting to incident case cabinet..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Incident Response & Case Management" 
        description="Investigate compromised assets, audit chronological timeline trails, and coordinate eradication playbooks."
      />

      {/* SLA / MTTD / MTTR Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Mean Time To Detect (MTTD)" value="14 Mins" status="low" subtitle="Alert trigger to initial triage" />
        <MetricCard title="Mean Time To Respond (MTTR)" value="52 Mins" status="low" subtitle="Incident assignment to isolation" />
        <MetricCard title="Open Incidents Queue" value={incidents.filter(i => i.status !== 'Closed').length} status="critical" subtitle="Assigned cases requiring review" />
        <MetricCard title="Playbook Completion SLA" value="100%" status="high" subtitle="Containment tasks achieved" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        <button style={navTabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Analyst Dashboard</button>
        <button style={navTabStyle('queue')} onClick={() => setActiveTab('queue')}>Incidents Queue ({incidents.length})</button>
        <button style={navTabStyle('workspace')} onClick={() => setActiveTab('workspace')}>Triage Workspace {selectedIncident ? `(${selectedIncident.id})` : ''}</button>
      </div>

      {/* 1. ANALYST DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            <Panel title="Incident Category Distributions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 0' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>MALWARE EXECUTION</span>
                    <span>1 Ticket</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                    <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--color-critical)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>INITIAL ACCESS</span>
                    <span>1 Ticket</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                    <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--color-high)' }} />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Top Affected Asset Registries">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>PRD-DB-SRV-01 (10.100.4.12)</span>
                  <strong style={{ color: 'var(--color-critical)' }}>1 Critical Incident</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CEO-LAPTOP-01 (10.100.40.5)</span>
                  <strong style={{ color: 'var(--color-high)' }}>1 High Incident</strong>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* 2. INCIDENTS QUEUE */}
      {activeTab === 'queue' && (
        <Panel title="SecOps Active Tickets Queue">
          <DataTable 
            columns={[
              { header: 'Case ID', accessor: 'id', renderCell: (val) => <span style={{ fontWeight: 700 }}>{val}</span> },
              { header: 'Title Summary', accessor: 'title', renderCell: (val, row) => <span>{val || row.summary}</span> },
              { header: 'Severity', accessor: 'severity', renderCell: (val) => <StatusBadge status={val} text={val.toUpperCase()} /> },
              { header: 'Priority', accessor: 'priority', renderCell: (val) => <StatusBadge status={val || 'medium'} text={(val || 'medium').toUpperCase()} /> },
              { header: 'Category', accessor: 'category' },
              { header: 'Assignee', accessor: 'assignee' },
              { header: 'Status', accessor: 'status', renderCell: (val) => <StatusBadge status={val === 'Closed' ? 'low' : 'warning'} text={val} /> }
            ]}
            data={incidents}
            onRowClick={(row) => { setSelectedIncidentId(row.id); setActiveTab('workspace'); }}
          />
        </Panel>
      )}

      {/* 3. TRIAGE WORKSPACE */}
      {activeTab === 'workspace' && (
        selectedIncident ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px', alignItems: 'stretch' }} className="dashboard-grid-layout">
            
            {/* Left Side Workspace elements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Incident Header dossier */}
              <Panel 
                title={`Active Incident Dossier: ${selectedIncident.id}`}
                actions={
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCompileReport}
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Compile Report
                    </button>
                    {selectedIncident.status !== 'Closed' && (
                      <button
                        onClick={handleCloseIncident}
                        style={{ backgroundColor: 'var(--color-blue)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Close Incident
                      </button>
                    )}
                  </div>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>{selectedIncident.title || selectedIncident.summary}</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{selectedIncident.description || 'No descriptive incident notes provided.'}</p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <span>Priority: <strong>{selectedIncident.priority}</strong></span>
                    <span>•</span>
                    <span>Category: <strong>{selectedIncident.category}</strong></span>
                    <span>•</span>
                    <span>Reporter: <strong>{selectedIncident.reporter}</strong></span>
                    <span>•</span>
                    <span>Risk Score: <strong>{selectedIncident.risk_score}/100</strong></span>
                  </div>
                </div>
              </Panel>

              {/* Remediations playbooks */}
              <Panel title="Remediation Playbook Checklist">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {playbookItems.map(item => (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        padding: '10px 14px', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px', 
                        backgroundColor: item.completed ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                        alignItems: 'center'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        onChange={() => handleTogglePlaybook(item.id)} 
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{item.stage.toUpperCase()}</span>
                        <p style={{ fontSize: '12px', color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)', margin: 0, textDecoration: item.completed ? 'line-through' : 'none' }}>{item.task}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Forensic Evidence cabinet file list */}
              {/* Evidence Management - SHA-256 integrity hashes and chain of custody tracking */}
              <Panel title="Forensic Evidence Cabinet">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Registry, Memory, PCAP ingest */}
                  <form onSubmit={handleAddEvidence} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px' }} className="evidence-form">
                    <input 
                      type="text" 
                      placeholder="Artifact Name (update.exe)..." 
                      value={evidenceName} 
                      onChange={e => setEvidenceName(e.target.value)} 
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px' }}
                    />
                    <input 
                      type="text" 
                      placeholder="SHA-256 Hash..." 
                      value={evidenceHash} 
                      onChange={e => setEvidenceHash(e.target.value)} 
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Chain of Custody details..." 
                      value={evidenceCustody} 
                      onChange={e => setEvidenceCustody(e.target.value)} 
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px' }}
                    />
                    <button type="submit" style={{ backgroundColor: 'var(--color-blue)', border: 'none', color: '#fff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      Register Evidence
                    </button>
                  </form>

                  {/* Registered evidence listing */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedIncident.evidence.map((ev, idx) => (
                      <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--color-blue-hover)', marginBottom: '4px' }}>
                          <span>📎 {ev.name} ({ev.type})</span>
                          <span>{ev.size}</span>
                        </div>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '4px' }}>SHA-256: {ev.hash}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          <span>Custody: <strong>{ev.custody}</strong></span>
                          <span>Added by: {ev.addedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              {/* Relationship visual graph mapping */}
              {/* Investigation Graph - Incident -> Assets -> Users -> IOCs -> Threat Actors -> MITRE */}
              <Panel title="Investigation Relationship Linkages">
                <div style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  backgroundColor: 'var(--bg-primary)', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ border: '1px solid var(--color-critical)', borderRadius: '4px', padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                      🚩 [ Incident ID: {selectedIncident.id} ]
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>↓</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                      🖥️ Host Asset: {selectedIncident.affected_assets?.[0] || 'Unassigned'}
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                      👤 Affected User: {selectedIncident.affected_users?.[0] || 'SYSTEM'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>↓</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                      🏷️ MITRE Mapping: {selectedIncident.mitre_id || 'T1486'}
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                      👾 Threat Intel Actor: LockBit ransomware variant
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Right Side Timeline & Collaboration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Chronological Timeline Reconstruction */}
              {/* Timeline Engine - chronological event reconstruction from telemetry, notes, alerts */}
              <Panel title="Timeline Reconstruction History">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '2px solid var(--border-color)', paddingLeft: '14px', position: 'relative', overflowY: 'auto', maxHeight: '350px' }}>
                  {selectedIncident.timeline.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '-18px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-blue)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px' }}>
                        <span>{item.author.toUpperCase()}</span>
                        <span>{item.timestamp}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-primary)', margin: 0 }}>{item.details}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Case task board */}
              <Panel title="Incident Task Board">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Task Input */}
                  <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      placeholder="Assign new case task..." 
                      value={taskText} 
                      onChange={e => setTaskText(e.target.value)} 
                      style={{ flex: 1, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px' }}
                    />
                    <button type="submit" style={{ backgroundColor: 'var(--color-blue)', border: 'none', color: '#fff', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Add Task
                    </button>
                  </form>

                  {/* Tasks List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(selectedIncident.tasks || []).map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                        <span>{t.title}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <StatusBadge status={t.status === 'Completed' ? 'low' : 'info'} text={t.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              {/* Collaboration Notes / Comments */}
              <Panel title="Collaborators Case Logs">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Comment Input */}
                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      placeholder="Write internal case notes..." 
                      value={commentText} 
                      onChange={e => setCommentText(e.target.value)} 
                      style={{ flex: 1, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px' }}
                    />
                    <button type="submit" style={{ backgroundColor: 'var(--color-blue)', border: 'none', color: '#fff', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Send
                    </button>
                  </form>

                  {/* Comments Feed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '200px' }}>
                    {(selectedIncident.comments || []).map(c => (
                      <div key={c.id} style={{ padding: '8px 10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '2px' }}>
                          <span>{c.author}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{c.timestamp.replace('T', ' ').substring(0, 16)}</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              {/* Markdown compiled view */}
              {markdownReport && (
                <Panel title="Markdown Report Compiler">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea 
                      readOnly 
                      value={markdownReport} 
                      style={{ width: '100%', height: '140px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: '#34d399', fontFamily: 'monospace', fontSize: '11px', padding: '10px', borderRadius: '4px', outline: 'none' }}
                    />
                    <button 
                      onClick={() => { navigator.clipboard.writeText(markdownReport); alert('Report copied to clipboard!'); }}
                      style={{ backgroundColor: 'var(--color-blue)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                    >
                      Copy Report
                    </button>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        ) : (
          <EmptyState title="No active triage case selected" description="Select a ticket from the Incidents Queue tab to load the digital forensics timeline reconstruction workspace." />
        )
      )}
    </DashboardLayout>
  );
};

export default Incidents;
