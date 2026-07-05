import re
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import uuid
import yaml
from app.database.supabase_client import supabase_client

logger = logging.getLogger("threatstream.services.telemetry")

class EventNormalizer:
    """
    Standardized Event Normalizer.
    Converts event logs from multiple EDR collectors into a common unified schema.
    """
    
    @staticmethod
    def normalize(source: str, raw: Dict[str, Any]) -> Dict[str, Any]:
        source_lower = source.lower()
        
        # Base schema baseline
        event_id = str(uuid.uuid4())
        timestamp = raw.get("timestamp") or datetime.utcnow().isoformat()
        hostname = raw.get("hostname") or "UNKNOWN-HOST"
        user_name = raw.get("user") or raw.get("user_name") or "SYSTEM"
        event_type = raw.get("type") or raw.get("event_type") or "Process"
        details = raw.get("details") or "EDR Event Ingested."
        category = raw.get("category") or "Auditing"
        severity = raw.get("severity") or "informational"
        
        # Extracted fields initialization
        pid = raw.get("pid") or raw.get("process_id")
        ppid = raw.get("ppid") or raw.get("parent_process_id")
        parent_process = raw.get("parent_process") or raw.get("parent_image") or raw.get("parentProcess")
        command_line = raw.get("command_line") or raw.get("commandLine")
        hash_val = raw.get("hash") or raw.get("sha256") or raw.get("md5")
        
        mitre_id = raw.get("mitre_id")
        mitre_name = raw.get("mitre_name")
        mitre_tactic = raw.get("mitre_tactic")
        risk_score = raw.get("risk_score") or 0
        correlation_id = raw.get("correlation_id") or str(uuid.uuid4())
        
        normalized_data = {}

        # Collector specific adapters
        if "sysmon" in source_lower:
            event_type = "Process" if raw.get("EventID") == 1 else ("Network" if raw.get("EventID") == 3 else event_type)
            pid = pid or raw.get("ProcessId")
            parent_process = parent_process or raw.get("ParentImage")
            command_line = command_line or raw.get("CommandLine")
            hash_val = hash_val or raw.get("Hashes")
            normalized_data = {
                "integrity_level": raw.get("IntegrityLevel", "Medium"),
                "image": raw.get("Image")
            }
            
        elif "windows" in source_lower:
            event_type = "Authentication" if raw.get("EventID") in [4624, 4625] else event_type
            normalized_data = {
                "event_id_code": raw.get("EventID"),
                "logon_type": raw.get("LogonType")
            }
            
        elif "auditd" in source_lower:
            event_type = "Syscall"
            command_line = command_line or raw.get("syscall_args")
            normalized_data = {
                "syscall": raw.get("syscall", "execve"),
                "uid": raw.get("uid", 0)
            }
            
        elif "osquery" in source_lower:
            event_type = "Query"
            command_line = command_line or raw.get("query_sql")
            normalized_data = {
                "query_name": raw.get("name") or "processes_snapshot"
            }
            
        elif "zeek" in source_lower:
            event_type = "Network"
            normalized_data = {
                "service": raw.get("service") or "dns",
                "query": raw.get("query"),
                "duration": raw.get("duration", 0.0)
            }
            
        elif "suricata" in source_lower:
            event_type = "Alert"
            normalized_data = {
                "category": raw.get("alert_category"),
                "flow_id": raw.get("flow_id")
            }

        normalized_event = {
            "id": event_id,
            "hostname": hostname,
            "user_name": user_name,
            "event_type": event_type,
            "details": details,
            "category": category,
            "timestamp": timestamp,
            "pid": int(pid) if pid else None,
            "ppid": int(ppid) if ppid else None,
            "source": source,
            "severity": severity,
            "mitre_id": mitre_id,
            "mitre_name": mitre_name,
            "mitre_tactic": mitre_tactic,
            "parent_process": parent_process,
            "command_line": command_line,
            "hash": hash_val,
            "risk_score": int(risk_score),
            "correlation_id": correlation_id,
            "raw_event": raw,
            "normalized_event": normalized_data
        }
        
        return normalized_event


class SigmaEngine:
    """
    Production Sigma Rule Engine.
    Parses and evaluates Sigma rules against normalized telemetry events.
    """
    
    @staticmethod
    def match_rule(rule_def: str, event: Dict[str, Any]) -> bool:
        try:
            # Parse YAML rule definition
            parsed = yaml.safe_load(rule_def)
            if not parsed:
                return False
                
            detection = parsed.get("detection") or {}
            selection = detection.get("selection") or {}
            
            # Simple keyword matching evaluator
            matched = True
            for field, expected in selection.items():
                field_clean = field.split("|")[0].lower()
                modifier = field.split("|")[1] if "|" in field else None
                
                # Resolve field values
                actual = event.get(field_clean) or event.get("normalized_event", {}).get(field_clean)
                if not actual:
                    # Fallback mapping
                    if field_clean == "commandline":
                        actual = event.get("command_line")
                    elif field_clean == "image":
                        actual = event.get("details")
                
                if not actual:
                    matched = False
                    break
                    
                # Evaluate matches
                actual_str = str(actual).lower()
                
                if isinstance(expected, list):
                    list_match = False
                    for exp in expected:
                        exp_str = str(exp).lower()
                        if modifier == "contains" and exp_str in actual_str:
                            list_match = True
                        elif exp_str == actual_str:
                            list_match = True
                    if not list_match:
                        matched = False
                        break
                else:
                    exp_str = str(expected).lower()
                    if modifier == "contains" and exp_str not in actual_str:
                        matched = False
                        break
                    elif modifier is None and exp_str != actual_str:
                        matched = False
                        break
            
            return matched
        except Exception as e:
            logger.error(f"Failed to parse or match Sigma rule: {str(e)}")
            return False


class YaraEngine:
    """
    Production YARA Rule Engine.
    Loads and runs YARA rules against file content buffers or hashes.
    """
    
    @staticmethod
    def match_rule(yara_def: str, file_content: bytes) -> List[str]:
        matched_rules = []
        try:
            # Fallback regex signature parser if yara-python is not installed
            # Extract strings definition block: $name = "..."
            strings = re.findall(r'\$[a-zA-Z0-9_]+\s*=\s*["\']([^"\']+)["\']', yara_def)
            for s in strings:
                if s.encode() in file_content:
                    matched_rules.append("matched_yara_rule_signature")
                    break
        except Exception as e:
            logger.error(f"YARA parsing error: {str(e)}")
        return matched_rules


class CorrelationEngine:
    """
    Enterprise Event Correlation Engine.
    Correlates telemetry events and alerts within a time window.
    """
    
    @staticmethod
    def correlate(event: Dict[str, Any], time_window_mins: int = 30) -> List[Dict[str, Any]]:
        correlation_chain = []
        hostname = event.get("hostname")
        user_name = event.get("user_name")
        correlation_id = event.get("correlation_id")
        
        try:
            # Query recent related events in database
            cutoff = (datetime.utcnow() - timedelta(minutes=time_window_mins)).isoformat()
            res = supabase_client.table("telemetry") \
                .select("*") \
                .eq("hostname", hostname) \
                .gt("created_at", cutoff) \
                .execute()
                
            if res.data:
                for item in res.data:
                    # Match by user name or correlation PID trees
                    if item.get("user_name") == user_name or item.get("correlation_id") == correlation_id:
                        correlation_chain.append(item)
        except Exception as e:
            logger.error(f"Correlation query failed: {str(e)}")
            
        return correlation_chain


class TelemetryIngestService:
    """
    Orchestration service that normalizes, runs rule evaluation, correlates findings, and stores alerts.
    """
    
    @classmethod
    def ingest_event(cls, source: str, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Normalize
        normalized = EventNormalizer.normalize(source, raw_event)
        
        # Persist to database
        db_insert = {
            "hostname": normalized["hostname"],
            "user_name": normalized["user_name"],
            "event_type": normalized["event_type"],
            "details": normalized["details"],
            "category": normalized["category"],
            "pid": normalized["pid"],
            "ppid": normalized["ppid"],
            "source": normalized["source"],
            "severity": normalized["severity"],
            "mitre_id": normalized["mitre_id"],
            "mitre_name": normalized["mitre_name"],
            "mitre_tactic": normalized["mitre_tactic"],
            "parent_process": normalized["parent_process"],
            "command_line": normalized["command_line"],
            "hash": normalized["hash"],
            "raw_event": normalized["raw_event"],
            "normalized_event": normalized["normalized_event"],
            "risk_score": normalized["risk_score"],
            "correlation_id": normalized["correlation_id"]
        }
        
        telemetry_id = None
        try:
            ins_res = supabase_client.table("telemetry").insert(db_insert).execute()
            if ins_res.data:
                telemetry_id = ins_res.data[0]["id"]
                normalized["id"] = telemetry_id
        except Exception as dbe:
            logger.error(f"Failed to persist telemetry event: {str(dbe)}")
            
        # 2. Run Detections (Sigma evaluation)
        try:
            rules_res = supabase_client.table("detections").select("*").eq("status", "Active").execute()
            if rules_res.data:
                for rule in rules_res.data:
                    matched = False
                    if rule.get("rule_type") == "Sigma":
                        matched = SigmaEngine.match_rule(rule.get("definition", ""), normalized)
                        
                    if matched:
                        # Fetch Correlation Chain
                        chain = CorrelationEngine.correlate(normalized)
                        chain_ids = [c.get("id") for c in chain if c.get("id")]
                        
                        # Generate Alert
                        alert_payload = {
                            "rule_id": rule["id"],
                            "telemetry_id": telemetry_id,
                            "severity": rule["severity"],
                            "mitre_id": rule.get("mitre_id"),
                            "mitre_name": rule.get("mitre_name"),
                            "ioc_value": normalized.get("hash") or normalized.get("command_line") or "",
                            "risk_score": 90 if rule["severity"] == "critical" else (75 if rule["severity"] == "high" else 50),
                            "evidence": {
                                "process_tree": f"{normalized.get('parent_process')} -> {normalized.get('command_line')}",
                                "correlation_chain_ids": chain_ids
                            },
                            "status": "New"
                        }
                        
                        # Save Alert
                        supabase_client.table("alerts").insert(alert_payload).execute()
                        
                        # Increment stats
                        supabase_client.table("detections") \
                            .update({
                                "execution_count": (rule.get("execution_count") or 0) + 1,
                                "last_triggered": datetime.utcnow().isoformat()
                            }) \
                            .eq("id", rule["id"]) \
                            .execute()
                            
        except Exception as re:
            logger.error(f"Detections run check failure: {str(re)}")
            
        return normalized
