from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.core.security import get_current_user
from app.database.supabase_client import supabase_client
from app.schemas.job import JobResponse
from app.plugins.manager import PluginManager

router = APIRouter()

@router.get("/")
async def list_plugins(current_user: dict = Depends(get_current_user)):
    """
    Lists all registered connector plugins and their configurations.
    """
    response = supabase_client.table("connectors").select("*").execute()
    return response.data or []

@router.post("/{id}/execute", response_model=JobResponse)
async def execute_plugin(
    id: UUID, 
    payload: Dict[str, Any] = {}, 
    current_user: dict = Depends(get_current_user)
):
    """
    Directly triggers a connector execution by inserting a job in the background queue.
    """
    # 1. Fetch connector info to resolve name
    conn_res = supabase_client.table("connectors").select("*").eq("id", str(id)).execute()
    if not conn_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connector plugin not found"
        )
    connector = conn_res.data[0]

    # 2. Map category/type to job name
    job_name = f"Direct Run: {connector['display_name']}"
    job_type = "scan" if connector["category"] == "scanner" else "collect"
    if connector["category"] == "enrichment":
        job_type = "enrich"

    # 3. Queue new job
    new_job = {
        "name": job_name,
        "type": job_type,
        "status": "queued",
        "priority": 5,
        "payload": payload,
        "connector_id": str(id),
        "progress": 0,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    insert_res = supabase_client.table("jobs").insert(new_job).execute()
    if not insert_res.data:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue job for plugin"
        )
    return insert_res.data[0]

@router.post("/{id}/test")
async def test_plugin(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Secure key validation and connectivity checking for a connector.
    """
    conn_res = supabase_client.table("connectors").select("*").eq("id", str(id)).execute()
    if not conn_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connector not found"
        )
    connector = conn_res.data[0]
    plugin_name = connector["name"]
    config = connector.get("config") or {}

    try:
        plugin = PluginManager.get_plugin(plugin_name, config=config)
        health_report = plugin.health()
        
        # Update database with health status
        status_map = {
            "connected": "active",
            "auth_failed": "error",
            "rate_limited": "error",
            "disconnected": "inactive",
            "not_configured": "not_configured"
        }
        connector_status = status_map.get(health_report["status"], "inactive")

        supabase_client.table("connectors") \
            .update({
                "status": connector_status,
                "health": health_report,
                "last_seen": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }) \
            .eq("id", str(id)) \
            .execute()

        return health_report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Plugin health test crashed: {str(e)}"
        )

@router.post("/{id}/config")
async def configure_plugin(
    id: UUID, 
    config_in: Dict[str, Any], 
    current_user: dict = Depends(get_current_user)
):
    """
    Enables secure credential rotation & configuration saving for a plugin.
    """
    conn_res = supabase_client.table("connectors").select("*").eq("id", str(id)).execute()
    if not conn_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connector not found"
        )
    connector = conn_res.data[0]
    plugin_name = connector["name"]

    # Secure credentials test before saving
    plugin = PluginManager.get_plugin(plugin_name, config=config_in)
    is_valid = plugin.authenticate()
    health_report = plugin.health()

    status_map = {
        "connected": "active",
        "auth_failed": "error",
        "rate_limited": "error",
        "disconnected": "inactive"
    }
    connector_status = status_map.get(health_report["status"], "inactive")

    # Update credentials in Supabase
    update_res = supabase_client.table("connectors") \
        .update({
            "config": config_in,
            "status": connector_status,
            "health": health_report,
            "last_seen": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }) \
        .eq("id", str(id)) \
        .select() \
        .execute()

    if not update_res.data:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update connector configuration"
        )

    # Log in audit trail
    audit_entry = {
        "user_email": current_user.get("email") or "analyst@acme.com",
        "action": "config_change",
        "resource_type": "connector",
        "resource_id": str(id),
        "resource_name": connector["display_name"],
        "details": {"reason": "Analyst configured connector settings"},
        "severity": "warning"
    }
    try:
        supabase_client.table("audit_logs").insert(audit_entry).execute()
    except Exception as ae:
        logger.error(f"Failed to record audit log: {str(ae)}")

    return update_res.data[0]
