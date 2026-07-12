/**
 * src/pages/ThreatIntelligence.jsx
 * Enterprise Threat Intelligence Platform (TIP) Module
 */
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { Icon } from '../components/Icons';
import { ThreatService } from '../services/ThreatService';
import { OperationsService } from '../services/OperationsService';

const threatService = new ThreatService();
const operationsService = new OperationsService();

export const ThreatIntelligence = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, explorer, actors, campaigns, malware, connectors
  const [isLoading, setIsLoading] = useState(true);
  
  // Data States
  const [iocs, setIocs] = useState([]);
  const [actors, setActors] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [malware, setMalware] = useState([]);
  const [stats, setStats] = useState({ total: 0, confidenceAvg: 0, critical: 0 });

  // Explorer UI States
  const [explorerQuery, setExplorerQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // table, card
  const [selectedIOCs, setSelectedIOCs] = useState([]);
  const [selectedIOCDetails, setSelectedIOCDetails] = useState(null);
  const [correlations, setCorrelations] = useState([]);

  // Connectors Status State (Plugin Interface Stubs)
  const [connectors, setConnectors] = useState([]);

  useEffect(() => {
    const loadPlatformIntel = async () => {
      setIsLoading(true);
      try {
        const [fetchedIOCs, fetchedActors, fetchedCampaigns, fetchedMalware, intelStats] = await Promise.all([
          threatService.getIOCs(),
          threatService.getThreatActors(),
          threatService.getCampaigns(),
          threatService.getMalwareFamilies(),
          threatService.getIntelStats()
        ]);

        setIocs(fetchedIOCs);
        setActors(fetchedActors);
        setCampaigns(fetchedCampaigns);
        setMalware(fetchedMalware);
        setStats(intelStats);
        setConnectors(await operationsService.getConnectors());
      } catch (err) {
        console.error('Failed to resolve threat intelligence catalog:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlatformIntel();
  }, []);

  const handleSelectIOC = async (ioc) => {
    setSelectedIOCDetails(ioc);
    try {
      const related = await threatService.getIOCCorrelations(ioc.id);
      setCorrelations(related);
    } catch (err) {
      console.error('Failed to load correlations:', err);
      setCorrelations([]);
    }
  };

  const handleBulkSelect = (id) => {
    setSelectedIOCs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIOCs.length === filteredIOCs.length) {
      setSelectedIOCs([]);
    } else {
      setSelectedIOCs(filteredIOCs.map(i => i.id));
    }
  };

  // Bulk Export STIX 2.1 Utility
  const handleExportSTIX = () => {
    if (selectedIOCs.length === 0) {
      alert('Select one or more indicators to export.');
      return;
    }
    const selectedData = iocs.filter(i => selectedIOCs.includes(i.id));
    
    // Compile STIX 2.1 Bundle Object
    const stixBundle = {
      type: 'bundle',
      id: `bundle--${crypto.randomUUID()}`,
      spec_version: '2.1',
      objects: selectedData.map(ioc => ({
        type: 'indicator',
        id: `indicator--${ioc.id}`,
        created: ioc.created_at || new Date().toISOString(),
        modified: ioc.updated_at || new Date().toISOString(),
        name: ioc.value,
        description: ioc.description || 'ThreatStream IOC Import',
        indicator_types: [ioc.ioc_type?.toLowerCase() === 'hash' ? 'file-hash-malicious' : 'malicious-activity'],
        pattern: ioc.ioc_type?.toLowerCase() === 'ip' 
          ? `[ipv4-addr:value = '${ioc.value}']` 
          : ioc.ioc_type?.toLowerCase() === 'domain' 
            ? `[domain-name:value = '${ioc.value}']` 
            : `[file:hashes.'SHA-256' = '${ioc.value}']`,
        pattern_type: 'stix',
        valid_from: ioc.created_at || new Date().toISOString(),
        confidence: ioc.confidence
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stixBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `threatstream_stix_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (selectedIOCs.length === 0) {
      alert('Select one or more indicators to export.');
      return;
    }
    const selectedData = iocs.filter(i => selectedIOCs.includes(i.id));
    const csvRows = [
      ['ID', 'Value', 'Type', 'Severity', 'Confidence', 'Source Feed', 'Description'],
      ...selectedData.map(i => [i.id, i.value, i.ioc_type, i.severity, i.confidence, i.source_feed, i.description])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `threatstream_ioc_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const toggleConnectorActive = (id) => {
    setConnectors(prev => prev.map(c =>
      c.id === id ? { ...c, active: !c.active, status: !c.active ? 'Connected' : 'Standby' } : c
    ));
  };

  // Filter Explorer registry
  const filteredIOCs = iocs.filter(ioc => {
    const matchesQuery = 
      ioc.value.toLowerCase().includes(explorerQuery.toLowerCase()) ||
      (ioc.description && ioc.description.toLowerCase().includes(explorerQuery.toLowerCase())) ||
      ioc.tags?.some(tag => tag.toLowerCase().includes(explorerQuery.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || ioc.ioc_type === typeFilter;
    const matchesSev = severityFilter === 'ALL' || ioc.severity === severityFilter;
    return matchesQuery && matchesType && matchesSev;
  });

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

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Connecting to Threat Intelligence Platform..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Threat Intelligence Platform" 
        description="Explore indicators of compromise (IOCs), correlate active campaigns, track threat actors infrastructure, and configure feed connector pipelines."
      />

      {/* Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        <button style={tabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Intel Dashboard</button>
        <button style={tabStyle('explorer')} onClick={() => setActiveTab('explorer')}>IOC Explorer ({iocs.length})</button>
        <button style={tabStyle('actors')} onClick={() => setActiveTab('actors')}>Threat Actors ({actors.length})</button>
        <button style={tabStyle('campaigns')} onClick={() => setActiveTab('campaigns')}>Campaigns ({campaigns.length})</button>
        <button style={tabStyle('malware')} onClick={() => setActiveTab('malware')}>Malware Families ({malware.length})</button>
        <button style={tabStyle('connectors')} onClick={() => setActiveTab('connectors')}>Feed Connectors</button>
      </div>

      {/* TAB: INTEL DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <MetricCard title="Total Registry IOCs" value={stats.total} status="info" subtitle="Indicators active in DB" />
            <MetricCard title="Mean Confidence" value={`${stats.confidenceAvg}%`} status="low" subtitle="Multi-source validation rate" />
            <MetricCard title="Critical Threat Vectors" value={stats.critical} status="critical" subtitle="Urgent block rules synced" />
            <MetricCard title="Correlations Mapped" value={14} status="high" subtitle="Infrastructure relationship links" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }} className="dashboard-grid-layout">
            {/* Top Campaigns & Actors List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Panel title="Most Active Campaigns & Mapped Threat Actors">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {campaigns.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</span>
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Status: {c.status} • Target: {c.target_regions?.join(', ')}</span>
                      </div>
                      <StatusBadge status={c.status === 'Active' ? 'high' : 'muted'} text={c.status} />
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Latest Synced Threat Intelligence Alerts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {iocs.slice(0, 3).map(ioc => (
                    <div key={ioc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>{ioc.value}</span>
                      <StatusBadge status={ioc.severity} text={ioc.ioc_type} />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Severity and Confidence Distributions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Panel title="Indicator Severity Distribution">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>CRITICAL</span>
                      <span>{stats.critical}</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                      <div style={{ width: `${(stats.critical / Math.max(1, stats.total)) * 100}%`, height: '100%', backgroundColor: 'var(--color-critical)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>HIGH</span>
                      <span>2</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                      <div style={{ width: '40%', height: '100%', backgroundColor: 'var(--color-high)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>MEDIUM & LOW</span>
                      <span>1</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                      <div style={{ width: '20%', height: '100%', backgroundColor: 'var(--color-low)' }} />
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Geographic IP Ingress distribution */}
              <Panel title="Top IOC Source Jurisdictions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Russia (RU)</span>
                    <strong>65%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Germany (DE)</span>
                    <strong>20%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Netherlands (NL)</span>
                    <strong>15%</strong>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {/* TAB: IOC EXPLORER */}
      {activeTab === 'explorer' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }} className="dashboard-grid-layout">
          
          {/* Explorer List */}
          <Panel 
            title="Threat Indicators Registry"
            actions={
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>
                  {selectedIOCs.length} Selected
                </span>
                {selectedIOCs.length > 0 && (
                  <>
                    <button onClick={handleExportSTIX} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--color-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Export STIX 2.1
                    </button>
                    <button onClick={handleExportCSV} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Export CSV
                    </button>
                  </>
                )}
                <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <button onClick={() => setViewMode('table')} style={{ border: 'none', padding: '4px 8px', backgroundColor: viewMode === 'table' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    List
                  </button>
                  <button onClick={() => setViewMode('card')} style={{ border: 'none', padding: '4px 8px', backgroundColor: viewMode === 'card' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Grid
                  </button>
                </div>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FilterBar showClear={explorerQuery || typeFilter !== 'ALL' || severityFilter !== 'ALL'} onClear={() => { setExplorerQuery(''); setTypeFilter('ALL'); setSeverityFilter('ALL'); }}>
                <SearchBar value={explorerQuery} onChange={setExplorerQuery} placeholder="Filter IOCs by value, actor or tags..." />
                
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', outline: 'none' }}>
                  <option value="ALL">All Types</option>
                  <option value="IP">IP Address</option>
                  <option value="Domain">Domain</option>
                  <option value="URL">URL</option>
                  <option value="Hash">Hash File</option>
                </select>

                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', outline: 'none' }}>
                  <option value="ALL">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </FilterBar>

              {viewMode === 'table' ? (
                <DataTable 
                  columns={[
                    {
                      header: (
                        <input type="checkbox" checked={selectedIOCs.length === filteredIOCs.length && filteredIOCs.length > 0} onChange={handleSelectAll} />
                      ),
                      accessor: 'id',
                      renderCell: (val) => (
                        <input type="checkbox" checked={selectedIOCs.includes(val)} onClick={e => e.stopPropagation()} onChange={() => handleBulkSelect(val)} />
                      )
                    },
                    { header: 'Indicator Value', accessor: 'value', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{val}</span> },
                    { header: 'Type', accessor: 'ioc_type', renderCell: (val) => <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{val}</span> },
                    { header: 'Threat Severity', accessor: 'severity', renderCell: (val) => <StatusBadge status={val} text={val?.toUpperCase()} /> },
                    { header: 'Source Feed', accessor: 'source_feed' }
                  ]}
                  data={filteredIOCs}
                  onRowClick={handleSelectIOC}
                  emptyText="No indicators match explorer search parameters."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {filteredIOCs.map(ioc => (
                    <div 
                      key={ioc.id}
                      onClick={() => handleSelectIOC(ioc)}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{ioc.ioc_type}</span>
                        <StatusBadge status={ioc.severity} text={ioc.severity} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{ioc.value}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confidence: {ioc.confidence}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Details Drawer */}
          <div>
            {selectedIOCDetails ? (
              <Panel 
                title="IOC Correlation Dossier"
                actions={
                  <button onClick={() => setSelectedIOCDetails(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    ×
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-blue)', wordBreak: 'break-all' }}>{selectedIOCDetails.value}</span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                      <StatusBadge status={selectedIOCDetails.severity} text={selectedIOCDetails.severity} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confidence: {selectedIOCDetails.confidence}%</span>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={() => window.location.href = `/ioc-enrichment?ioc=${encodeURIComponent(selectedIOCDetails.value)}`}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ⚡ Enrich with VirusTotal
                      </button>
                    </div>
                  </div>

                  {selectedIOCDetails.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      <strong>Description:</strong> {selectedIOCDetails.description}
                    </div>
                  )}

                  {/* Correlations lists */}
                  <div>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Asset & Incident Relationships</h4>
                    {correlations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {correlations.map(corr => (
                          <div key={corr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', fontSize: '11px' }}>
                            <span style={{ textTransform: 'capitalize' }}>Related {corr.target_type}</span>
                            <strong>Score: {corr.relationship_score}%</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No relational linkages recorded. Mappings pending alert correlations.</span>
                    )}
                  </div>

                  {/* DNS & WHOIS Placeholders */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>WHOIS / DNS QUERY PLACEHOLDER</div>
                    <div style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Lookup Type: Passive Resolver</div>
                      <div>Query: {selectedIOCDetails.value}</div>
                      <div>Result: [Active resolver interfaces mapped to future GrayNoise/AbuseIPDB integrations]</div>
                    </div>
                  </div>
                </div>
              </Panel>
            ) : (
              <Panel title="IOC Correlation Dossier">
                <EmptyState title="No indicator selected" description="Select an indicator to preview relationship linkages." />
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* TAB: THREAT ACTORS */}
      {activeTab === 'actors' && (
        <Panel title="Registered Threat Actors Directory">
          <DataTable 
            columns={[
              { header: 'Threat Actor', accessor: 'name', renderCell: (val) => <span style={{ fontWeight: 700, color: 'var(--color-blue)' }}>{val}</span> },
              { header: 'Aliases', accessor: 'aliases', renderCell: (val) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{val?.join(', ') || 'None'}</span> },
              { header: 'Origin Focus', accessor: 'country' },
              { header: 'Primary Motivation', accessor: 'motivation' },
              { header: 'Target Sectors', accessor: 'target_industries', renderCell: (val) => val?.join(', ') },
              { header: 'System Risk Score', accessor: 'risk_score', renderCell: (val) => <span style={{ fontWeight: 700, color: val >= 80 ? 'var(--color-critical)' : 'var(--color-low)' }}>{val}/100</span> },
              { header: 'Status', accessor: 'status', renderCell: (val) => <StatusBadge status={val === 'Active' ? 'high' : 'muted'} text={val} /> }
            ]}
            data={actors}
          />
        </Panel>
      )}

      {/* TAB: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <Panel title="Known Cyber Campaigns Timeline">
          <DataTable 
            columns={[
              { header: 'Campaign Name', accessor: 'name', renderCell: (val) => <span style={{ fontWeight: 700 }}>{val}</span> },
              { header: 'Timeline Range', accessor: 'start_date', renderCell: (val, row) => <span>{val} to {row.end_date || 'Active'}</span> },
              { header: 'Status', accessor: 'status', renderCell: (val) => <StatusBadge status={val === 'Completed' ? 'low' : 'high'} text={val} /> },
              { header: 'Target Regions', accessor: 'target_regions', renderCell: (val) => val?.join(', ') },
              { header: 'Target Sectors', accessor: 'affected_industries', renderCell: (val) => val?.join(', ') }
            ]}
            data={campaigns}
          />
        </Panel>
      )}

      {/* TAB: MALWARE FAMILIES */}
      {activeTab === 'malware' && (
        <Panel title="Malware Strains Registry">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {malware.map(m => (
              <div key={m.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '16px', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{m.name}</span>
                  <StatusBadge status="critical" text={m.malware_type} />
                </div>
                {m.aliases?.length > 0 && <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>Aliases: {m.aliases.join(', ')}</span>}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{m.description}</p>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>CAPABILITIES:</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.capabilities?.join(' • ')}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* TAB: FEED CONNECTORS */}
      {activeTab === 'connectors' && (
        <Panel title="Intel Source Pipeline Connectors (Plugins Directory)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {connectors.map(conn => (
              <div 
                key={conn.id}
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
                    <StatusBadge status={conn.active ? 'low' : 'muted'} text={conn.status.toUpperCase()} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Latest Sync: {conn.lastPoll} • Records Ingested: {conn.records}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <button
                    onClick={() => alert(`Connector sync execution is queued for background processing.`)}
                    disabled={!conn.active}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: conn.active ? 'pointer' : 'not-allowed',
                      opacity: conn.active ? 1 : 0.4
                    }}
                  >
                    Sync Now
                  </button>
                  <button
                    onClick={() => toggleConnectorActive(conn.id)}
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
                    {conn.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </DashboardLayout>
  );
};

export default ThreatIntelligence;
