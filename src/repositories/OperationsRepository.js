import { supabase } from '../lib/supabase/client';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const INITIAL_CONNECTORS = [
  // Scanners
  { id: generateUUID(), name: 'nmap', display_name: 'Nmap', category: 'scanner', plugin_type: 'nmap', status: 'active', version: '7.94', description: 'Network discovery and security auditing tool.', icon: 'globe', config: {}, capabilities: ['port_scan', 'service_detection', 'os_detection', 'script_scan'], health: { last_check: new Date().toISOString(), latency_ms: 45, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'masscan', display_name: 'Masscan', category: 'scanner', plugin_type: 'masscan', status: 'active', version: '1.3.2', description: 'Mass IP port scanner, fastest in the world.', icon: 'globe', config: {}, capabilities: ['port_scan', 'banner_grab'], health: { last_check: new Date().toISOString(), latency_ms: 30, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'rustscan', display_name: 'RustScan', category: 'scanner', plugin_type: 'rustscan', status: 'inactive', version: '2.1.1', description: 'Fast port scanner written in Rust.', icon: 'terminal', config: {}, capabilities: ['port_scan'], health: { last_check: new Date().toISOString(), latency_ms: 15, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'nuclei', display_name: 'Nuclei', category: 'scanner', plugin_type: 'nuclei', status: 'active', version: '3.2.0', description: 'Fast vulnerability scanner using templates.', icon: 'shield', config: {}, capabilities: ['vuln_scan', 'cve_detection', 'misconfiguration', 'exposure'], health: { last_check: new Date().toISOString(), latency_ms: 120, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'openvas', display_name: 'OpenVAS', category: 'scanner', plugin_type: 'openvas', status: 'not_configured', version: '22.4', description: 'Open Vulnerability Assessment Scanner.', icon: 'shield', config: {}, capabilities: ['vuln_scan'], health: {}, last_seen: null, install_date: null, is_licensed: false },
  { id: generateUUID(), name: 'greenbone', display_name: 'Greenbone Enterprise', category: 'scanner', plugin_type: 'greenbone', status: 'not_configured', version: '22.4', description: 'Enterprise vulnerability management feed.', icon: 'shield', config: {}, capabilities: ['vuln_scan'], health: {}, last_seen: null, install_date: null, is_licensed: false },
  { id: generateUUID(), name: 'nikto', display_name: 'Nikto', category: 'scanner', plugin_type: 'nikto', status: 'inactive', version: '2.1.6', description: 'Web server scanner for CGIs and configuration issues.', icon: 'globe', config: {}, capabilities: ['web_scan', 'header_check', 'plugin_scan'], health: { last_check: new Date().toISOString(), latency_ms: 220, error_count: 1 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'whatweb', display_name: 'WhatWeb', category: 'scanner', plugin_type: 'whatweb', status: 'active', version: '0.5.5', description: 'Web technology fingerprinting scanner.', icon: 'globe', config: {}, capabilities: ['fingerprint', 'cms_detect', 'framework_detect'], health: { last_check: new Date().toISOString(), latency_ms: 85, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'sslyze', display_name: 'SSLyze', category: 'scanner', plugin_type: 'sslyze', status: 'active', version: '5.2.0', description: 'SSL/TLS configuration analyzer.', icon: 'globe', config: {}, capabilities: ['ssl_scan', 'cert_check', 'cipher_check'], health: { last_check: new Date().toISOString(), latency_ms: 95, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },

  // Collectors
  { id: generateUUID(), name: 'zeek', display_name: 'Zeek (Bro)', category: 'collector', plugin_type: 'zeek', status: 'active', version: '6.0.3', description: 'Network analysis and behavior monitoring framework.', icon: 'activity', config: {}, capabilities: ['pcap_analysis', 'dns_log', 'http_log', 'ssl_log', 'conn_log'], health: { last_check: new Date().toISOString(), latency_ms: 10, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'suricata', display_name: 'Suricata', category: 'collector', plugin_type: 'suricata', status: 'active', version: '7.0.3', description: 'Network IDS/IPS/NSM engine.', icon: 'activity', config: {}, capabilities: ['ids', 'ips', 'network_monitor', 'rule_engine'], health: { last_check: new Date().toISOString(), latency_ms: 12, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'sysmon', display_name: 'Sysmon', category: 'collector', plugin_type: 'sysmon', status: 'active', version: '15.0', description: 'Windows system monitor driver log collector.', icon: 'cpu', config: {}, capabilities: ['process_create', 'network_conn', 'file_create', 'registry'], health: { last_check: new Date().toISOString(), latency_ms: 5, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'osquery', display_name: 'OSQuery', category: 'collector', plugin_type: 'osquery', status: 'active', version: '5.11.0', description: 'SQL-powered endpoint visibility agent.', icon: 'cpu', config: {}, capabilities: ['process_query', 'network_query', 'file_query', 'user_query'], health: { last_check: new Date().toISOString(), latency_ms: 18, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'auditd', display_name: 'Auditd', category: 'collector', plugin_type: 'auditd', status: 'active', version: '3.1.2', description: 'Linux system audit framework collector.', icon: 'cpu', config: {}, capabilities: ['syscall_audit', 'file_access', 'user_login'], health: { last_check: new Date().toISOString(), latency_ms: 8, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'falco', display_name: 'Falco', category: 'collector', plugin_type: 'falco', status: 'inactive', version: '0.37.1', description: 'Cloud-native runtime security system.', icon: 'activity', config: {}, capabilities: ['container_runtime', 'k8s_audit', 'syscall_detect'], health: { last_check: new Date().toISOString(), latency_ms: 0, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },

  // EDR
  { id: generateUUID(), name: 'defender', display_name: 'Microsoft Defender', category: 'edr', plugin_type: 'defender', status: 'not_configured', version: '1.0.0', description: 'Microsoft Defender for Endpoint integrations.', icon: 'shield', config: {}, capabilities: ['alert_sync', 'device_inventory'], health: {}, last_seen: null, install_date: null, is_licensed: false },
  { id: generateUUID(), name: 'crowdstrike', display_name: 'CrowdStrike Falcon', category: 'edr', plugin_type: 'crowdstrike', status: 'active', version: '7.18', description: 'CrowdStrike EDR telemetry and threat hunting.', icon: 'shield', config: {}, capabilities: ['alert_sync', 'threat_intel', 'device_inventory'], health: { last_check: new Date().toISOString(), latency_ms: 110, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'sentinelone', display_name: 'SentinelOne', category: 'edr', plugin_type: 'sentinelone', status: 'not_configured', version: '1.0.0', description: 'SentinelOne Singularity Control and Complete.', icon: 'shield', config: {}, capabilities: ['alert_sync', 'device_inventory'], health: {}, last_seen: null, install_date: null, is_licensed: false },

  // SIEM
  { id: generateUUID(), name: 'elastic', display_name: 'Elastic Security', category: 'siem', plugin_type: 'elastic', status: 'active', version: '8.13.0', description: 'Elastic SIEM log ingestion and query agent.', icon: 'database', config: {}, capabilities: ['log_ingestion', 'alert_sync', 'case_sync', 'threat_intel'], health: { last_check: new Date().toISOString(), latency_ms: 55, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'wazuh', display_name: 'Wazuh', category: 'siem', plugin_type: 'wazuh', status: 'not_configured', version: '4.7.0', description: 'Unified XDR and SIEM security monitor.', icon: 'database', config: {}, capabilities: ['alert_sync', 'log_ingestion'], health: {}, last_seen: null, install_date: null, is_licensed: false },

  // Threat Intel
  { id: generateUUID(), name: 'misp', display_name: 'MISP', category: 'threat_intel', plugin_type: 'misp', status: 'not_configured', version: '2.4.188', description: 'Malware Information Sharing Platform connector.', icon: 'intelligence', config: {}, capabilities: ['indicator_sync', 'sharing'], health: {}, last_seen: null, install_date: null, is_licensed: false },
  { id: generateUUID(), name: 'opencti', display_name: 'OpenCTI', category: 'threat_intel', plugin_type: 'opencti', status: 'not_configured', version: '6.1.5', description: 'Open Cyber Threat Intelligence Platform sync.', icon: 'intelligence', config: {}, capabilities: ['indicator_sync', 'graph_sync'], health: {}, last_seen: null, install_date: null, is_licensed: false },

  // Enrichment
  { id: generateUUID(), name: 'virustotal', display_name: 'VirusTotal', category: 'enrichment', plugin_type: 'virustotal', status: 'active', version: 'v3', description: 'Multi-engine file hash and URL scanner.', icon: 'enrichment', config: { api_key: '********' }, capabilities: ['hash_lookup', 'url_scan', 'ip_lookup', 'domain_lookup'], health: { last_check: new Date().toISOString(), latency_ms: 140, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'abuseipdb', display_name: 'AbuseIPDB', category: 'enrichment', plugin_type: 'abuseipdb', status: 'active', version: 'v2', description: 'IP address abuse report repository.', icon: 'enrichment', config: { api_key: '********' }, capabilities: ['ip_lookup'], health: { last_check: new Date().toISOString(), latency_ms: 105, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'greynoise', display_name: 'GreyNoise', category: 'enrichment', plugin_type: 'greynoise', status: 'active', version: 'v3', description: 'Internet scanner background noise analyzer.', icon: 'enrichment', config: { api_key: '********' }, capabilities: ['ip_lookup'], health: { last_check: new Date().toISOString(), latency_ms: 120, error_count: 0 }, last_seen: new Date().toISOString(), install_date: new Date().toISOString(), is_licensed: true },
  { id: generateUUID(), name: 'shodan', display_name: 'Shodan', category: 'enrichment', plugin_type: 'shodan', status: 'not_configured', version: '1.0.0', description: 'Search engine for Internet-connected devices.', icon: 'enrichment', config: {}, capabilities: ['ip_lookup', 'domain_lookup', 'port_scan'], health: {}, last_seen: null, install_date: null, is_licensed: false },
  { id: generateUUID(), name: 'censys', display_name: 'Censys', category: 'enrichment', plugin_type: 'censys', status: 'not_configured', version: '1.0.0', description: 'Attack surface mapping and host analyzer.', icon: 'enrichment', config: {}, capabilities: ['ip_lookup', 'domain_lookup'], health: {}, last_seen: null, install_date: null, is_licensed: false }
];

const INITIAL_JOBS = [
  { id: 'job-001', name: 'Nmap Full Network Scan', type: 'scan', status: 'running', priority: 2, payload: { target: '10.0.5.0/24', ports: '1-65535' }, result: null, error: null, progress: 67, connector_id: 'nmap', scheduled_at: null, started_at: new Date(Date.now() - 263000).toISOString(), completed_at: null, created_by: null, created_at: new Date(Date.now() - 263000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'job-002', name: 'Nuclei CVE Template Scan', type: 'scan', status: 'running', priority: 2, payload: { target: 'https://staging.acme.com', templates: 'cves/' }, result: null, error: null, progress: 34, connector_id: 'nuclei', scheduled_at: null, started_at: new Date(Date.now() - 121000).toISOString(), completed_at: null, created_by: null, created_at: new Date(Date.now() - 121000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'job-003', name: 'IOC Enrichment Batch', type: 'enrich', status: 'queued', priority: 3, payload: { items: 25 }, result: null, error: null, progress: 0, connector_id: 'virustotal', scheduled_at: null, started_at: null, completed_at: null, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'job-004', name: 'Full Platform Backup', type: 'backup', status: 'completed', priority: 1, payload: { scope: 'full' }, result: { backup_id: 'ts_backup_20260705_0200', size_mb: 847 }, error: null, progress: 100, connector_id: null, scheduled_at: null, started_at: new Date(Date.now() - 3600000).toISOString(), completed_at: new Date(Date.now() - 3600000 + 494000).toISOString(), created_by: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'job-005', name: 'Threat Feed Update', type: 'collect', status: 'completed', priority: 3, payload: { provider: 'otx' }, result: { indicators_added: 412 }, error: null, progress: 100, connector_id: null, scheduled_at: null, started_at: new Date(Date.now() - 1800000).toISOString(), completed_at: new Date(Date.now() - 1800000 + 104000).toISOString(), created_by: null, created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'job-006', name: 'Weekly Executive Report', type: 'report', status: 'queued', priority: 5, payload: { format: 'pdf' }, result: null, error: null, progress: 0, connector_id: null, scheduled_at: null, started_at: null, completed_at: null, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'job-007', name: 'Old Log Cleanup', type: 'cleanup', status: 'failed', priority: 8, payload: { retention_days: 90 }, result: null, error: 'Permission denied: /var/log/archive', progress: 0, connector_id: null, scheduled_at: null, started_at: new Date(Date.now() - 7200000).toISOString(), completed_at: new Date(Date.now() - 7200000 + 2000).toISOString(), created_by: null, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString() },
  { id: 'job-008', name: 'OSQuery Fleet Collect', type: 'collect', status: 'running', priority: 2, payload: { query: 'select * from processes' }, result: null, error: null, progress: 89, connector_id: 'osquery', scheduled_at: null, started_at: new Date(Date.now() - 312000).toISOString(), completed_at: null, created_by: null, created_at: new Date(Date.now() - 312000).toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_SCHEDULED_TASKS = [
  { id: generateUUID(), name: 'Daily Full Backup', description: 'Triggers a full database and config export.', cron_expression: '0 2 * * *', job_type: 'backup', connector_id: null, payload: { scope: 'full' }, enabled: true, last_run: new Date(Date.now() - 54000000).toISOString(), next_run: new Date(Date.now() + 32400000).toISOString(), run_count: 365, fail_count: 0, created_at: new Date(Date.now() - 31536000000).toISOString() },
  { id: generateUUID(), name: 'Nuclei Scan Every 6h', description: 'Vulnerability scan targeting corporate perimeter.', cron_expression: '0 */6 * * *', job_type: 'scan', connector_id: 'nuclei', payload: { target: '10.0.5.0/24' }, enabled: true, last_run: new Date(Date.now() - 18000000).toISOString(), next_run: new Date(Date.now() + 3600000).toISOString(), run_count: 1247, fail_count: 2, created_at: new Date(Date.now() - 26300000).toISOString() },
  { id: generateUUID(), name: 'Hourly Feed Update', description: 'Pulls the latest OSINT threat intelligence indicators.', cron_expression: '0 * * * *', job_type: 'collect', connector_id: null, payload: { provider: 'otx' }, enabled: true, last_run: new Date(Date.now() - 3600000).toISOString(), next_run: new Date(Date.now() + 3600000).toISOString(), run_count: 8760, fail_count: 5, created_at: new Date(Date.now() - 31536000000).toISOString() },
  { id: generateUUID(), name: 'Weekly Executive Report', description: 'Compiles and generates the platform PDF summary.', cron_expression: '0 9 * * 1', job_type: 'report', connector_id: null, payload: {}, enabled: true, last_run: new Date(Date.now() - 432000000).toISOString(), next_run: new Date(Date.now() + 172800000).toISOString(), run_count: 52, fail_count: 0, created_at: new Date(Date.now() - 31536000000).toISOString() },
  { id: generateUUID(), name: 'Zeek PCAP Collect', description: 'Triggers a PCAP flow collector ingestion job.', cron_expression: '*/5 * * * *', job_type: 'collect', connector_id: 'zeek', payload: { interface: 'eth0' }, enabled: true, last_run: new Date(Date.now() - 300000).toISOString(), next_run: new Date(Date.now() + 300000).toISOString(), run_count: 52848, fail_count: 0, created_at: new Date(Date.now() - 31536000000).toISOString() },
  { id: generateUUID(), name: 'OSQuery Fleet Poll', description: 'Collects running process lists from host assets.', cron_expression: '*/15 * * * *', job_type: 'collect', connector_id: 'osquery', payload: { query: 'select name, pid from processes' }, enabled: true, last_run: new Date(Date.now() - 900000).toISOString(), next_run: new Date(Date.now() + 900000).toISOString(), run_count: 17616, fail_count: 1, created_at: new Date(Date.now() - 31536000000).toISOString() }
];

const INITIAL_AUDIT_LOGS = [
  { id: generateUUID(), timestamp: new Date(Date.now() - 300000).toISOString(), user_email: 'admin@acme.com', action: 'config_change', resource_type: 'connector', resource_id: 'nmap', resource_name: 'Nmap Scanner', details: { modified_fields: ['target_range', 'scan_speed'], reason: 'Network expansion' }, ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', severity: 'warning' },
  { id: generateUUID(), timestamp: new Date(Date.now() - 900000).toISOString(), user_email: 'analyst@acme.com', action: 'update', resource_type: 'incident', resource_id: 'inc-984', resource_name: 'LockBit 3.0 Ransomware Activity', details: { status: 'Mitigated', comments_added: 'Containment completed on target server.' }, ip_address: '10.0.12.98', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', severity: 'info' },
  { id: generateUUID(), timestamp: new Date(Date.now() - 1800000).toISOString(), user_email: 'admin@acme.com', action: 'api_key_created', resource_type: 'user', resource_id: 'usr-1', resource_name: 'SOC Automation Key', details: { scope: ['read:intel', 'write:intel', 'read:incidents'], key_prefix: 'ts_live_ab12' }, ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', severity: 'warning' },
  { id: generateUUID(), timestamp: new Date(Date.now() - 3600000).toISOString(), user_email: 'system', action: 'backup_complete', resource_type: 'backup', resource_id: 'ts_backup_20260705_0200', resource_name: 'Daily Auto-Backup', details: { size_bytes: 888127393, checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }, ip_address: '127.0.0.1', user_agent: 'ThreatStream System Daemon', severity: 'info' },
  { id: generateUUID(), timestamp: new Date(Date.now() - 5400000).toISOString(), user_email: 'hunter@acme.com', action: 'export', resource_type: 'ioc', resource_id: null, resource_name: 'Active C2 Domains', details: { format: 'csv', count: 124 }, ip_address: '10.0.12.63', user_agent: 'Mozilla/5.0 (X11; Linux x86_64)', severity: 'info' },
  { id: generateUUID(), timestamp: new Date(Date.now() - 7200000).toISOString(), user_email: 'hacker_attempts@xyz.com', action: 'login_failed', resource_type: 'user', resource_id: null, resource_name: 'admin', details: { failure_reason: 'Invalid password credential', attempt_count: 3 }, ip_address: '185.220.101.44', user_agent: 'Python-urllib/3.10', severity: 'warning' },
  { id: generateUUID(), timestamp: new Date(Date.now() - 14400000).toISOString(), user_email: 'admin@acme.com', action: 'admin_escalation', resource_type: 'user', resource_id: 'usr-4', resource_name: 'analyst@acme.com', details: { granted_roles: ['Global Administrator'], approved_by: 'admin@acme.com' }, ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0', severity: 'critical' },
  { id: generateUUID(), timestamp: new Date(Date.now() - 18000000).toISOString(), user_email: 'admin@acme.com', action: 'delete', resource_type: 'rule', resource_id: 'rule-7a1b', resource_name: 'Temporary_Mimikatz_Hunt', details: { deleted_rule_hash: '2fa9e8b7c' }, ip_address: '10.0.12.42', user_agent: 'Mozilla/5.0', severity: 'warning' }
];

const INITIAL_BACKUPS = [
  { id: generateUUID(), name: 'ts_backup_20260705_0200', type: 'full', status: 'completed', size_bytes: 888127393, file_path: '/backups/ts_backup_20260705_0200.tar.gz', checksum: 'sha256:e3b0c442...', tables_included: ['users', 'assets', 'incidents', 'telemetry', 'threats', 'yara_rules'], retention_days: 30, triggered_by: 'scheduled', created_by: null, completed_at: new Date(Date.now() - 54000000).toISOString(), expires_at: new Date(Date.now() + 25 * 86400000).toISOString(), created_at: new Date(Date.now() - 54000000).toISOString() },
  { id: generateUUID(), name: 'ts_backup_20260704_0200', type: 'full', status: 'completed', size_bytes: 871109941, file_path: '/backups/ts_backup_20260704_0200.tar.gz', checksum: 'sha256:a8f4c28d...', tables_included: ['users', 'assets', 'incidents', 'telemetry', 'threats', 'yara_rules'], retention_days: 30, triggered_by: 'scheduled', created_by: null, completed_at: new Date(Date.now() - 54000000 - 86400000).toISOString(), expires_at: new Date(Date.now() + 24 * 86400000).toISOString(), created_at: new Date(Date.now() - 54000000 - 86400000).toISOString() },
  { id: generateUUID(), name: 'ts_config_20260705', type: 'config', status: 'completed', size_bytes: 24576, file_path: '/backups/ts_config_20260705.json', checksum: 'sha256:bcd87f2e...', tables_included: ['connectors', 'settings', 'scheduled_tasks'], retention_days: 90, triggered_by: 'manual', created_by: null, completed_at: new Date(Date.now() - 28800000).toISOString(), expires_at: new Date(Date.now() + 85 * 86400000).toISOString(), created_at: new Date(Date.now() - 28800000).toISOString() }
];

const INITIAL_API_KEYS = [
  { id: generateUUID(), name: 'SOC Automation Service', key_prefix: 'ts_live_ab12', scopes: ['read:intel', 'write:intel', 'read:incidents', 'write:incidents', 'read:assets'], created_by: null, last_used: new Date().toISOString(), expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), is_active: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: generateUUID(), name: 'SIEM Log Forwarder', key_prefix: 'ts_live_cd34', scopes: ['read:telemetry', 'read:assets'], created_by: null, last_used: new Date(Date.now() - 60000).toISOString(), expires_at: new Date(Date.now() + 180 * 86400000).toISOString(), is_active: true, created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: generateUUID(), name: 'Reporting Engine Daemon', key_prefix: 'ts_live_ef56', scopes: ['read:incidents'], created_by: null, last_used: new Date(Date.now() - 86400000).toISOString(), expires_at: new Date(Date.now() + 2 * 86400000).toISOString(), is_active: true, created_at: new Date(Date.now() - 88 * 86400000).toISOString() },
  { id: generateUUID(), name: 'Deprecated Key', key_prefix: 'ts_live_gh78', scopes: ['read'], created_by: null, last_used: new Date(Date.now() - 200 * 86400000).toISOString(), expires_at: null, is_active: false, created_at: new Date(Date.now() - 201 * 86400000).toISOString() }
];

const BACKEND_URL = 'http://localhost:8000/api/v1';

async function checkBackend() {
  try {
    // Try to reach health check with a short timeout to prevent UI lag
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600);
    const res = await fetch('http://localhost:8000/health', { 
      method: 'GET', 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function getAuthHeaders() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : { 'Authorization': 'Bearer dev-token' })
    };
  } catch (e) {
    return { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dev-token'
    };
  }
}

export class OperationsRepository {
  constructor() {
    this.connectors = [...INITIAL_CONNECTORS];
    this.jobs = [...INITIAL_JOBS];
    this.scheduledTasks = [...INITIAL_SCHEDULED_TASKS];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.backups = [...INITIAL_BACKUPS];
    this.apiKeys = [...INITIAL_API_KEYS];
  }

  // --- JOB QUEUE ---
  async getJobs(filters = {}) {
    if (await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const url = new URL(`${BACKEND_URL}/jobs`);
        if (filters.status) url.searchParams.append('status_filter', filters.status);
        if (filters.type) url.searchParams.append('type_filter', filters.type);
        const res = await fetch(url, { headers });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend fetch jobs failed:', e);
      }
    }

    try {
      let query = supabase.from('jobs').select('*');
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('type', filters.type);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase fetch jobs failed:', e);
    }

    return [];
  }

  async createJob(jobData) {
    if (await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/jobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: jobData.name || 'Job Process',
            type: jobData.type || 'scan',
            priority: jobData.priority || 5,
            payload: jobData.payload || {},
            connector_id: jobData.connector_id || null,
            scheduled_at: jobData.scheduled_at || null
          })
        });
        if (res.ok) {
          const data = await res.json();
          this.jobs.unshift(data);
          return data;
        }
      } catch (e) {
        console.warn('Backend create job failed:', e);
      }
    }

    return null;
  }

  async updateJobStatus(id, status, progress, result, errorText = null) {
    if (await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        let endpoint = `${BACKEND_URL}/jobs/${id}`;
        
        if (status === 'cancelled') {
          endpoint = `${BACKEND_URL}/jobs/${id}/cancel`;
        } else if (status === 'paused') {
          endpoint = `${BACKEND_URL}/jobs/${id}/pause`;
        } else if (status === 'running') {
          endpoint = `${BACKEND_URL}/jobs/${id}/resume`;
        }

        const method = (status === 'cancelled' || status === 'paused' || status === 'running') ? 'POST' : 'PATCH';
        
        const res = await fetch(endpoint, {
          method,
          headers,
          ...(method === 'PATCH' ? { body: JSON.stringify({ status, progress, result, error: errorText }) } : {})
        });
        
        if (res.ok) {
          const data = await res.json();
          const idx = this.jobs.findIndex(j => j.id === id);
          if (idx !== -1) this.jobs[idx] = data;
          return data;
        }
      } catch (e) {
        console.warn('Backend update job status failed:', e);
      }
    }

    try {
      const updates = { status, updated_at: new Date().toISOString() };
      if (progress !== null && progress !== undefined) updates.progress = progress;
      if (result) updates.result = result;
      if (errorText) updates.error = errorText;
      if (status === 'running') updates.started_at = new Date().toISOString();
      if (status === 'completed' || status === 'failed' || status === 'cancelled') updates.completed_at = new Date().toISOString();

      const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select();
      if (!error && data && data[0]) {
        const idx = this.jobs.findIndex(j => j.id === id);
        if (idx !== -1) this.jobs[idx] = data[0];
        return data[0];
      }
    } catch (e) {
      console.warn('Supabase update job failed:', e);
    }

    return null;
  }

  // --- CONNECTORS ---
  async getConnectors(category = null) {
    if (await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/plugins`, { headers });
        if (res.ok) {
          const plugins = await res.json();
          if (category && category !== 'all') {
            return plugins.filter(c => c.category === category);
          }
          return plugins;
        }
      } catch (e) {
        console.warn('Backend fetch plugins failed:', e);
      }
    }

    try {
      let query = supabase.from('connectors').select('*');
      if (category && category !== 'all') query = query.eq('category', category);
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase fetch connectors failed:', e);
    }

    return [];
  }

  async getConnectorByName(name) {
    try {
      const { data, error } = await supabase.from('connectors').select('*').eq('name', name).maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase get connector failed:', e);
    }
    return null;
  }

  async updateConnectorConfig(name, config) {
    const conn = await this.getConnectorByName(name);
    if (conn && conn.id && await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/plugins/${conn.id}/config`, {
          method: 'POST',
          headers,
          body: JSON.stringify(config)
        });
        if (res.ok) {
          const data = await res.json();
          const idx = this.connectors.findIndex(c => c.name === name);
          if (idx !== -1) this.connectors[idx] = data;
          return data;
        }
      } catch (e) {
        console.warn('Backend update connector config failed:', e);
      }
    }

    try {
      const updates = { 
        config, 
        status: 'active', 
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      };
      const { data, error } = await supabase.from('connectors').update(updates).eq('name', name).select();
      if (!error && data && data[0]) {
        return data[0];
      }
    } catch (e) {
      console.warn('Supabase update connector failed:', e);
    }

    return null;
  }

  async testConnectorHealth(name) {
    const conn = await this.getConnectorByName(name);
    if (conn && conn.id && await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/plugins/${conn.id}/test`, {
          method: 'POST',
          headers
        });
        if (res.ok) {
          const health_report = await res.json();
          // Map backend key to frontend view keys
          return {
            status: health_report.status === 'connected' ? 'active' : health_report.status,
            latency_ms: health_report.latency_ms || 45,
            last_check: health_report.last_successful_sync || new Date().toISOString(),
            error_count: 0
          };
        }
      } catch (e) {
        console.warn('Backend test connector health failed:', e);
      }
    }

    return { status: 'error', error: 'Live connector health is unavailable' };
  }

  // --- SCHEDULED TASKS ---
  async getScheduledTasks() {
    if (await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/scheduler`, { headers });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Backend fetch scheduler tasks failed:', e);
      }
    }

    try {
      const { data, error } = await supabase.from('scheduled_tasks').select('*');
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase scheduled tasks failed:', e);
    }
    return [];
  }

  async createScheduledTask(task) {
    if (await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/scheduler/jobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: task.name,
            description: task.description || '',
            cron_expression: task.cron_expression,
            job_type: task.job_type,
            connector_id: task.connector_id || null,
            payload: task.payload || {}
          })
        });
        if (res.ok) {
          const data = await res.json();
          this.scheduledTasks.push(data);
          return data;
        }
      } catch (e) {
        console.warn('Backend create scheduled task failed:', e);
      }
    }

    const newTask = {
      id: generateUUID(),
      name: task.name,
      description: task.description || '',
      cron_expression: task.cron_expression,
      job_type: task.job_type,
      connector_id: task.connector_id || null,
      payload: task.payload || {},
      enabled: true,
      last_run: null,
      next_run: new Date(Date.now() + 86400000).toISOString(),
      run_count: 0,
      fail_count: 0,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('scheduled_tasks').insert(newTask).select();
      if (!error && data && data[0]) {
        this.scheduledTasks.push(data[0]);
        return data[0];
      }
    } catch (e) {
      console.warn('Supabase insert scheduled task failed:', e);
    }

    return null;
  }

  async toggleTask(id) {
    if (await checkBackend()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/scheduler/${id}/toggle`, {
          method: 'POST',
          headers
        });
        if (res.ok) {
          const data = await res.json();
          const idx = this.scheduledTasks.findIndex(t => t.id === id);
          if (idx !== -1) this.scheduledTasks[idx] = data;
          return data;
        }
      } catch (e) {
        console.warn('Backend toggle task failed:', e);
      }
    }

    return null;
  }

  // --- AUDIT LOGS ---
  async getAuditLogs(filters = {}) {
    try {
      let query = supabase.from('audit_logs').select('*');
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.severity) query = query.eq('severity', filters.severity);
      if (filters.user_email) query = query.ilike('user_email', `%${filters.user_email}%`);
      const { data, error } = await query.order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase audit logs failed:', e);
    }

    return [];
  }

  async createAuditLog(entry) {
    const newLog = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      user_id: null,
      user_email: entry.user_email || 'admin@acme.com',
      action: entry.action,
      resource_type: entry.resource_type || null,
      resource_id: entry.resource_id || null,
      resource_name: entry.resource_name || null,
      details: entry.details || {},
      ip_address: entry.ip_address || '10.0.12.42',
      user_agent: navigator.userAgent,
      severity: entry.severity || 'info'
    };

    try {
      await supabase.from('audit_logs').insert(newLog);
    } catch (e) {
      console.warn('Supabase insert audit log failed:', e);
    }

    return newLog;
  }

  // --- BACKUPS ---
  async getBackups() {
    try {
      const { data, error } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase backups failed:', e);
    }
    return [];
  }

  async createBackup(type = 'full') {
    const timestampStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const newBackup = {
      id: generateUUID(),
      name: `ts_backup_${timestampStr}_manual`,
      type,
      status: 'completed',
      size_bytes: type === 'full' ? 892348271 : (type === 'incremental' ? 12398471 : 24576),
      file_path: `/backups/ts_backup_${timestampStr}_manual.tar.gz`,
      checksum: 'sha256:d5f2a18...',
      tables_included: type === 'config' ? ['connectors', 'settings', 'scheduled_tasks'] : ['users', 'assets', 'incidents', 'telemetry', 'threats', 'yara_rules'],
      retention_days: type === 'config' ? 90 : 30,
      triggered_by: 'manual',
      created_by: null,
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('backups').insert(newBackup).select();
      if (!error && data && data[0]) {
        this.backups.unshift(data[0]);
        return data[0];
      }
    } catch (e) {
      console.warn('Supabase insert backup failed:', e);
    }

    return newBackup;
  }

  async deleteBackup(id) {
    try {
      await supabase.from('backups').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete backup failed:', e);
    }
    this.backups = this.backups.filter(b => b.id !== id);
    return true;
  }

  // --- SYSTEM METRICS ---
  async getSystemMetrics() {
    try {
      const { data, error } = await supabase.from('system_metrics').select('*').order('timestamp', { ascending: false }).limit(24);
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase system metrics failed:', e);
    }

    return [];
  }

  // --- API KEYS ---
  async getApiKeys() {
    try {
      const { data, error } = await supabase.from('api_keys').select('*');
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase fetch api keys failed:', e);
    }
    return [];
  }

  async createApiKey(name, scopes = ['read']) {
    const rawKey = 'ts_live_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newKey = {
      id: generateUUID(),
      name,
      key_prefix: rawKey.substring(0, 11),
      key_hash: 'bcrypt_mock_hash',
      scopes,
      created_by: null,
      last_used: null,
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      is_active: true,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('api_keys').insert(newKey).select();
      if (!error && data && data[0]) {
        this.apiKeys.unshift(data[0]);
        return { key: rawKey, data: data[0] };
      }
    } catch (e) {
      console.warn('Supabase insert API key failed:', e);
    }

    return { key: rawKey, data: newKey };
  }

  async revokeApiKey(id) {
    try {
      const { data, error } = await supabase.from('api_keys').update({ is_active: false }).eq('id', id).select();
      if (!error && data && data[0]) {
        const idx = this.apiKeys.findIndex(k => k.id === id);
        if (idx !== -1) this.apiKeys[idx] = data[0];
        return data[0];
      }
    } catch (e) {
      console.warn('Supabase revoke API key failed:', e);
    }

    return null;
  }
}
