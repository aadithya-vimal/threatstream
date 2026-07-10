/**
 * src/services/TelemetryService.js
 * EDR Telemetry Normalization, Rules Engine, and Alerts Coordinator
 */
import { TelemetryRepository } from '../repositories/TelemetryRepository';

// =======================================================
// EVENT NORMALIZATION ENGINE & SOURCE ADAPTERS
// =======================================================
class EventNormalizer {
  constructor() {
    this.adapters = {
      sysmon: (raw) => ({
        pid: raw.process_id || raw.pid || null,
        ppid: raw.parent_process_id || raw.ppid || null,
        parent_process: raw.parent_image || raw.parentProcess || null,
        command_line: raw.command_line || raw.commandLine || null,
        hash: raw.hash || raw.md5 || raw.sha256 || null,
        source: 'Sysmon',
        normalized_event: { process_name: raw.image || raw.processName || null, integrity_level: raw.integrity || 'Medium' }
      }),
      windows: (raw) => ({
        source: 'Windows Event Log',
        pid: raw.pid || null,
        ppid: raw.ppid || null,
        parent_process: raw.parent || null,
        command_line: raw.command_line || null,
        normalized_event: { event_id: raw.EventID || raw.eventId, logon_type: raw.LogonType || null }
      }),
      linux_auditd: (raw) => ({
        source: 'Linux Auditd',
        pid: raw.pid || null,
        ppid: raw.ppid || null,
        command_line: raw.syscall_args || raw.commandLine || null,
        normalized_event: { syscall: raw.syscall || 'execve', uid: raw.uid || 0 }
      }),
      osquery: (raw) => ({
        source: 'OSQuery',
        pid: raw.pid || null,
        ppid: raw.ppid || null,
        command_line: raw.query_sql || null,
        normalized_event: { query_name: raw.name || 'processes_snapshot' }
      }),
      zeek: (raw) => ({
        source: 'Zeek',
        normalized_event: { service: raw.service || 'dns', query: raw.query || null, duration: raw.duration || 0.0 }
      }),
      suricata: (raw) => ({
        source: 'Suricata',
        normalized_event: { category: raw.alert_category || 'Trojan Activity', flow_id: raw.flow_id || null }
      }),
      crowdsec: (raw) => ({
        source: 'CrowdSec',
        normalized_event: { scenario: raw.scenario || 'ssh-bf', confidence: 'high' }
      }),
      falco: (raw) => ({
        source: 'Falco',
        normalized_event: { rule: raw.rule || 'Write below monitored directory', container_id: raw.container || 'N/A' }
      })
    };
  }

  normalize(source, rawPayload) {
    const adapter = this.adapters[source.toLowerCase()];
    const baseline = {
      uuid: crypto.randomUUID(),
      timestamp: rawPayload.timestamp || new Date().toISOString(),
      hostname: rawPayload.hostname || 'UNKNOWN-HOST',
      user: rawPayload.user || 'SYSTEM',
      type: rawPayload.type || 'Process',
      details: rawPayload.details || 'EDR Telemetry log entry normalized.',
      severity: rawPayload.severity || 'informational',
      mitre_id: rawPayload.mitre_id || null,
      mitre_name: rawPayload.mitre_name || null,
      mitre_tactic: rawPayload.mitre_tactic || null,
      risk_score: rawPayload.risk_score || 0,
      raw_event: rawPayload,
      correlation_id: rawPayload.correlation_id || crypto.randomUUID()
    };

    if (adapter) {
      const adapterOutputs = adapter(rawPayload);
      return { ...baseline, ...adapterOutputs };
    }
    return baseline;
  }
}

// =======================================================
// DETECTION MATCHING ENGINE (SIGMA & YARA INTERFACE)
// =======================================================
class DetectionEngine {
  evaluateRule(rule, event) {
    if (!rule.definition || !rule.status || rule.status !== 'Active') return false;

    const def = rule.definition.toLowerCase();
    const eventDetails = (event.details || '').toLowerCase();
    const eventCmd = (event.command_line || '').toLowerCase();

    // 1. Process Rules matching
    if (rule.name.includes('PowerShell') && event.type === 'Process') {
      if (def.includes('invoke-webrequest') || def.includes('net.webclient')) {
        return eventDetails.includes('powershell') && (eventCmd.includes('webrequest') || eventCmd.includes('webclient') || eventDetails.includes('bypass'));
      }
    }

    // 2. Registry Rules matching
    if (rule.name.includes('Registry') && event.type === 'Registry') {
      return eventDetails.includes('run\\updater') || eventDetails.includes('run');
    }

    // 3. DNS Rules matching
    if (rule.name.includes('DNS') && event.type === 'DNS') {
      return eventDetails.includes('.ru') || eventDetails.includes('vpn');
    }

    // 4. Credential Access dumping (YARA signatures)
    if (rule.rule_type === 'YARA' && event.type === 'Process') {
      return eventCmd.includes('taskmgr') && eventCmd.includes('lsass');
    }

    return false;
  }
}

// =======================================================
// SERVICE COORDINATOR LAYER
// =======================================================
export class TelemetryService {
  constructor() {
    this.telemetryRepository = new TelemetryRepository();
    this.normalizer = new EventNormalizer();
    this.detectionEngine = new DetectionEngine();
  }

  async getTelemetryEvents(queryStr = '') {
    return await this.telemetryRepository.getTelemetryEvents(queryStr);
  }

  getTelemetryEventsSync(queryStr = '') {
    return [];
  }

  async getRules() {
    return await this.telemetryRepository.getRules();
  }

  async getAlerts() {
    return await this.telemetryRepository.getAlerts();
  }

  async saveAlert(alert) {
    return await this.telemetryRepository.saveAlert(alert);
  }

  /**
   * Normalize an incoming EDR agent log stream, evaluate it live against the 
   * Active rule library, and auto-generate threat alerts if triggered.
   */
  async processIncomingTelemetry(source, rawPayload) {
    // 1. Normalize
    const normalized = this.normalizer.normalize(source, rawPayload);
    
    // 2. Evaluate against Rule catalog
    const rulesList = await this.getRules();
    for (const rule of rulesList) {
      const isMatched = this.detectionEngine.evaluateRule(rule, normalized);
      if (isMatched) {
        // Increment execution stats
        rule.execution_count = (rule.execution_count || 0) + 1;
        rule.last_triggered = new Date().toISOString();

        // 3. Auto-Trigger Alert
        const threatAlert = {
          rule_id: rule.id,
          telemetry_id: normalized.id || 'evt-live-ingested',
          affected_asset_id: 'asset-001', // Attributed core asset
          severity: rule.severity || 'high',
          mitre_id: rule.mitreMapping?.id || rule.mitre_id,
          mitre_name: rule.mitreMapping?.name || rule.mitre_name,
          ioc_value: normalized.hash || normalized.remoteIP || normalized.query || normalized.value || '',
          risk_score: rule.severity === 'critical' ? 95 : rule.severity === 'high' ? 80 : 50,
          evidence: { process_tree: `${normalized.parent_process || 'explorer.exe'} -> ${normalized.processName || 'cmd.exe'}`, details: normalized.details },
          status: 'New'
        };
        await this.saveAlert(threatAlert);
      }
    }

    return normalized;
  }
}

export default TelemetryService;
