from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    workspace_name: str = Field(min_length=2, max_length=120)
    workspace_slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

    @field_validator("name", "workspace_name")
    @classmethod
    def trim_names(cls, value: str) -> str:
        return value.strip()


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = Field(default=None, max_length=1000)


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = Field(default=None, max_length=1000)


class CredentialWrite(BaseModel):
    secret: str = Field(min_length=1, max_length=16384)


class CredentialMetadata(BaseModel):
    provider_key: str
    secret_hint: str
    key_version: int
    rotated_at: datetime


class OrganizationSummary(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime


class WorkspaceSummary(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: str
    description: str | None = None
    created_at: datetime
    role_key: str | None = None


class TeamSummary(BaseModel):
    id: UUID
    organization_id: UUID
    workspace_id: UUID
    name: str
    slug: str
    description: str | None = None
    created_at: datetime


class TenancyContextResponse(BaseModel):
    organizations: list[OrganizationSummary]
    workspaces: list[WorkspaceSummary]


class OrganizationBootstrapResponse(BaseModel):
    organization: OrganizationSummary
    workspace: WorkspaceSummary
    role_key: str
