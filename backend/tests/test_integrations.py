import asyncio
import base64
import json
import os
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.dependencies import tenancy as tenancy_dependencies
from app.core.config import settings
from app.core.credentials import CredentialCipher
from app.domains.integrations.registry import PROVIDERS, get_provider, public_provider, validate_credentials
from app.domains.integrations.schemas import IntegrationCredentialWrite
from app.domains.integrations.service import IntegrationService
from app.domains.integrations.tester import ProviderConnectionTester, ProviderTestResult
from app.main import app


VALID_KEY = "a" * 64


def test_registry_exposes_only_the_implemented_provider_and_safe_schema():
    assert set(PROVIDERS) == {"virustotal"}
    provider = public_provider(PROVIDERS["virustotal"])
    assert provider["runtime_mode"] == "web"
    assert provider["capabilities"] == {
        "web_supported": True,
        "desktop_supported": True,
        "requires_local_agent": False,
        "test_connection": True,
    }
    assert provider["credential_fields"][0]["key"] == "api_key"
    assert VALID_KEY not in json.dumps(provider)


@pytest.mark.parametrize("provider_id", ["unknown", "github", "../../secret"])
def test_unknown_provider_is_rejected(provider_id):
    with pytest.raises(HTTPException) as exc_info:
        get_provider(provider_id)
    assert exc_info.value.status_code == 404


def test_provider_schema_rejects_unexpected_fields_and_invalid_keys():
    provider = get_provider("virustotal")
    with pytest.raises(HTTPException) as unexpected:
        validate_credentials(provider, {"api_key": VALID_KEY, "endpoint": "https://attacker.test"})
    assert unexpected.value.status_code == 422
    with pytest.raises(HTTPException):
        validate_credentials(provider, {"api_key": "short"})


def test_write_schema_rejects_top_level_extras():
    with pytest.raises(Exception):
        IntegrationCredentialWrite(credentials={"api_key": VALID_KEY}, plaintext=VALID_KEY)


def test_encrypted_payload_contains_no_plaintext_and_is_workspace_bound(monkeypatch):
    monkeypatch.setattr(settings, "CREDENTIAL_ENCRYPTION_KEY", base64.urlsafe_b64encode(os.urandom(32)).decode("ascii"))
    workspace_id = str(uuid4())
    plaintext = json.dumps({"api_key": VALID_KEY})
    ciphertext, nonce = CredentialCipher().encrypt(plaintext, workspace_id, "virustotal")
    assert VALID_KEY not in ciphertext
    assert CredentialCipher().decrypt(ciphertext, nonce, workspace_id, "virustotal") == plaintext
    with pytest.raises(Exception) as exc_info:
        CredentialCipher().decrypt(ciphertext, nonce, str(uuid4()), "virustotal")
    assert VALID_KEY not in str(exc_info.value)


class FakeResponse:
    def __init__(self, status_code):
        self.status_code = status_code


class FakeClient:
    response = FakeResponse(200)
    error = None
    request = None

    def __init__(self, **kwargs):
        assert kwargs["follow_redirects"] is False
        assert kwargs["timeout"].connect == 5.0

    async def __aenter__(self): return self
    async def __aexit__(self, *_args): return None

    async def get(self, url, headers):
        FakeClient.request = (url, headers)
        if FakeClient.error:
            raise FakeClient.error
        return FakeClient.response


@pytest.mark.parametrize("status_code,expected", [(200, "connected"), (401, "invalid_credentials"), (403, "invalid_credentials"), (429, "rate_limited"), (500, "provider_error")])
def test_provider_test_normalizes_responses(monkeypatch, status_code, expected):
    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    FakeClient.response = FakeResponse(status_code)
    FakeClient.error = None
    result = asyncio.run(ProviderConnectionTester().test("virustotal", {"api_key": VALID_KEY}))
    assert result.status == expected
    url, headers = FakeClient.request
    assert url.startswith("https://www.virustotal.com/")
    assert VALID_KEY not in url
    assert headers == {"x-apikey": VALID_KEY}
    assert VALID_KEY not in result.message


def test_provider_timeout_is_safe(monkeypatch):
    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    FakeClient.error = httpx.ReadTimeout("timeout")
    result = asyncio.run(ProviderConnectionTester().test("virustotal", {"api_key": VALID_KEY}))
    FakeClient.error = None
    assert result.status == "unreachable"
    assert VALID_KEY not in result.message


def test_api_contract_has_all_workspace_integration_operations():
    methods_by_path = {route.path: route.methods for route in app.routes if hasattr(route, "methods")}
    base = "/api/v1/workspaces/{workspace_id}/integrations"
    provider = f"{base}/{{provider_id}}"
    assert methods_by_path[base] == {"GET"}
    assert {"GET", "PUT", "DELETE"}.issubset(set().union(*(route.methods for route in app.routes if route.path == provider)))
    assert methods_by_path[f"{provider}/test"] == {"POST"}


def test_workspace_header_mismatch_is_denied_before_repository_access():
    dependency = tenancy_dependencies.require_workspace_permission("workspace:read")
    workspace_id = uuid4()
    request = Request({"type": "http", "headers": [(b"x-workspace-id", str(uuid4()).encode())]})
    user = SimpleNamespace(user_id=uuid4())
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(dependency(request, workspace_id, user, object()))
    assert exc_info.value.status_code == 403


def test_integration_state_never_serializes_ciphertext():
    credential = SimpleNamespace(
        status="connected", secret_hint="••••aaaa", last_tested_at=None,
        last_successful_test_at=None, updated_at=None, secret_ciphertext=VALID_KEY,
    )
    state = IntegrationService._state(PROVIDERS["virustotal"], credential, True)
    serialized = json.dumps(state, default=str)
    assert VALID_KEY not in serialized
    assert "secret_ciphertext" not in serialized
    assert state["masked_hint"] == "••••aaaa"


class Transaction:
    async def __aenter__(self): return self
    async def __aexit__(self, *_args): return None


class FakeSession:
    def begin(self): return Transaction()
    async def rollback(self): return None


class FakeIntegrationRepository:
    def __init__(self, workspace_id, user_id):
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.organization_id = uuid4()
        self.credential = None
        self.actions = []

    async def workspace_organization_id(self, workspace_id):
        return self.organization_id if workspace_id == self.workspace_id else None

    async def upsert_credential(self, **values):
        created = self.credential is None
        self.credential = SimpleNamespace(
            id=uuid4(), organization_id=self.organization_id, workspace_id=self.workspace_id,
            provider_key=values["provider_id"], secret_ciphertext=values["ciphertext"], secret_nonce=values["nonce"],
            secret_hint=values["hint"], key_version=values["key_version"], status="untested",
            last_tested_at=None, last_successful_test_at=None, last_failure_category=None, updated_at=None,
        )
        self.actions.append("created" if created else "updated")
        return self.credential, created

    async def get_credential(self, workspace_id, provider_id, **_kwargs):
        if workspace_id == self.workspace_id and self.credential and provider_id == self.credential.provider_key:
            return self.credential
        return None

    async def record_test(self, credential, _user_id, result):
        from datetime import UTC, datetime
        credential.status = result
        credential.last_tested_at = datetime.now(UTC)
        self.actions.append(f"tested:{result}")
        return credential.last_tested_at

    async def delete_credential(self, _credential, _user_id):
        self.actions.append("deleted")
        self.credential = None


def test_service_saves_updates_tests_and_deletes_without_plaintext(monkeypatch):
    monkeypatch.setattr(settings, "CREDENTIAL_ENCRYPTION_KEY", base64.urlsafe_b64encode(os.urandom(32)).decode("ascii"))
    workspace_id, user_id = uuid4(), uuid4()
    service = IntegrationService(FakeSession(), SimpleNamespace(user_id=user_id))
    repository = FakeIntegrationRepository(workspace_id, user_id)
    service.repository = repository
    payload = IntegrationCredentialWrite(credentials={"api_key": VALID_KEY})

    saved = asyncio.run(service.store_credential(workspace_id, "virustotal", payload))
    assert saved["configured"] is True
    assert saved["masked_hint"] == "••••aaaa"
    assert VALID_KEY not in repository.credential.secret_ciphertext
    assert VALID_KEY not in json.dumps(saved, default=str)

    asyncio.run(service.store_credential(workspace_id, "virustotal", IntegrationCredentialWrite(credentials={"api_key": "b" * 64})))
    assert repository.actions == ["created", "updated"]

    async def connected(_self, _provider, credentials):
        assert credentials == {"api_key": "b" * 64}
        return ProviderTestResult("connected", "The credential was accepted by the provider.")
    monkeypatch.setattr(ProviderConnectionTester, "test", connected)
    tested = asyncio.run(service.test_credential(workspace_id, "virustotal"))
    assert tested["status"] == "connected"
    assert repository.actions[-1] == "tested:connected"

    asyncio.run(service.delete_credential(workspace_id, "virustotal"))
    assert repository.credential is None
    assert repository.actions[-1] == "deleted"


def test_audit_event_names_and_metadata_are_secret_free():
    source = open("app/database/repositories/integrations.py", encoding="utf-8").read()
    for event in ["credential.created", "credential.updated", "credential.tested", "credential.deleted"]:
        assert event in source
    assert '"provider_id"' in source
    assert '"result_category"' in source
    assert "secret_ciphertext" not in source[source.index("def add_audit"):]
