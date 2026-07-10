/**
 * src/services/AssetService.js
 * Infrastructure Asset Management & Attack Surface Risk Engine
 */
import { AssetRepository } from '../repositories/AssetRepository';

// =======================================================
// PLUGGABLE SCANNER ENGINE PLUGINS (COMMON INTERFACE)
// =======================================================
class ScannerEngine {
  constructor(id, name, description) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  async executeScan(target) {
    throw new Error('Live scanner execution is handled by the backend job orchestrator');
  }
}

class NmapEngine extends ScannerEngine {
  constructor() { super('nmap', 'Nmap', 'Deep TCP/UDP port mapping and service scanning'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class RustScanEngine extends ScannerEngine {
  constructor() { super('rustscan', 'RustScan', 'High-performance multi-threaded port scan'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class MasscanEngine extends ScannerEngine {
  constructor() { super('masscan', 'Masscan', 'Asynchronous internet-scale IP port scanner'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class NucleiEngine extends ScannerEngine {
  constructor() { super('nuclei', 'Nuclei', 'Template-driven vulnerability check engine'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class WhatWebEngine extends ScannerEngine {
  constructor() { super('whatweb', 'WhatWeb', 'Next-generation web scanner app profiling'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class SSLyzeEngine extends ScannerEngine {
  constructor() { super('sslyze', 'SSLyze', 'SSL/TLS configuration analyzer'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class TestSSLEngine extends ScannerEngine {
  constructor() { super('testssl', 'testssl.sh', 'Command-line tool to check TLS encryption strength'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class NiktoEngine extends ScannerEngine {
  constructor() { super('nikto', 'Nikto', 'Web server security scanner'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class OpenVASEngine extends ScannerEngine {
  constructor() { super('openvas', 'OpenVAS', 'Full-featured vulnerability scanner and manager'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class GreenboneEngine extends ScannerEngine {
  constructor() { super('greenbone', 'Greenbone', 'Enterprise vulnerability feed manager'); }
  async executeScan(target) {
    return super.executeScan(target);
  }
}

class ScannerCoordinator {
  constructor() {
    this.engines = {
      nmap: new NmapEngine(),
      rustscan: new RustScanEngine(),
      masscan: new MasscanEngine(),
      nuclei: new NucleiEngine(),
      whatweb: new WhatWebEngine(),
      sslyze: new SSLyzeEngine(),
      testssl: new TestSSLEngine(),
      nikto: new NiktoEngine(),
      openvas: new OpenVASEngine(),
      greenbone: new GreenboneEngine()
    };
  }

  async runScan(engineId, target) {
    const engine = this.engines[engineId];
    if (!engine) {
      throw new Error(`Scanner engine ${engineId} is not available in the frontend runtime`);
    }
    return await engine.executeScan(target);
  }
}

// =======================================================
// SERVICE LAYER DEFINITION WITH RISK ENGINE
// =======================================================
export class AssetService {
  constructor() {
    this.assetRepository = new AssetRepository();
    this.scannerCoordinator = new ScannerCoordinator();
  }

  async getAssets() {
    const rawAssets = await this.assetRepository.getAssets();
    // Compute risk profiles live on every fetch using the Asset Risk Engine
    return rawAssets.map(asset => {
      const riskSummary = this.calculateAssetRisk(asset);
      return {
        ...asset,
        risk_score: riskSummary.riskScore,
        riskScore: riskSummary.riskScore,
        security_score: riskSummary.securityScore,
        securityScore: riskSummary.securityScore,
        exposure_score: riskSummary.exposureScore,
        exposureScore: riskSummary.exposureScore,
        priority: riskSummary.priority,
        riskCategory: riskSummary.category
      };
    });
  }

  async getAssetById(id) {
    const asset = await this.assetRepository.getAssetById(id);
    if (!asset) return null;
    const riskSummary = this.calculateAssetRisk(asset);
    return {
      ...asset,
      risk_score: riskSummary.riskScore,
      riskScore: riskSummary.riskScore,
      security_score: riskSummary.securityScore,
      securityScore: riskSummary.securityScore,
      exposure_score: riskSummary.exposureScore,
      exposureScore: riskSummary.exposureScore,
      priority: riskSummary.priority,
      riskCategory: riskSummary.category
    };
  }

  async getNetworkTopology() {
    return await this.assetRepository.getNetworkTopology();
  }

  async runDiscovery(scannerId, target) {
    return await this.scannerCoordinator.runScan(scannerId, target);
  }

  /**
   * Enterprise Asset Risk Engine (Weighted Matrix Engine)
   */
  calculateAssetRisk(asset) {
    // 1. Criticality baseline weight (critical=1.0, high=0.8, medium=0.5, low=0.2)
    const critMap = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.2 };
    const critWeight = critMap[(asset.criticality || 'medium').toLowerCase()] || 0.5;

    // 2. Open listening services impact: 5 points per open port (max 20 points)
    const servicesCount = asset.services?.length || 0;
    const servicesWeight = Math.min(20, servicesCount * 5);

    // 3. Internet Exposure impact: adds 30 points if internet-facing
    const internetWeight = asset.internet_facing ? 30 : 0;

    // 4. Vulnerabilities vulnerability impact: critical = 25 points each, high = 15 points each, other = 5 points each (max 45 points)
    let vulnWeight = 0;
    const cves = asset.detectedCVEs || [];
    cves.forEach(c => {
      if (!c.patched) {
        if (c.severity === 'critical') vulnWeight += 25;
        else if (c.severity === 'high') vulnWeight += 15;
        else vulnWeight += 5;
      }
    });
    vulnWeight = Math.min(45, vulnWeight);

    // 5. Exploit availability penalty: adds 10 points if public exploit is known
    const exploitAvailable = cves.some(c => !c.patched && c.exploit_available);
    const exploitPenalty = exploitAvailable ? 10 : 0;

    // 6. Security controls buffer (reduces risk): 5 points subtracted per patch applied
    const patchesAppliedCount = cves.filter(c => c.patched).length;
    const patchControlCredits = Math.min(15, patchesAppliedCount * 5);

    // Calculate final weighted risk score (0-100)
    const baseScore = servicesWeight + internetWeight + vulnWeight + exploitPenalty - patchControlCredits;
    const riskScore = Math.max(10, Math.min(100, Math.round(baseScore * critWeight + (critWeight * 30))));

    // Security Score (Inverse of Risk)
    const securityScore = Math.max(0, 100 - riskScore);

    // Exposure Score (Port Density + Public Visibility)
    const exposureScore = Math.max(0, Math.min(100, (asset.internet_facing ? 55 : 12) + (servicesCount * 8)));

    // Priority (Action urgency)
    let priority = 'Medium';
    if (riskScore >= 80 && critWeight >= 0.8) priority = 'Immediate';
    else if (riskScore >= 60) priority = 'High';
    else if (riskScore < 30) priority = 'Low';

    // Risk Category
    let category = 'Medium';
    if (riskScore >= 80) category = 'Critical';
    else if (riskScore >= 60) category = 'High';
    else if (riskScore < 30) category = 'Low';

    return {
      riskScore,
      securityScore,
      exposureScore,
      priority,
      category
    };
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
      internetFacingCount: 0,
      totalVulnerabilities: 0,
      cloudProviders: { AWS: 0, Azure: 0, 'On-Premise': 0, None: 0 },
      expiringCertificates: 0,
      eolSoftwareCount: 0
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

      if (a.internet_facing) stats.internetFacingCount++;

      const cves = a.detectedCVEs || [];
      stats.totalVulnerabilities += cves.filter(c => !c.patched).length;

      const provider = a.cloud_provider || 'None';
      if (provider.includes('AWS')) stats.cloudProviders.AWS++;
      else if (provider.includes('Azure')) stats.cloudProviders.Azure++;
      else stats.cloudProviders['On-Premise']++;

      const software = a.installedSoftware || [];
      software.forEach(sw => {
        if (sw.support_status === 'End of Life' || sw.support_status === 'End of Service') {
          stats.eolSoftwareCount++;
        }
      });
    });

    stats.riskAvg = stats.total > 0 ? Math.round(riskSum / stats.total) : 0;
    return stats;
  }
}

export default AssetService;
