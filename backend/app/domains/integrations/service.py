import json
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.credentials import CredentialCipher, secret_hint
from app.core.security import AuthenticatedPrincipal
from app.database.repositories import IntegrationRepository, TenancyRepository
from app.domains.integrations.registry import PROVIDERS, get_provider, public_provider, validate_credentials
from app.domains.integrations.schemas import IntegrationCredentialWrite
from app.domains.integrations.tester import ProviderConnectionTester


class IntegrationService:
    def __init__(self, session: AsyncSession, user: AuthenticatedPrincipal):
        self.session = session
        self.user = user
        self.repository = IntegrationRepository(session)

    async def _can_manage(self, workspace_id: UUID) -> bool:
        return await TenancyRepository(self.session).has_workspace_permission(workspace_id, self.user.user_id, "integration:manage")

    @staticmethod
    def _state(provider, credential, can_manage: bool) -> dict[str, Any]:
        state = public_provider(provider)
        state.update({
            "configured": credential is not None,
            "status": credential.status if credential else "not_configured",
            "masked_hint": credential.secret_hint if credential else None,
            "last_tested_at": credential.last_tested_at if credential else None,
            "last_successful_test_at": credential.last_successful_test_at if credential else None,
            "updated_at": credential.updated_at if credential else None,
        })
        state["capabilities"]["can_manage"] = can_manage
        return state

    async def list_integrations(self, workspace_id: UUID) -> list[dict[str, Any]]:
        rows = {row.provider_key: row for row in await self.repository.list_credentials(workspace_id)}
        can_manage = await self._can_manage(workspace_id)
        return [self._state(provider, rows.get(provider_id), can_manage) for provider_id, provider in PROVIDERS.items()]

    async def get_integration(self, workspace_id: UUID, provider_id: str) -> dict[str, Any]:
        provider = get_provider(provider_id)
        credential = await self.repository.get_credential(workspace_id, provider.provider)
        return self._state(provider, credential, await self._can_manage(workspace_id))

    async def store_credential(self, workspace_id: UUID, provider_id: str, payload: IntegrationCredentialWrite) -> dict[str, Any]:
        provider = get_provider(provider_id)
        credentials = validate_credentials(provider, payload.credentials)
        serialized = json.dumps(credentials, separators=(",", ":"), sort_keys=True)
        hint = secret_hint(credentials[provider.credential_fields[0].key])
        ciphertext, nonce = CredentialCipher().encrypt(serialized, str(workspace_id), provider.provider)
        credentials.clear()
        serialized = ""
        async with self.session.begin():
            organization_id = await self.repository.workspace_organization_id(workspace_id)
            if organization_id is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
            row, _created = await self.repository.upsert_credential(
                workspace_id=workspace_id,
                organization_id=organization_id,
                user_id=self.user.user_id,
                provider_id=provider.provider,
                ciphertext=ciphertext,
                nonce=nonce,
                hint=hint,
                key_version=settings.CREDENTIAL_KEY_VERSION,
            )
        return self._state(provider, row, True)

    async def test_credential(self, workspace_id: UUID, provider_id: str) -> dict[str, Any]:
        provider = get_provider(provider_id)
        credential = await self.repository.get_credential(workspace_id, provider.provider)
        if credential is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This integration is not configured.")
        ciphertext = credential.secret_ciphertext
        nonce = credential.secret_nonce
        # End the read transaction before any network I/O. Re-lock the record only
        # when persisting the normalized result so provider latency never holds DB locks.
        await self.session.rollback()
        plaintext = CredentialCipher().decrypt(
            ciphertext,
            nonce,
            str(workspace_id),
            provider.provider,
        )
        try:
            credentials = validate_credentials(provider, json.loads(plaintext))
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The stored credential is invalid. Replace it in Settings.") from None
        finally:
            plaintext = ""
        try:
            result = await ProviderConnectionTester().test(provider.provider, credentials)
        finally:
            credentials.clear()
        async with self.session.begin():
            current = await self.repository.get_credential(workspace_id, provider.provider, for_update=True)
            if current is None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This integration is not configured.")
            tested_at = await self.repository.record_test(current, self.user.user_id, result.status)
        return {"provider": provider.provider, "status": result.status, "tested_at": tested_at, "message": result.message}

    async def delete_credential(self, workspace_id: UUID, provider_id: str) -> None:
        provider = get_provider(provider_id)
        async with self.session.begin():
            credential = await self.repository.get_credential(workspace_id, provider.provider, for_update=True)
            if credential is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
            await self.repository.delete_credential(credential, self.user.user_id)
