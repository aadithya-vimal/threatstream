from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.credentials import CredentialCipher, secret_hint
from app.core.security import AuthenticatedUser
from app.database.repositories import TenancyRepository
from app.domains.tenancy.schemas import CredentialWrite, OrganizationCreate, TeamCreate, WorkspaceCreate


def organization_dict(row) -> dict[str, Any]:
    return {"id": row.id, "name": row.name, "slug": row.slug, "created_at": row.created_at}


def workspace_dict(row, role_key: str | None = None) -> dict[str, Any]:
    return {"id": row.id, "organization_id": row.organization_id, "name": row.name, "slug": row.slug, "description": row.description, "created_at": row.created_at, "role_key": role_key}


def team_dict(row) -> dict[str, Any]:
    return {"id": row.id, "organization_id": row.organization_id, "workspace_id": row.workspace_id, "name": row.name, "slug": row.slug, "description": row.description, "created_at": row.created_at}


class TenancyService:
    def __init__(self, session: AsyncSession, user: AuthenticatedUser):
        self.session = session
        self.user = user
        self.repository = TenancyRepository(session)

    async def context(self) -> dict[str, list[dict[str, Any]]]:
        organizations, workspaces = await self.repository.context(self.user.id)
        return {"organizations": [organization_dict(row) for row in organizations], "workspaces": [workspace_dict(row, role) for row, role in workspaces]}

    async def create_organization(self, payload: OrganizationCreate) -> dict[str, Any]:
        async with self.session.begin():
            organization, workspace = await self.repository.create_organization(self.user.id, payload.name, payload.slug, payload.workspace_name, payload.workspace_slug)
        return {"organization": organization_dict(organization), "workspace": workspace_dict(workspace, "workspace_administrator"), "role_key": "workspace_administrator"}

    async def create_workspace(self, organization_id: UUID, payload: WorkspaceCreate) -> dict[str, Any]:
        async with self.session.begin():
            workspace = await self.repository.create_workspace(organization_id, self.user.id, payload.name, payload.slug, payload.description)
        return workspace_dict(workspace, "workspace_administrator")

    async def list_teams(self, workspace_id: UUID) -> list[dict[str, Any]]:
        return [team_dict(row) for row in await self.repository.list_teams(workspace_id)]

    async def create_team(self, workspace_id: UUID, payload: TeamCreate) -> dict[str, Any]:
        async with self.session.begin():
            organization_id = await self.repository.workspace_organization_id(workspace_id)
            if organization_id is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
            team = await self.repository.create_team(workspace_id, organization_id, self.user.id, payload.name, payload.slug, payload.description)
        return team_dict(team)

    async def list_credential_metadata(self, workspace_id: UUID) -> list[dict[str, Any]]:
        return [{"provider_key": row.provider_key, "secret_hint": row.secret_hint, "key_version": row.key_version, "rotated_at": row.rotated_at} for row in await self.repository.credential_metadata(workspace_id)]

    async def store_credential(self, workspace_id: UUID, provider_key: str, payload: CredentialWrite) -> dict[str, Any]:
        normalized_provider = provider_key.lower()
        ciphertext, nonce = CredentialCipher().encrypt(payload.secret, str(workspace_id), normalized_provider)
        async with self.session.begin():
            organization_id = await self.repository.workspace_organization_id(workspace_id)
            if organization_id is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
            row = await self.repository.upsert_credential(workspace_id=workspace_id, organization_id=organization_id, user_id=self.user.id, provider_key=normalized_provider, ciphertext=ciphertext, nonce=nonce, hint=secret_hint(payload.secret), key_version=settings.CREDENTIAL_KEY_VERSION)
        return {"provider_key": row.provider_key, "secret_hint": row.secret_hint, "key_version": row.key_version, "rotated_at": row.rotated_at}

    async def delete_credential(self, workspace_id: UUID, provider_key: str) -> bool:
        async with self.session.begin():
            organization_id = await self.repository.workspace_organization_id(workspace_id)
            if organization_id is None:
                return False
            return await self.repository.delete_credential(workspace_id, organization_id, self.user.id, provider_key.lower())
