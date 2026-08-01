import asyncio
import time
from datetime import UTC, datetime, timedelta

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jwt import InvalidTokenError
from jwt.algorithms import RSAAlgorithm

from app.core.config import settings
from app.core.security import NeonAuthJwksCache, decode_neon_auth_token, neon_auth_jwks


def signing_material():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public_jwk = RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    return private_pem, {**public_jwk, "kid": "test-key", "alg": "RS256", "use": "sig"}


def configure_auth(monkeypatch):
    monkeypatch.setattr(settings, "NEON_AUTH_ISSUER", "https://auth.example.test")
    monkeypatch.setattr(settings, "NEON_AUTH_JWKS_URL", "https://auth.example.test/api/auth/jwks")
    monkeypatch.setattr(settings, "NEON_AUTH_AUDIENCE", "threatstream")


def token(private_key, *, claims=None, headers=None):
    now = datetime.now(UTC)
    payload = {
            "sub": "user_test",
            "iss": "https://auth.example.test",
            "aud": "threatstream",
            "iat": now,
            "nbf": now - timedelta(seconds=1),
            "exp": now + timedelta(minutes=5),
        }
    payload.update(claims or {})
    for key, value in list(payload.items()):
        if value is None:
            payload.pop(key)
    return jwt.encode(
        payload,
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key", **(headers or {})},
    )


def install_signing_key(monkeypatch, public_jwk):
    async def get_key(_key_id):
        return public_jwk
    monkeypatch.setattr(neon_auth_jwks, "get_key", get_key)


def decode(monkeypatch, *, claims=None, headers=None, audience="threatstream"):
    private_key, public_jwk = signing_material()
    configure_auth(monkeypatch)
    monkeypatch.setattr(settings, "NEON_AUTH_AUDIENCE", audience)
    install_signing_key(monkeypatch, public_jwk)
    return asyncio.run(decode_neon_auth_token(token(private_key, claims=claims, headers=headers)))


def test_valid_token_is_verified(monkeypatch):
    assert decode(monkeypatch)["sub"] == "user_test"


@pytest.mark.parametrize("claims", [
    {"iss": "https://other.example.test"},
    {"aud": "other-service"},
    {"exp": datetime.now(UTC) - timedelta(seconds=1)},
    {"nbf": datetime.now(UTC) + timedelta(minutes=5)},
    {"sub": None},
])
def test_invalid_registered_claims_are_rejected(monkeypatch, claims):
    with pytest.raises(HTTPException) as exc_info:
        decode(monkeypatch, claims=claims)
    assert exc_info.value.status_code == 401


def test_absent_audience_is_allowed_only_when_not_configured(monkeypatch):
    assert decode(monkeypatch, claims={"aud": None}, audience="")["sub"] == "user_test"
    with pytest.raises(HTTPException):
        decode(monkeypatch, claims={"aud": None}, audience="threatstream")


def test_missing_kid_is_rejected(monkeypatch):
    private_key, _ = signing_material()
    configure_auth(monkeypatch)
    value = jwt.encode({"sub": "user", "iss": settings.NEON_AUTH_ISSUER, "exp": datetime.now(UTC) + timedelta(minutes=5)}, private_key, algorithm="RS256")
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(decode_neon_auth_token(value))
    assert exc_info.value.status_code == 401


def test_symmetric_algorithm_is_rejected_even_if_environment_allowlists_it(monkeypatch):
    configure_auth(monkeypatch)
    monkeypatch.setattr(settings, "NEON_AUTH_JWT_ALGORITHMS", "HS256,RS256")
    value = jwt.encode({"sub": "user", "iss": settings.NEON_AUTH_ISSUER, "exp": datetime.now(UTC) + timedelta(minutes=5)}, "not-a-trusted-key-that-is-long-enough", algorithm="HS256", headers={"kid": "symmetric"})
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(decode_neon_auth_token(value))
    assert exc_info.value.status_code == 401


def test_invalid_signature_is_rejected(monkeypatch):
    signing_key, _ = signing_material()
    _, unrelated_public_key = signing_material()
    configure_auth(monkeypatch)

    async def get_key(_key_id):
        return unrelated_public_key

    monkeypatch.setattr(neon_auth_jwks, "get_key", get_key)
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(decode_neon_auth_token(token(signing_key)))
    assert exc_info.value.status_code == 401


def test_jwks_timeout_fails_closed(monkeypatch):
    configure_auth(monkeypatch)

    class TimeoutClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, url):
            raise httpx.ReadTimeout("timed out", request=httpx.Request("GET", url))

    monkeypatch.setattr("app.core.security.httpx.AsyncClient", lambda **_kwargs: TimeoutClient())
    with pytest.raises(InvalidTokenError, match="Signing keys unavailable"):
        asyncio.run(NeonAuthJwksCache()._refresh())


def test_unknown_key_refreshes_once_then_fails(monkeypatch):
    cache = NeonAuthJwksCache()
    cache._expires_at = time.monotonic() + 60
    refresh_count = 0

    async def refresh():
        nonlocal refresh_count
        refresh_count += 1
        cache._keys = {"current-key": {"kid": "current-key"}}

    monkeypatch.setattr(cache, "_refresh", refresh)
    with pytest.raises(InvalidTokenError, match="Unknown signing key"):
        asyncio.run(cache.get_key("rotated-key"))
    assert refresh_count == 1
