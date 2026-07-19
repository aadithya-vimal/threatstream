from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import AuditEvent, IntegrationCredential, Workspace


class IntegrationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def workspace_organization_id(self, workspace_id: UUID) -> UUID | None:
        return await self.session.scalar(select(Workspace.organization_id).where(Workspace.id == workspace_id))

    async def list_credentials(self, workspace_id: UUID) -> list[IntegrationCredential]:
        rows = await self.session.scalars(
            select(IntegrationCredential)
            .where(IntegrationCredential.workspace_id == workspace_id)
            .order_by(IntegrationCredential.provider_key)
        )
        return list(rows.all())

    async def get_credential(self, workspace_id: UUID, provider_id: str, *, for_update: bool = False) -> IntegrationCredential | None:
        query = select(IntegrationCredential).where(
            IntegrationCredential.workspace_id == workspace_id,
            IntegrationCredential.provider_key == provider_id,
        )
        if for_update:
            query = query.with_for_update()
        return await self.session.scalar(query)

    async def upsert_credential(
        self,
        *,
        workspace_id: UUID,
        organization_id: UUID,
        user_id: UUID,
        provider_id: str,
        ciphertext: str,
        nonce: str,
        hint: str,
        key_version: int,
    ) -> tuple[IntegrationCredential, bool]:
        credential = await self.get_credential(workspace_id, provider_id, for_update=True)
        created = credential is None
        if created:
            credential = IntegrationCredential(
                organization_id=organization_id,
                workspace_id=workspace_id,
                provider_key=provider_id,
                secret_ciphertext=ciphertext,
                secret_nonce=nonce,
                secret_hint=hint,
                key_version=key_version,
                status="untested",
                created_by=user_id,
                updated_by=user_id,
            )
            self.session.add(credential)
        else:
            credential.secret_ciphertext = ciphertext
            credential.secret_nonce = nonce
            credential.secret_hint = hint
            credential.key_version = key_version
            credential.status = "untested"
            credential.last_failure_category = None
            credential.updated_by = user_id
            credential.rotated_at = datetime.now(UTC)
        await self.session.flush()
        self.add_audit(
            credential,
            user_id,
            "credential.created" if created else "credential.updated",
            {"provider_id": provider_id},
        )
        return credential, created

    async def record_test(self, credential: IntegrationCredential, user_id: UUID, result: str) -> datetime:
        tested_at = datetime.now(UTC)
        credential.status = result
        credential.last_tested_at = tested_at
        credential.updated_by = user_id
        if result == "connected":
            credential.last_successful_test_at = tested_at
            credential.last_failure_category = None
        else:
            credential.last_failure_category = result
        self.add_audit(credential, user_id, "credential.tested", {"provider_id": credential.provider_key, "result_category": result})
        return tested_at

    async def delete_credential(self, credential: IntegrationCredential, user_id: UUID) -> None:
        self.add_audit(credential, user_id, "credential.deleted", {"provider_id": credential.provider_key})
        await self.session.delete(credential)

    def add_audit(self, credential: IntegrationCredential, user_id: UUID, action: str, metadata: dict) -> None:
        self.session.add(AuditEvent(
            organization_id=credential.organization_id,
            workspace_id=credential.workspace_id,
            actor_id=user_id,
            action=action,
            target_type="integration_credential",
            target_id=credential.id,
            event_metadata=metadata,
        ))
