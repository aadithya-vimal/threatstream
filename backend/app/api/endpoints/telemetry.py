from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import yaml
from app.database.supabase_client import supabase_client
from app.services.telemetry import TelemetryIngestService, SigmaEngine, YaraEngine, CorrelationEngine

router = APIRouter()

@router.get("/events")
async def get_telemetry_events(
    hostname: Optional[str] = None,
    source: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    page: int = Query(1, ge=1)
):
    """
    Fetch normalized EDR telemetry events with support for search, filtering, and pagination.
    """
    try:
        offset = (page - 1) * limit
        query = supabase_client.table("telemetry").select("*", count="exact").order("timestamp", desc=True)
        
        if hostname:
            query = query.eq("hostname", hostname)
        if source:
            query = query.eq("source", source)
        if event_type:
            query = query.eq("event_type", event_type)
            
        res = query.range(offset, offset + limit - 1).execute()
        return {
            "status": "success",
            "events": res.data or [],
            "count": res.count or 0,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch telemetry events: {str(e)}")


@router.post("/ingest")
async def ingest_telemetry_events(payload: Dict[str, Any]):
    """
    Streaming and batch ingestion endpoint.
    Normalizes logs, runs Sigma rules engine, correlates items, and triggers alerts.
    """
    source = payload.get("source", "Sysmon")
    events = payload.get("events")
    
    try:
        if isinstance(events, list):
            # Batch ingestion
            results = []
            for evt in events:
                res = TelemetryIngestService.ingest_event(source, evt)
                results.append(res)
            return {"status": "success", "ingested_count": len(results), "events": results}
        else:
            # Single streaming event
            res = TelemetryIngestService.ingest_event(source, payload.get("event") or payload)
            return {"status": "success", "ingested_count": 1, "event": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest event: {str(e)}")


@router.post("/rules")
async def import_sigma_rule(payload: Dict[str, Any]):
    """
    Import and validate a Sigma / YARA rule.
    """
    name = payload.get("name")
    rule_type = payload.get("rule_type", "Sigma")
    severity = payload.get("severity", "medium")
    definition = payload.get("definition", "")
    description = payload.get("description", "")
    
    if not name or not definition:
        raise HTTPException(status_code=400, detail="Name and rule definition syntax are required.")
        
    # Rule syntax validation check
    if rule_type == "Sigma":
        try:
            yaml.safe_load(definition)
        except Exception as ye:
            raise HTTPException(status_code=400, detail=f"Invalid Sigma rule YAML structure: {str(ye)}")
            
    try:
        ins = supabase_client.table("detections").insert({
            "name": name,
            "rule_type": rule_type,
            "severity": severity,
            "definition": definition,
            "description": description,
            "status": "Active"
        }).execute()
        return {"status": "success", "rule": ins.data[0] if ins.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save rule: {str(e)}")


@router.post("/yara/scan")
async def yara_file_scan(
    file: UploadFile = File(...),
    rule_id: Optional[str] = Form(None)
):
    """
    Scans an uploaded file against active YARA rules.
    """
    try:
        content = await file.read()
        
        # Load rules from DB
        query = supabase_client.table("detections").select("*").eq("rule_type", "YARA")
        if rule_id:
            query = query.eq("id", rule_id)
        res = query.execute()
        
        matches = []
        if res.data:
            for rule in res.data:
                yara_def = rule.get("definition", "")
                findings = YaraEngine.match_rule(yara_def, content)
                if findings:
                    matches.append({
                        "rule_id": rule["id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "description": rule.get("description", ""),
                        "mitre_id": rule.get("mitre_id")
                    })
                    
        return {
            "status": "success",
            "file_name": file.filename,
            "file_size": len(content),
            "matches_count": len(matches),
            "matches": matches
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YARA scan failure: {str(e)}")


@router.get("/alerts")
async def get_security_alerts():
    """
    Lists triggered alerts.
    """
    try:
        res = supabase_client.table("alerts") \
            .select("*, detections(name, description)") \
            .order("created_at", desc=True) \
            .execute()
        return {"status": "success", "alerts": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")


@router.post("/alerts/{alert_id}/escalate")
async def escalate_alert_to_incident(
    alert_id: str,
    payload: Dict[str, Any] = None
):
    """
    Escalates an alert to an Incident, attaching evidence, assets, and correlation timeline.
    """
    try:
        # Fetch alert details
        alert_res = supabase_client.table("alerts").select("*").eq("id", alert_id).execute()
        if not alert_res.data:
            raise HTTPException(status_code=404, detail="Alert not found.")
        alert = alert_res.data[0]
        
        # Resolve associated telemetry details
        telemetry_res = supabase_client.table("telemetry").select("*").eq("id", alert["telemetry_id"]).execute()
        telemetry = telemetry_res.data[0] if telemetry_res.data else {}
        
        # Build escalation Incident package
        incident_summary = f"Escalated Threat: {alert.get('mitre_name') or 'Security Intrusion Alert'}"
        evidence_data = {
            "source_alert_id": alert_id,
            "telemetry": telemetry,
            "process_tree": alert.get("evidence", {}).get("process_tree"),
            "correlation_chain_ids": alert.get("evidence", {}).get("correlation_chain_ids", [])
        }
        
        timeline_data = [
            {
                "time": datetime.utcnow().isoformat(),
                "action": "Alert Escalated by SOC Analyst",
                "details": f"Alert ID {alert_id} converted to active incident ticket."
            }
        ]
        
        incident_insert = {
            "summary": incident_summary,
            "severity": alert["severity"],
            "status": "Active",
            "owner": (payload or {}).get("owner", "Unassigned"),
            "mitre_id": alert.get("mitre_id"),
            "mitre_name": alert.get("mitre_name"),
            "evidence": evidence_data,
            "timeline": timeline_data
        }
        
        # Insert incident ticket
        inc_res = supabase_client.table("incidents").insert(incident_insert).execute()
        
        # Update alert status to Resolved
        supabase_client.table("alerts").update({"status": "Resolved"}).eq("id", alert_id).execute()
        
        return {
            "status": "success",
            "message": "Alert successfully escalated to incident.",
            "incident": inc_res.data[0] if inc_res.data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Escalation failed: {str(e)}")
