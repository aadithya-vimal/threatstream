from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.tenancy import require_workspace_permission
from app.core.security import AuthenticatedPrincipal
from app.database.session import get_db_session
from app.domains.integrations.schemas import IntegrationCredentialWrite, IntegrationState, IntegrationTestResult
from app.domains.integrations.service import IntegrationService

router = APIRouter()
ProviderId = Annotated[str, Path(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:[_-][a-z0-9]+)*$")]


@router.get("/workspaces/{workspace_id}/integrations", response_model=list[IntegrationState])
async def list_integrations(
    workspace_id: UUID,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("workspace:read")),
    session: AsyncSession = Depends(get_db_session),
):
    return await IntegrationService(session, user).list_integrations(workspace_id)


@router.get("/workspaces/{workspace_id}/integrations/{provider_id}", response_model=IntegrationState)
async def get_integration(
    workspace_id: UUID,
    provider_id: ProviderId,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("workspace:read")),
    session: AsyncSession = Depends(get_db_session),
):
    return await IntegrationService(session, user).get_integration(workspace_id, provider_id)


@router.put("/workspaces/{workspace_id}/integrations/{provider_id}", response_model=IntegrationState)
async def store_credential(
    workspace_id: UUID,
    provider_id: ProviderId,
    payload: IntegrationCredentialWrite,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("integration:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    return await IntegrationService(session, user).store_credential(workspace_id, provider_id, payload)


@router.post("/workspaces/{workspace_id}/integrations/{provider_id}/test", response_model=IntegrationTestResult)
async def test_credential(
    workspace_id: UUID,
    provider_id: ProviderId,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("integration:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    return await IntegrationService(session, user).test_credential(workspace_id, provider_id)


@router.delete("/workspaces/{workspace_id}/integrations/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(
    workspace_id: UUID,
    provider_id: ProviderId,
    user: AuthenticatedPrincipal = Depends(require_workspace_permission("integration:manage")),
    session: AsyncSession = Depends(get_db_session),
):
    await IntegrationService(session, user).delete_credential(workspace_id, provider_id)
