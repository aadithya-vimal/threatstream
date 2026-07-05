from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from uuid import UUID
from app.core.security import get_current_user
from app.database.supabase_client import supabase_client
from app.scheduler.task_scheduler import task_scheduler

router = APIRouter()

@router.get("/")
async def list_scheduler_tasks(current_user: dict = Depends(get_current_user)):
    """
    List all active scheduled tasks in the platform database.
    """
    response = supabase_client.table("scheduled_tasks").select("*").execute()
    db_tasks = response.data or []
    
    # Enrich with APScheduler live triggers metadata
    active_cron_jobs = task_scheduler.get_jobs_list()
    active_map = {job["id"]: job for job in active_cron_jobs}

    for task in db_tasks:
        task_id = task["id"]
        task["live_scheduler"] = active_map.get(task_id, {"next_run_time": None})

    return db_tasks

@router.post("/jobs", status_code=status.HTTP_201_CREATED)
async def create_scheduler_job(
    task_in: Dict[str, Any], 
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a new scheduled task and triggers APScheduler reload.
    """
    new_task = {
        "name": task_in["name"],
        "description": task_in.get("description", ""),
        "cron_expression": task_in.get("cron_expression"),
        "job_type": task_in["job_type"],
        "connector_id": task_in.get("connector_id"),
        "payload": task_in.get("payload", {}),
        "enabled": True,
        "run_count": 0,
        "fail_count": 0
    }

    response = supabase_client.table("scheduled_tasks").insert(new_task).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register task in database"
        )
    
    # Reload APScheduler triggers to reflect changes
    await task_scheduler.sync_database_tasks()
    return response.data[0]

@router.post("/{id}/toggle")
async def toggle_scheduler_job(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Toggles a scheduled task enabled/disabled state.
    """
    task_id = str(id)
    # Check current state
    res = supabase_client.table("scheduled_tasks").select("enabled").eq("id", task_id).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled task not found"
        )
    
    new_enabled = not res.data[0]["enabled"]
    update_res = supabase_client.table("scheduled_tasks") \
        .update({"enabled": new_enabled}) \
        .eq("id", task_id) \
        .execute()
        
    # Sync with live scheduler
    await task_scheduler.sync_database_tasks()
    return update_res.data[0]
