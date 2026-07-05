/**
 * src/types/index.js
 * Centralized Data Models & Schemas for ThreatStream SOC
 */

/**
 * Base Model containing common fields
 */
export class BaseModel {
  constructor(data = {}) {
    this.id = data.id || null; // UUID
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }
}

/**
 * Threat Event Model
 */
export class Threat extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.ip = data.ip || '';
    this.lat = typeof data.lat === 'number' ? data.lat : 0.0;
    this.lon = typeof data.lon === 'number' ? data.lon : 0.0;
    this.country = data.country || '??';
    this.attack_type = data.attack_type || 'unknown';
    this.timestamp = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
  }
}

/**
 * Indicator of Compromise (IOC) Model
 */
export class IOC extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.value = data.value || '';
    this.ioc_type = data.ioc_type || ''; // 'IP' | 'Domain' | 'URL' | 'Hash'
    this.asn = data.asn || '';
    this.country = data.country || '';
    this.threat_type = data.threat_type || '';
    this.confidence = typeof data.confidence === 'number' ? data.confidence : 0;
    this.severity = data.severity || 'low'; // 'low' | 'medium' | 'high' | 'critical'
    this.mitre_id = data.mitre_id || '';
    this.mitre_name = data.mitre_name || '';
    this.source_feed = data.source_feed || '';
    this.last_seen = data.last_seen || new Date().toISOString();
    this.description = data.description || '';
    this.expiration = data.expiration || null;
    this.status = data.status || 'Active'; // 'Active' | 'Expired' | 'False Positive' | 'Review'
    this.threat_actor_id = data.threat_actor_id || null;
    this.campaign_id = data.campaign_id || null;
    this.malware_family_id = data.malware_family_id || null;
    this.tags = Array.isArray(data.tags) ? data.tags : [];
    this.references = Array.isArray(data.references) ? data.references : [];
    this.geolocation = data.geolocation || null;
  }
}

/**
 * Infrastructure Asset Model
 */
export class Asset extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.hostname = data.hostname || '';
    this.ip = data.ip || '';
    this.mac = data.mac || '';
    this.vendor = data.vendor || '';
    this.os = data.os || '';
    this.asset_type = data.asset_type || 'Server'; // 'Server' | 'Workstation' | 'Network'
    this.criticality = data.criticality || 'medium'; // 'low' | 'medium' | 'high' | 'critical'
    this.risk_score = typeof data.risk_score === 'number' ? data.risk_score : 0;
    this.status = data.status || 'Offline'; // 'Online' | 'Offline'
    this.owner = data.owner || '';
    this.last_seen = data.last_seen || new Date().toISOString();
    this.patch_status = data.patch_status || 'Up to Date';
    this.display_name = data.display_name || '';
    this.ipv6 = data.ipv6 || '';
    this.architecture = data.architecture || '';
    this.manufacturer = data.manufacturer || '';
    this.model = data.model || '';
    this.serial_number = data.serial_number || '';
    this.environment = data.environment || 'Production'; // 'Production' | 'Development' | 'Testing'
    this.department = data.department || '';
    this.business_unit = data.business_unit || '';
    this.tags = Array.isArray(data.tags) ? data.tags : [];
    this.security_score = typeof data.security_score === 'number' ? data.security_score : 100;
    this.internet_facing = typeof data.internet_facing === 'boolean' ? data.internet_facing : false;
    this.cloud_provider = data.cloud_provider || '';
    this.location = data.location || '';
    this.first_seen = data.first_seen || new Date().toISOString();
    this.lifecycle_status = data.lifecycle_status || 'Active';
    // Sub-registries & relations mappings
    this.networkInterfaces = Array.isArray(data.networkInterfaces) ? data.networkInterfaces : [];
    this.openPorts = Array.isArray(data.openPorts) ? data.openPorts : [];
    this.services = Array.isArray(data.services) ? data.services : [];
    this.detectedCVEs = Array.isArray(data.detectedCVEs) ? data.detectedCVEs : [];
    this.installedSoftware = Array.isArray(data.installedSoftware) ? data.installedSoftware : [];
    this.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  }
}

/**
 * Host Model (specific host metadata)
 */
export class Host extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.asset_id = data.asset_id || null;
    this.cpu_cores = data.cpu_cores || 0;
    this.memory_gb = data.memory_gb || 0;
    this.kernel_version = data.kernel_version || '';
  }
}

/**
 * Network Interface Model - Physical and virtual network interfaces mapping
 */
export class NetworkInterface extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.asset_id = data.asset_id || null;
    this.name = data.name || '';
    this.ip = data.ip || '';
    this.gateway = data.gateway || '';
    this.netmask = data.netmask || '';
    this.mac = data.mac || '';
  }
}

/**
 * Open Port Model - Listening socket port indicator
 */
export class OpenPort extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.asset_id = data.asset_id || null;
    this.port = data.port || 0;
    this.protocol = data.protocol || 'TCP';
    this.state = data.state || 'open';
  }
}

/**
 * Active Service Model - Running port daemon listener mapping
 */
export class Service extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.asset_id = data.asset_id || null;
    this.port = data.port || 0;
    this.name = data.name || '';
    this.product = data.product || '';
    this.version = data.version || '';
  }
}

/**
 * Vulnerability Model - CVE reference mapping database entries
 */
export class Vulnerability extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.cve = data.cve || '';
    this.cvss = typeof data.cvss === 'number' ? data.cvss : 0.0;
    this.summary = data.summary || '';
    this.severity = data.severity || 'medium';
  }
}

/**
 * CVE mapping link to Assets
 */
export class CVE extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.asset_id = data.asset_id || null;
    this.vulnerability_id = data.vulnerability_id || null;
    this.patched = typeof data.patched === 'boolean' ? data.patched : false;
  }
}

/**
 * EDR Endpoint Agent Model
 */
export class Endpoint extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.asset_id = data.asset_id || null;
    this.agent_version = data.agent_version || '';
    this.policy = data.policy || '';
    this.risks_logged = typeof data.risks_logged === 'number' ? data.risks_logged : 0;
    this.status = data.status || 'Active';
    this.last_check_in = data.last_check_in || new Date().toISOString();
  }
}

/**
 * Process Telemetry Event Model - Execution timeline trace nodes mapping
 */
export class ProcessEvent extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.hostname = data.hostname || '';
    this.user = data.user || '';
    this.process_name = data.process_name || '';
    this.parent_process = data.parent_process || '';
    this.command_line = data.command_line || '';
    this.timestamp = data.timestamp || new Date().toISOString();
  }
}

/**
 * DNS Telemetry Event Model
 */
export class DNSEvent extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.hostname = data.hostname || '';
    this.user = data.user || '';
    this.query = data.query || '';
    this.resolved_ip = data.resolved_ip || '';
    this.timestamp = data.timestamp || new Date().toISOString();
  }
}

/**
 * Network Telemetry Event Model
 */
export class NetworkEvent extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.hostname = data.hostname || '';
    this.user = data.user || '';
    this.source_ip = data.source_ip || '';
    this.source_port = data.source_port || 0;
    this.dest_ip = data.dest_ip || '';
    this.dest_port = data.dest_port || 0;
    this.protocol = data.protocol || 'TCP';
    this.action = data.action || 'accept'; // 'accept' | 'drop'
    this.timestamp = data.timestamp || new Date().toISOString();
  }
}

/**
 * Authentication Telemetry Event Model
 */
export class AuthenticationEvent extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.hostname = data.hostname || '';
    this.user = data.user || '';
    this.logon_type = data.logon_type || 'Interactive';
    this.status = data.status || 'Success'; // 'Success' | 'Failure'
    this.source_ip = data.source_ip || '';
    this.timestamp = data.timestamp || new Date().toISOString();
  }
}

/**
 * Detection Analytics Rule Model
 */
/**
 * Detection Analytics Rule Model - Sigma and YARA configuration definitions
 */
export class Detection extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.name = data.name || '';
    this.rule_type = data.rule_type || 'Sigma'; // 'Sigma' | 'YARA' | 'Custom'
    this.severity = data.severity || 'medium';
    this.mitre_id = data.mitre_id || '';
    this.mitre_name = data.mitre_name || '';
    this.mitre_tactic = data.mitre_tactic || '';
    this.status = data.status || 'Active';
    this.description = data.description || '';
    this.definition = data.definition || '';
    this.author = data.author || '';
    this.version = data.version || '1.0';
    this.tags = Array.isArray(data.tags) ? data.tags : [];
    this.execution_count = typeof data.execution_count === 'number' ? data.execution_count : 0;
    this.last_triggered = data.last_triggered || null;
  }
}

/**
 * Security Alert Event Model - Threat trigger incidents catalog & lifecycle management
 */
export class Alert extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.rule_id = data.rule_id || null;
    this.telemetry_id = data.telemetry_id || null;
    this.affected_asset_id = data.affected_asset_id || null;
    this.severity = data.severity || 'medium'; // 'informational' | 'low' | 'medium' | 'high' | 'critical'
    this.mitre_id = data.mitre_id || '';
    this.mitre_name = data.mitre_name || '';
    this.ioc_value = data.ioc_value || '';
    this.threat_actor_id = data.threat_actor_id || null;
    this.campaign_id = data.campaign_id || null;
    this.risk_score = typeof data.risk_score === 'number' ? data.risk_score : 0;
    this.evidence = data.evidence || null;
    this.status = data.status || 'New'; // 'New' | 'In Progress' | 'Resolved' | 'False Positive'
  }
}

/**
 * Case Management Incident Model
 */
export class Incident extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.summary = data.summary || '';
    this.severity = data.severity || 'medium'; // 'low' | 'medium' | 'high' | 'critical'
    this.status = data.status || 'Active'; // 'Active' | 'Investigating' | 'Mitigated' | 'Closed'
    this.owner = data.owner || 'Unassigned';
    this.logged_date = data.logged_date || new Date().toISOString();
    this.affected_assets = Array.isArray(data.affected_assets) ? data.affected_assets : [];
    this.mitre_id = data.mitre_id || '';
    this.mitre_name = data.mitre_name || '';
    this.mitre_tactic = data.mitre_tactic || '';
  }
}

/**
 * Malware File Sample Model
 */
export class MalwareSample extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.filename = data.filename || '';
    this.filesize = data.filesize || '';
    this.md5 = data.md5 || '';
    this.sha1 = data.sha1 || '';
    this.sha256 = data.sha256 || '';
    this.entropy = typeof data.entropy === 'number' ? data.entropy : 0.0;
    this.file_type = data.file_type || '';
    this.compiled_date = data.compiled_date || '';
    this.subsystem = data.subsystem || '';
    this.status = data.status || 'Queued'; // 'Queued' | 'Running' | 'Completed'
    this.verdict = data.verdict || 'Unknown';
    this.vt_score = data.vt_score || '';
  }
}

/**
 * Case Compliance Report Model
 */
export class Report extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.name = data.name || '';
    this.classification = data.classification || '';
    this.author = data.author || '';
    this.date_generated = data.date_generated || new Date().toISOString().split('T')[0];
    this.file_format = data.file_format || 'PDF';
  }
}

/**
 * System Settings Configuration Model
 */
export class SystemSettings extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.key = data.key || '';
    this.value = data.value || '';
    this.description = data.description || '';
  }
}

/**
 * Threat Actor Model - Group profiles mapping database entities
 */
export class ThreatActor extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.name = data.name || '';
    this.aliases = Array.isArray(data.aliases) ? data.aliases : [];
    this.country = data.country || '';
    this.motivation = data.motivation || '';
    this.target_industries = Array.isArray(data.target_industries) ? data.target_industries : [];
    this.known_campaigns = Array.isArray(data.known_campaigns) ? data.known_campaigns : [];
    this.known_malware = Array.isArray(data.known_malware) ? data.known_malware : [];
    this.mitre_techniques = Array.isArray(data.mitre_techniques) ? data.mitre_techniques : [];
    this.description = data.description || '';
    this.risk_score = typeof data.risk_score === 'number' ? data.risk_score : 50;
    this.status = data.status || 'Active';
  }
}

/**
 * Campaign Model - Campaign details tracking database entities
 */
export class Campaign extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.name = data.name || '';
    this.description = data.description || '';
    this.start_date = data.start_date || '';
    this.end_date = data.end_date || '';
    this.status = data.status || 'Active';
    this.target_regions = Array.isArray(data.target_regions) ? data.target_regions : [];
    this.affected_industries = Array.isArray(data.affected_industries) ? data.affected_industries : [];
    this.references = Array.isArray(data.references) ? data.references : [];
  }
}

/**
 * Malware Family Model - Malware strains capabilities database entities
 */
export class MalwareFamily extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.name = data.name || '';
    this.aliases = Array.isArray(data.aliases) ? data.aliases : [];
    this.malware_type = data.malware_type || 'Trojan';
    this.capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
    this.mitre_techniques = Array.isArray(data.mitre_techniques) ? data.mitre_techniques : [];
    this.description = data.description || '';
  }
}

/**
 * IOC Correlation Link Model
 */
export class IOCCorrelation extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.ioc_id = data.ioc_id || null;
    this.target_type = data.target_type || ''; // 'asset' | 'incident' | 'vulnerability'
    this.target_id = data.target_id || null;
    this.relationship_score = typeof data.relationship_score === 'number' ? data.relationship_score : 50;
  }
}
