from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.tenancy import require_workspace_permission
from app.core.security import AuthenticatedPrincipal
from app.database.session import get_db_session
from app.domains.findings.schemas import (
    ActivitySummary, AssigneeSummary, CommentCreate, CommentSummary,
    EvidenceCreate, EvidenceSummary, FindingCreate, FindingDelete, FindingDetail,
    FindingPage, FindingSeverity, FindingStatus, FindingSummary, FindingTransition, FindingUpdate,
)
from app.domains.findings.service import FindingsService

router = APIRouter()
ReadUser = Annotated[AuthenticatedPrincipal, Depends(require_workspace_permission("finding:read"))]
TriageUser = Annotated[AuthenticatedPrincipal, Depends(require_workspace_permission("finding:triage"))]
Session = Annotated[AsyncSession, Depends(get_db_session)]


@router.get("/workspaces/{workspace_id}/findings", response_model=FindingPage)
async def list_findings(
    workspace_id: UUID, user: ReadUser, session: Session,
    page: int = Query(default=1, ge=1), page_size: int = Query(default=25, ge=1, le=100),
    finding_status: list[FindingStatus] | None = Query(default=None, alias="status"),
    severity: list[FindingSeverity] | None = Query(default=None),
    assignee_user_id: UUID | None = None, search: str | None = Query(default=None, max_length=200),
    asset_id: UUID | None = None,
    sort: Literal["created_at", "updated_at", "title", "status", "severity"] = "updated_at",
    direction: Literal["asc", "desc"] = "desc",
):
    return await FindingsService(session, user).list(
        workspace_id, page=page, page_size=page_size,
        statuses=[value.value for value in finding_status or []],
        severities=[value.value for value in severity or []], assignee_user_id=assignee_user_id, asset_id=asset_id,
        search=search, sort=sort, direction=direction,
    )


@router.post("/workspaces/{workspace_id}/findings", response_model=FindingSummary, status_code=status.HTTP_201_CREATED)
async def create_finding(workspace_id: UUID, payload: FindingCreate, user: TriageUser, session: Session):
    return await FindingsService(session, user).create(workspace_id, payload)


@router.get("/workspaces/{workspace_id}/findings/assignees", response_model=list[AssigneeSummary])
async def list_finding_assignees(workspace_id: UUID, user: ReadUser, session: Session):
    return await FindingsService(session, user).assignees(workspace_id)


@router.get("/workspaces/{workspace_id}/findings/{finding_id}", response_model=FindingDetail)
async def get_finding(workspace_id: UUID, finding_id: UUID, user: ReadUser, session: Session):
    return await FindingsService(session, user).detail(workspace_id, finding_id)


@router.patch("/workspaces/{workspace_id}/findings/{finding_id}", response_model=FindingSummary)
async def update_finding(workspace_id: UUID, finding_id: UUID, payload: FindingUpdate, user: TriageUser, session: Session):
    return await FindingsService(session, user).update(workspace_id, finding_id, payload)


@router.delete("/workspaces/{workspace_id}/findings/{finding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finding(workspace_id: UUID, finding_id: UUID, payload: FindingDelete, user: TriageUser, session: Session):
    await FindingsService(session, user).delete(workspace_id, finding_id, payload.version)


@router.post("/workspaces/{workspace_id}/findings/{finding_id}/transitions", response_model=FindingSummary)
async def transition_finding(workspace_id: UUID, finding_id: UUID, payload: FindingTransition, user: TriageUser, session: Session):
    return await FindingsService(session, user).transition(workspace_id, finding_id, payload)


@router.post("/workspaces/{workspace_id}/findings/{finding_id}/comments", response_model=CommentSummary, status_code=status.HTTP_201_CREATED)
async def add_finding_comment(workspace_id: UUID, finding_id: UUID, payload: CommentCreate, user: TriageUser, session: Session):
    return await FindingsService(session, user).add_comment(workspace_id, finding_id, payload)


@router.post("/workspaces/{workspace_id}/findings/{finding_id}/evidence", response_model=EvidenceSummary, status_code=status.HTTP_201_CREATED)
async def add_finding_evidence(workspace_id: UUID, finding_id: UUID, payload: EvidenceCreate, user: TriageUser, session: Session):
    return await FindingsService(session, user).add_evidence(workspace_id, finding_id, payload)


@router.delete("/workspaces/{workspace_id}/findings/{finding_id}/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finding_evidence(workspace_id: UUID, finding_id: UUID, evidence_id: UUID, payload: FindingDelete, user: TriageUser, session: Session):
    await FindingsService(session, user).delete_evidence(workspace_id, finding_id, evidence_id, payload.version)
