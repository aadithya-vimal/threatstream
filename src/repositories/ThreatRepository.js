/**
 * src/repositories/ThreatRepository.js
 * Threat and IOC Repository Layer
 */
import { supabase } from '../lib/supabase/client';
import { Threat, IOC } from '../types';

export class ThreatRepository {
  constructor() {
    // High-fidelity fallback mock dataset
    this.mockThreats = [];
    this.mockIOCs = [
      {
        id: 'intel-001',
        value: '185.220.101.5',
        type: 'IP',
        subType: 'IPv4',
        asn: 'AS208366 TorExitServer',
        country: 'DE',
        threatType: 'Command & Control (C2)',
        confidence: 98,
        severity: 'critical',
        mitreTechnique: { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control' },
        sourceFeed: 'AlienVault OTX',
        tags: ['APT29', 'Cozy Bear', 'Tor Exit', 'CobaltStrike'],
        lastSeen: '2026-07-05T11:00:00Z',
        description: 'Highly active IP address identified as a malicious Tor exit node. Multi-stage Command and Control (C2) payloads associated with APT29 (Cozy Bear) threat campaigns are routing over this exit socket to honeypot nodes in Europe.',
        references: [
          'https://otx.alienvault.com/indicator/ip/185.220.101.5',
          'https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-184a'
        ],
        threatActor: {
          name: 'APT29 (Cozy Bear)',
          type: 'State-Sponsored APT',
          origin: 'Russia',
          description: 'Cozy Bear (also known as APT29, Nobelium, or Midnight Blizzard) is a Russian state-sponsored cyber espionage group active since at least 2008. They target governments, think tanks, and technology providers globally.'
        },
        timeline: [
          { date: '2026-07-05 11:00', title: 'Honeypot Trigger', details: 'Interactive SSH honeypot login attempt using leaked admin credentials.', source: 'Internal honeypot' },
          { date: '2026-07-04 18:24', title: 'AlienVault Pulse Created', details: 'Added to Cozy Bear active infrastructure indicator logs.', source: 'OTX Sync' },
          { date: '2026-07-02 09:12', title: 'VirusTotal Verdict Change', details: 'Aggregator flag updated: 62/70 engines report malicious payload routing.', source: 'VirusTotal' }
        ]
      },
      {
        id: 'intel-002',
        value: 'free-vpn-service.ru',
        type: 'Domain',
        subType: 'Domain',
        asn: 'AS57112 RussianTelecom',
        country: 'RU',
        threatType: 'Phishing Host',
        confidence: 89,
        severity: 'high',
        mitreTechnique: { id: 'T1566', name: 'Phishing', tactic: 'Initial Access' },
        sourceFeed: 'VirusTotal',
        tags: ['Phishing', 'Social Engineering', 'Credential Stealer'],
        lastSeen: '2026-07-05T09:42:00Z',
        description: 'Phishing landing page imitating free commercial VPN packages. Used in spear-phishing campaigns targeting corporate executives to harvest corporate login tokens and VPN credentials.',
        references: [
          'https://www.virustotal.com/gui/domain/free-vpn-service.ru'
        ],
        threatActor: {
          name: 'UNC2541',
          type: 'Financial / Cybercrime Group',
          origin: 'Unknown',
          description: 'UNC2541 is a cybercrime group active since at least 2019, targeting aerospace, aviation, and defense industries using custom phishing campaigns.'
        },
        timeline: [
          { date: '2026-07-05 09:42', title: 'DNS Resolution Alert', details: 'Corporate endpoint MACOS-DEV-382 queried phishing indicators domain free-vpn-service.ru.', source: 'EDR Agent Query Log' },
          { date: '2026-07-04 06:00', title: 'Domain Registered', details: 'New domain created under .ru registrar, bypassing sandbox check.', source: 'Whois Scraper' }
        ]
      },
      {
        id: 'intel-003',
        value: 'invoice_2848.xlsm',
        type: 'Hash',
        subType: 'SHA256',
        asn: 'N/A',
        country: 'US',
        threatType: 'Malware Distribution',
        confidence: 95,
        severity: 'critical',
        mitreTechnique: { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' },
        sourceFeed: 'URLhaus',
        tags: ['LockBit', 'Ransomware', 'Macro Payload', 'VBA Script'],
        lastSeen: '2026-07-04T16:10:00Z',
        description: 'Malicious Microsoft Excel workbook containing embedded obfuscated VBA macros. Executing macros initiates PowerShell scripts which download and deploy LockBit ransomware variants to local endpoints.',
        references: [
          'https://urlhaus.abuse.ch/browse/'
        ],
        threatActor: {
          name: 'LockBit Gang',
          type: 'Ransomware-as-a-Service (RaaS)',
          origin: 'Russia / Eastern Europe',
          description: 'LockBit is one of the most prolific ransomware groups operating under a RaaS business model, encrypting networks and blackmailing corporations.'
        },
        timeline: [
          { date: '2026-07-04 16:10', title: 'Sandbox Execution Verdict', details: 'Verdicts: file classified as LockBit Ransomware payload. Score 98/100.', source: 'Malware Sandbox' },
          { date: '2026-07-04 15:45', title: 'Email Attachment Captured', details: 'Blocked invoice_2848.xlsm file attachment from mail spool.', source: 'SMTP Gateway Defender' }
        ]
      },
      {
        id: 'intel-004',
        value: '91.240.118.12',
        type: 'IP',
        subType: 'IPv4',
        asn: 'AS44050 IP-Transit Ltd',
        country: 'NL',
        threatType: 'Command & Control (C2)',
        confidence: 99,
        severity: 'critical',
        mitreTechnique: { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control' },
        sourceFeed: 'AbuseIPDB',
        tags: ['APT28', 'Fancy Bear', 'CobaltStrike', 'C2'],
        lastSeen: '2026-07-05T08:12:00Z',
        description: 'Active Cobalt Strike Command and Control infrastructure. Routinely scanned by multiple open-source feeds. High correlation with APT28 (Fancy Bear) network attacks targeting administrative targets.',
        references: [
          'https://www.abuseipdb.com/check/91.240.118.12'
        ],
        threatActor: {
          name: 'APT28 (Fancy Bear)',
          type: 'State-Sponsored APT',
          origin: 'Russia',
          description: 'Fancy Bear (also known as APT28, Sednit, or Sofacy) is a Russian cyber espionage group operating since the mid-2000s under Russian military intelligence (GRU).'
        },
        timeline: [
          { date: '2026-07-05 08:12', title: 'Border Ingress Dropped', details: 'Dropped connection to local server staging cluster.', source: 'Core Firewall Logs' },
          { date: '2026-07-01 12:00', title: 'Abuse Report Spike', details: 'Added 48 new abuse reports logged for SSH scanning.', source: 'AbuseIPDB Sync' }
        ]
      },
      {
        id: 'intel-005',
        value: 'update-service-ms.com',
        type: 'Domain',
        subType: 'Domain',
        asn: 'AS16509 Amazon Web Services',
        country: 'US',
        threatType: 'Command & Control (C2)',
        confidence: 85,
        severity: 'high',
        mitreTechnique: { id: 'T1568', name: 'Dynamic Resolution', tactic: 'Command and Control' },
        sourceFeed: 'AlienVault OTX',
        tags: ['Adversary Simulation', 'DGA', 'Domain-Flux'],
        lastSeen: '2026-07-04T12:00:00Z',
        description: 'Suspicious domain mimicking Microsoft update servers. Uses Dynamic Generation Algorithms (DGA) to establish persistent connections for unauthorized remote commands.',
        references: [],
        threatActor: null,
        timeline: [
          { date: '2026-07-04 12:00', title: 'Domain Flagged', details: 'Marked as suspicious domain due to typo-squatting algorithm match.', source: 'Ingest Parser' }
        ]
      },
      {
        id: 'intel-006',
        value: '103.45.28.192',
        type: 'IP',
        subType: 'IPv4',
        asn: 'AS58461 ChinaTelecom',
        country: 'CN',
        threatType: 'Vulnerability Scanner',
        confidence: 78,
        severity: 'low',
        mitreTechnique: { id: 'T1595', name: 'Active Scanning', tactic: 'Reconnaissance' },
        sourceFeed: 'GreyNoise',
        tags: ['Scanner', 'Mass-Scan', 'Port-Scan', 'Log4j-Probe'],
        lastSeen: '2026-07-05T11:32:00Z',
        description: 'Global port scanner IP scouting vulnerable Apache Log4j setups and web applications. Classified as broad internet noise.',
        references: [
          'https://viz.greynoise.io/ip/103.45.28.192'
        ],
        threatActor: null,
        timeline: [
          { date: '2026-07-05 11:32', title: 'Honeypot Trigger', details: 'Scanned ports 80, 443, 8080 and executed LDAP Log4j bypass paths.', source: 'Singapore IoT Honeypot' }
        ]
      }
    ];
  }

  /**
   * Fetch recent threat events.
   */
  async getRecentThreats(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('threat_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map(item => new Threat(item));
    } catch (err) {
      console.warn('ThreatRepository: falling back to mock adapter. Reason:', err.message);
      return this.mockThreats.slice(0, limit).map(item => new Threat(item));
    }
  }

  /**
   * Set dynamic list of threat events (useful for real-time live events cache)
   */
  updateLocalThreatCache(threatsArray) {
    this.mockThreats = threatsArray;
  }

  /**
   * Listen for real-time threat events.
   * Connects to Supabase realtime channels or falls back to simulated feeds in mock mode.
   */
  listenForThreats(callback) {
    // Attempt Supabase Realtime channel subscription
    try {
      const channel = supabase
        .channel('public:threat_events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'threat_events' },
          (payload) => {
            callback(new Threat(payload.new));
          }
        )
        .subscribe();

      // Return cleanup handler
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('ThreatRepository: Supabase realtime channel not active. Loading honeypots stream simulator...');
    }

    // High-fidelity active honeypot attacks simulation fallback
    const intervalId = setInterval(() => {
      const attackTypes = ['ssh', 'ftp', 'apache', 'imap', 'sip', 'bots', 'strongips'];
      const countries = ['DE', 'US', 'SG', 'RU', 'CN', 'NL', 'IN', 'JP', 'BR'];
      const type = attackTypes[Math.floor(Math.random() * attackTypes.length)];
      const country = countries[Math.floor(Math.random() * countries.length)];
      
      const lat = (Math.random() - 0.5) * 120;
      const lon = (Math.random() - 0.5) * 240;

      const mockThreat = new Threat({
        id: `threat-live-${Math.floor(Math.random() * 100000)}`,
        ip: `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        lat,
        lon,
        country,
        attack_type: type,
        timestamp: Date.now()
      });

      callback(mockThreat);
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Fetch all registered IOCs.
   */
  async getIOCs() {
    try {
      const { data, error } = await supabase
        .from('iocs')
        .select('*')
        .order('confidence', { ascending: false });

      if (error) throw error;
      return data.map(item => new IOC(item));
    } catch (err) {
      console.warn('ThreatRepository: falling back to mock IOCs.', err.message);
      return this.mockIOCs.map(item => new IOC(item));
    }
  }

  /**
   * Fetch specific IOC by its database identifier.
   */
  async getIOCById(id) {
    try {
      const { data, error } = await supabase
        .from('iocs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new IOC(data);
    } catch (err) {
      console.warn('ThreatRepository: fetching IOC from mock catalog.', err.message);
      const found = this.mockIOCs.find(item => item.id === id);
      return found ? new IOC(found) : null;
    }
  }
}

export default ThreatRepository;
