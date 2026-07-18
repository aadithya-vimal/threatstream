import asyncio
import base64
import os
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from jose import jwt
from starlette.requests import Request

from app.api.dependencies import tenancy as tenancy_dependencies
from app.core.config import settings
from app.core.credentials import CredentialCipher, secret_hint
from app.core.security import AuthenticatedUser, get_current_user
from app.domains.tenancy.service import TenancyService
from app.main import app


def test_valid_supabase_token_is_decoded(monkeypatch):
    secret = "phase-two-test-secret-with-sufficient-length"
    user_id = uuid4()
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", secret)
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://tenant-test.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_JWT_ISSUER", "")
    token = jwt.encode(
        {
            "sub": str(user_id),
            "email": "engineer@example.test",
            "aud": "authenticated",
            "iss": settings.supabase_jwt_issuer,
        },
        secret,
        algorithm="HS256",
    )

    user = get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))

    assert user.id == user_id
    assert user.email == "engineer@example.test"
    assert user.token == token


def test_invalid_token_returns_generic_unauthorized(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "configured-secret")
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid"))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired access token"


def test_api_errors_include_correlation_id():
    response = TestClient(app).get("/api/v1/tenancy/context")
    payload = response.json()
    assert response.status_code == 401
    assert payload["error"]["code"] == "authentication_required"
    assert UUID(payload["error"]["correlation_id"])
    assert response.headers["X-Correlation-ID"] == payload["error"]["correlation_id"]


def test_legacy_product_routes_are_not_registered():
    paths = {route.path for route in app.routes}
    assert "/api/v1/malware/samples" not in paths
    assert "/api/v1/plugins/" not in paths
    assert "/api/v1/telemetry/events" not in paths
    assert "/api/v1/tenancy/context" in paths
    assert "/api/v1/tenancy/workspaces/{workspace_id}/credentials/{provider_key}" in paths


def test_credentials_are_encrypted_with_workspace_bound_aad(monkeypatch):
    encoded_key = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")
    monkeypatch.setattr(settings, "CREDENTIAL_ENCRYPTION_KEY", encoded_key)
    workspace_id = str(uuid4())
    cipher = CredentialCipher()

    ciphertext, nonce = cipher.encrypt("provider-secret-value", workspace_id, "github")

    assert "provider-secret-value" not in ciphertext
    assert cipher.decrypt(ciphertext, nonce, workspace_id, "github") == "provider-secret-value"
    with pytest.raises(Exception):
        cipher.decrypt(ciphertext, nonce, workspace_id, "semgrep")
    assert secret_hint("provider-secret-value") == "••••alue"


def test_permission_dependency_denies_missing_permission(monkeypatch):
    class FakeClient:
        def __init__(self, access_token):
            self.access_token = access_token

        async def rpc(self, function_name, payload):
            assert function_name == "has_workspace_permission"
            assert payload["required_permission"] == "team:manage"
            return False

    monkeypatch.setattr(tenancy_dependencies, "SupabaseRestClient", FakeClient)
    dependency = tenancy_dependencies.require_workspace_permission("team:manage")
    request = Request({"type": "http", "headers": []})
    user = AuthenticatedUser(id=uuid4(), email=None, token="token", claims={})

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(dependency(request, uuid4(), user))
    assert exc_info.value.status_code == 403


def test_tenancy_context_attaches_membership_roles():
    workspace_id = uuid4()
    organization_id = uuid4()
    user = AuthenticatedUser(id=uuid4(), email=None, token="token", claims={})

    class FakeClient:
        async def select(self, table, params):
            if table == "organizations":
                return [{"id": str(organization_id), "name": "Example", "slug": "example", "created_at": "2026-07-18T00:00:00Z"}]
            if table == "workspaces":
                return [{
                    "id": str(workspace_id),
                    "organization_id": str(organization_id),
                    "name": "Product",
                    "slug": "product",
                    "description": None,
                    "created_at": "2026-07-18T00:00:00Z",
                }]
            return [{"workspace_id": str(workspace_id), "role_key": "application_security_engineer"}]

    service = object.__new__(TenancyService)
    service.user = user
    service.client = FakeClient()
    context = asyncio.run(service.context())

    assert context["organizations"][0]["id"] == str(organization_id)
    assert context["workspaces"][0]["role_key"] == "application_security_engineer"
