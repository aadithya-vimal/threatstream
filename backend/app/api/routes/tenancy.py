from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.tenancy import require_organization_administrator, require_workspace_permission
from app.core.security import AuthenticatedPrincipal, get_current_user
from app.domains.tenancy.schemas import (
    OrganizationBootstrapResponse,
    CredentialMetadata,
    CredentialWrite,
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
ProviderKey = Annotated[str, Path(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:[_-][a-z0-9]+)*$")]


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


@router.get("/workspaces/{workspace_id}/credentials", response_model=list[CredentialMetadata])
async def list_credential_metadata(
    workspace_id: UUID,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("integration:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    return await TenancyService(session, user).list_credential_metadata(workspace_id)


@router.put("/workspaces/{workspace_id}/credentials/{provider_key}", response_model=CredentialMetadata)
async def store_credential(
    workspace_id: UUID,
    provider_key: ProviderKey,
    payload: CredentialWrite,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("integration:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    return await TenancyService(session, user).store_credential(workspace_id, provider_key, payload)


@router.delete("/workspaces/{workspace_id}/credentials/{provider_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(
    workspace_id: UUID,
    provider_key: ProviderKey,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("integration:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    await TenancyService(session, user).delete_credential(workspace_id, provider_key)
    return None
