from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.security import get_current_user
from app.database.supabase_client import supabase_client
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.workers.job_worker import worker_manager

router = APIRouter()

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job_in: JobCreate, current_user: dict = Depends(get_current_user)):
    """
    Creates a new background job queued for execution.
    """
    new_job = {
        "name": job_in.name,
        "type": job_in.type,
        "status": "queued",
        "priority": job_in.priority,
        "payload": job_in.payload,
        "connector_id": str(job_in.connector_id) if job_in.connector_id else None,
        "scheduled_at": job_in.scheduled_at.isoformat() if job_in.scheduled_at else None,
        "progress": 0,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    response = supabase_client.table("jobs").insert(new_job).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job in database"
        )
    return response.data[0]

@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves all jobs, optionally filtered by status or type.
    """
    query = supabase_client.table("jobs").select("*")
    if status_filter:
        query = query.eq("status", status_filter)
    if type_filter:
        query = query.eq("type", type_filter)
        
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@router.get("/{id}", response_model=JobResponse)
async def get_job(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Retrieves detailed execution properties for a single job.
    """
    response = supabase_client.table("jobs").select("*").eq("id", str(id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    return response.data[0]

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Removes a job execution history record.
    """
    # Cancel if running first
    res = supabase_client.table("jobs").select("status").eq("id", str(id)).execute()
    if res.data and res.data[0]["status"] in ["queued", "running", "paused"]:
        worker_manager.cancel_job(str(id))

    response = supabase_client.table("jobs").delete().eq("id", str(id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found to delete"
        )
    return None

@router.post("/{id}/cancel", response_model=JobResponse)
async def cancel_job(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Gracefully cancels a running or queued job.
    """
    job_str_id = str(id)
    worker_manager.cancel_job(job_str_id)
    
    response = supabase_client.table("jobs").select("*").eq("id", job_str_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    return response.data[0]

@router.post("/{id}/pause", response_model=JobResponse)
async def pause_job(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Pauses execution of an active job.
    """
    job_str_id = str(id)
    worker_manager.pause_job(job_str_id)
    
    response = supabase_client.table("jobs").select("*").eq("id", job_str_id).execute()
    return response.data[0]

@router.post("/{id}/resume", response_model=JobResponse)
async def resume_job(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Resumes a paused job.
    """
    job_str_id = str(id)
    worker_manager.resume_job(job_str_id)
    
    response = supabase_client.table("jobs").select("*").eq("id", job_str_id).execute()
    return response.data[0]

@router.post("/{id}/retry", response_model=JobResponse)
async def retry_job(id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Clones a failed/cancelled job parameters and queues it as a new run.
    """
    job_str_id = str(id)
    response = supabase_client.table("jobs").select("*").eq("id", job_str_id).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original job not found"
        )
        
    old_job = response.data[0]
    new_job = {
        "name": f"Retry: {old_job['name']}",
        "type": old_job["type"],
        "status": "queued",
        "priority": old_job["priority"],
        "payload": old_job["payload"],
        "connector_id": old_job.get("connector_id"),
        "progress": 0,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    insert_res = supabase_client.table("jobs").insert(new_job).execute()
    return insert_res.data[0]
