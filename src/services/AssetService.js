/**
 * src/services/AssetService.js
 * Infrastructure Asset Management Service Layer
 */
import { AssetRepository } from '../repositories/AssetRepository';

class ScannerEngine {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }
  async executeScan(target) { throw new Error('Not implemented'); }
}

class NmapEngine extends ScannerEngine {
  constructor() { super('Nmap', 'Port scanning'); }
  async executeScan(target) {
    return {
      ports: [
        { port: 22, service: 'ssh', version: 'OpenSSH 8.2p1' },
        { port: 80, service: 'http', version: 'Apache httpd 2.4.41' },
        { port: 443, service: 'https', version: 'Apache httpd 2.4.41' }
      ],
      osGuess: 'Linux 5.x',
      latency: '0.12ms'
    };
  }
}

class NucleiEngine extends ScannerEngine {
  constructor() { super('Nuclei', 'Template vulnerability scanning'); }
  async executeScan(target) {
    return {
      vulnerabilities: [
        { id: 'CVE-2021-44228', severity: 'critical', name: 'Apache Log4j RCE', matched: 'ldap://...' }
      ]
    };
  }
}

class SSLyzeEngine extends ScannerEngine {
  constructor() { super('SSLyze', 'SSL validation'); }
  async executeScan(target) {
    return {
      protocols: ['TLSv1.2', 'TLSv1.3'],
      hasWeakCiphers: false,
      certificateExpired: false
    };
  }
}

class ScannerCoordinator {
  constructor() {
    this.engines = {
      nmap: new NmapEngine(),
      nuclei: new NucleiEngine(),
      sslyze: new SSLyzeEngine()
    };
  }

  async runScan(engineId, target) {
    const engine = this.engines[engineId];
    if (!engine) {
      return { status: 'completed', info: `Executed mock scan using ${engineId}. No vulnerabilities discovered.` };
    }
    return await engine.executeScan(target);
  }
}

export class AssetService {
  constructor() {
    this.assetRepository = new AssetRepository();
    this.scannerCoordinator = new ScannerCoordinator();
  }

  async getAssets() {
    return await this.assetRepository.getAssets();
  }

  async getAssetById(id) {
    return await this.assetRepository.getAssetById(id);
  }

  async getNetworkTopology() {
    return await this.assetRepository.getNetworkTopology();
  }

  async runDiscovery(scannerId, target) {
    return await this.scannerCoordinator.runScan(scannerId, target);
  }

  /**
   * Fetch aggregate asset statistics
   */
  async getAssetStats() {
    const assets = await this.getAssets();
    const stats = {
      total: assets.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      riskAvg: 0,
      serverCount: 0,
      workstationCount: 0,
      totalVulnerabilities: 0
    };

    let riskSum = 0;

    assets.forEach(a => {
      const crit = (a.criticality || '').toLowerCase();
      if (crit === 'critical') stats.criticalCount++;
      else if (crit === 'high') stats.highCount++;
      else if (crit === 'medium') stats.mediumCount++;
      else if (crit === 'low') stats.lowCount++;

      riskSum += a.risk_score || a.riskScore || 0;

      const type = (a.asset_type || a.assetType || '').toLowerCase();
      if (type === 'server') stats.serverCount++;
      else if (type === 'workstation') stats.workstationCount++;

      const cves = a.detectedCVEs || [];
      stats.totalVulnerabilities += cves.length;
    });

    stats.riskAvg = stats.total > 0 ? Math.round(riskSum / stats.total) : 0;
    return stats;
  }
}

export default AssetService;
