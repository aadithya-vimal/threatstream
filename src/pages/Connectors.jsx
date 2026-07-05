import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';
import { OperationsService } from '../services/OperationsService';

const INITIAL_CONNECTORS = [
  // Scanners
  { name: 'nmap', display_name: 'Nmap', category: 'scanner', plugin_type: 'nmap', status: 'active', version: '7.94', description: 'Network discovery and security auditing tool.', capabilities: ['port_scan', 'service_detection', 'os_detection'], health: { last_check: '2026-07-05 13:00', latency: '45ms' } },
  { name: 'masscan', display_name: 'Masscan', category: 'scanner', plugin_type: 'masscan', status: 'active', version: '1.3.2', description: 'Fastest internet port scanner, reaches 10M pps.', capabilities: ['port_scan', 'banner_grab'], health: { last_check: '2026-07-05 13:02', latency: '30ms' } },
  { name: 'rustscan', display_name: 'RustScan', category: 'scanner', plugin_type: 'rustscan', status: 'inactive', version: '2.1.1', description: 'Modern port scanner written in Rust.', capabilities: ['port_scan'], health: { last_check: '2026-07-05 12:00', latency: '15ms' } },
  { name: 'nuclei', display_name: 'Nuclei', category: 'scanner', plugin_type: 'nuclei', status: 'active', version: '3.2.0', description: 'Template-based vulnerability scanner targeting CVEs.', capabilities: ['vuln_scan', 'cve_detection', 'misconfiguration'], health: { last_check: '2026-07-05 13:05', latency: '120ms' } },
  { name: 'openvas', display_name: 'OpenVAS', category: 'scanner', plugin_type: 'openvas', status: 'not_configured', version: '22.4', description: 'Full-featured vulnerability assessment scanner.', capabilities: ['vuln_scan'], health: {} },
  { name: 'greenbone', display_name: 'Greenbone Enterprise', category: 'scanner', plugin_type: 'greenbone', status: 'not_configured', version: '22.4', description: 'Vulnerability assessment vulnerability feed.', capabilities: ['vuln_scan'], health: {} },
  { name: 'nikto', display_name: 'Nikto', category: 'scanner', plugin_type: 'nikto', status: 'inactive', version: '2.1.6', description: 'Web server vulnerability scanner.', capabilities: ['web_scan', 'header_check'], health: { last_check: '2026-07-05 11:30', latency: '220ms' } },
  { name: 'whatweb', display_name: 'WhatWeb', category: 'scanner', plugin_type: 'whatweb', status: 'active', version: '0.5.5', description: 'Web technology and framework fingerprinting.', capabilities: ['fingerprint', 'cms_detect'], health: { last_check: '2026-07-05 13:00', latency: '85ms' } },
  { name: 'sslyze', display_name: 'SSLyze', category: 'scanner', plugin_type: 'sslyze', status: 'active', version: '5.2.0', description: 'SSL/TLS configuration and cert analyzer.', capabilities: ['ssl_scan', 'cert_check'], health: { last_check: '2026-07-05 12:45', latency: '95ms' } },

  // Collectors
  { name: 'zeek', display_name: 'Zeek (Bro)', category: 'collector', plugin_type: 'zeek', status: 'active', version: '6.0.3', description: 'Network analysis and behavior monitoring framework.', capabilities: ['pcap_analysis', 'dns_log', 'ssl_log'], health: { last_check: '2026-07-05 13:05', latency: '10ms' } },
  { name: 'suricata', display_name: 'Suricata', category: 'collector', plugin_type: 'suricata', status: 'active', version: '7.0.3', description: 'Network IDS/IPS threat detection engine.', capabilities: ['ids', 'ips', 'rule_engine'], health: { last_check: '2026-07-05 13:05', latency: '12ms' } },
  { name: 'sysmon', display_name: 'Sysmon', category: 'collector', plugin_type: 'sysmon', status: 'active', version: '15.0', description: 'Windows system monitor driver logger.', capabilities: ['process_create', 'network_conn', 'registry'], health: { last_check: '2026-07-05 13:05', latency: '5ms' } },
  { name: 'osquery', display_name: 'OSQuery', category: 'collector', plugin_type: 'osquery', status: 'active', version: '5.11.0', description: 'SQL-powered operating system visibility agent.', capabilities: ['process_query', 'network_query'], health: { last_check: '2026-07-05 13:05', latency: '18ms' } },
  { name: 'auditd', display_name: 'Auditd', category: 'collector', plugin_type: 'auditd', status: 'active', version: '3.1.2', description: 'Linux system audit framework collector.', capabilities: ['syscall_audit', 'file_access'], health: { last_check: '2026-07-05 13:05', latency: '8ms' } },
  { name: 'falco', display_name: 'Falco', category: 'collector', plugin_type: 'falco', status: 'inactive', version: '0.37.1', description: 'Runtime container security monitoring.', capabilities: ['syscall_detect', 'k8s_audit'], health: {} },

  // EDR
  { name: 'defender', display_name: 'Microsoft Defender', category: 'edr', plugin_type: 'defender', status: 'not_configured', version: '1.0.0', description: 'Microsoft Defender for Endpoint logs sync.', capabilities: ['alert_sync', 'device_inventory'], health: {} },
  { name: 'crowdstrike', display_name: 'CrowdStrike Falcon', category: 'edr', plugin_type: 'crowdstrike', status: 'active', version: '7.18', description: 'CrowdStrike Falcon sensor threat queries.', capabilities: ['alert_sync', 'device_inventory'], health: { last_check: '2026-07-05 13:00', latency: '110ms' } },
  { name: 'sentinelone', display_name: 'SentinelOne', category: 'edr', plugin_type: 'sentinelone', status: 'not_configured', version: '1.0.0', description: 'SentinelOne Singularity control alerts ingestion.', capabilities: ['alert_sync'], health: {} },

  // SIEM
  { name: 'elastic', display_name: 'Elastic Security', category: 'siem', plugin_type: 'elastic', status: 'active', version: '8.13.0', description: 'Elastic SIEM log ingestion endpoint.', capabilities: ['log_ingestion', 'alert_sync'], health: { last_check: '2026-07-05 13:02', latency: '55ms' } },
  { name: 'wazuh', display_name: 'Wazuh', category: 'siem', plugin_type: 'wazuh', status: 'not_configured', version: '4.7.0', description: 'Unified open source XDR security monitor.', capabilities: ['alert_sync'], health: {} },

  // Threat Intel
  { name: 'misp', display_name: 'MISP', category: 'threat_intel', plugin_type: 'misp', status: 'not_configured', version: '2.4.188', description: 'Malware Information Sharing Platform client.', capabilities: ['indicator_sync'], health: {} },
  { name: 'opencti', display_name: 'OpenCTI', category: 'threat_intel', plugin_type: 'opencti', status: 'not_configured', version: '6.1.5', description: 'Open Cyber Threat Intelligence Platform client.', capabilities: ['indicator_sync', 'graph_sync'], health: {} },

  // Enrichment
  { name: 'virustotal', display_name: 'VirusTotal', category: 'enrichment', plugin_type: 'virustotal', status: 'active', version: 'v3', description: 'Multi-engine file hash and IP reputation lookup.', capabilities: ['hash_lookup', 'url_scan', 'ip_lookup'], health: { last_check: '2026-07-05 13:00', latency: '140ms' } },
  { name: 'abuseipdb', display_name: 'AbuseIPDB', category: 'enrichment', plugin_type: 'abuseipdb', status: 'active', version: 'v2', description: 'IP address abuse report repository.', capabilities: ['ip_lookup'], health: { last_check: '2026-07-05 13:00', latency: '105ms' } },
  { name: 'greynoise', display_name: 'GreyNoise', category: 'enrichment', plugin_type: 'greynoise', status: 'active', version: 'v3', description: 'Scanner and internet background noise filter.', capabilities: ['ip_lookup'], health: { last_check: '2026-07-05 13:00', latency: '120ms' } },
  { name: 'shodan', display_name: 'Shodan', category: 'enrichment', plugin_type: 'shodan', status: 'not_configured', version: '1.0.0', description: 'Search engine for internet-connected devices.', capabilities: ['ip_lookup', 'port_scan'], health: {} },
  { name: 'censys', display_name: 'Censys', category: 'enrichment', plugin_type: 'censys', status: 'not_configured', version: '1.0.0', description: 'Attack surface monitoring and host analysis.', capabilities: ['ip_lookup', 'domain_lookup'], health: {} }
];

const TEMPLATES = {
  nmap: { exec: 'nmap -sV -sC -O --script=vuln {target}', output: 'xml', parsers: 'ports, services, vulns' },
  masscan: { exec: 'masscan {target} -p{ports} --rate={rate}', output: 'json', parsers: 'ports' },
  rustscan: { exec: 'rustscan -a {target} -- -sV', output: 'text', parsers: 'ports, services' },
  nuclei: { exec: 'nuclei -u {target} -t {templates} -j', output: 'jsonl', parsers: 'vulns, info' },
  openvas: { exec: 'gvm-cli --gmp-username {user} scan {target}', output: 'xml', parsers: 'vulns' },
  nikto: { exec: 'nikto -h {target} -Format json', output: 'json', parsers: 'issues' },
  whatweb: { exec: 'whatweb --log-json={output} {target}', output: 'json', parsers: 'tech, plugins' },
  sslyze: { exec: 'sslyze {target} --json_out={output}', output: 'json', parsers: 'certs, ciphers' },
  zeek: { exec: 'zeek -r {pcap}', output: 'tsv', parsers: 'conn, dns, http, ssl' },
  suricata: { exec: 'suricata -r {pcap} -S {rules}', output: 'json', parsers: 'alerts, flows' },
  osquery: { exec: 'osqueryi --json "{query}"', output: 'json', parsers: 'rows' },
  virustotal: { exec: 'GET /api/v3/files/{hash}', output: 'json', parsers: 'stats, verdict' },
  shodan: { exec: 'GET /shodan/host/{ip}', output: 'json', parsers: 'ports, vulns, tags' },
  censys: { exec: 'GET /v2/hosts/{ip}', output: 'json', parsers: 'ports, services' },
  abuseipdb: { exec: 'GET /api/v2/check?ipAddress={ip}', output: 'json', parsers: 'abuseScore, reports' },
  greynoise: { exec: 'GET /v2/noise/context/{ip}', output: 'json', parsers: 'noise, classification' }
};

export const Connectors = () => {
  const [connectors, setConnectors] = useState(INITIAL_CONNECTORS);
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
        if (list && list.length > 0) {
          setConnectors(list);
          setSelectedConn(list[0]);
          setConfigFields({
            apiKey: list[0].config?.api_key || list[0].config?.API_KEY || '',
            host: list[0].config?.host || '',
            timeout: list[0].config?.timeout || '30'
          });
        }
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
    const matchesSearch = c.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchTerm.toLowerCase());
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
