from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthenticatedPrincipal, get_current_user
from app.database.repositories import TenancyRepository
from app.database.session import get_db_session


def require_workspace_permission(permission: str) -> Callable:
    async def dependency(request: Request, workspace_id: UUID, user: AuthenticatedPrincipal = Depends(get_current_user), session: AsyncSession = Depends(get_db_session, use_cache=False)) -> AuthenticatedPrincipal:
        supplied_workspace = request.headers.get("X-Workspace-ID")
        if supplied_workspace and supplied_workspace != str(workspace_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace scope mismatch")
        if not await TenancyRepository(session).has_workspace_permission(workspace_id, user.user_id, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace permission denied")
        request.state.workspace_id = workspace_id
        request.state.user_id = user.user_id
        return user
    return dependency


async def require_organization_administrator(request: Request, organization_id: UUID, user: AuthenticatedPrincipal = Depends(get_current_user), session: AsyncSession = Depends(get_db_session, use_cache=False)) -> AuthenticatedPrincipal:
    if not await TenancyRepository(session).is_organization_administrator(organization_id, user.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization administrator permission required")
    request.state.organization_id = organization_id
    request.state.user_id = user.user_id
    return user
