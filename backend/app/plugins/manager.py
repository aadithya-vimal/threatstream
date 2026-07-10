import time
import logging
import importlib
from typing import Dict, Any, Type
from app.plugins.base import BasePlugin
from app.plugins.virustotal import VirusTotalPlugin
from app.plugins.ioc_providers import (
    AnyRunPlugin,
    AbuseIPDBPlugin,
    CensysPlugin,
    GreyNoisePlugin,
    HybridAnalysisPlugin,
    MISPPlugin,
    OTXPlugin,
    OpenCTIPlugin,
    ShodanPlugin,
    URLHausPlugin,
)
# Orchestrators will be lazily imported
from app.plugins.nmap import NmapDiscoveryPlugin
from app.plugins.nuclei import NucleiDiscoveryPlugin
from app.plugins.whatweb import WhatWebDiscoveryPlugin
from app.plugins.sslyze import SSLyzeDiscoveryPlugin
from app.plugins.masscan import MasscanDiscoveryPlugin
from app.plugins.rustscan import RustScanDiscoveryPlugin
from app.plugins.nikto import NiktoDiscoveryPlugin
from app.plugins.windows_events import WindowsEventLogsCollector
from app.plugins.sysmon import SysmonCollector
from app.plugins.auditd import AuditdCollector
from app.plugins.osquery import OSQueryCollector
from app.plugins.zeek import ZeekCollector
from app.plugins.suricata import SuricataCollector

logger = logging.getLogger("threatstream.plugins")

class NmapPlugin(BasePlugin):
    def initialize(self) -> bool:
        logger.info("Initializing Nmap Scanner Plugin Wrapper")
        return True

    def authenticate(self) -> bool:
        return True

    def validate(self, payload: Dict[str, Any]) -> bool:
        target = payload.get("target")
        return bool(target)

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        target = payload.get("target", "localhost")
        logger.info(f"Nmap executing scan targeting: {target}")
        
        # Simulate scanning steps
        steps = ["Resolving DNS", "Ping sweep", "SYN port scan", "Service finger print", "Vulnerability script match"]
        for i, step in enumerate(steps):
            logger.info(f"Nmap Step {i+1}/{len(steps)}: {step}")
            if progress_callback:
                progress_callback(int((i + 1) * 100 / len(steps)))
            time.sleep(1.0)
            
        return {
            "target": target,
            "scan_status": "completed",
            "ports_open": [22, 80, 443, 3306],
            "os_match": "Ubuntu Linux 22.04 LTS",
            "services": {
                "22": "ssh (OpenSSH 8.9p1)",
                "80": "http (Nginx 1.18.0)",
                "443": "https (Nginx 1.18.0)",
                "3306": "mysql (MySQL 8.0.35)"
            }
        }

    def health(self) -> Dict[str, Any]:
        return {"status": "connected", "quota_remaining": 9999, "last_successful_sync": None}

    def cleanup(self) -> bool:
        logger.info("Cleaning up Nmap plugin sockets")
        return True


class NucleiPlugin(BasePlugin):
    def initialize(self) -> bool:
        logger.info("Initializing Nuclei Vulnerability Scanner")
        return True

    def authenticate(self) -> bool:
        return True

    def validate(self, payload: Dict[str, Any]) -> bool:
        target = payload.get("target")
        return bool(target)

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        target = payload.get("target")
        logger.info(f"Nuclei loading CVE templates for scan against: {target}")
        
        if progress_callback:
            progress_callback(20)
        time.sleep(0.8)
        logger.info("Running SSL/TLS misconfiguration checks")
        
        if progress_callback:
            progress_callback(60)
        time.sleep(1.0)
        logger.info("Matching sub-directory exposures templates")
        
        if progress_callback:
            progress_callback(100)
        return {
            "target": target,
            "vulnerabilities": [
                {
                    "template_id": "cve-2021-44228",
                    "name": "Log4j RCE",
                    "severity": "critical",
                    "matcher_name": "log4j-rce-indicator",
                    "matched_at": f"{target}/solr/admin/cores"
                },
                {
                    "template_id": "ssl-deprecated-ciphers",
                    "name": "Deprecated TLS 1.0 Ciphers",
                    "severity": "medium",
                    "matched_at": target
                }
            ]
        }

    def health(self) -> Dict[str, Any]:
        return {"status": "connected", "quota_remaining": 9999, "last_successful_sync": None}

    def cleanup(self) -> bool:
        return True


class DefaultPlugin(BasePlugin):
    def initialize(self) -> bool:
        return True

    def authenticate(self) -> bool:
        return True

    def validate(self, payload: Dict[str, Any]) -> bool:
        return True

    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        logger.info("Executing generic placeholder operations background job")
        for p in range(10, 110, 20):
            if progress_callback:
                progress_callback(p)
            time.sleep(0.5)
        return {"status": "success", "note": "Generic background operation succeeded."}

    def health(self) -> Dict[str, Any]:
        return {"status": "connected", "quota_remaining": 9999, "last_successful_sync": None}

    def cleanup(self) -> bool:
        return True


class PluginManager:
    """
    Manager that maps job types to concrete plugin executors.
    """
    _registry: Dict[str, Type[BasePlugin]] = {
        "nmap": NmapDiscoveryPlugin,
        "virustotal": VirusTotalPlugin,
        "abuseipdb": AbuseIPDBPlugin,
        "greynoise": GreyNoisePlugin,
        "shodan": ShodanPlugin,
        "censys": CensysPlugin,
        "urlhaus": URLHausPlugin,
        "otx": OTXPlugin,
        "hybridanalysis": HybridAnalysisPlugin,
        "anyrun": AnyRunPlugin,
        "misp": MISPPlugin,
        "opencti": OpenCTIPlugin,
        "nuclei": NucleiDiscoveryPlugin,
        "whatweb": WhatWebDiscoveryPlugin,
        "sslyze": SSLyzeDiscoveryPlugin,
        "masscan": MasscanDiscoveryPlugin,
        "rustscan": RustScanDiscoveryPlugin,
        "nikto": NiktoDiscoveryPlugin,
        "windows_events": WindowsEventLogsCollector,
        "sysmon": SysmonCollector,
        "auditd": AuditdCollector,
        "osquery": OSQueryCollector,
        "zeek": ZeekCollector,
        "suricata": SuricataCollector,
        "orchestrator": "app.plugins.orchestrator.EnrichmentOrchestrator",
        "discovery_orchestrator": "app.plugins.discovery.DiscoveryOrchestrator",
        "default": DefaultPlugin
    }

    @classmethod
    def get_plugin(cls, plugin_name: str, config: Dict[str, Any] = None) -> BasePlugin:
        """Retrieve plugin instance by name.
        Supports direct class objects or dotted import strings.
        """
        plugin_entry = cls._registry.get(plugin_name.lower(), cls._registry["default"])
        if isinstance(plugin_entry, str):
            # Dynamically import the class from its dotted path
            module_path, class_name = plugin_entry.rsplit(".", 1)
            module = importlib.import_module(module_path)
            plugin_class = getattr(module, class_name)
        else:
            plugin_class = plugin_entry
        plugin_instance = plugin_class(config or {})
        plugin_instance.initialize()
        return plugin_instance
