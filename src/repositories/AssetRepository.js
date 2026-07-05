/**
 * src/repositories/AssetRepository.js
 * Assets and Infrastructure Inventory Repository
 */
import { supabase } from '../lib/supabase/client';
import { Asset } from '../types';

export class AssetRepository {
  constructor() {
    this.mockAssets = [
      {
        id: 'asset-001',
        hostname: 'PRD-DB-SRV-01',
        display_name: 'Production PostgreSQL Cluster',
        ip: '10.100.4.12',
        ipv6: 'fe80::250:56ff:feab:cd12',
        mac: '00:50:56:AB:CD:12',
        vendor: 'VMware, Inc.',
        manufacturer: 'VMware',
        model: 'ESXi Virtual Platform',
        serial_number: 'VMW-DB-984A-12',
        os: 'Red Hat Enterprise Linux 8.4',
        architecture: 'x86_64',
        asset_type: 'Server',
        environment: 'Production',
        department: 'IT Operations',
        business_unit: 'Financial Core',
        tags: ['Database', 'Production', 'PCI-DSS'],
        criticality: 'critical',
        risk_score: 92,
        security_score: 18,
        internet_facing: false,
        cloud_provider: 'On-Premise',
        location: 'US-East DC-01 (Rack A-12)',
        status: 'Online',
        owner: 'Database Ops',
        last_seen: '2026-07-05T11:40:00Z',
        first_seen: '2025-01-10T08:00:00Z',
        lifecycle_status: 'Active',
        patch_status: 'Patches Pending',
        networkInterfaces: [
          { name: 'eth0', ip: '10.100.4.12', gateway: '10.100.4.1', netmask: '255.255.255.0' },
          { name: 'eth1', ip: '192.168.12.5', gateway: 'N/A', netmask: '255.255.255.0' }
        ],
        openPorts: [22, 5432, 9100],
        services: [
          { port: 22, name: 'ssh', product: 'OpenSSH', version: '8.2p1', banner: 'SSH-2.0-OpenSSH_8.2p1', tls_status: 'None', risk_level: 'low' },
          { port: 5432, name: 'postgresql', product: 'PostgreSQL', version: '13.3', banner: 'PostgreSQL DB socket open', tls_status: 'None', risk_level: 'medium' },
          { port: 9100, name: 'prometheus-node-exporter', product: 'Node Exporter', version: '1.0', banner: 'HTTP node stats', tls_status: 'None', risk_level: 'low' }
        ],
        detectedCVEs: [
          { cve: 'CVE-2024-3094', severity: 'critical', cvss: 10.0, summary: 'XZ Utils backdoor allowing remote code execution.', patched: false, exploit_available: true, patch_available: true },
          { cve: 'CVE-2021-44228', severity: 'critical', cvss: 10.0, summary: 'Log4j RCE vulnerability.', patched: true, exploit_available: true, patch_available: true }
        ],
        installedSoftware: [
          { name: 'openssh-server', version: '8.2p1-ubuntu0.3', installDate: '2025-10-12', vendor: 'Canonical', publisher: 'Ubuntu', license: 'GPLv2', package_manager: 'dpkg', support_status: 'Supported' },
          { name: 'postgresql-13', version: '13.3-1.pgdg20.04+1', installDate: '2025-11-20', vendor: 'PostgreSQL Global Development Group', publisher: 'PGDG', license: 'PostgreSQL License', package_manager: 'dpkg', support_status: 'Supported' },
          { name: 'xz-utils', version: '5.6.1-1', installDate: '2026-03-10', vendor: 'Tukaani', publisher: 'Tukaani Project', license: 'GPLv2/LGPLv2.1', package_manager: 'dpkg', support_status: 'End of Life' }
        ],
        recommendations: [
          'Upgrade xz-utils package immediately to version 5.6.4 or higher to mitigate CVE-2024-3094.',
          'Configure firewall rule to restrict access to port 5432 (PostgreSQL) only to authorized application servers.'
        ]
      },
      {
        id: 'asset-002',
        hostname: 'PRD-APP-SRV-02',
        display_name: 'Production Web App Frontend',
        ip: '10.100.4.25',
        ipv6: 'fe80::250:56ff:feab:cd13',
        mac: '00:50:56:AB:CD:13',
        vendor: 'VMware, Inc.',
        manufacturer: 'VMware',
        model: 'ESXi Virtual Platform',
        serial_number: 'VMW-WEB-882C-13',
        os: 'Ubuntu 20.04 LTS',
        architecture: 'x86_64',
        asset_type: 'Server',
        environment: 'Production',
        department: 'IT Operations',
        business_unit: 'Customer Portals',
        tags: ['Web Application', 'Production', 'Docker'],
        criticality: 'high',
        risk_score: 78,
        security_score: 22,
        internet_facing: true,
        cloud_provider: 'AWS EC2',
        location: 'us-east-1a (Subnet Web)',
        status: 'Online',
        owner: 'Web Platform Ops',
        last_seen: '2026-07-05T11:38:00Z',
        first_seen: '2025-02-15T09:30:00Z',
        lifecycle_status: 'Active',
        patch_status: 'Patches Pending',
        networkInterfaces: [
          { name: 'eth0', ip: '10.100.4.25', gateway: '10.100.4.1', netmask: '255.255.255.0' }
        ],
        openPorts: [80, 443, 8080],
        services: [
          { port: 80, name: 'http', product: 'Nginx', version: '1.18.0', banner: 'nginx/1.18.0', tls_status: 'None', risk_level: 'low' },
          { port: 443, name: 'https', product: 'Nginx', version: '1.18.0', banner: 'nginx/1.18.0 ssl', tls_status: 'Active', risk_level: 'low' },
          { port: 8080, name: 'http-alt', product: 'Apache Tomcat', version: '9.0.37', banner: 'Apache Tomcat/9.0.37', tls_status: 'None', risk_level: 'high' }
        ],
        detectedCVEs: [
          { cve: 'CVE-2024-21626', severity: 'high', cvss: 8.6, summary: 'runc container breakout vulnerability.', patched: false, exploit_available: true, patch_available: true }
        ],
        installedSoftware: [
          { name: 'nginx', version: '1.18.0', installDate: '2025-09-01', vendor: 'Nginx Inc.', publisher: 'Nginx', license: '2-clause BSD-like', package_manager: 'dpkg', support_status: 'Supported' },
          { name: 'docker-ce', version: '20.10.7', installDate: '2025-09-02', vendor: 'Docker Inc.', publisher: 'Docker', license: 'Apache-2.0', package_manager: 'dpkg', support_status: 'Supported' },
          { name: 'runc', version: '1.0.0-rc95', installDate: '2025-09-02', vendor: 'Open Container Initiative', publisher: 'OCI', license: 'Apache-2.0', package_manager: 'dpkg', support_status: 'Supported' }
        ],
        recommendations: [
          'Upgrade Docker Engine and runc packages immediately to fix runc container escape vector.',
          'Enforce SSL/TLS ciphers policies on Nginx to block weak protocol variants.'
        ]
      },
      {
        id: 'asset-003',
        hostname: 'MACOS-DEV-382',
        display_name: 'Developer Workstation macOS',
        ip: '10.100.20.91',
        ipv6: 'fe80::a20:ffff:fe11:92aa',
        mac: 'F4:0F:24:11:92:AA',
        vendor: 'Apple Inc.',
        manufacturer: 'Apple',
        model: 'MacBook Pro M3 Max',
        serial_number: 'APL-C02D-981F-A2',
        os: 'macOS Sonoma 14.2',
        architecture: 'arm64',
        asset_type: 'Workstation',
        environment: 'Testing',
        department: 'Engineering',
        business_unit: 'Dev Tools',
        tags: ['Developer Laptop', 'BYOD'],
        criticality: 'medium',
        risk_score: 42,
        security_score: 58,
        internet_facing: false,
        cloud_provider: 'None',
        location: 'Office Bldg A (Floor 3)',
        status: 'Offline',
        owner: 'Engineering',
        last_seen: '2026-07-04T18:00:00Z',
        first_seen: '2025-06-20T10:00:00Z',
        lifecycle_status: 'Active',
        patch_status: 'Up to Date',
        networkInterfaces: [
          { name: 'en0', ip: '10.100.20.91', gateway: '10.100.20.1', netmask: '255.255.255.0' }
        ],
        openPorts: [22],
        services: [
          { port: 22, name: 'ssh', product: 'OpenSSH (macOS)', version: '8.6p1', banner: 'SSH-2.0-OpenSSH_8.6p1 Apple-233.1', tls_status: 'None', risk_level: 'low' }
        ],
        detectedCVEs: [],
        installedSoftware: [
          { name: 'Xcode', version: '15.1', installDate: '2025-12-15', vendor: 'Apple', publisher: 'Apple', license: 'Proprietary', package_manager: 'Mac App Store', support_status: 'Supported' },
          { name: 'Docker Desktop', version: '4.25.0', installDate: '2026-01-10', vendor: 'Docker Inc.', publisher: 'Docker', license: 'Subscription Agreement', package_manager: 'Manual', support_status: 'Supported' }
        ],
        recommendations: [
          'No critical vulnerabilities detected. Ensure Xcode auto-updates remain active.'
        ]
      },
      {
        id: 'asset-004',
        hostname: 'CEO-LAPTOP-01',
        display_name: 'Executive Dell Latitude',
        ip: '10.100.40.5',
        ipv6: 'fe80::2cf0:a2ff:fe84:de9f',
        mac: '2C:F0:A2:84:DE:9F',
        vendor: 'Dell Inc.',
        manufacturer: 'Dell',
        model: 'Latitude 7440',
        serial_number: 'DLL-SVC-7731-9F',
        os: 'Windows 11 Enterprise',
        architecture: 'x64',
        asset_type: 'Workstation',
        environment: 'Production',
        department: 'Executive Office',
        business_unit: 'Administration',
        tags: ['Executive', 'VIP'],
        criticality: 'critical',
        risk_score: 65,
        security_score: 35,
        internet_facing: false,
        cloud_provider: 'None',
        location: 'Executive Suite 4A',
        status: 'Online',
        owner: 'Executive Office',
        last_seen: '2026-07-05T11:41:00Z',
        first_seen: '2025-04-01T09:00:00Z',
        lifecycle_status: 'Active',
        patch_status: 'Patches Pending',
        networkInterfaces: [
          { name: 'Wi-Fi', ip: '10.100.40.5', gateway: '10.100.40.1', netmask: '255.255.255.0' }
        ],
        openPorts: [135, 445],
        services: [
          { port: 135, name: 'msrpc', product: 'Microsoft Windows RPC', version: 'N/A', banner: 'MSRPC services daemon', tls_status: 'None', risk_level: 'low' },
          { port: 445, name: 'microsoft-ds', product: 'Microsoft SMB', version: 'N/A', banner: 'Windows SMB file sharing', tls_status: 'None', risk_level: 'medium' }
        ],
        detectedCVEs: [
          { cve: 'CVE-2023-38606', severity: 'high', cvss: 8.8, summary: 'Windows Kernel Privilege Escalation.', patched: false, exploit_available: false, patch_available: true }
        ],
        installedSoftware: [
          { name: 'Office 365 ProPlus', version: '16.0.14326', installDate: '2025-05-12', vendor: 'Microsoft Corp', publisher: 'Microsoft', license: 'Enterprise O365', package_manager: 'Windows Update', support_status: 'Supported' },
          { name: 'Slack Desktop', version: '4.33.0', installDate: '2025-08-20', vendor: 'Slack Technologies', publisher: 'Salesforce', license: 'Proprietary', package_manager: 'Winget', support_status: 'Supported' }
        ],
        recommendations: [
          'Deploy Windows cumulative system patch KB5029351 to resolve kernel vulnerability.',
          'Disable SMBv1 network exposure to secure workstations against remote indexing.'
        ]
      }
    ];

    this.mockTopology = {
      nodes: [
        { id: 'switch-core', label: 'Core Switch', type: 'switch', zone: 'internal' },
        { id: 'fw-edge', label: 'Edge Firewall', type: 'firewall', zone: 'edge' },
        { id: 'asset-001', label: 'PRD-DB-SRV-01', type: 'server', zone: 'db' },
        { id: 'asset-002', label: 'PRD-APP-SRV-02', type: 'server', zone: 'app' },
        { id: 'asset-003', label: 'MACOS-DEV-382', type: 'workstation', zone: 'corp' },
        { id: 'asset-004', label: 'CEO-LAPTOP-01', type: 'workstation', zone: 'corp' }
      ],
      links: [
        { source: 'fw-edge', target: 'switch-core' },
        { source: 'switch-core', target: 'asset-001', bandwidth: '10 Gbps' },
        { source: 'switch-core', target: 'asset-002', bandwidth: '10 Gbps' },
        { source: 'switch-core', target: 'asset-003', bandwidth: '1 Gbps' },
        { source: 'switch-core', target: 'asset-004', bandwidth: '1 Gbps' }
      ]
    };
  }

  /**
   * Fetch all registered assets.
   */
  async getAssets() {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('hostname', { ascending: true });

      if (error) throw error;
      return data.map(item => new Asset(item));
    } catch (err) {
      console.warn('AssetRepository: falling back to mock assets.', err.message);
      return this.mockAssets.map(item => new Asset(item));
    }
  }

  /**
   * Fetch detailed asset by ID.
   */
  async getAssetById(id) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new Asset(data);
    } catch (err) {
      console.warn('AssetRepository: fetching asset from mock catalog.', err.message);
      const found = this.mockAssets.find(item => item.id === id);
      return found ? found : null;
    }
  }

  /**
   * Fetch Switch-Routing Topology Map nodes
   */
  async getNetworkTopology() {
    try {
      const { data: nodes, error: nodeErr } = await supabase.from('topology_nodes').select('*');
      const { data: links, error: linkErr } = await supabase.from('topology_links').select('*');
      if (nodeErr || linkErr) throw new Error('Topology DB tables not found');
      return { nodes, links };
    } catch (err) {
      console.warn('AssetRepository: falling back to mock topology.', err.message);
      return this.mockTopology;
    }
  }
}

export default AssetRepository;
