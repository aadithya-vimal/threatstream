import asyncio
import base64
import os
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4
from types import SimpleNamespace

import pytest
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from jwt import InvalidTokenError
from jwt.algorithms import RSAAlgorithm
from starlette.requests import Request

from app.api.dependencies import tenancy as tenancy_dependencies
from app.core.config import settings
from app.core.credentials import CredentialCipher, secret_hint
from app.core.security import AuthenticatedPrincipal, decode_neon_auth_token
from app.domains.tenancy.service import TenancyService
from app.main import app


def signing_material():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    return private_pem, private_key.public_key()


def neon_auth_token(private_key, **overrides):
    now = datetime.now(UTC)
    claims = {"sub": "user_2test", "iss": "https://auth.example.test", "aud": "threatstream", "iat": now, "nbf": now - timedelta(seconds=1), "exp": now + timedelta(minutes=5)}
    claims.update(overrides)
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": "test-key"})


def configure_neon_auth(monkeypatch):
    monkeypatch.setattr(settings, "NEON_AUTH_ISSUER", "https://auth.example.test")
    monkeypatch.setattr(settings, "NEON_AUTH_JWKS_URL", "https://auth.example.test/api/auth/jwks")
    monkeypatch.setattr(settings, "NEON_AUTH_AUDIENCE", "threatstream")


def test_valid_neon_auth_token_is_decoded(monkeypatch):
    private_key, public_key = signing_material()
    configure_neon_auth(monkeypatch)
    monkeypatch.setattr("app.core.security.neon_auth_jwks.get_key", lambda_key(public_key))
    payload = asyncio.run(decode_neon_auth_token(neon_auth_token(private_key, email="engineer@example.test")))
    assert payload["sub"] == "user_2test"
    assert payload["email"] == "engineer@example.test"


def lambda_key(public_key):
    async def get_key(_key_id):
        key = RSAAlgorithm.to_jwk(public_key, as_dict=True)
        return {**key, "kid": "test-key", "alg": "RS256", "use": "sig"}
    return get_key


@pytest.mark.parametrize("claim,value", [("iss", "https://wrong.example.test"), ("aud", "wrong")])
def test_neon_auth_token_rejects_wrong_trust_boundary(monkeypatch, claim, value):
    private_key, public_key = signing_material()
    configure_neon_auth(monkeypatch)
    monkeypatch.setattr("app.core.security.neon_auth_jwks.get_key", lambda_key(public_key))
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(decode_neon_auth_token(neon_auth_token(private_key, **{claim: value})))
    assert exc_info.value.status_code == 401


def test_neon_auth_token_rejects_expired_and_missing_subject(monkeypatch):
    private_key, public_key = signing_material()
    configure_neon_auth(monkeypatch)
    monkeypatch.setattr("app.core.security.neon_auth_jwks.get_key", lambda_key(public_key))
    with pytest.raises(HTTPException):
        asyncio.run(decode_neon_auth_token(neon_auth_token(private_key, exp=datetime.now(UTC) - timedelta(minutes=1))))
    with pytest.raises(HTTPException):
        asyncio.run(decode_neon_auth_token(neon_auth_token(private_key, sub="")))


def test_unknown_signing_key_is_rejected(monkeypatch):
    private_key, _ = signing_material()
    configure_neon_auth(monkeypatch)
    async def missing_key(_key_id):
        raise InvalidTokenError("unknown")
    monkeypatch.setattr("app.core.security.neon_auth_jwks.get_key", missing_key)
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(decode_neon_auth_token(neon_auth_token(private_key)))
    assert exc_info.value.detail == "Invalid or expired access token"


def test_unsupported_signing_algorithm_is_rejected(monkeypatch):
    configure_neon_auth(monkeypatch)
    now = datetime.now(UTC)
    token = jwt.encode(
        {"sub": "user_2test", "iss": "https://auth.example.test", "aud": "threatstream", "exp": now + timedelta(minutes=5)},
        "not-a-production-secret-used-only-in-this-unit-test",
        algorithm="HS256",
        headers={"kid": "test-key"},
    )
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(decode_neon_auth_token(token))
    assert exc_info.value.status_code == 401


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
    assert "/api/v1/tenancy/workspaces/{workspace_id}/audit" in paths
    assert "/api/v1/workspaces/{workspace_id}/integrations/{provider_id}" in paths
    assert "/api/v1/tenancy/workspaces/{workspace_id}/credentials/{provider_key}" not in paths


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


def principal():
    return AuthenticatedPrincipal(
        user_id=uuid4(),
        subject="user_test",
        issuer="https://auth.example.test",
        email=None,
        display_name=None,
        token_claims={},
    )


def test_permission_dependency_denies_missing_permission(monkeypatch):
    class FakeRepository:
        def __init__(self, _session): pass
        async def has_workspace_permission(self, *_args): return False
    monkeypatch.setattr(tenancy_dependencies, "TenancyRepository", FakeRepository)
    dependency = tenancy_dependencies.require_workspace_permission("team:manage")
    request = Request({"type": "http", "headers": []})
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(dependency(request, uuid4(), principal(), object()))
    assert exc_info.value.status_code == 403


def test_tenancy_context_attaches_membership_roles():
    organization = type("Organization", (), {"id": uuid4(), "name": "Example", "slug": "example", "created_at": datetime.now(UTC)})()
    workspace = type("Workspace", (), {"id": uuid4(), "organization_id": organization.id, "name": "Product", "slug": "product", "description": None, "created_at": datetime.now(UTC)})()
    class FakeRepository:
        async def context(self, _user_id): return [organization], [(workspace, "application_security_engineer")]
    service = TenancyService(object(), principal())
    service.repository = FakeRepository()
    context = asyncio.run(service.context())
    assert context["organizations"][0]["id"] == organization.id
    assert context["workspaces"][0]["role_key"] == "application_security_engineer"


def test_audit_service_returns_safe_workspace_event_fields():
    workspace_id = uuid4()
    event = SimpleNamespace(
        id=uuid4(), workspace_id=workspace_id, action="team.created", target_type="team",
        target_id=uuid4(), result="success", event_metadata={"source": "api"}, created_at=datetime.now(UTC),
    )
    class FakeRepository:
        async def list_audit_events(self, requested_workspace, limit):
            assert requested_workspace == workspace_id
            assert limit == 25
            return [(event, "operator@example.test")]
    service = TenancyService(object(), principal())
    service.repository = FakeRepository()
    result = asyncio.run(service.list_audit_events(workspace_id, 25))
    assert result[0]["actor_email"] == "operator@example.test"
    assert result[0]["metadata"] == {"source": "api"}
    assert "before_summary" not in result[0]
    assert "after_summary" not in result[0]
