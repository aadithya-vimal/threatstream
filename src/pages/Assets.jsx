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

const assetService = new AssetService();

export const Assets = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [critFilter, setCritFilter] = useState('ALL');
  
  // Selected Asset Detail State
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailTab, setDetailTab] = useState('services');

  // Scanner State
  const [scanTarget, setScanTarget] = useState('10.100.4.0/24');
  const [scannerId, setScannerId] = useState('nmap');
  const [isScanning, setIsScanning] = useState(false);
  const [scanOutput, setScanOutput] = useState(null);

  // Async States
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({ total: 0, criticalCount: 0, highCount: 0, riskAvg: 0 });
  const [topology, setTopology] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Load assets data asynchronously on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const list = await assetService.getAssets();
        const statData = await assetService.getAssetStats();
        const topoData = await assetService.getNetworkTopology();
        setAssets(list);
        setStats(statData);
        setTopology(topoData);
      } catch (err) {
        console.error('Failed to load asset details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAssetId) {
      const asset = assets.find(a => a.id === selectedAssetId);
      setSelectedAsset(asset);
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, assets]);

  // Filters
  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.hostname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.ip.includes(searchTerm) || 
                          a.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCrit = critFilter === 'ALL' || a.criticality === critFilter;
    return matchesSearch && matchesCrit;
  });

  const columns = [
    { header: 'Hostname', accessor: 'hostname', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { header: 'IP Address', accessor: 'ip', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
    { header: 'MAC Address', accessor: 'mac', renderCell: (val) => <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{val}</span> },
    { header: 'Asset Type', accessor: 'assetType' },
    {
      header: 'Criticality',
      accessor: 'criticality',
      renderCell: (val) => <StatusBadge status={val} text={val} />
    },
    {
      header: 'Risk Score',
      accessor: 'riskScore',
      renderCell: (val) => {
        let color = 'var(--color-low)';
        if (val >= 85) color = 'var(--color-critical)';
        else if (val >= 70) color = 'var(--color-high)';
        return <span style={{ fontWeight: 700, color }}>{val}</span>;
      }
    },
    { header: 'Status', accessor: 'status', renderCell: (val) => <StatusBadge status={val === 'Online' ? 'low' : 'muted'} text={val} /> },
    {
      header: 'Action',
      accessor: 'id',
      renderCell: (val) => (
        <button 
          onClick={() => setSelectedAssetId(val)}
          style={{ background: 'none', border: 'none', color: 'var(--color-blue)', fontWeight: 600, cursor: 'pointer' }}
        >
          View Details
        </button>
      )
    }
  ];

  // Execute Network scan trigger
  const runMockScan = async () => {
    setIsScanning(true);
    setScanOutput(null);
    try {
      // Simulate scan process delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      const res = await assetService.runDiscovery(scannerId, scanTarget);
      setScanOutput(res);
    } catch (err) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
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

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Asset & Infrastructure Inventory" 
        description="Comprehensive asset discovery, network topology visualization, and vulnerability mapping."
      />

      {/* Metrics overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard title="Total Assets" value={stats.total} status="info" subtitle="Registered systems" />
        <MetricCard title="Critical Systems" value={stats.criticalCount} status="critical" subtitle="Require highest uptime" />
        <MetricCard title="Vulnerability Count" value={stats.totalVulnerabilities} status="high" subtitle="Across all network endpoints" />
        <MetricCard title="Average Network Risk" value={`${stats.riskAvg}/100`} status={stats.riskAvg > 70 ? 'critical' : 'medium'} subtitle="Overall environment score" />
      </div>

      {/* Tab bar navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px' }}>
        <button style={navTabStyle('inventory')} onClick={() => setActiveTab('inventory')}>Asset Directory</button>
        <button style={navTabStyle('discovery')} onClick={() => setActiveTab('discovery')}>Network Discovery & Scanners</button>
        <button style={navTabStyle('topology')} onClick={() => setActiveTab('topology')}>Network Topology Map</button>
      </div>

      {/* 1. ASSET DIRECTORY TAB */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedAsset ? 'minmax(0, 1.1fr) minmax(0, 0.9fr)' : '1fr', gap: '24px', alignItems: 'stretch' }} className="dashboard-grid-layout">
          
          {/* Main assets list */}
          <Panel title="Active Host Registry" actions={<span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click host to view full profile</span>}>
            <FilterBar showClear={searchTerm || critFilter !== 'ALL'} onClear={() => { setSearchTerm(''); setCritFilter('ALL'); }}>
              <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by hostname, IP, owner..." style={{ maxWidth: '240px' }} />
              <select
                value={critFilter}
                onChange={e => setCritFilter(e.target.value)}
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
                <option value="ALL">All Criticality</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </FilterBar>

            <DataTable 
              columns={columns} 
              data={filteredAssets} 
              onRowClick={(row) => setSelectedAssetId(row.id)}
            />
          </Panel>

          {/* Right inspector detail panel */}
          {selectedAsset && (
            <Panel 
              title={`${selectedAsset.hostname} Profile`}
              actions={
                <button onClick={() => setSelectedAssetId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} className="btn-icon-hover">
                  <Icon name="cross" size={16} />
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-blue-hover)' }}>{selectedAsset.ip}</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>MAC: {selectedAsset.mac} | {selectedAsset.os}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={selectedAsset.criticality} text={selectedAsset.criticality} />
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginTop: '4px', color: selectedAsset.riskScore > 75 ? 'var(--color-critical)' : 'var(--color-low)' }}>
                      Risk: {selectedAsset.riskScore}/100
                    </span>
                  </div>
                </div>

                {/* Sub tabs inside inspector */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '12px', paddingBottom: '4px' }}>
                  {['services', 'interfaces', 'software', 'vulnerabilities'].map(subTab => (
                    <button 
                      key={subTab} 
                      onClick={() => setDetailTab(subTab)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: detailTab === subTab ? 'var(--color-blue-hover)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        paddingBottom: '2px',
                        borderBottom: detailTab === subTab ? '2px solid var(--color-blue)' : '2px solid transparent'
                      }}
                    >
                      {subTab}
                    </button>
                  ))}
                </div>

                {/* Sub tabs content renderer */}
                {detailTab === 'services' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>OPEN PORTS & ACTIVE SERVICES</span>
                    {selectedAsset.services.map((srv, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                        <span>Port <strong>{srv.port}</strong> ({srv.name})</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{srv.product} {srv.version}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'interfaces' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>NETWORK INTERFACE CONTROLLERS</span>
                    {selectedAsset.networkInterfaces.map((nic, idx) => (
                      <div key={idx} style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>Interface: {nic.name}</span>
                          <span>IP: {nic.ip}</span>
                        </div>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Netmask: {nic.netmask} | Gateway: {nic.gateway}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'software' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>INSTALLED SYSTEM BINARIES & SOFTWARE</span>
                    {selectedAsset.installedSoftware.map((sw, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px' }}>
                        <span style={{ fontWeight: 600 }}>{sw.name}</span>
                        <span style={{ fontFamily: 'monospace' }}>v{sw.version}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'vulnerabilities' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>PATCH STATUS: {selectedAsset.patchStatus.toUpperCase()}</span>
                    {selectedAsset.detectedCVEs.length === 0 ? (
                      <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--color-low)', fontStyle: 'italic', fontSize: '12px' }}>
                        No vulnerabilities detected on this system.
                      </div>
                    ) : (
                      selectedAsset.detectedCVEs.map((cve, idx) => (
                        <div key={idx} style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: cve.severity === 'critical' ? 'var(--color-critical-bg)' : 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>{cve.cve}</span>
                            <StatusBadge status={cve.severity} text={`CVSS ${cve.cvss}`} />
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>{cve.summary}</p>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: cve.patched ? 'var(--color-low)' : 'var(--color-critical)' }}>
                            {cve.patched ? 'PATCH APPLIED' : 'ACTION REQUIRED'}
                          </span>
                        </div>
                      ))
                    )}
                    
                    {/* Recommendations list */}
                    {selectedAsset.recommendations?.length > 0 && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>REMEDIATION ADVICE</span>
                        {selectedAsset.recommendations.map((rec, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>{idx + 1}.</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* 2. NETWORK DISCOVERY & SCANNERS TAB */}
      {activeTab === 'discovery' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '24px' }}>
          
          {/* Discovery Trigger Options */}
          <Panel title="Discovery Control Center">
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
                  <option value="nmap">Nmap Port Scanner (Core)</option>
                  <option value="nuclei">Nuclei Vulnerability Template Scanner</option>
                  <option value="sslyze">SSLyze Certificate Analyzer</option>
                  <option value="masscan">Masscan Ingress IP Scout (Mock)</option>
                  <option value="rustscan">Rustscan Accelerated Scanner (Mock)</option>
                  <option value="whatweb">WhatWeb App Profiler (Mock)</option>
                </select>
              </div>

              <button
                onClick={runMockScan}
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
                className="btn-primary-hover"
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

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <strong>Architecture Note:</strong> Future integrations with local docker agents will execute these CLI tools using standard FastAPI background tasks, writing structured logs directly into the PostgreSQL assets tables.
              </div>
            </div>
          </Panel>

          {/* Scan output logs console */}
          <Panel title="Scanner CLI Telemetry Output">
            {isScanning ? (
              <LoadingState message={`Executing binary scan on ${scanTarget} using ${scannerId}...`} />
            ) : scanOutput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '4px 8px', backgroundColor: 'var(--bg-secondary)', borderLeft: '3px solid var(--color-low)', fontSize: '11px', color: 'var(--color-low)', fontWeight: 600 }}>
                  SCAN EXECUTION COMPLETED SUCCESSFULLY
                </div>
                <pre style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: '#34d399',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '16px',
                  overflowX: 'auto',
                  maxHeight: '320px',
                  lineHeight: '1.5'
                }}>
                  {scannerId === 'nmap' && (
                    `$ nmap -sV -p- ${scanTarget}
Starting Nmap 7.92 ( https://nmap.org ) at 2026-07-05 11:43 UTC
Nmap scan report for ${scanTarget}
Host is up (0.00012s latency).
Not shown: 99997 closed ports
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1
80/tcp   open  http    Apache httpd 2.4.41
443/tcp  open  https   Apache httpd 2.4.41

Service detection performed. Please refer to inventory logs.`
                  )}
                  {scannerId === 'nuclei' && (
                    `$ nuclei -target ${scanTarget} -severity critical,high
[CVE-2021-44228] [http] [critical] Apache Log4j RCE matched on target gateway.
[INFO] Scanning completed. 1 critical vulnerability discovered.`
                  )}
                  {scannerId === 'sslyze' && (
                    `$ sslyze --regular ${scanTarget}
SCAN RESULTS FOR: ${scanTarget}:443
  * Protocols supported: TLS 1.2, TLS 1.3
  * Cipher suite audits: All ciphers compliant. No weak keys mapped.
  * Certificate chain validated successfully. Expiry in 348 days.`
                  )}
                  {['masscan', 'rustscan', 'whatweb'].includes(scannerId) && (
                    `[MOCK OUTPUT] Executed scanner daemon plugin: ${scannerId}
Output: Target ${scanTarget} profiled. No anomalies identified.`
                  )}
                </pre>
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

      {/* 3. NETWORK TOPOLOGY TAB */}
      {activeTab === 'topology' && (
        <Panel title="Global Corporate Network Connections Map">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Topology Mapping: Automatic LLDP & traceroute correlation</span>
              <span style={{ color: 'var(--color-low)' }}>● Dynamic Update Channel Active</span>
            </div>

            {/* Visual HTML map mock */}
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
              
              {/* Outer boundary circles */}
              <div style={{ position: 'absolute', width: '380px', height: '380px', border: '1px dashed rgba(59,130,246,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', width: '220px', height: '220px', border: '1px dashed rgba(59,130,246,0.15)', borderRadius: '50%' }} />

              {/* Edge Node: Firewall */}
              <div style={{ position: 'absolute', top: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-critical-bg)', border: '1px solid var(--color-critical)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-critical)' }}>
                  🛡️
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Edge Firewall</span>
              </div>

              {/* Center Core Switch */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                <div style={{ width: '50px', height: '50px', backgroundColor: 'var(--panel-bg)', border: '2px solid var(--color-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-blue)' }}>
                  🔌
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Core Switch</span>
              </div>

              {/* Subnet hosts surrounding core */}
              {/* Asset 001 */}
              <div style={{ position: 'absolute', bottom: '50px', left: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--color-critical)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  🗄️
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600 }}>PRD-DB-SRV-01</span>
              </div>

              {/* Asset 002 */}
              <div style={{ position: 'absolute', bottom: '50px', right: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--color-high)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  🖥️
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600 }}>PRD-APP-SRV-02</span>
              </div>

              {/* Asset 003 */}
              <div style={{ position: 'absolute', top: '160px', left: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--color-low)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  💻
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600 }}>MACOS-DEV-382</span>
              </div>

              {/* Asset 004 */}
              <div style={{ position: 'absolute', top: '160px', right: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--color-medium)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  💻
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600 }}>CEO-LAPTOP-01</span>
              </div>
            </div>

            {/* Topology legend */}
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
