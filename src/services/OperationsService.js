/**
 * src/services/OperationsService.js
 * Operations Platform Service coordinates Job Queue, Connector Management, Scheduler, Audit logs, and System Health.
 */
import { OperationsRepository } from '../repositories/OperationsRepository';

export const PLUGIN_REGISTRY = {
  scanners: ['nmap', 'masscan', 'rustscan', 'nuclei', 'openvas', 'greenbone', 'nikto', 'whatweb', 'sslyze'],
  collectors: ['zeek', 'suricata', 'sysmon', 'osquery', 'auditd', 'falco'],
  edr: ['defender', 'crowdstrike', 'sentinelone'],
  siem: ['elastic', 'wazuh'],
  threat_intel: ['misp', 'opencti'],
  enrichment: ['virustotal', 'abuseipdb', 'greynoise', 'shodan', 'censys']
};

export class OperationsService {
  constructor() {
    this.repo = new OperationsRepository();
  }

  // --- JOBS QUEUE ---
  async getJobs(filters = {}) {
    return this.repo.getJobs(filters);
  }

  async createJob(jobData) {
    await this.repo.createAuditLog({
      action: 'create',
      resource_type: 'job',
      resource_name: jobData.name || 'Job Process',
      severity: 'info',
      details: { payload: jobData.payload }
    });
    return this.repo.createJob(jobData);
  }

  async cancelJob(id) {
    const job = await this.repo.updateJobStatus(id, 'cancelled', null, null);
    if (job) {
      await this.repo.createAuditLog({
        action: 'update',
        resource_type: 'job',
        resource_id: id,
        resource_name: job.name,
        severity: 'warning',
        details: { status: 'cancelled' }
      });
    }
    return job;
  }

  // --- CONNECTORS ---
  async getConnectors(category = null) {
    return this.repo.getConnectors(category);
  }

  async getConnectorByName(name) {
    return this.repo.getConnectorByName(name);
  }

  async configureConnector(name, config) {
    const conn = await this.repo.updateConnectorConfig(name, config);
    if (conn) {
      await this.repo.createAuditLog({
        action: 'config_change',
        resource_type: 'connector',
        resource_id: conn.id,
        resource_name: conn.display_name,
        severity: 'warning',
        details: { modified_config: Object.keys(config) }
      });
    }
    return conn;
  }

  async testConnector(name) {
    return this.repo.testConnectorHealth(name);
  }

  // --- SCHEDULER ---
  async getScheduledTasks() {
    return this.repo.getScheduledTasks();
  }

  async createTask(task) {
    const created = await this.repo.createScheduledTask(task);
    if (created) {
      await this.repo.createAuditLog({
        action: 'create',
        resource_type: 'scheduled_task',
        resource_id: created.id,
        resource_name: created.name,
        severity: 'info'
      });
    }
    return created;
  }

  async toggleTask(id) {
    const toggled = await this.repo.toggleTask(id);
    if (toggled) {
      await this.repo.createAuditLog({
        action: 'update',
        resource_type: 'scheduled_task',
        resource_id: toggled.id,
        resource_name: toggled.name,
        severity: 'warning',
        details: { enabled: toggled.enabled }
      });
    }
    return toggled;
  }

  // --- AUDIT LOGS ---
  async getAuditLogs(filters = {}) {
    return this.repo.getAuditLogs(filters);
  }

  async logAction(entry) {
    return this.repo.createAuditLog(entry);
  }

  // --- BACKUPS ---
  async getBackups() {
    return this.repo.getBackups();
  }

  async triggerBackup(type = 'full') {
    await this.repo.createAuditLog({
      action: 'backup_start',
      resource_type: 'backup',
      resource_name: `Backup Initiated (${type})`,
      severity: 'warning'
    });
    const backupObj = await this.repo.createBackup(type);
    if (backupObj) {
      await this.repo.createAuditLog({
        action: 'backup_complete',
        resource_type: 'backup',
        resource_id: backupObj.id,
        resource_name: backupObj.name,
        severity: 'info',
        details: { size_bytes: backupObj.size_bytes }
      });
    }
    return backupObj;
  }

  async deleteBackup(id) {
    await this.repo.createAuditLog({
      action: 'delete',
      resource_type: 'backup',
      resource_id: id,
      severity: 'warning'
    });
    return this.repo.deleteBackup(id);
  }

  // --- SYSTEM HEALTH & KEYS ---
  async getSystemMetrics() {
    return this.repo.getSystemMetrics();
  }

  async getApiKeys() {
    return this.repo.getApiKeys();
  }

  async createApiKey(name, scopes = ['read']) {
    const result = await this.repo.createApiKey(name, scopes);
    if (result) {
      await this.repo.createAuditLog({
        action: 'api_key_created',
        resource_type: 'user',
        resource_name: name,
        severity: 'warning',
        details: { scopes, key_prefix: result.data.key_prefix }
      });
    }
    return result;
  }

  async revokeApiKey(id) {
    const key = await this.repo.revokeApiKey(id);
    if (key) {
      await this.repo.createAuditLog({
        action: 'api_key_revoked',
        resource_type: 'user',
        resource_id: id,
        resource_name: key.name,
        severity: 'critical'
      });
    }
    return key;
  }

  /**
   * Plugin interface stub returning templates.
   */
  getPluginInterface(pluginType) {
    const interfaces = {
      nmap: { exec: 'nmap -sV -sC -O --script=vuln {target}', output: 'xml', parsers: ['ports', 'services', 'vulns'] },
      masscan: { exec: 'masscan {target} -p{ports} --rate={rate}', output: 'json', parsers: ['ports'] },
      rustscan: { exec: 'rustscan -a {target} -- -sV', output: 'text', parsers: ['ports', 'services'] },
      nuclei: { exec: 'nuclei -u {target} -t {templates} -j', output: 'jsonl', parsers: ['vulns', 'info'] },
      openvas: { exec: 'gvm-cli --gmp-username {user} scan {target}', output: 'xml', parsers: ['vulns'] },
      nikto: { exec: 'nikto -h {target} -Format json', output: 'json', parsers: ['issues'] },
      whatweb: { exec: 'whatweb --log-json={output} {target}', output: 'json', parsers: ['tech', 'plugins'] },
      sslyze: { exec: 'sslyze {target} --json_out={output}', output: 'json', parsers: ['certs', 'ciphers'] },
      zeek: { exec: 'zeek -r {pcap}', output: 'tsv', parsers: ['conn', 'dns', 'http', 'ssl'] },
      suricata: { exec: 'suricata -r {pcap} -S {rules}', output: 'json', parsers: ['alerts', 'flows'] },
      osquery: { exec: 'osqueryi --json "{query}"', output: 'json', parsers: ['rows'] },
      virustotal: { exec: 'GET /api/v3/files/{hash}', output: 'json', parsers: ['stats', 'verdict'] },
      shodan: { exec: 'GET /shodan/host/{ip}', output: 'json', parsers: ['ports', 'vulns', 'tags'] },
      censys: { exec: 'GET /v2/hosts/{ip}', output: 'json', parsers: ['ports', 'services'] },
      abuseipdb: { exec: 'GET /api/v2/check?ipAddress={ip}', output: 'json', parsers: ['abuseScore', 'reports'] },
      greynoise: { exec: 'GET /v2/noise/context/{ip}', output: 'json', parsers: ['noise', 'classification'] }
    };
    return interfaces[pluginType] || { exec: 'unknown', output: 'json', parsers: [] };
  }
}

export default OperationsService;
