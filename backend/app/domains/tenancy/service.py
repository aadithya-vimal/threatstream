from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthenticatedPrincipal
from app.database.repositories import TenancyRepository
from app.domains.tenancy.schemas import OrganizationCreate, TeamCreate, WorkspaceCreate


def organization_dict(row) -> dict[str, Any]:
    return {"id": row.id, "name": row.name, "slug": row.slug, "created_at": row.created_at}


def workspace_dict(row, role_key: str | None = None) -> dict[str, Any]:
    return {"id": row.id, "organization_id": row.organization_id, "name": row.name, "slug": row.slug, "description": row.description, "created_at": row.created_at, "role_key": role_key}


def team_dict(row) -> dict[str, Any]:
    return {"id": row.id, "organization_id": row.organization_id, "workspace_id": row.workspace_id, "name": row.name, "slug": row.slug, "description": row.description, "created_at": row.created_at}


class TenancyService:
    def __init__(self, session: AsyncSession, user: AuthenticatedPrincipal):
        self.session = session
        self.user = user
        self.repository = TenancyRepository(session)

    async def context(self) -> dict[str, list[dict[str, Any]]]:
        organizations, workspaces = await self.repository.context(self.user.user_id)
        return {"organizations": [organization_dict(row) for row in organizations], "workspaces": [workspace_dict(row, role) for row, role in workspaces]}

    async def create_organization(self, payload: OrganizationCreate) -> dict[str, Any]:
        async with self.session.begin():
            organization, workspace = await self.repository.create_organization(self.user.user_id, payload.name, payload.slug, payload.workspace_name, payload.workspace_slug)
        return {"organization": organization_dict(organization), "workspace": workspace_dict(workspace, "workspace_administrator"), "role_key": "workspace_administrator"}

    async def create_workspace(self, organization_id: UUID, payload: WorkspaceCreate) -> dict[str, Any]:
        async with self.session.begin():
            workspace = await self.repository.create_workspace(organization_id, self.user.user_id, payload.name, payload.slug, payload.description)
        return workspace_dict(workspace, "workspace_administrator")

    async def list_teams(self, workspace_id: UUID) -> list[dict[str, Any]]:
        return [team_dict(row) for row in await self.repository.list_teams(workspace_id)]

    async def list_audit_events(self, workspace_id: UUID, limit: int = 100) -> list[dict[str, Any]]:
        return [{
            "id": event.id,
            "workspace_id": event.workspace_id,
            "actor_email": actor_email,
            "action": event.action,
            "target_type": event.target_type,
            "target_id": event.target_id,
            "result": event.result,
            "metadata": event.event_metadata or {},
            "created_at": event.created_at,
        } for event, actor_email in await self.repository.list_audit_events(workspace_id, limit)]

    async def create_team(self, workspace_id: UUID, payload: TeamCreate) -> dict[str, Any]:
        async with self.session.begin():
            organization_id = await self.repository.workspace_organization_id(workspace_id)
            if organization_id is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
            team = await self.repository.create_team(workspace_id, organization_id, self.user.user_id, payload.name, payload.slug, payload.description)
        return team_dict(team)
