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


def token(private_key):
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": "user_test",
            "iss": "https://auth.example.test",
            "aud": "threatstream",
            "iat": now,
            "nbf": now - timedelta(seconds=1),
            "exp": now + timedelta(minutes=5),
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


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
