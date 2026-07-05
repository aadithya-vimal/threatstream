from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.core.security import get_current_user
from app.database.supabase_client import supabase_client
from app.schemas.job import JobResponse

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
