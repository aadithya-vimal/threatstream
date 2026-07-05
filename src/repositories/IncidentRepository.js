/**
 * src/repositories/IncidentRepository.js
 * Case Management and Malware Sandbox Repository
 */
import { supabase } from '../lib/supabase/client';
import { Incident, MalwareSample } from '../types';

export class IncidentRepository {
  constructor() {
    this.mockIncidents = [
      {
        id: 'INC-2026-001',
        summary: 'Brute-force SSH attack on PRD-DB-SRV-01',
        severity: 'critical',
        status: 'Active',
        owner: 'Admin Vimal',
        date: '2026-07-05 11:15',
        affectedAssets: ['PRD-DB-SRV-01 (10.100.4.12)'],
        mitreMapping: { id: 'T1110.001', name: 'Password Brute Forcing', tactic: 'Credential Access' },
        recommendations: [
          'Implement Fail2Ban on PRD-DB-SRV-01 to automatically block source IPs after 3 failed login attempts.',
          'Enforce key-based SSH authentication and disable password logins completely.',
          'Configure firewalls to block connections to SSH port 22 from the source Tor exit node 185.220.101.5.'
        ],
        evidence: [
          { name: 'auth_log_dump.txt', type: 'Text Log', size: '14.2 KB', addedBy: 'Admin Vimal', date: '2026-07-05' },
          { name: 'firewall_ingress_flow.pcap', type: 'Packet Capture', size: '1.4 MB', addedBy: 'SysOps Core', date: '2026-07-05' }
        ],
        timeline: [
          { timestamp: '2026-07-05 11:15', author: 'System Alert', details: 'Brute force logs triggered: 200+ failed SSH logins inside 10 minutes.' },
          { timestamp: '2026-07-05 11:20', author: 'Admin Vimal', details: 'Incident created and assigned to triage queue. Correlated with active threat intelligence IOC 185.220.101.5.' },
          { timestamp: '2026-07-05 11:32', author: 'Firewall Daemon', details: 'Automated policy block deployed: IP address 185.220.101.5 dropped at ingress router.' }
        ]
      },
      {
        id: 'INC-2026-002',
        summary: 'Phishing email link clicked by executive',
        severity: 'high',
        status: 'Investigating',
        owner: 'Jane Doe',
        date: '2026-07-05 09:42',
        affectedAssets: ['MACOS-DEV-382 (10.100.20.91)', 'CEO-LAPTOP-01 (10.100.40.5)'],
        mitreMapping: { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
        recommendations: [
          'Force immediate password reset and session invalidation for executive user accounts.',
          'Deploy email security filtering rules to quarantine incoming mails containing domains registry mismatch.',
          'Trigger EDR scan on affected executive laptops to audit local browser cookie stores.'
        ],
        evidence: [
          { name: 'phishing_mail_header.eml', type: 'Email Spec', size: '28 KB', addedBy: 'Jane Doe', date: '2026-07-05' }
        ],
        timeline: [
          { timestamp: '2026-07-05 09:42', author: 'EDR Agent', details: 'DNS query alert: Host CEO-LAPTOP-01 queried phishing indicators domain free-vpn-service.ru.' },
          { timestamp: '2026-07-05 10:05', author: 'Jane Doe', details: 'Triage ticket opened. Invalidation credentials payload dispatched to Active Directory.' }
        ]
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
      console.warn('IncidentRepository: falling back to mock incidents.', err.message);
      return this.mockIncidents.map(item => new Incident(item));
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
      console.warn('IncidentRepository: fetching case details from mock database.', err.message);
      const found = this.mockIncidents.find(item => item.id === id);
      return found ? found : null;
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
      console.warn('IncidentRepository: fetching malware profile from mock catalog.', err.message);
      
      // Return custom profile or create a default one
      const found = this.mockMalwareProfiles[filename];
      if (found) return found;

      // Fallback fallback
      return {
        filename: filename || 'suspicious_payload.exe',
        hashes: { md5: 'd41d8cd98f00b204e9800998ecf8427e', sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709', sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
        entropy: { score: 4.12, verdict: 'Low (Normal, uncompressed)' },
        fileMetadata: { fileType: 'PE32 executable (console) Intel 80386, for MS Windows', fileSize: '84 KB', compiled: '2026-07-01 10:00:00 UTC', subsystem: 'Windows Console' },
        peMetadata: { sections: [{ name: '.text', size: '60 KB', entropy: 5.1 }, { name: '.data', size: '24 KB', entropy: 1.2 }], imports: [], exports: [] },
        strings: ['exit'],
        signatures: [],
        virusTotal: { positives: 0, total: 72, communityScore: 0, verdict: 'Clean File' },
        yaraVerdict: { ruleMatched: 'None', author: 'N/A', severity: 'low' }
      };
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
      console.warn('IncidentRepository: mock upload evidence triggered due to:', err.message);
      return `mock-storage/evidence/${incidentId}/${filename}`;
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
      console.warn('IncidentRepository: mock download evidence triggered due to:', err.message);
      return new Blob(['Mock evidence packet data.'], { type: 'text/plain' });
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
      console.warn('IncidentRepository: mock upload malware triggered due to:', err.message);
      return `mock-storage/malware/${filename}`;
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
      console.warn('IncidentRepository: mock download malware triggered due to:', err.message);
      return new Blob(['Mock malware binary stream.'], { type: 'application/octet-stream' });
    }
  }
}

export default IncidentRepository;
