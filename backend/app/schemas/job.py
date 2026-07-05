from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

class JobCreate(BaseModel):
    name: str = Field(..., description="Descriptive name of the job")
    type: str = Field(..., description="Job type, e.g., 'scan', 'collect', 'enrich', 'backup', 'report'")
    priority: int = Field(default=5, ge=1, le=10, description="Priority from 1 (critical) to 10 (low)")
    payload: Dict[str, Any] = Field(default={}, description="Input arguments for the job execution")
    connector_id: Optional[UUID] = Field(default=None, description="Linked connector UUID if any")
    scheduled_at: Optional[datetime] = Field(default=None, description="Time to trigger execution if scheduled")

class JobUpdate(BaseModel):
    status: Optional[str] = Field(default=None, description="Status code")
    progress: Optional[int] = Field(default=None, ge=0, le=100, description="Percentage completion progress")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Execution result JSON payload")
    error: Optional[str] = Field(default=None, description="Error trace logging if failed")
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

class JobResponse(BaseModel):
    id: UUID
    name: str
    type: str
    status: str
    priority: int
    payload: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: int
    connector_id: Optional[UUID] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
