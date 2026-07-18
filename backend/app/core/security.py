import asyncio
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.models import ExternalIdentity, User
from app.database.session import get_db_session

security_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    user_id: UUID
    subject: str
    issuer: str
    email: str | None
    display_name: str | None
    token_claims: dict[str, Any]

    @property
    def id(self) -> UUID:
        return self.user_id


AuthenticatedUser = AuthenticatedPrincipal


class ClerkJwksCache:
    def __init__(self) -> None:
        self._keys: dict[str, dict[str, Any]] = {}
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    async def get_key(self, key_id: str) -> dict[str, Any]:
        if key_id in self._keys and time.monotonic() < self._expires_at:
            return self._keys[key_id]
        async with self._lock:
            if key_id in self._keys and time.monotonic() < self._expires_at:
                return self._keys[key_id]
            await self._refresh()
            key = self._keys.get(key_id)
            if key is None:
                await self._refresh()
                key = self._keys.get(key_id)
            if key is None:
                raise JWTError("Unknown signing key")
            return key

    async def _refresh(self) -> None:
        jwks_url = settings.CLERK_JWKS_URL or f"{settings.CLERK_JWT_ISSUER.rstrip('/')}/.well-known/jwks.json"
        if not settings.CLERK_JWT_ISSUER or not jwks_url:
            raise JWTError("Authentication is not configured")
        try:
            async with httpx.AsyncClient(timeout=settings.CLERK_JWKS_TIMEOUT_SECONDS) as client:
                response = await client.get(jwks_url)
                response.raise_for_status()
                keys = response.json().get("keys", [])
        except (httpx.HTTPError, ValueError, AttributeError) as exc:
            raise JWTError("Signing keys unavailable") from exc
        self._keys = {key["kid"]: key for key in keys if isinstance(key, dict) and key.get("kid")}
        self._expires_at = time.monotonic() + max(30, settings.CLERK_JWKS_CACHE_SECONDS)


clerk_jwks = ClerkJwksCache()


async def decode_clerk_token(token: str) -> dict[str, Any]:
    if not settings.CLERK_JWT_ISSUER:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication is not configured")
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") != "RS256" or not header.get("kid"):
            raise JWTError("Unsupported token")
        key = await clerk_jwks.get_key(header["kid"])
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.CLERK_JWT_ISSUER,
            audience=settings.CLERK_AUDIENCE or None,
            options={"verify_aud": bool(settings.CLERK_AUDIENCE), "verify_nbf": True, "verify_exp": True, "verify_iss": True},
        )
        if not payload.get("sub"):
            raise JWTError("Missing subject")
        if settings.CLERK_AUTHORIZED_PARTY and payload.get("azp") != settings.CLERK_AUTHORIZED_PARTY:
            raise JWTError("Wrong authorized party")
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token") from exc


async def resolve_local_user(session: AsyncSession, claims: dict[str, Any]) -> User:
    issuer = settings.CLERK_JWT_ISSUER
    subject = str(claims["sub"])
    email = claims.get("email")
    async with session.begin():
        row = await session.execute(
            select(ExternalIdentity, User)
            .join(User, User.id == ExternalIdentity.user_id)
            .where(ExternalIdentity.provider == "clerk", ExternalIdentity.issuer == issuer, ExternalIdentity.subject == subject)
            .with_for_update()
        )
        identity_user = row.first()
        now = datetime.now(UTC)
        if identity_user:
            identity, user = identity_user
            if user.status != "active":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
            identity.last_seen_at = now
            user.last_seen_at = now
            if email and not user.email:
                user.email = email
            return user
        user = User(email=email, display_name=claims.get("name"), avatar_url=claims.get("image_url"), last_seen_at=now)
        session.add(user)
        await session.flush()
        session.add(ExternalIdentity(user_id=user.id, provider="clerk", issuer=issuer, subject=subject, email_at_link_time=email, last_seen_at=now))
        return user


def require_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> str:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return credentials.credentials


async def get_current_user(
    token: str = Depends(require_bearer_token),
    session: AsyncSession = Depends(get_db_session),
) -> AuthenticatedPrincipal:
    claims = await decode_clerk_token(token)
    user = await resolve_local_user(session, claims)
    return AuthenticatedPrincipal(
        user_id=user.id,
        subject=str(claims["sub"]),
        issuer=settings.CLERK_JWT_ISSUER,
        email=user.email,
        display_name=user.display_name,
        token_claims=claims,
    )
