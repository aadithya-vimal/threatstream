import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';
import { apiRequest } from '../lib/api';
import { TelemetryService } from '../services/TelemetryService';

export const YARAPlatform = () => {
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Rules');
  const [fileToScan, setFileToScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const telemetryService = new TelemetryService();
  const categories = [
    'All Rules',
    ...new Set(rules.map(rule => rule.category).filter(Boolean))
  ].map((name) => ({
    name,
    count: name === 'All Rules' ? rules.length : rules.filter(rule => rule.category === name).length
  }));
  const topTriggeredRules = [...rules]
    .sort((a, b) => (b.execution_count || 0) - (a.execution_count || 0))
    .slice(0, 4);
  const recentMatches = [...rules]
    .filter(rule => rule.last_triggered)
    .sort((a, b) => new Date(b.last_triggered) - new Date(a.last_triggered))
    .slice(0, 3);
  const liveTriggeredTotal = rules.reduce((sum, rule) => sum + (rule.execution_count || 0), 0);
  const activeDeployments = rules.filter(rule => rule.status === 'Active').length;

  React.useEffect(() => {
    const loadRules = async () => {
      const fetched = await telemetryService.getRules();
      setRules(fetched || []);
      setSelectedRule((fetched || [])[0] || null);
    };
    loadRules();
  }, []);

  const handleScanFile = async () => {
    if (!fileToScan) return;
    setScanning(true);
    setScanResult(null);
    
    const formData = new FormData();
    formData.append('file', fileToScan);
    if (selectedRule) {
      formData.append('rule_id', selectedRule.id);
    }
    
    try {
      const res = await apiRequest('/telemetry/yara/scan', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        setScanResult({ matches_count: 0, matches: [], error: 'Scan failed on backend.' });
      }
    } catch (err) {
      console.error('YARA scan failed on backend.', err);
      setScanResult({ matches_count: 0, matches: [], error: 'Scan failed on backend.' });
    } finally {
      setScanning(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = (rule.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (rule.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Rules' || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <SectionHeader 
        title="YARA Rules Management Platform" 
        subtitle="Create, manage, version, and monitor YARA detection signatures across the enterprise log stream."
      />

      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        <MetricCard title="Total YARA Rules" value={rules.length} change="Live from detections table" icon="yara" />
        <MetricCard title="Executions (Today)" value={liveTriggeredTotal} change="Live rule executions" icon="play" />
        <MetricCard title="Total Triggered Rules" value={rules.filter(rule => (rule.execution_count || 0) > 0).length} change="Live active rules" icon="activity" />
        <MetricCard title="Active Rules Deployments" value={activeDeployments} change="Live active state" icon="check" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: '20px', height: 'calc(100vh - 280px)', minHeight: '600px' }}>
        {/* Left Side: Rule Library categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Panel title="Rule Library">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Search rule library..." 
                value={searchTerm}
                onChange={handleSearch}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginTop: '4px'
                }}
              >
                <Icon name="plus" size={14} /> New YARA Rule
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '16px' }}>
              {categories.map(category => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: selectedCategory === category.name ? 'var(--bg-tertiary)' : 'transparent',
                    color: selectedCategory === category.name ? 'var(--accent)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: selectedCategory === category.name ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{category.name}</span>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 6px', 
                    borderRadius: '10px', 
                    backgroundColor: selectedCategory === category.name ? 'var(--accent)' : 'var(--bg-primary)',
                    color: selectedCategory === category.name ? '#fff' : 'var(--text-secondary)'
                  }}>{category.count}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center Panel: Table and Rule Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <Panel title="Deployments Queue">
            <DataTable
              headers={[
                { key: 'name', label: 'Rule Name' },
                { key: 'category', label: 'Category' },
                { key: 'severity', label: 'Severity' },
                { key: 'execution_count', label: 'Executions' },
                { key: 'status', label: 'Status' }
              ]}
              data={filteredRules.map(rule => ({
                ...rule,
                name: (
                  <span 
                    onClick={() => setSelectedRule(rule)} 
                    style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {rule.name}
                  </span>
                ),
                severity: <StatusBadge value={rule.severity} />,
                status: <span style={{ color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}><span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-green)', borderRadius: '50%' }}></span> Active</span>
              }))}
            />
          </Panel>

          {selectedRule && (
            <Panel title={`Rule Details: ${selectedRule.name}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text-primary)' }}>{selectedRule.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedRule.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Author: {selectedRule.author}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>v{selectedRule.version}</span>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>MITRE: {selectedRule.mitre_id}</span>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>YARA Rule Definition</h4>
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: '#60a5fa',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    overflowX: 'auto',
                    lineHeight: '1.5'
                  }}>
                    {selectedRule.definition}
                  </pre>
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* Right Panel: Rule Analytics & Recent Matches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Panel title="Rule Analytics">
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Top Triggered Rules</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {topTriggeredRules.length > 0 ? topTriggeredRules.map((rule, idx) => {
                const maxHits = Math.max(...topTriggeredRules.map(r => r.execution_count || 0), 1);
                const width = `${Math.max(12, ((rule.execution_count || 0) / maxHits) * 100)}%`;
                const barColor = idx === 0 ? 'var(--color-red)' : idx === 1 ? 'var(--color-orange)' : idx === 2 ? 'var(--color-blue)' : 'var(--color-green)';
                return (
                  <div key={rule.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>{rule.name}</span>
                      <span>{(rule.execution_count || 0).toLocaleString()} hits</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                      <div style={{ width, height: '100%', backgroundColor: barColor }}></div>
                    </div>
                  </div>
                );
              }) : (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No live rule executions recorded yet.</span>
              )}
            </div>

            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recent Matches</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMatches.length > 0 ? recentMatches.map((rule) => (
                <div key={rule.id} style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', borderLeft: '3px solid var(--color-red)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Live detections feed</span>
                    <span>{new Date(rule.last_triggered).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{rule.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-red)', marginTop: '2px' }}>Category: {rule.category}</div>
                </div>
              )) : (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No recent live rule matches available.</span>
              )}
            </div>
          </Panel>

          <Panel title="Ad-hoc File Scanner">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Scan a local binary or log payload against selected YARA signature:</span>
              <input 
                type="file" 
                onChange={(e) => setFileToScan(e.target.files[0])}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '6px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
              <button
                onClick={handleScanFile}
                disabled={scanning || !fileToScan}
                style={{
                  padding: '8px 12px',
                  backgroundColor: scanning || !fileToScan ? 'var(--border-color)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: scanning || !fileToScan ? 'not-allowed' : 'pointer',
                  textAlign: 'center'
                }}
              >
                {scanning ? 'Scanning File...' : 'Scan File'}
              </button>

              {scanResult && (
                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: scanResult.matches_count > 0 ? '#ef4444' : '#10b981' }}>
                    {scanResult.matches_count > 0 ? `⚠️ Matches Found: ${scanResult.matches_count}` : '✅ No Signatures Matched'}
                  </div>
                  {scanResult.matches?.map((match, idx) => (
                    <div key={idx} style={{ fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '4px' }}>
                      <strong>{match.rule_name}</strong> - <span style={{ textTransform: 'uppercase', color: '#ef4444' }}>{match.severity}</span>
                      <div style={{ color: 'var(--text-muted)' }}>{match.description}</div>
                    </div>
                  ))}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Size: {scanResult.file_size} bytes
                  </div>
                </div>
              )}
            </div>
          </Panel>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default YARAPlatform;
