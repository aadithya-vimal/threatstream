from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.tenancy import require_organization_administrator, require_workspace_permission
from app.core.security import AuthenticatedPrincipal, get_current_user
from app.domains.tenancy.schemas import (
    AuditEventSummary, OrganizationBootstrapResponse,
    OrganizationCreate,
    TeamCreate,
    TeamSummary,
    TenancyContextResponse,
    WorkspaceCreate,
    WorkspaceSummary,
)
from app.domains.tenancy.service import TenancyService
from app.database.session import get_db_session

router = APIRouter()


@router.get("/context", response_model=TenancyContextResponse)
async def get_tenancy_context(user: AuthenticatedPrincipal = Depends(get_current_user), session: AsyncSession = Depends(get_db_session)):
    return await TenancyService(session, user).context()


@router.post("/organizations", response_model=OrganizationBootstrapResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(payload: OrganizationCreate, user: AuthenticatedPrincipal = Depends(get_current_user), session: AsyncSession = Depends(get_db_session)):
    return await TenancyService(session, user).create_organization(payload)


@router.post(
    "/organizations/{organization_id}/workspaces",
    response_model=WorkspaceSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace(
    organization_id: UUID,
    payload: WorkspaceCreate,
    user: AuthenticatedPrincipal = Depends(require_organization_administrator),
    session: AsyncSession = Depends(get_db_session),
):
    return await TenancyService(session, user).create_workspace(organization_id, payload)


@router.get("/workspaces/{workspace_id}/teams", response_model=list[TeamSummary])
async def list_teams(
    workspace_id: UUID,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("workspace:read")),
    session: AsyncSession = Depends(get_db_session),
):
    return await TenancyService(session, user).list_teams(workspace_id)


@router.post("/workspaces/{workspace_id}/teams", response_model=TeamSummary, status_code=status.HTTP_201_CREATED)
async def create_team(
    workspace_id: UUID,
    payload: TeamCreate,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("team:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    return await TenancyService(session, user).create_team(workspace_id, payload)


@router.get("/workspaces/{workspace_id}/audit", response_model=list[AuditEventSummary])
async def list_audit_events(
    workspace_id: UUID,
    limit: int = Query(default=100, ge=1, le=200),
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("audit:read")),
    session: AsyncSession = Depends(get_db_session),
):
    return await TenancyService(session, user).list_audit_events(workspace_id, limit)
