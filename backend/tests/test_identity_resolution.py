import asyncio
from contextlib import AbstractAsyncContextManager
from uuid import uuid4

from app.core.config import settings
from app.core.security import resolve_local_user
from app.database.models import ExternalIdentity, User


class Transaction(AbstractAsyncContextManager):
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


class Result:
    def __init__(self, row):
        self.row = row

    def first(self):
        return self.row


class IdentitySession:
    def __init__(self):
        self.user = None
        self.identity = None
        self.added = []

    def begin(self):
        return Transaction()

    async def execute(self, _statement):
        row = (self.identity, self.user) if self.identity and self.user else None
        return Result(row)

    def add(self, model):
        self.added.append(model)
        if isinstance(model, User):
            self.user = model
        if isinstance(model, ExternalIdentity):
            self.identity = model

    async def flush(self):
        if self.user and self.user.id is None:
            self.user.id = uuid4()
        if self.user and self.user.status is None:
            self.user.status = "active"


def test_neon_identity_resolution_is_idempotent_and_grants_no_tenancy(monkeypatch):
    monkeypatch.setattr(settings, "NEON_AUTH_ISSUER", "https://auth.example.test")
    claims = {"sub": "neon-user-1", "email": "engineer@example.test", "name": "Engineer"}
    session = IdentitySession()

    first_user = asyncio.run(resolve_local_user(session, claims))
    second_user = asyncio.run(resolve_local_user(session, claims))

    assert first_user.id == second_user.id
    assert session.identity.provider == "neon_auth"
    assert session.identity.issuer == "https://auth.example.test"
    assert session.identity.subject == "neon-user-1"
    assert len([model for model in session.added if isinstance(model, User)]) == 1
    assert len([model for model in session.added if isinstance(model, ExternalIdentity)]) == 1
    assert {type(model).__name__ for model in session.added} == {"User", "ExternalIdentity"}
