/**
 * src/repositories/TelemetryRepository.js
 * Telemetry and Detections Rules Repository
 */
import { supabase } from '../lib/supabase/client';

export class TelemetryRepository {
  constructor() {
    this.mockRules = [
      {
        id: 'rule-001',
        name: 'Suspicious PowerShell Download Script',
        type: 'Sigma',
        severity: 'high',
        mitreMapping: { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
        status: 'Active',
        description: 'Detects PowerShell command executions attempting to download remote payloads using webclient or invoke-webrequest.',
        definition: `title: Suspicious PowerShell Download
status: stable
logsource:
  product: windows
  service: security
detection:
  selection:
    CommandLine|contains:
      - 'Net.WebClient'
      - 'DownloadFile'
      - 'Invoke-WebRequest'
      - 'iwr '
  condition: selection
falsepositives:
  - Administrative setup scripts`,
        author: 'SOC Rules Team',
        created: '2026-06-10'
      },
      {
        id: 'rule-002',
        name: 'LockBit Ransomware Executable Signature',
        type: 'YARA',
        severity: 'critical',
        mitreMapping: { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
        status: 'Active',
        description: 'Detects binary signatures matching LockBit ransomware payloads in memory or disk scans.',
        definition: `rule LockBit_Ransomware_Payload {
  meta:
    description = "YARA rule to detect LockBit binaries"
    author = "SecOps Intel"
    date = "2026-07-02"
  strings:
    $lockbit_extension = ".lockbit" wide ascii
    $ransom_note = "Restore-My-Files.txt" wide ascii
    $vss_delete = "vssadmin delete shadows /all" wide ascii
  condition:
    uint16(0) == 0x5A4D and (2 of them)
}`,
        author: 'Malware Ops',
        created: '2026-07-02'
      },
      {
        id: 'rule-003',
        name: 'LSASS Memory Dump Attempt via Task Manager',
        type: 'Custom',
        severity: 'critical',
        mitreMapping: { id: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access' },
        status: 'Active',
        description: 'Detects taskmgr.exe dumping LSASS memory to extract hashed login credentials.',
        definition: `type: EndpointTelemetryRule
trigger: process_creation
rules:
  - process_name: 'taskmgr.exe'
    target_process: 'lsass.exe'
    access_mask: '0x1F18' # Dump permission`,
        author: 'Admin Vimal',
        created: '2026-07-03'
      },
      {
        id: 'rule-004',
        name: 'Unauthorized RDP Login Patterns',
        type: 'Sigma',
        severity: 'medium',
        mitreMapping: { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement' },
        status: 'Testing',
        description: 'Detects RDP login attempts originating from unknown subnets or during non-business hours.',
        definition: `title: Abnormal RDP Login
status: testing
detection:
  selection:
    EventID: 4624
    LogonType: 10 # RDP
    TimeOfDay|outside: '08:00-18:00'
  condition: selection`,
        author: 'SOC Triage',
        created: '2026-07-04',
        version: '1.0',
        tags: ['Lateral Movement', 'RDP'],
        execution_count: 3,
        last_triggered: '2026-07-05T09:12:00Z'
      }
    ];

    this.mockEvents = [
      {
        id: 'evt-1001',
        timestamp: '2026-07-05T11:38:12Z',
        type: 'Process',
        hostname: 'WIN10-DESK-294',
        user: 'sales_user',
        details: 'Process Created: powershell.exe -ExecutionPolicy Bypass -File C:\\Users\\sales_user\\AppData\\Local\\Temp\\update.ps1',
        processName: 'powershell.exe',
        parentProcess: 'explorer.exe',
        category: 'Process Creation',
        pid: 3824,
        ppid: 1102,
        source: 'Sysmon',
        severity: 'high',
        mitre_id: 'T1059.001',
        mitre_name: 'PowerShell',
        mitre_tactic: 'Execution',
        command_line: 'powershell.exe -ExecutionPolicy Bypass -File C:\\Users\\sales_user\\AppData\\Local\\Temp\\update.ps1',
        hash: 'b12fa8e71182390a88cdff1236892410294e7721',
        risk_score: 85,
        correlation_id: '46d9d92b-8a88-4228-a83a-4422e8ff1294',
        raw_event: { event_id: 1, parent_pid: 1102, image: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' },
        normalized_event: { process_name: 'powershell.exe', integrity_level: 'Medium' }
      },
      {
        id: 'evt-1002',
        timestamp: '2026-07-05T11:38:15Z',
        type: 'Network Connection',
        hostname: 'WIN10-DESK-294',
        user: 'sales_user',
        details: 'Outbound TCP Connection: powershell.exe -> 91.240.118.12:443 (Allowed)',
        processName: 'powershell.exe',
        remoteIP: '91.240.118.12',
        remotePort: 443,
        category: 'Network Flow',
        pid: 3824,
        ppid: 1102,
        source: 'Sysmon',
        severity: 'high',
        mitre_id: 'T1071.001',
        mitre_name: 'Web Protocols',
        mitre_tactic: 'Command and Control',
        command_line: 'powershell.exe -ExecutionPolicy Bypass',
        risk_score: 80,
        correlation_id: '46d9d92b-8a88-4228-a83a-4422e8ff1294'
      },
      {
        id: 'evt-1003',
        timestamp: '2026-07-05T11:39:01Z',
        type: 'Registry',
        hostname: 'WIN10-DESK-294',
        user: 'SYSTEM',
        details: 'Registry Key Created: HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater -> C:\\Windows\\Temp\\agent.exe',
        key: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater',
        action: 'Create Key',
        category: 'Persistence',
        pid: 1404,
        ppid: 612,
        source: 'Sysmon',
        severity: 'high',
        mitre_id: 'T1547.001',
        mitre_name: 'Registry Run Keys',
        mitre_tactic: 'Persistence',
        command_line: 'reg.exe add HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v Updater /t REG_SZ /d C:\\Windows\\Temp\\agent.exe',
        risk_score: 75,
        correlation_id: '46d9d92b-8a88-4228-a83a-4422e8ff1294'
      },
      {
        id: 'evt-1004',
        timestamp: '2026-07-05T11:39:45Z',
        type: 'DNS',
        hostname: 'MACOS-DEV-382',
        user: 'dev_user',
        details: 'DNS Resolution Request: free-vpn-service.ru -> AS57112 RussianTelecom',
        query: 'free-vpn-service.ru',
        resolvedIP: '185.190.140.22',
        category: 'DNS Lookup',
        pid: 8821,
        ppid: 914,
        source: 'Zeek',
        severity: 'medium',
        mitre_id: 'T1071.004',
        mitre_name: 'DNS',
        mitre_tactic: 'Command and Control',
        risk_score: 50,
        correlation_id: '3c82e22f-8a14-498c-8822-4429e8122822'
      },
      {
        id: 'evt-1005',
        timestamp: '2026-07-05T11:40:10Z',
        type: 'Scheduled Task',
        hostname: 'PRD-APP-SRV-02',
        user: 'root',
        details: 'Cron Job Created: /usr/local/bin/sync-agent.sh > /dev/null 2>&1',
        taskName: 'sync-agent',
        trigger: 'hourly',
        category: 'Persistence',
        pid: 912,
        ppid: 1,
        source: 'Linux Auditd',
        severity: 'medium',
        mitre_id: 'T1053.003',
        mitre_name: 'Cron',
        mitre_tactic: 'Persistence',
        risk_score: 60,
        correlation_id: 'ff11a28a-c42e-4b2a-a82f-28821219d2aa'
      }
    ];

    this.mockAlerts = [
      {
        id: 'alert-1001',
        rule_id: 'rule-001',
        telemetry_id: 'evt-1001',
        affected_asset_id: 'asset-001',
        severity: 'high',
        mitre_id: 'T1059.001',
        mitre_name: 'PowerShell',
        ioc_value: '91.240.118.12',
        threat_actor_id: 'actor-1',
        risk_score: 85,
        evidence: { process_tree: 'explorer.exe -> powershell.exe -> update.ps1' },
        status: 'New',
        created_at: new Date().toISOString()
      },
      {
        id: 'alert-1002',
        rule_id: 'rule-002',
        telemetry_id: 'evt-1003',
        affected_asset_id: 'asset-001',
        severity: 'critical',
        mitre_id: 'T1547.001',
        mitre_name: 'Registry Run Keys',
        ioc_value: 'C:\\Windows\\Temp\\agent.exe',
        threat_actor_id: 'actor-1',
        risk_score: 95,
        evidence: { process_tree: 'cmd.exe -> reg.exe' },
        status: 'New',
        created_at: new Date().toISOString()
      }
    ];
  }

  /**
   * Search through telemetry events using standard filters
   */
  async getTelemetryEvents(queryStr = '') {
    try {
      // Simulating Supabase lookup
      const { data, error } = await supabase
        .from('telemetry')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return this.filterLocalEvents(data, queryStr);
    } catch (err) {
      console.warn('TelemetryRepository: executing search on mock adapter.', err.message);
      return this.filterLocalEvents(this.mockEvents, queryStr);
    }
  }

  /**
   * Fetch Active detection rules (Sigma/YARA)
   */
  async getRules() {
    try {
      const { data, error } = await supabase
        .from('detections')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('TelemetryRepository: falling back to mock rules.', err.message);
      return this.mockRules;
    }
  }

  // --- KQL Search Engine Filter Logic ---
  filterLocalEvents(events, queryStr) {
    if (!queryStr || queryStr.trim() === '') {
      return [...events];
    }

    const lines = queryStr.split('\n').map(l => l.trim()).filter(Boolean);
    let filtered = [...events];

    try {
      lines.forEach(line => {
        if (line.startsWith('//') || line.startsWith('#')) return;

        if (line.startsWith('|')) {
          const cmdParts = line.substring(1).trim().split(/\s+/);
          const cmd = cmdParts[0].toLowerCase();
          
          if (cmd === 'where') {
            const expr = cmdParts.slice(1).join(' ');
            
            if (expr.includes('==')) {
              const [field, val] = expr.split('==').map(s => s.trim().replace(/['"]/g, ''));
              filtered = filtered.filter(evt => {
                const objValue = this.getNestedValue(evt, field);
                return String(objValue).toLowerCase() === String(val).toLowerCase();
              });
            }
            else if (expr.includes('contains') || expr.includes('has')) {
              const delimiter = expr.includes('contains') ? 'contains' : 'has';
              const [field, val] = expr.split(delimiter).map(s => s.trim().replace(/['"]/g, ''));
              filtered = filtered.filter(evt => {
                const objValue = this.getNestedValue(evt, field);
                return String(objValue).toLowerCase().includes(String(val).toLowerCase());
              });
            }
            else if (expr.includes('!=')) {
              const [field, val] = expr.split('!=').map(s => s.trim().replace(/['"]/g, ''));
              filtered = filtered.filter(evt => {
                const objValue = this.getNestedValue(evt, field);
                return String(objValue).toLowerCase() !== String(val).toLowerCase();
              });
            }
          }
          else if (cmd === 'limit') {
            const limitCount = parseInt(cmdParts[1]);
            if (!isNaN(limitCount)) {
              filtered = filtered.slice(0, limitCount);
            }
          }
          else if (cmd === 'order' && cmdParts[1] === 'by') {
            const field = cmdParts[2];
            const direction = cmdParts[3] || 'asc';
            filtered.sort((a, b) => {
              const valA = String(this.getNestedValue(a, field));
              const valB = String(this.getNestedValue(b, field));
              return direction.toLowerCase() === 'desc' 
                ? valB.localeCompare(valA)
                : valA.localeCompare(valB);
            });
          }
        } 
        else {
          const term = line.toLowerCase();
          filtered = filtered.filter(evt => 
            evt.hostname.toLowerCase().includes(term) ||
            evt.user.toLowerCase().includes(term) ||
            evt.type.toLowerCase().includes(term) ||
            (evt.details && evt.details.toLowerCase().includes(term))
          );
        }
      });
    } catch (err) {
      console.error('KQL Query Parse error inside repository:', err);
    }

    return filtered;
  }

  getNestedValue(obj, path) {
    const lowercaseKey = path.toLowerCase();
    const actualKey = Object.keys(obj).find(k => k.toLowerCase() === lowercaseKey) || path;
    return obj[actualKey] !== undefined ? obj[actualKey] : '';
  }

  /**
   * Fetch all triggered security alerts.
   */
  async getAlerts() {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('TelemetryRepository: falling back to mock alerts.', err.message);
      return this.mockAlerts;
    }
  }

  /**
   * Write new alert event.
   */
  async saveAlert(alert) {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([alert])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('TelemetryRepository: writing alert to local session cache.', err.message);
      const newAlert = { ...alert, id: `alert-${Math.floor(Math.random() * 100000)}`, created_at: new Date().toISOString() };
      this.mockAlerts.unshift(newAlert);
      return newAlert;
    }
  }
}

export default TelemetryRepository;
