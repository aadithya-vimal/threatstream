import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { Icon } from '../components/Icons';
import { ThreatService } from '../services/ThreatService';

const threatService = new ThreatService();

export const ThreatIntelligence = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  
  // Selected IOC and Enrichment States
  const [selectedIOCId, setSelectedIOCId] = useState(null);
  const [enrichedIOCData, setEnrichedIOCData] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // Async States
  const [iocs, setIocs] = useState([]);
  const [stats, setStats] = useState({ total: 0, confidenceAvg: 0, critical: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Load Initial Registry Data on mount
  useEffect(() => {
    const loadIntel = async () => {
      setIsLoading(true);
      try {
        const list = await threatService.getIOCs();
        const statData = await threatService.getIntelStats();
        setIocs(list);
        setStats(statData);
      } catch (err) {
        console.error('Failed to load IOC datasets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadIntel();
  }, []);

  // Load and enrich IOC data when selected
  useEffect(() => {
    if (!selectedIOCId) {
      setEnrichedIOCData(null);
      return;
    }

    const runEnrichment = async () => {
      setIsEnriching(true);
      try {
        const enriched = await threatService.enrichIOC(selectedIOCId);
        setEnrichedIOCData(enriched);
      } catch (err) {
        console.error('Enrichment failed:', err);
      } finally {
        setIsEnriching(false);
      }
    };

    runEnrichment();
  }, [selectedIOCId]);

  // Filter logic
  const filteredIOCs = iocs.filter(ioc => {
    const matchesSearch = 
      ioc.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ioc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ioc.threatActor && ioc.threatActor.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || ioc.type === typeFilter;
    const matchesSev = severityFilter === 'ALL' || ioc.severity === severityFilter;

    return matchesSearch && matchesType && matchesSev;
  });

  const columns = [
    {
      header: 'Indicator Value',
      accessor: 'value',
      renderCell: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{val}</span>
    },
    {
      header: 'Type',
      accessor: 'type',
      renderCell: (val, row) => (
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {val} ({row.subType})
        </span>
      )
    },
    {
      header: 'Threat Severity',
      accessor: 'severity',
      renderCell: (val) => <StatusBadge status={val} text={val} />
    },
    {
      header: 'Confidence',
      accessor: 'confidence',
      renderCell: (val) => {
        let color = 'var(--color-low)';
        if (val >= 90) color = 'var(--color-critical)';
        else if (val >= 75) color = 'var(--color-high)';
        return <span style={{ fontWeight: 700, color }}>{val}%</span>;
      }
    },
    {
      header: 'Threat Actor',
      accessor: 'threatActor',
      renderCell: (val) => val ? (
        <span style={{ color: 'var(--color-blue-hover)', fontWeight: 600 }}>{val.name}</span>
      ) : (
        <span style={{ color: 'var(--text-muted)' }}>Unattributed</span>
      )
    },
    {
      header: 'Source Feed',
      accessor: 'sourceFeed',
      renderCell: (val) => (
        <span style={{ fontSize: '11px', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          {val}
        </span>
      )
    }
  ];

  return (
    <DashboardLayout>
      <SectionHeader
        title="Threat Intelligence Module"
        description="Unified IOC registry correlating internal network honeypots with global reputation databases."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => alert('Manually adding indicators is locked in read-only sandbox mode.')}
              style={{
                backgroundColor: 'var(--color-blue)',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Icon name="check" size={14} /> Add Indicator
            </button>
          </div>
        }
      />

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Total Indicators" value={stats.total} status="info" subtitle="Active inside registry" />
        <MetricCard title="Avg Confidence Rate" value={`${stats.confidenceAvg}%`} status="low" subtitle="Multi-feed validation" />
        <MetricCard title="Critical Severity Alerts" value={stats.critical} status="critical" subtitle="Immediate mitigation needed" />
        
        {/* Connected Feeds widget in MetricCard format */}
        <div style={{
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Feed Integrations
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {['VirusTotal', 'OTX', 'AbuseIPDB', 'GreyNoise', 'URLhaus', 'CISA'].map(feed => (
              <div key={feed} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <span className="pulse-dot" style={{ backgroundColor: 'var(--color-low)', width: '6px', height: '6px', animationDuration: `${1.5 + Math.random()}s` }} />
                <span>{feed}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Panel Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: '24px', alignItems: 'stretch' }} className="dashboard-grid-layout">
        
        {/* Left Side: IOC Registry Table */}
        <Panel title="Threat Indicators Registry" actions={<span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click row to analyze</span>}>
          <FilterBar showClear={searchTerm || typeFilter !== 'ALL' || severityFilter !== 'ALL'} onClear={() => { setSearchTerm(''); setTypeFilter('ALL'); setSeverityFilter('ALL'); }}>
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Filter by host, IP, actor, tag..." style={{ maxWidth: '240px' }} />
            
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
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
              <option value="ALL">All Types</option>
              <option value="IP">IP Address</option>
              <option value="Domain">Domain</option>
              <option value="Hash">Hash</option>
            </select>

            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
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
              <option value="ALL">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </FilterBar>

          <DataTable 
            columns={columns} 
            data={filteredIOCs} 
            emptyText="No indicators match filters."
            onRowClick={(row) => setSelectedIOCId(row.id)}
          />
        </Panel>

        {/* Right Side: IOC Enrichment and Analysis Profile */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedIOCId ? (
            <Panel 
              title="Intelligence Analysis Profile" 
              actions={
                <button 
                  onClick={() => setSelectedIOCId(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  className="btn-icon-hover"
                >
                  <Icon name="cross" size={16} />
                </button>
              }
            >
              {isEnriching ? (
                <LoadingState message="Querying VirusTotal, OTX, GreyNoise, and CISA feeds..." />
              ) : enrichedIOCData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '680px', paddingRight: '4px' }}>
                  
                  {/* Title & Description */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-blue-hover)', wordBreak: 'break-all' }}>
                        {enrichedIOCData.value}
                      </span>
                      <StatusBadge status={enrichedIOCData.severity} text={enrichedIOCData.severity} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <StatusBadge status="info" text={`${enrichedIOCData.type} (${enrichedIOCData.subType})`} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                        Country: <strong>{enrichedIOCData.country}</strong> | ASN: <strong>{enrichedIOCData.asn}</strong>
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                      {enrichedIOCData.description}
                    </p>
                  </div>

                  {/* Dynamic Enrichment Panel */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                      REAL-TIME ENRICHMENT TELEMETRY
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* VirusTotal */}
                      {enrichedIOCData.enrichments?.VirusTotal?.success && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>VirusTotal Verdict:</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-critical)' }}>
                            {enrichedIOCData.enrichments.VirusTotal.data.ratio} Engines flagged (Score: {enrichedIOCData.enrichments.VirusTotal.data.communityScore})
                          </span>
                        </div>
                      )}

                      {/* AbuseIPDB */}
                      {enrichedIOCData.enrichments?.AbuseIPDB?.success && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>AbuseIPDB Score:</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-critical)' }}>
                            {enrichedIOCData.enrichments.AbuseIPDB.data.abuseConfidenceScore}% Confidence ({enrichedIOCData.enrichments.AbuseIPDB.data.totalReports} Reports)
                          </span>
                        </div>
                      )}

                      {/* GreyNoise */}
                      {enrichedIOCData.enrichments?.GreyNoise?.success && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>GreyNoise Scanner Classification:</span>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {enrichedIOCData.enrichments.GreyNoise.data.noiseType} traffic
                          </span>
                        </div>
                      )}

                      {/* CISA mitigation */}
                      {enrichedIOCData.enrichments?.CISA?.success && enrichedIOCData.enrichments.CISA.data.listedInAdvisory && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-critical)', fontWeight: 600, fontSize: '11px', marginBottom: '4px' }}>
                            <Icon name="shield" size={12} /> CISA ADVISORY ACTIVE ({enrichedIOCData.enrichments.CISA.data.cisaAdvisoryId})
                          </span>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                            {enrichedIOCData.enrichments.CISA.data.mitigationRecommended}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Threat Actor Association */}
                  {enrichedIOCData.threatActor ? (
                    <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'rgba(37, 99, 235, 0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-blue-hover)', fontSize: '13px' }}>
                          Threat Actor: {enrichedIOCData.threatActor.name}
                        </span>
                        <StatusBadge status="warning" text={enrichedIOCData.threatActor.type} />
                      </div>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Origin Focus: <strong>{enrichedIOCData.threatActor.origin}</strong>
                      </span>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                        {enrichedIOCData.threatActor.description}
                      </p>
                    </div>
                  ) : (
                    <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Threat Actor: No direct correlation mapped. Investigation ongoing.
                    </div>
                  )}

                  {/* MITRE ATT&CK Mapping */}
                  {enrichedIOCData.mitreTechnique && (
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        MITRE ATT&CK Mapping
                      </h4>
                      <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', marginRight: '8px' }}>
                            {enrichedIOCData.mitreTechnique.id}
                          </span>
                          <span style={{ fontSize: '12px' }}>{enrichedIOCData.mitreTechnique.name}</span>
                        </div>
                        <span style={{ fontSize: '10px', backgroundColor: 'var(--color-blue-bg)', color: 'var(--color-blue)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {enrichedIOCData.mitreTechnique.tactic}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Timeline events */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      Telemetry Timeline
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', paddingLeft: '14px', borderLeft: '1px solid var(--border-color)' }}>
                      {enrichedIOCData.timeline?.map((evt, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '-18px', top: '4px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-blue)', border: '1px solid var(--bg-primary)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{evt.title}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{evt.date}</span>
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                            {evt.details} (Source: {evt.source})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reference Links */}
                  {enrichedIOCData.references?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Threat Advisories & Links
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {enrichedIOCData.references.map((link, idx) => (
                          <a 
                            key={idx} 
                            href={link} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ fontSize: '12px', color: 'var(--color-blue-hover)', textDecoration: 'none', wordBreak: 'break-all' }}
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </Panel>
          ) : (
            <Panel title="Indicator Analysis Profile" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState 
                title="No Indicator Selected" 
                description="Select an active indicator of compromise (IOC) from the registry on the left to trigger the multi-feed threat intelligence enrichment lookup."
              />
            </Panel>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ThreatIntelligence;
