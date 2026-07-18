from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status

from app.core.security import AuthenticatedUser, get_current_user
from app.database.rest_client import SupabaseRestClient


def require_workspace_permission(permission: str) -> Callable:
    async def dependency(
        request: Request,
        workspace_id: UUID,
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        client = SupabaseRestClient(user.token)
        allowed = await client.rpc(
            "has_workspace_permission",
            {"target_workspace_id": str(workspace_id), "required_permission": permission},
        )
        if allowed is not True:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace permission denied")
        request.state.workspace_id = workspace_id
        request.state.user_id = user.id
        return user

    return dependency


async def require_organization_administrator(
    request: Request,
    organization_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    client = SupabaseRestClient(user.token)
    allowed = await client.rpc(
        "is_organization_administrator",
        {"target_organization_id": str(organization_id)},
    )
    if allowed is not True:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization administrator permission required")
    request.state.organization_id = organization_id
    request.state.user_id = user.id
    return user
