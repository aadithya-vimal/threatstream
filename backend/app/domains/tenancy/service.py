from typing import Any
from uuid import UUID

from app.core.security import AuthenticatedUser
from app.core.config import settings
from app.core.credentials import CredentialCipher, secret_hint
from app.database.rest_client import SupabaseRestClient
from app.domains.tenancy.schemas import CredentialWrite, OrganizationCreate, TeamCreate, WorkspaceCreate


class TenancyService:
    def __init__(self, user: AuthenticatedUser):
        self.user = user
        self.client = SupabaseRestClient(user.token)

    async def context(self) -> dict[str, list[dict[str, Any]]]:
        organizations = await self.client.select(
            "organizations",
            {"select": "id,name,slug,created_at", "order": "name.asc"},
        )
        workspaces = await self.client.select(
            "workspaces",
            {"select": "id,organization_id,name,slug,description,created_at", "order": "name.asc"},
        )
        memberships = await self.client.select(
            "workspace_members",
            {
                "select": "workspace_id,role_key",
                "user_id": f"eq.{self.user.id}",
                "status": "eq.active",
            },
        )
        roles = {row["workspace_id"]: row["role_key"] for row in memberships}
        for workspace in workspaces:
            workspace["role_key"] = roles.get(workspace["id"], "organization_administrator")
        return {"organizations": organizations, "workspaces": workspaces}

    async def create_organization(self, payload: OrganizationCreate) -> dict[str, Any]:
        return await self.client.rpc(
            "create_organization_with_workspace",
            {
                "organization_name": payload.name,
                "organization_slug": payload.slug,
                "workspace_name": payload.workspace_name,
                "workspace_slug": payload.workspace_slug,
            },
        )

    async def create_workspace(self, organization_id: UUID, payload: WorkspaceCreate) -> dict[str, Any]:
        return await self.client.rpc(
            "create_workspace",
            {
                "target_organization_id": str(organization_id),
                "workspace_name": payload.name,
                "workspace_slug": payload.slug,
                "workspace_description": payload.description,
            },
        )

    async def list_teams(self, workspace_id: UUID) -> list[dict[str, Any]]:
        return await self.client.select(
            "teams",
            {
                "select": "id,organization_id,workspace_id,name,slug,description,created_at",
                "workspace_id": f"eq.{workspace_id}",
                "order": "name.asc",
            },
        )

    async def create_team(self, workspace_id: UUID, payload: TeamCreate) -> dict[str, Any]:
        return await self.client.rpc(
            "create_team",
            {
                "target_workspace_id": str(workspace_id),
                "team_name": payload.name,
                "team_slug": payload.slug,
                "team_description": payload.description,
            },
        )

    async def list_credential_metadata(self, workspace_id: UUID) -> list[dict[str, Any]]:
        data = await self.client.rpc(
            "list_integration_credential_metadata",
            {"target_workspace_id": str(workspace_id)},
        )
        return data if isinstance(data, list) else []

    async def store_credential(self, workspace_id: UUID, provider_key: str, payload: CredentialWrite) -> dict[str, Any]:
        normalized_provider = provider_key.lower()
        ciphertext, nonce = CredentialCipher().encrypt(payload.secret, str(workspace_id), normalized_provider)
        return await self.client.rpc(
            "upsert_integration_credential",
            {
                "target_workspace_id": str(workspace_id),
                "target_provider_key": normalized_provider,
                "encrypted_secret": ciphertext,
                "encryption_nonce": nonce,
                "masked_hint": secret_hint(payload.secret),
                "encryption_key_version": settings.CREDENTIAL_KEY_VERSION,
            },
        )

    async def delete_credential(self, workspace_id: UUID, provider_key: str) -> bool:
        result = await self.client.rpc(
            "delete_integration_credential",
            {"target_workspace_id": str(workspace_id), "target_provider_key": provider_key.lower()},
        )
        return result is True
