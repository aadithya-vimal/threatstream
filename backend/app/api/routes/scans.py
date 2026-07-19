from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.tenancy import require_workspace_permission
from app.core.security import AuthenticatedPrincipal
from app.database.session import get_db_session
from app.domains.scans.scheduler import ScheduleService
from app.domains.scans.schemas import (
    SafeRawResult,
    ScannerDefinitionResponse,
    ScannerHealth,
    ScanJobPage,
    ScanJobSummary,
    ScanProfileCreate,
    ScanProfileSummary,
    ScanProfileUpdate,
    TargetMutation,
    ScanScheduleCreate, ScanScheduleUpdate, ScanScheduleSummary, ScanSchedulePage, VersionPayload, WorkerStatus,
)
from app.domains.scans.service import ScansService

router = APIRouter()
Session = Annotated[AsyncSession, Depends(get_db_session)]
ReadUser = Annotated[AuthenticatedPrincipal, Depends(require_workspace_permission("scan:read"))]
RunUser = Annotated[AuthenticatedPrincipal, Depends(require_workspace_permission("scan:run"))]
ManageUser = Annotated[AuthenticatedPrincipal, Depends(require_workspace_permission("scan:manage"))]


@router.get("/workspaces/{workspace_id}/scanners", response_model=list[ScannerDefinitionResponse])
async def scanners(workspace_id: UUID, user: ReadUser, session: Session):
    return await ScansService(session, user).definitions()


@router.get("/workspaces/{workspace_id}/scanners/{scanner_type}/health", response_model=ScannerHealth)
async def scanner_health(workspace_id: UUID, scanner_type: str, user: ReadUser, session: Session):
    return await ScansService(session, user).health(scanner_type)


@router.get("/workspaces/{workspace_id}/scan-profiles", response_model=list[ScanProfileSummary])
async def profiles(workspace_id: UUID, user: ReadUser, session: Session):
    return await ScansService(session, user).profiles(workspace_id)


@router.post("/workspaces/{workspace_id}/scan-profiles", response_model=ScanProfileSummary, status_code=status.HTTP_201_CREATED)
async def create_profile(workspace_id: UUID, payload: ScanProfileCreate, user: ManageUser, session: Session):
    return await ScansService(session, user).create_profile(workspace_id, payload)


@router.get("/workspaces/{workspace_id}/scan-profiles/{profile_id}", response_model=ScanProfileSummary)
async def profile(workspace_id: UUID, profile_id: UUID, user: ReadUser, session: Session):
    return await ScansService(session, user).profile(workspace_id, profile_id)


@router.patch("/workspaces/{workspace_id}/scan-profiles/{profile_id}", response_model=ScanProfileSummary)
async def update_profile(workspace_id: UUID, profile_id: UUID, payload: ScanProfileUpdate, user: ManageUser, session: Session):
    return await ScansService(session, user).update_profile(workspace_id, profile_id, payload)


@router.delete("/workspaces/{workspace_id}/scan-profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disable_profile(workspace_id: UUID, profile_id: UUID, user: ManageUser, session: Session):
    await ScansService(session, user).disable_profile(workspace_id, profile_id)


@router.post("/workspaces/{workspace_id}/scan-profiles/{profile_id}/targets", response_model=ScanProfileSummary)
async def add_targets(workspace_id: UUID, profile_id: UUID, payload: TargetMutation, user: ManageUser, session: Session):
    return await ScansService(session, user).add_targets(workspace_id, profile_id, payload.asset_ids)


@router.delete("/workspaces/{workspace_id}/scan-profiles/{profile_id}/targets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_target(workspace_id: UUID, profile_id: UUID, asset_id: UUID, user: ManageUser, session: Session):
    await ScansService(session, user).remove_target(workspace_id, profile_id, asset_id)


@router.post("/workspaces/{workspace_id}/scan-profiles/{profile_id}/run", response_model=ScanJobSummary, status_code=status.HTTP_202_ACCEPTED)
async def run_profile(workspace_id: UUID, profile_id: UUID, user: RunUser, session: Session):
    return await ScansService(session, user).queue(workspace_id, profile_id)


@router.get("/workspaces/{workspace_id}/scan-worker/status", response_model=WorkerStatus)
async def worker_status(workspace_id: UUID, user: ReadUser, session: Session):
    return await ScansService(session,user).worker_status(workspace_id)


@router.get("/workspaces/{workspace_id}/scan-schedules", response_model=ScanSchedulePage)
async def schedules(workspace_id:UUID,user:ReadUser,session:Session,page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),profile_id:UUID|None=None,enabled:bool|None=None,schedule_type:Literal["interval","cron"]|None=None,next_from:datetime|None=None,next_to:datetime|None=None,search:str|None=Query(None,max_length=200),sort:Literal["next_run_at","created_at","updated_at","name"]="next_run_at",direction:Literal["asc","desc"]="asc"):
    return await ScheduleService(session,user).list(workspace_id,page=page,page_size=page_size,profile_id=profile_id,enabled=enabled,schedule_type=schedule_type,next_from=next_from,next_to=next_to,search=search,sort=sort,direction=direction)


@router.post("/workspaces/{workspace_id}/scan-schedules",response_model=ScanScheduleSummary,status_code=status.HTTP_201_CREATED)
async def create_schedule(workspace_id:UUID,payload:ScanScheduleCreate,user:ManageUser,session:Session):return await ScheduleService(session,user).create(workspace_id,payload)


@router.get("/workspaces/{workspace_id}/scan-schedules/{schedule_id}",response_model=ScanScheduleSummary)
async def schedule(workspace_id:UUID,schedule_id:UUID,user:ReadUser,session:Session):return await ScheduleService(session,user).detail(workspace_id,schedule_id)


@router.patch("/workspaces/{workspace_id}/scan-schedules/{schedule_id}",response_model=ScanScheduleSummary)
async def update_schedule(workspace_id:UUID,schedule_id:UUID,payload:ScanScheduleUpdate,user:ManageUser,session:Session):return await ScheduleService(session,user).update(workspace_id,schedule_id,payload)


@router.delete("/workspaces/{workspace_id}/scan-schedules/{schedule_id}",status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(workspace_id:UUID,schedule_id:UUID,user:ManageUser,session:Session):await ScheduleService(session,user).disable(workspace_id,schedule_id)


@router.post("/workspaces/{workspace_id}/scan-schedules/{schedule_id}/enable",response_model=ScanScheduleSummary)
async def enable_schedule(workspace_id:UUID,schedule_id:UUID,payload:VersionPayload,user:ManageUser,session:Session):return await ScheduleService(session,user).set_enabled(workspace_id,schedule_id,True,payload.version)


@router.post("/workspaces/{workspace_id}/scan-schedules/{schedule_id}/disable",response_model=ScanScheduleSummary)
async def disable_schedule(workspace_id:UUID,schedule_id:UUID,payload:VersionPayload,user:ManageUser,session:Session):return await ScheduleService(session,user).set_enabled(workspace_id,schedule_id,False,payload.version)


@router.get("/workspaces/{workspace_id}/scan-jobs", response_model=ScanJobPage)
async def jobs(
    workspace_id: UUID, user: ReadUser, session: Session,
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
    job_status: list[Literal["queued", "claimed", "running", "processing", "completed", "failed", "cancelled"]] | None = Query(None, alias="status"), scanner_type: str | None = Query(None, max_length=32),
    profile_id: UUID | None = None, asset_id: UUID | None = None, requested_by: UUID | None = None,
    date_from: datetime | None = None, date_to: datetime | None = None, search: str | None = Query(None, max_length=200),
    sort: Literal["created_at", "updated_at", "status", "completed_at"] = "created_at",
    direction: Literal["asc", "desc"] = "desc",
):
    statuses = list(job_status or [])
    return await ScansService(session, user).jobs(workspace_id, page=page, page_size=page_size, statuses=statuses,
        scanner_type=scanner_type, profile_id=profile_id, asset_id=asset_id, requested_by=requested_by,
        date_from=date_from, date_to=date_to, search=search, sort=sort, direction=direction)


@router.get("/workspaces/{workspace_id}/scan-jobs/{job_id}", response_model=ScanJobSummary)
async def job(workspace_id: UUID, job_id: UUID, user: ReadUser, session: Session):
    return await ScansService(session, user).job(workspace_id, job_id)


@router.post("/workspaces/{workspace_id}/scan-jobs/{job_id}/cancel", response_model=ScanJobSummary)
async def cancel_job(workspace_id: UUID, job_id: UUID, user: ManageUser, session: Session):
    return await ScansService(session, user).cancel(workspace_id, job_id)


@router.get("/workspaces/{workspace_id}/scan-jobs/{job_id}/results", response_model=list[SafeRawResult])
async def results(workspace_id: UUID, job_id: UUID, user: ReadUser, session: Session):
    return await ScansService(session, user).results(workspace_id, job_id)
