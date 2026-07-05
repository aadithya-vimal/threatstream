import React, { useState, useEffect } from 'react';
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
import { IncidentService, ReportGenerator } from '../services/IncidentService';

const incidentService = new IncidentService();

export const Incidents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Incident Case State
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Evidence upload mock
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceList, setEvidenceList] = useState([]);

  // Report Generator modal display
  const [markdownReport, setMarkdownReport] = useState(null);

  // Async States
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load incidents asynchronously on mount
  useEffect(() => {
    const fetchIncidents = async () => {
      setIsLoading(true);
      try {
        const list = await incidentService.getIncidents();
        setIncidents(list);
      } catch (err) {
        console.error('Failed to load incident tickets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      const inc = incidents.find(i => i.id === selectedIncidentId);
      setSelectedIncident(inc);
      setEvidenceList(inc.evidence);
    } else {
      setSelectedIncident(null);
      setEvidenceList([]);
    }
    setMarkdownReport(null);
  }, [selectedIncidentId, incidents]);

  // Filters
  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inc.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Incident ID', accessor: 'id', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { header: 'Summary Description', accessor: 'summary' },
    {
      header: 'Severity',
      accessor: 'severity',
      renderCell: (val) => <StatusBadge status={val} text={val} />
    },
    {
      header: 'Incident Status',
      accessor: 'status',
      renderCell: (val) => {
        let badgeSev = 'info';
        if (val === 'Active') badgeSev = 'critical';
        else if (val === 'Investigating') badgeSev = 'high';
        else if (val === 'Mitigated') badgeSev = 'low';
        else if (val === 'Closed') badgeSev = 'success';
        return <StatusBadge status={badgeSev} text={val} />;
      }
    },
    { header: 'Owner Assigned', accessor: 'owner' },
    { header: 'Logged Date', accessor: 'date' }
  ];

  // Mock Evidence Adding Handler
  const handleAddEvidence = (e) => {
    e.preventDefault();
    if (!evidenceName.trim()) return;

    const newEvidence = {
      name: evidenceName,
      type: 'Incident Attachment',
      size: `${Math.floor(Math.random() * 500) + 12} KB`,
      addedBy: 'Admin Vimal',
      date: new Date().toISOString().split('T')[0]
    };

    setEvidenceList([...evidenceList, newEvidence]);
    setEvidenceName('');
  };

  // Compile Incident Report
  const generateCaseReport = () => {
    if (!selectedIncident) return;
    // Bundle the current UI evidence states back into the incident object
    const incidentToReport = {
      ...selectedIncident,
      evidence: evidenceList
    };
    const md = ReportGenerator.generateMarkdownReport(incidentToReport);
    setMarkdownReport(md);
  };

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Incident Case Management" 
        description="Monitor active tickets, collect logs evidence, log timelines, and generate audit reports."
      />

      {/* Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Total Open Cases" value="2 Tickets" status="critical" subtitle="Assigned to SecOps queue" />
        <MetricCard title="Investigating" value="1 Case" status="high" subtitle="Logs correlation active" />
        <MetricCard title="Mitigated Today" value="5 Closed" status="low" subtitle="Target MTTR achieved" />
        <MetricCard title="Avg Resolution Time" value="1.4 Hours" status="low" subtitle="Alert to triage completion" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedIncident ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr', gap: '24px', alignItems: 'stretch' }} className="dashboard-grid-layout">
        
        {/* Left Side: Incidents Table */}
        <Panel title="Incident Queue" actions={<span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click ticket to triage case</span>}>
          <FilterBar showClear={searchTerm || statusFilter !== 'ALL'} onClear={() => { setSearchTerm(''); setStatusFilter('ALL'); }}>
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Filter ID, description, owner..." style={{ maxWidth: '240px' }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Investigating">Investigating</option>
              <option value="Mitigated">Mitigated</option>
              <option value="Closed">Closed</option>
            </select>
          </FilterBar>

          <DataTable 
            columns={columns} 
            data={filteredIncidents} 
            onRowClick={(row) => setSelectedIncidentId(row.id)}
          />
        </Panel>

        {/* Right Side: Incident Details Inspector */}
        {selectedIncident && (
          <Panel 
            title={`Incident Profile: ${selectedIncident.id}`}
            actions={
              <button onClick={() => setSelectedIncidentId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} className="btn-icon-hover">
                <Icon name="cross" size={16} />
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* Incident Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedIncident.summary}</h3>
                  <StatusBadge status={selectedIncident.severity} text={selectedIncident.severity} />
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Owner: <strong>{selectedIncident.owner}</strong></span>
                  <span>|</span>
                  <span>Logged: <strong>{selectedIncident.date}</strong></span>
                </div>
              </div>

              {/* MITRE Mapping */}
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '2px' }}>
                  <span>MITRE ATT&CK: {selectedIncident.mitreMapping.name}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-blue-hover)' }}>{selectedIncident.mitreMapping.id}</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tactic Focus: {selectedIncident.mitreMapping.tactic}</span>
              </div>

              {/* Affected Assets */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AFFECTED INFRASTRUCTURE</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedIncident.affectedAssets.map((asset, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      <span>🖥️</span>
                      <span style={{ fontWeight: 600 }}>{asset}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Timeline */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CASE TIMELINE HISTORY</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '14px', position: 'relative' }}>
                  {selectedIncident.timeline.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '-18px', top: '4px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-blue)', border: '1px solid var(--bg-primary)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>
                        <span>{item.author}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{item.timestamp}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{item.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Cabinet */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EVIDENCE CABINET FILES</span>
                
                {/* Upload attachment Form */}
                <form onSubmit={handleAddEvidence} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    value={evidenceName}
                    onChange={e => setEvidenceName(e.target.value)}
                    placeholder="Attach file log name (e.g. dump.pcap)..."
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      padding: '6px 12px',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--color-blue)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Attach
                  </button>
                </form>

                {/* Evidence table listing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {evidenceList.map((e, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px' }}>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block', color: 'var(--color-blue-hover)' }}>📎 {e.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Size: {e.size} | Type: {e.type}</span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>By: {e.addedBy}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REMEDIATION PLAYBOOK ACTIONS</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedIncident.recommendations.map((rec, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>{idx + 1}.</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Case Report compiling Actions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Generate audit ready summary case file</span>
                <button
                  onClick={generateCaseReport}
                  style={{
                    backgroundColor: 'var(--color-blue)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  className="btn-primary-hover"
                >
                  <Icon name="reports" size={14} /> Generate Incident Report
                </button>
              </div>

              {/* Report display text box */}
              {markdownReport && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
                  <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', fontSize: '11px', fontWeight: 600 }}>
                    <span>COMPILED AUDIT REPORT (MARKDOWN)</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(markdownReport); alert('Report copied to clipboard!'); }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-blue-hover)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Copy
                    </button>
                  </div>
                  <pre style={{
                    color: '#a7f3d0',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    padding: '12px',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    lineHeight: '1.4'
                  }}>
                    {markdownReport}
                  </pre>
                </div>
              )}

            </div>
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Incidents;
