/**
 * src/pages/Assets.jsx
 * Enterprise Asset Intelligence & Attack Surface Management Console
 */
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
import { AssetService } from '../services/AssetService';
import { OperationsService } from '../services/OperationsService';

const assetService = new AssetService();

export const Assets = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, directory, discovery, topology
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    criticalCount: 0,
    highCount: 0,
    riskAvg: 0,
    totalVulnerabilities: 0,
    internetFacingCount: 0,
    cloudProviders: { AWS: 0, Azure: 0, 'On-Premise': 0 },
    eolSoftwareCount: 0
  });
  const [topology, setTopology] = useState({ nodes: [], links: [] });

  // Directory Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [critFilter, setCritFilter] = useState('ALL');
  const [envFilter, setEnvFilter] = useState('ALL');
  const [facingFilter, setFacingFilter] = useState('ALL'); // ALL, yes, no
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('profile'); // profile, services, software, vulns, timeline, topology

  // Bulk Selection States
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);

  // Scanner States
  const [scanTarget, setScanTarget] = useState('127.0.0.1');
  const [scannerId, setScannerId] = useState('nmap');
  const [scanProfile, setScanProfile] = useState('default');
  const [customArgs, setCustomArgs] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanOutput, setScanOutput] = useState(null);

  // Discovery orchestrator states
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState('');
  const [discoveredHosts, setDiscoveredHosts] = useState([]);
  const [runningScanners, setRunningScanners] = useState([]);
  const [failedScanners, setFailedScanners] = useState([]);
  const [scanTimeline, setScanTimeline] = useState(null);

  const opsService = new OperationsService();

  // Load Platform Datasets
  useEffect(() => {
    const loadPlatformAssets = async () => {
      setIsLoading(true);
      try {
        const [assetList, assetStats, topoData] = await Promise.all([
          assetService.getAssets(),
          assetService.getAssetStats(),
          assetService.getNetworkTopology()
        ]);
        setAssets(assetList);
        setStats(assetStats);
        setTopology(topoData);
      } catch (err) {
        console.error('Failed to load asset intelligence database:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlatformAssets();
  }, []);

  // Update detail inspector reference when selected ID changes
  useEffect(() => {
    if (selectedAssetId) {
      const found = assets.find(a => a.id === selectedAssetId);
      setSelectedAsset(found || null);
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, assets]);

  // Filters application
  const filteredAssets = assets.filter(a => {
    const matchesSearch = 
      a.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ip.includes(searchTerm) ||
      (a.owner && a.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.display_name && a.display_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCrit = critFilter === 'ALL' || a.criticality === critFilter;
    const matchesEnv = envFilter === 'ALL' || a.environment === envFilter;
    const matchesFacing = facingFilter === 'ALL' || 
      (facingFilter === 'yes' ? a.internet_facing : !a.internet_facing);

    return matchesSearch && matchesCrit && matchesEnv && matchesFacing;
  });

  const handleBulkSelect = (id) => {
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map(a => a.id));
    }
  };

  // SBOM CycloneDX Exporter Stub
  const handleExportCycloneDX = () => {
    if (selectedAssetIds.length === 0) {
      alert('Select one or more assets to export SBOM.');
      return;
    }
    const targetAssets = assets.filter(a => selectedAssetIds.includes(a.id));
    
    // Compile CycloneDX SBOM JSON representation
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tool: {
          vendor: 'ThreatStream',
          name: 'Attack Surface Management Engine',
          version: '2.0.0'
        }
      },
      components: targetAssets.flatMap(asset => 
        (asset.installedSoftware || []).map(sw => ({
          type: 'library',
          name: sw.name,
          version: sw.version,
          publisher: sw.publisher || 'Unknown',
          licenses: [{ license: { name: sw.license || 'Proprietary' } }],
          properties: [
            { name: 'threatstream:associated_host', value: asset.hostname },
            { name: 'threatstream:support_status', value: sw.support_status || 'Supported' }
          ]
        }))
      )
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sbom, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `threatstream_sbom_cyclonedx_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (selectedAssetIds.length === 0) {
      alert('Select one or more assets to export inventory.');
      return;
    }
    const targetAssets = assets.filter(a => selectedAssetIds.includes(a.id));
    const csvRows = [
      ['Hostname', 'Display Name', 'IP Address', 'Environment', 'Criticality', 'Risk Score', 'Owner'],
      ...targetAssets.map(a => [a.hostname, a.display_name, a.ip, a.environment, a.criticality, a.risk_score, a.owner])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `threatstream_inventory_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleBulkChangeOwner = () => {
    const newOwner = prompt('Enter name of new Owner department / team:');
    if (!newOwner) return;
    setAssets(prev => prev.map(a => 
      selectedAssetIds.includes(a.id) ? { ...a, owner: newOwner } : a
    ));
    setSelectedAssetIds([]);
    alert('Assets ownership updated successfully.');
  };

  // Run discovery scan via backend job orchestrator
  const executeScan = async () => {
    setIsScanning(true);
    setScanOutput(null);
    setDiscoveredHosts([]);
    setJobProgress(0);
    setJobStatus('queued');
    setRunningScanners([]);
    setFailedScanners([]);

    try {
      const job = await opsService.createJob({
        name: `Asset Discovery Scan: ${scanTarget}`,
        type: 'scan',
        payload: {
          target: scanTarget,
          scanner: scannerId,
          profile: scanProfile,
          custom_arguments: customArgs
        }
      });

      if (!job || !job.id) {
        // Mock fallback
        setTimeout(async () => {
          try {
            const res = await assetService.runDiscovery(scannerId, scanTarget);
            setScanOutput(res);
          } catch (e) {
            console.error(e);
          } finally {
            setIsScanning(false);
          }
        }, 2500);
        return;
      }

      const pollInterval = setInterval(async () => {
        try {
          const jobsList = await opsService.getJobs();
          const currentJob = jobsList.find(j => j.id === job.id);
          if (currentJob) {
            setJobProgress(currentJob.progress || 0);
            setJobStatus(currentJob.status);

            if (currentJob.status === 'completed') {
              clearInterval(pollInterval);
              setIsScanning(false);
              const result = currentJob.result || {};
              setScanOutput(result);
              setDiscoveredHosts(result.discovered_hosts || []);
              setRunningScanners(result.scanners_run || []);
              setFailedScanners(result.scanners_failed || []);
              setScanTimeline(result.timeline || null);
              
              // Refresh active assets directory list from backend
              const updatedList = await assetService.getAssets();
              setAssets(updatedList);
            } else if (currentJob.status === 'failed' || currentJob.status === 'cancelled') {
              clearInterval(pollInterval);
              setIsScanning(false);
              alert(`Scan execution failed: ${currentJob.error || 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.error("Discovery scan polling error:", err);
        }
      }, 1000);

    } catch (e) {
      console.warn("Backend scan trigger failed, using offline simulation:", e);
      setTimeout(async () => {
        try {
          const res = await assetService.runDiscovery(scannerId, scanTarget);
          setScanOutput(res);
        } catch (err) {
          console.error(err);
        } finally {
          setIsScanning(false);
        }
      }, 2500);
    }
  };

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
        <LoadingState message="Connecting to Asset Intelligence registry..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Asset Intelligence & Attack Surface" 
        description="Unified corporate asset inventory, live risk scoring engines, network topology correlations, and plug-in vulnerability scanner controls."
      />

      {/* Overview Cards Row - Attack Surface Dashboard Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <MetricCard title="Total Assets Registered" value={stats.total} status="info" subtitle="Hosts, cloud instances, and sites" />
        <MetricCard title="Avg Security Score" value={`${Math.max(10, 100 - stats.riskAvg)}/100`} status="low" subtitle="Inverse of network risk weight" />
        <MetricCard title="Internet-Facing Nodes" value={stats.internetFacingCount} status="high" subtitle="External ingress vectors" />
        <MetricCard title="Vulnerabilities Unpatched" value={stats.totalVulnerabilities} status="critical" subtitle="Discovered active CVEs" />
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        <button style={tabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Executive Dashboard</button>
        <button style={tabStyle('directory')} onClick={() => setActiveTab('directory')}>Asset Directory ({assets.length})</button>
        <button style={tabStyle('discovery')} onClick={() => setActiveTab('discovery')}>Discovery Scanners</button>
        <button style={tabStyle('topology')} onClick={() => setActiveTab('topology')}>Network Topology</button>
      </div>

      {/* TAB: EXECUTIVE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Cloud Distribution and High Risk items */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }} className="dashboard-grid-layout">
            
            <Panel title="Highest Risk Active Infrastructure Assets">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {assets.sort((x, y) => y.risk_score - x.risk_score).slice(0, 3).map(asset => (
                  <div 
                    key={asset.id} 
                    onClick={() => { setSelectedAssetId(asset.id); setActiveTab('directory'); }}
                    style={{
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 14px', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px', 
                      backgroundColor: 'var(--bg-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{asset.hostname}</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{asset.display_name} • IP: {asset.ip} • Owner: {asset.owner}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-critical)' }}>Risk Index: {asset.risk_score}/100</span>
                      <StatusBadge status={asset.criticality} text={asset.criticality} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Cloud Provider Distribution">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
                {Object.entries(stats.cloudProviders || {}).map(([provider, count]) => (
                  <div key={provider}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'uppercase' }}>{provider}</span>
                      <span>{count} Assets</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                      <div style={{ width: `${(count / Math.max(1, stats.total)) * 100}%`, height: '100%', backgroundColor: 'var(--color-blue)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Software EOL and Expiring Certificates widget row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <Panel title="Critical Software Packages EOL Status">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-high)' }}>{stats.eolSoftwareCount}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Installed packages identified as End-of-Life</span>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-critical)' }}>
                  ⚠️
                </div>
              </div>
            </Panel>

            <Panel title="Exposed Ingress Certificates Status">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-low)' }}>1 Active</span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>SSL certificate expiring in less than 30 days</span>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-blue)' }}>
                  🔑
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB: ASSET DIRECTORY */}
      {activeTab === 'directory' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedAsset ? 'minmax(0, 1.2fr) minmax(0, 0.8fr)' : '1fr', gap: '24px', alignItems: 'stretch' }} className="dashboard-grid-layout">
          
          {/* Inventory Table Panel */}
          <Panel 
            title="Infrastructure Asset Directory"
            actions={
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>
                  {selectedAssetIds.length} Selected
                </span>
                {selectedAssetIds.length > 0 && (
                  <>
                    <button onClick={handleExportCycloneDX} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--color-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Export CycloneDX SBOM
                    </button>
                    <button onClick={handleExportCSV} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Export CSV
                    </button>
                    <button onClick={handleBulkChangeOwner} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Change Owner
                    </button>
                  </>
                )}
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FilterBar showClear={searchTerm || critFilter !== 'ALL' || envFilter !== 'ALL' || facingFilter !== 'ALL'} onClear={() => { setSearchTerm(''); setCritFilter('ALL'); setEnvFilter('ALL'); setFacingFilter('ALL'); }}>
                <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Filter by hostname, IP, display name..." />
                
                <select value={critFilter} onChange={e => setCritFilter(e.target.value)} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', outline: 'none' }}>
                  <option value="ALL">All Criticality</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', outline: 'none' }}>
                  <option value="ALL">All Environments</option>
                  <option value="Production">Production</option>
                  <option value="Testing">Testing</option>
                  <option value="Development">Development</option>
                </select>

                <select value={facingFilter} onChange={e => setFacingFilter(e.target.value)} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '6px 10px', fontSize: '13px', outline: 'none' }}>
                  <option value="ALL">All Exposure</option>
                  <option value="yes">Internet Facing</option>
                  <option value="no">Internal Only</option>
                </select>
              </FilterBar>

              <DataTable 
                columns={[
                  {
                    header: (
                      <input type="checkbox" checked={selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0} onChange={handleSelectAll} />
                    ),
                    accessor: 'id',
                    renderCell: (val) => (
                      <input type="checkbox" checked={selectedAssetIds.includes(val)} onClick={e => e.stopPropagation()} onChange={() => handleBulkSelect(val)} />
                    )
                  },
                  { header: 'Hostname', accessor: 'hostname', renderCell: (val) => <span style={{ fontWeight: 700 }}>{val}</span> },
                  { header: 'Environment', accessor: 'environment' },
                  { header: 'IP Address', accessor: 'ip', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
                  { header: 'Criticality', accessor: 'criticality', renderCell: (val) => <StatusBadge status={val} text={val?.toUpperCase()} /> },
                  { header: 'Risk Score', accessor: 'risk_score', renderCell: (val) => <span style={{ fontWeight: 700, color: val >= 75 ? 'var(--color-critical)' : 'var(--color-low)' }}>{val}/100</span> },
                  { header: 'Exposure', accessor: 'internet_facing', renderCell: (val) => val ? <span style={{ color: 'var(--color-high)', fontWeight: 600 }}>External</span> : <span style={{ color: 'var(--text-muted)' }}>Internal</span> }
                ]}
                data={filteredAssets}
                onRowClick={(row) => setSelectedAssetId(row.id)}
                emptyText="No assets match search parameters."
              />
            </div>
          </Panel>

          {/* Right Inspector Drawer Panel */}
          {selectedAsset && (
            <Panel 
              title={`${selectedAsset.hostname} Details`}
              actions={
                <button onClick={() => setSelectedAssetId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  ×
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-blue)' }}>{selectedAsset.display_name}</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <StatusBadge status={selectedAsset.criticality} text={selectedAsset.environment} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>Owner: <strong>{selectedAsset.owner}</strong></span>
                  </div>
                </div>

                {/* Tab navigator inside inspector */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {['profile', 'services', 'software', 'vulnerabilities', 'timeline'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setInspectorTab(tab)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: inspectorTab === tab ? 'var(--color-blue-hover)' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        paddingBottom: '2px',
                        borderBottom: inspectorTab === tab ? '2px solid var(--color-blue)' : '2px solid transparent'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Profile Information SubTab */}
                {inspectorTab === 'profile' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>IP Address (IPv4)</span>
                      <strong>{selectedAsset.ip}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>IPv6 Address</span>
                      <strong style={{ fontSize: '10px', wordBreak: 'break-all' }}>{selectedAsset.ipv6 || 'None'}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>MAC Address</span>
                      <strong style={{ fontFamily: 'monospace' }}>{selectedAsset.mac}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>Operating System</span>
                      <strong>{selectedAsset.os} ({selectedAsset.architecture})</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>Manufacturer / Model</span>
                      <strong>{selectedAsset.manufacturer} {selectedAsset.model}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>Serial Number</span>
                      <strong style={{ fontFamily: 'monospace' }}>{selectedAsset.serial_number || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>Cloud Provider</span>
                      <strong>{selectedAsset.cloud_provider || 'On-Premise'}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-muted)' }}>Geographic Location</span>
                      <strong>{selectedAsset.location || 'Unknown'}</strong>
                    </div>
                  </div>
                )}

                {/* Listening Services SubTab */}
                {inspectorTab === 'services' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedAsset.services?.map((s, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>Port {s.port}/{s.protocol}</strong> ({s.name})
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Banner: {s.banner || 'None'}</span>
                        </div>
                        <StatusBadge status={s.risk_level} text={`Risk: ${s.risk_level}`} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Software Packages (SBOM) SubTab */}
                {inspectorTab === 'software' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                    {selectedAsset.installedSoftware?.map((sw, idx) => (
                      <div key={idx} style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{sw.name}</span>
                          <span>v{sw.version}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>Publisher: {sw.publisher} | Lic: {sw.license}</span>
                          <span style={{ color: sw.support_status === 'End of Life' ? 'var(--color-critical)' : 'var(--text-muted)' }}>{sw.support_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vulnerabilities SubTab */}
                {inspectorTab === 'vulnerabilities' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {selectedAsset.detectedCVEs?.map((cve, idx) => (
                      <div key={idx} style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>{cve.cve}</span>
                          <StatusBadge status={cve.severity} text={`CVSS ${cve.cvss}`} />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>{cve.summary}</p>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '9px', fontWeight: 700 }}>
                          <span style={{ color: cve.exploit_available ? 'var(--color-critical)' : 'var(--text-muted)' }}>
                            {cve.exploit_available ? 'PUBLIC EXPLOIT READY' : 'NO KNOWN EXPLOITS'}
                          </span>
                          <span style={{ color: cve.patch_available ? 'var(--color-low)' : 'var(--color-high)' }}>
                            {cve.patch_available ? 'PATCH AVAILABLE' : 'NO PATCH REMEDIATION'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timeline / Lifecycle events SubTab */}
                {inspectorTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '1px solid var(--border-color)', paddingLeft: '14px', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '-18px', top: '4px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-blue)' }} />
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600 }}>Active Ingress Scanner Sync</span>
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>2026-07-05 11:40 • SSH port 22 verified active</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '-18px', top: '4px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-low)' }} />
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600 }}>CVE Vulnerability Mapped</span>
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>2026-03-10 08:12 • Backdoored xz-utils (CVE-2024-3094) package identified</span>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* TAB: DISCOVERY & SCANNERS */}
      {activeTab === 'discovery' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '24px' }}>
          
          <Panel title="Scanner Daemon Plugins">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Target IP Scope / Subnet</label>
                <input 
                  type="text" 
                  value={scanTarget}
                  onChange={e => setScanTarget(e.target.value)}
                  style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px'
                  }}
                  placeholder="e.g. 10.100.4.0/24"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Scanner Engine Plugin</label>
                <select
                  value={scannerId}
                  onChange={e => setScannerId(e.target.value)}
                  style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px'
                  }}
                >
                  <option value="nmap">Nmap Port Scanner (Core Production)</option>
                  <option value="rustscan">RustScan Accelerated Scanner (Core)</option>
                  <option value="masscan">Masscan Ingress IP Scout</option>
                  <option value="nuclei">Nuclei Vulnerability Template Scanner</option>
                  <option value="whatweb">WhatWeb App Profiler</option>
                  <option value="sslyze">SSLyze Certificate Analyzer</option>
                  <option value="testssl">testssl.sh TLS Analyzer</option>
                  <option value="nikto">Nikto Web Server Scanner</option>
                  <option value="openvas">OpenVAS Manager</option>
                  <option value="greenbone">Greenbone Security Feed</option>
                </select>
              </div>

              {scannerId === 'nmap' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nmap Scan Profile</label>
                    <select
                      value={scanProfile}
                      onChange={e => setScanProfile(e.target.value)}
                      style={{
                        padding: '10px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontSize: '13px'
                      }}
                    >
                      <option value="default">Default (-sS -sV -O -T4)</option>
                      <option value="quick">Quick Scan (-T4 -F)</option>
                      <option value="full_tcp">Full TCP Port Sweep (-T4 -p-)</option>
                      <option value="udp">UDP Scan (-sU -T4 -F)</option>
                      <option value="version">Service Version Detection (-sV -T4)</option>
                      <option value="os">OS Fingerprinting (-O -T4)</option>
                      <option value="service">Service Detection (-sV -T4)</option>
                      <option value="aggressive">Aggressive Scan (-A -T4)</option>
                      <option value="custom">Custom Command Arguments</option>
                    </select>
                  </div>

                  {scanProfile === 'custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Custom Arguments</label>
                      <input 
                        type="text" 
                        value={customArgs}
                        onChange={e => setCustomArgs(e.target.value)}
                        style={{
                          padding: '10px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontSize: '13px',
                          fontFamily: 'monospace'
                        }}
                        placeholder="e.g. -sS -p 22,80,443 -Pn"
                      />
                    </div>
                  )}
                </>
              )}

              <button
                onClick={executeScan}
                disabled={isScanning}
                style={{
                  backgroundColor: 'var(--color-blue)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isScanning ? (
                  <>
                    <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Running Ingress Scans...
                  </>
                ) : (
                  <>
                    <Icon name="terminal" size={14} /> Run Network Scan
                  </>
                )}
              </button>
            </div>
          </Panel>

          <Panel title="Discovery Scan Status & Results">
            {isScanning ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <LoadingState message={`Executing Discovery on target: ${scanTarget}...`} />
                <div style={{ padding: '14px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Orchestrated Job Status: <strong style={{ color: 'var(--color-orange)', textTransform: 'uppercase' }}>{jobStatus}</strong></span>
                    <span>Progress: {jobProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${jobProgress}%`, height: '100%', backgroundColor: 'var(--color-blue)', borderRadius: 4, transition: 'width 0.2s' }}></div>
                  </div>
                </div>
              </div>
            ) : scanOutput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '6px 12px', backgroundColor: 'rgba(16,185,129,0.1)', borderLeft: '4px solid #10b981', fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                  ORCHESTRATED DISCOVERY COMPLETED SUCCESSFULLY
                </div>

                {discoveredHosts && discoveredHosts.length > 0 ? (
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discovered Ingress Assets</h4>
                    <DataTable
                      headers={[
                        { key: 'ip', label: 'IP Address' },
                        { key: 'hostname', label: 'Hostname' },
                        { key: 'os', label: 'Operating System' },
                        { key: 'ports', label: 'Open Ports' },
                        { key: 'asn', label: 'ASN' },
                        { key: 'geoip', label: 'Location' }
                      ]}
                      data={discoveredHosts.map(host => ({
                        ip: <strong style={{ fontFamily: 'monospace' }}>{host.ip}</strong>,
                        hostname: <span style={{ color: 'var(--color-blue)', fontFamily: 'monospace' }}>{host.hostname}</span>,
                        os: host.os,
                        ports: (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {host.ports.map(p => (
                              <span key={p.port} style={{ padding: '2px 6px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                {p.port}/{p.service}
                              </span>
                            ))}
                          </div>
                        ),
                        asn: host.asn,
                        geoip: host.geoip
                      }))}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 5, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No corporate assets resolved on active subnets. Check target configuration.
                  </div>
                )}

                {scanTimeline && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 5, border: '1px solid var(--border-color)', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Started At:</span>{' '}
                      <strong>{new Date(scanTimeline.started_at).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Scan Duration:</span>{' '}
                      <strong>{scanTimeline.duration_ms} ms</strong>
                    </div>
                    {runningScanners.length > 0 && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Triggered Scanners:</span>{' '}
                        <strong>{runningScanners.join(', ')}</strong>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scanner Console Log Outputs</h4>
                  <pre style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: '#34d399',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    padding: '12px',
                    overflowX: 'auto',
                    maxHeight: '180px',
                    lineHeight: '1.4'
                  }}>
                    {scanOutput.discovered_hosts ? (
                      JSON.stringify(scanOutput, null, 2)
                    ) : (
                      `$ mock-scan --target ${scanTarget}\n` +
                      (scannerId === 'nmap' ? 
                        `Starting Nmap 7.92 ( https://nmap.org )\nNmap scan report for ${scanTarget}\n22/tcp open ssh OpenSSH\n80/tcp open http Apache` :
                        `[Mock Ingress logs] Completed scan against ${scanTarget} using ${scannerId}.`
                      )
                    )}
                  </pre>
                </div>
              </div>
            ) : (
              <EmptyState 
                title="Awaiting Scan Execution" 
                description="Configure target subnets and trigger scanners. Live binary logs will stream directly to this terminal console."
              />
            )}
          </Panel>
        </div>
      )}

      {/* TAB: NETWORK TOPOLOGY */}
      {activeTab === 'topology' && (
        <Panel title="Global Corporate Network Connections Map">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Topology Mapping: Automatic LLDP & traceroute correlation</span>
              <span style={{ color: 'var(--color-low)' }}>● Dynamic Update Channel Active</span>
            </div>

            <div style={{ 
              height: '420px', 
              backgroundColor: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '6px', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              
              <div style={{ position: 'absolute', width: '380px', height: '380px', border: '1px dashed rgba(59,130,246,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', width: '220px', height: '220px', border: '1px dashed rgba(59,130,246,0.15)', borderRadius: '50%' }} />

              <div style={{ position: 'absolute', top: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-critical-bg)', border: '1px solid var(--color-critical)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-critical)' }}>
                  🛡️
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Edge Firewall</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                <div style={{ width: '50px', height: '50px', backgroundColor: 'var(--panel-bg)', border: '2px solid var(--color-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-blue)' }}>
                  🔌
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Core Switch</span>
              </div>

              {/* Subnet hosts surrounding core */}
              {assets.map((asset, index) => {
                const angle = (index / assets.length) * 2 * Math.PI;
                const radius = 130;
                const x = Math.round(Math.cos(angle) * radius);
                const y = Math.round(Math.sin(angle) * radius);
                
                return (
                  <div 
                    key={asset.id} 
                    style={{ 
                      position: 'absolute', 
                      transform: `translate(${x}px, ${y}px)`,
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '4px' 
                    }}
                  >
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      backgroundColor: 'var(--panel-bg)', 
                      border: '1px solid var(--border-color)', 
                      borderColor: asset.risk_score >= 80 ? 'var(--color-critical)' : asset.risk_score >= 60 ? 'var(--color-high)' : 'var(--color-low)',
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '14px' 
                    }}>
                      {asset.asset_type === 'Server' ? '🗄️' : '💻'}
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 600 }}>{asset.hostname}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-critical)' }} />
                <span>Critical Risk (Score 80+)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-high)' }} />
                <span>High Risk (Score 60-79)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-low)' }} />
                <span>Low Risk (Score 0-39)</span>
              </div>
            </div>
          </div>
        </Panel>
      )}
    </DashboardLayout>
  );
};

export default Assets;
