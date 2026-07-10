/**
 * src/repositories/IncidentRepository.js
 * Incident Response, Playbooks, and Forensic Evidence Repository
 */
import { supabase } from '../lib/supabase/client';
import { Incident } from '../types';

export class IncidentRepository {
  constructor() {
    this.mockIncidents = [
      {
        id: 'INC-2026-001',
        title: 'Ransomware execution attempt on Database Server',
        description: 'Host PRD-DB-SRV-01 logged abnormal registry modifications mapping to persistence mechanisms and attempted shadow copy deletions.',
        summary: 'Ransomware execution attempt on Database Server',
        severity: 'critical',
        priority: 'critical',
        status: 'Investigating',
        owner: 'Admin Vimal',
        assignee: 'SecOps Team Alpha',
        reporter: 'Sysmon EDR Agent',
        category: 'Malware Execution',
        risk_score: 95,
        logged_date: '2026-07-05T11:15:00Z',
        classification: 'True Positive',
        tags: ['Ransomware', 'LockBit', 'Database'],
        affected_assets: ['PRD-DB-SRV-01 (10.100.4.12)'],
        affected_users: ['db_admin', 'SYSTEM'],
        mitre_id: 'T1486',
        mitre_name: 'Data Encrypted for Impact',
        mitre_tactic: 'Impact',
        evidence: [
          { name: 'update_agent.exe', type: 'Forensic File', size: '2.44 MB', addedBy: 'Admin Vimal', date: '2026-07-05', hash: '5f372a612d8b94f6fcfcb2ea2b12dfa8b9472d612dfa8b9472db9472dab9472d', custody: 'Transferred to Forensics Lab' },
          { name: 'reg_export_persistence.txt', type: 'Registry Export', size: '14.2 KB', addedBy: 'Admin Vimal', date: '2026-07-05', hash: '8b94f6fcfcb2ea2b12dfa8b9472d612d', custody: 'Stored in Encrypted Vault' }
        ],
        timeline: [
          { timestamp: '2026-07-05 11:15', author: 'Sysmon EDR', details: 'Alert triggered: cmd.exe invoked vssadmin.exe to delete shadow copies.' },
          { timestamp: '2026-07-05 11:20', author: 'Admin Vimal', details: 'Incident created. Assigned to SecOps Team Alpha. Triggered containment playbook.' },
          { timestamp: '2026-07-05 11:32', author: 'Admin Vimal', details: 'Host network interface quarantined via local firewall rule.' }
        ],
        playbook_checklist: [
          { id: 'pb-1', stage: 'Containment', task: 'Isolate host PRD-DB-SRV-01 from corporate network routing', completed: true },
          { id: 'pb-2', stage: 'Eradication', task: 'Terminate active malicious PIDs and delete update_agent.exe binaries', completed: false },
          { id: 'pb-3', stage: 'Recovery', task: 'Restore database directory from offline air-gapped snapshots', completed: false }
        ],
        tasks: [
          { id: 't-1', title: 'Verify backup integrity', status: 'In Progress', assignee: 'Jane Doe' },
          { id: 't-2', title: 'Acquire system volatile RAM dump', status: 'Completed', assignee: 'Admin Vimal' }
        ],
        comments: [
          { id: 'c-1', author: 'Admin Vimal', text: 'Volatile memory acquired successfully. Starting extraction of active process handles.', timestamp: '2026-07-05T11:40:00Z' },
          { id: 'c-2', author: 'Jane Doe', text: 'Confirming offline database backup from 2026-07-05 06:00 UTC is clean.', timestamp: '2026-07-05T11:45:00Z' }
        ]
      },
      {
        id: 'INC-2026-002',
        title: 'Spearphishing domain lookup detected',
        description: 'Executive laptop accessed known malicious Command and Control phishing site registrar.',
        summary: 'Spearphishing domain lookup detected',
        severity: 'high',
        priority: 'high',
        status: 'Active',
        owner: 'Jane Doe',
        assignee: 'Triage Queue',
        reporter: 'Zeek DNS Analyzer',
        category: 'Initial Access',
        risk_score: 75,
        logged_date: '2026-07-05T09:42:00Z',
        classification: 'True Positive',
        tags: ['Phishing', 'Initial Access', 'Executive'],
        affected_assets: ['MACOS-DEV-382 (10.100.20.91)', 'CEO-LAPTOP-01 (10.100.40.5)'],
        affected_users: ['ceo_admin'],
        mitre_id: 'T1566.002',
        mitre_name: 'Spearphishing Link',
        mitre_tactic: 'Initial Access',
        evidence: [
          { name: 'dns_log_entry.json', type: 'Zeek log', size: '2 KB', addedBy: 'Jane Doe', date: '2026-07-05', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', custody: 'Secured in Splunk Index' }
        ],
        timeline: [
          { timestamp: '2026-07-05 09:42', author: 'Zeek Sensor', details: 'DNS lookups resolved free-vpn-service.ru from CEO-LAPTOP-01.' }
        ],
        playbook_checklist: [
          { id: 'pb-1', stage: 'Containment', task: 'Revoke active OAuth authentication cookies for ceo_admin', completed: true },
          { id: 'pb-2', stage: 'Eradication', task: 'Flush local DNS cache and add domain block to egress proxy', completed: true }
        ],
        tasks: [
          { id: 't-1', title: 'Audit browser cookie stores', status: 'To Do', assignee: 'Jane Doe' }
        ],
        comments: []
      }
    ];

    this.mockMalwareProfiles = {
      'update_agent.exe': {
        filename: 'update_agent.exe',
        hashes: {
          md5: '8b94f6fcfcb2ea2b12dfa8b9472d612d',
          sha1: '372a612d8b94f6fcfcb2ea2b12dfa8b9472',
          sha256: '5f372a612d8b94f6fcfcb2ea2b12dfa8b9472d612dfa8b9472db9472dab9472d'
        },
        entropy: { score: 7.84, verdict: 'High (Highly likely packed or encrypted)' },
        fileMetadata: {
          fileType: 'PE32 executable (GUI) Intel 80386, for MS Windows',
          fileSize: '2.44 MB (2,558,464 bytes)',
          compiled: '2026-07-02 04:12:00 UTC',
          subsystem: 'Windows GUI (0x02)'
        },
        peMetadata: {
          sections: [
            { name: '.text', size: '840 KB', entropy: 6.2 },
            { name: '.rdata', size: '320 KB', entropy: 4.8 },
            { name: '.data', size: '120 KB', entropy: 2.1 },
            { name: '.upx0', size: '0 KB', entropy: 0.0 },
            { name: '.upx1', size: '1.16 MB', entropy: 7.95 }
          ],
          imports: [
            { library: 'KERNEL32.dll', functions: ['LoadLibraryA', 'GetProcAddress', 'VirtualAlloc', 'WriteProcessMemory'] },
            { library: 'USER32.dll', functions: ['MessageBoxA', 'ShowWindow'] },
            { library: 'WS2_32.dll', functions: ['WSAStartup', 'connect', 'send', 'recv'] }
          ],
          exports: []
        },
        strings: [
          'http://91.240.118.12/c2/payload.bin',
          'cmd.exe /c powershell.exe -windowstyle hidden -nop -enc ...',
          'Restore-My-Files.txt',
          'vssadmin delete shadows /all',
          'SYSTEM\\CurrentControlSet\\Services'
        ],
        signatures: [
          { name: 'UPX Packed Executable', ruleSet: 'PE Packers', severity: 'medium' },
          { name: 'Ransomware Shadow Copy Deletion Command', ruleSet: 'Behavioral signatures', severity: 'critical' },
          { name: 'Network Socket Winsock Call', ruleSet: 'Capabilities', severity: 'low' }
        ],
        virusTotal: {
          positives: 68,
          total: 72,
          communityScore: -85,
          verdict: 'Malicious (LockBit Ransomware Variant)'
        },
        yaraVerdict: {
          ruleMatched: 'LockBit_Ransomware_Payload',
          author: 'SecOps Intel',
          severity: 'critical'
        }
      }
    };
  }

  /**
   * Fetch active incidents.
   */
  async getIncidents() {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('logged_date', { ascending: false });

      if (error) throw error;
      return data.map(item => new Incident(item));
    } catch (err) {
      console.warn('IncidentRepository.getIncidents failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch specific incident by ID.
   */
  async getIncidentById(id) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new Incident(data);
    } catch (err) {
      console.warn('IncidentRepository.getIncidentById failed:', err.message);
      return null;
    }
  }

  /**
   * Update incident fields.
   */
  async updateIncident(id, fields) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return new Incident(data);
    } catch (err) {
      console.warn('IncidentRepository.updateIncident failed:', err.message);
      return null;
    }
  }

  /**
   * Fetch file static details for Malware PE analyzer
   */
  async getMalwareProfile(filename) {
    try {
      const { data, error } = await supabase
        .from('malware_samples')
        .select('*')
        .eq('filename', filename)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('IncidentRepository.getMalwareProfile failed:', err.message);
      return null;
    }
  }

  /**
   * Upload incident evidence attachment to Supabase Storage.
   */
  async uploadEvidence(incidentId, filename, fileBody) {
    try {
      const filePath = `${incidentId}/${filename}`;
      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(filePath, fileBody, { upsert: true });

      if (error) throw error;
      return data.path;
    } catch (err) {
      console.warn('IncidentRepository.uploadEvidence failed:', err.message);
      return null;
    }
  }

  /**
   * Download incident evidence attachment from Supabase Storage.
   */
  async downloadEvidence(incidentId, filename) {
    try {
      const filePath = `${incidentId}/${filename}`;
      const { data, error } = await supabase.storage
        .from('evidence')
        .download(filePath);

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('IncidentRepository.downloadEvidence failed:', err.message);
      return null;
    }
  }

  /**
   * Upload malware payload sample to Supabase Storage.
   */
  async uploadMalwareSample(filename, fileBody) {
    try {
      const { data, error } = await supabase.storage
        .from('malware')
        .upload(filename, fileBody, { upsert: true });

      if (error) throw error;
      return data.path;
    } catch (err) {
      console.warn('IncidentRepository.uploadMalwareSample failed:', err.message);
      return null;
    }
  }

  /**
   * Download malware payload sample from Supabase Storage.
   */
  async downloadMalwareSample(filename) {
    try {
      const { data, error } = await supabase.storage
        .from('malware')
        .download(filename);

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('IncidentRepository.downloadMalwareSample failed:', err.message);
      return null;
    }
  }
}

export default IncidentRepository;
