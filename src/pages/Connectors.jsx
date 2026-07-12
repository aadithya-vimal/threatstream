import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';
import { OperationsService } from '../services/OperationsService';
export const Connectors = () => {
  const [connectors, setConnectors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConn, setSelectedConn] = useState(null);
  const [configFields, setConfigFields] = useState({ apiKey: '', host: '', timeout: '30' });
  const [testingStatus, setTestingStatus] = useState('');
  
  const opsService = new OperationsService();

  useEffect(() => {
    const fetchConns = async () => {
      try {
        const list = await opsService.getConnectors();
        setConnectors(list || []);
        const first = list?.[0] || null;
        setSelectedConn(first);
        setConfigFields({
          apiKey: first?.config?.api_key || first?.config?.API_KEY || '',
          host: first?.config?.host || '',
          timeout: first?.config?.timeout || '30'
        });
      } catch (e) {
        console.warn("Failed to load connectors from backend:", e);
      }
    };
    fetchConns();
  }, []);

  const handleSelectConn = (conn) => {
    setSelectedConn(conn);
    setTestingStatus('');
    setConfigFields({
      apiKey: conn.config?.api_key || conn.config?.API_KEY || '',
      host: conn.config?.host || '',
      timeout: conn.config?.timeout || '30'
    });
  };

  const filteredConnectors = connectors.filter(c => {
    const matchesSearch = (c.display_name || c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTestConnection = async () => {
    if (!selectedConn) return;
    setTestingStatus('testing');
    try {
      const report = await opsService.testConnectorHealth(selectedConn.name);
      if (report && (report.status === 'active' || report.status === 'connected' || report.status === 'success')) {
        setTestingStatus('success');
      } else {
        setTestingStatus('failed');
        alert(`Connection test status: ${report?.status || 'Unknown status'}`);
      }
    } catch (e) {
      setTestingStatus('failed');
      alert(`Connection test failed: ${e.message}`);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedConn) return;
    try {
      const config = {
        api_key: configFields.apiKey,
        host: configFields.host,
        timeout: configFields.timeout
      };
      const updated = await opsService.updateConnectorConfig(selectedConn.name, config);
      if (updated) {
        setConnectors(prev => prev.map(c => c.name === selectedConn.name ? updated : c));
        setSelectedConn(updated);
        alert("Connector configuration successfully deployed.");
      }
    } catch (e) {
      alert("Failed to deploy configuration: " + e.message);
    }
  };

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Plugin Marketplace & Connectors" 
        subtitle="Manage agent feeds, scanners, threat sharing endpoints, and telemetry forwarder plugins."
      />

      {/* Categories Tabs and Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'scanner', 'collector', 'edr', 'siem', 'threat_intel', 'enrichment'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 14px',
                backgroundColor: selectedCategory === cat ? 'var(--bg-tertiary)' : 'transparent',
                color: selectedCategory === cat ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search connectors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            width: '240px'
          }}
        />
      </div>

      {/* Main Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', height: 'calc(100vh - 240px)', minHeight: '600px' }}>
        <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignContent: 'start' }}>
          {filteredConnectors.map((c) => {
            const isSelected = selectedConn && selectedConn.name === c.name;
            return (
              <div
                key={c.name}
                onClick={() => handleSelectConn(c)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--accent)', display: 'flex' }}>
                      <Icon name="plug" size={20} />
                    </span>
                    <strong style={{ fontSize: '15px' }}>{c.display_name}</strong>
                  </div>
                  <StatusBadge value={c.status} />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>{c.description}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {c.capabilities?.slice(0, 2).map(cap => (
                    <span key={cap} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {cap.replace('_', ' ')}
                    </span>
                  ))}
                  {c.capabilities?.length > 2 && (
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      +{c.capabilities.length - 2}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Configuration side panel */}
        <div>
          {selectedConn ? (
            <Panel title={`Config: ${selectedConn.display_name}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{selectedConn.display_name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{selectedConn.category} Plugin</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>v{selectedConn.version}</span>
                </div>

                {selectedConn.health?.last_check && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Health diagnostics</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Latency check:</span>
                      <strong>{selectedConn.health.latency}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Last checked:</span>
                      <strong>{new Date(selectedConn.health.last_check).toLocaleTimeString()}</strong>
                    </div>
                  </div>
                )}

                {/* Configuration form fields */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Connector configurations</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>API Token Key / Secret</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••"
                        value={configFields.apiKey}
                        onChange={(e) => setConfigFields({ ...configFields, apiKey: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          color: '#fff',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Endpoint Target Host Hostname</label>
                      <input
                        type="text"
                        placeholder="https://api.provider.com"
                        value={configFields.host}
                        onChange={(e) => setConfigFields({ ...configFields, host: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          color: '#fff',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={handleTestConnection}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {testingStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Save Config
                  </button>
                </div>

                {testingStatus === 'success' && (
                  <span style={{ display: 'block', textAlign: 'center', fontSize: '12px', color: 'var(--color-green)' }}>
                    ✅ Connection established successfully.
                  </span>
                )}

                {/* Plugin Shell Template */}
                {TEMPLATES[selectedConn.name] && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Plugin Interface Spec</h4>
                    <pre style={{
                      margin: 0,
                      padding: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#60a5fa',
                      fontFamily: 'monospace',
                      overflowX: 'auto'
                    }}>
                      Command: {TEMPLATES[selectedConn.name].exec}{'\n'}
                      Output: {TEMPLATES[selectedConn.name].output}{'\n'}
                      Parsers: {TEMPLATES[selectedConn.name].parsers}
                    </pre>
                  </div>
                )}
              </div>
            </Panel>
          ) : (
            <Panel title="Configuration Panel">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-secondary)' }}>
                <Icon name="plug" size={24} style={{ marginBottom: '8px' }} />
                <span>Select a connector plugin to configure.</span>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Connectors;
