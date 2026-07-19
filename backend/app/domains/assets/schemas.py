from datetime import datetime
from enum import Enum
from math import ceil
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domains.assets.metadata import validate_metadata


class AssetType(str, Enum):
    DOMAIN="domain"; SUBDOMAIN="subdomain"; IP_ADDRESS="ip_address"; URL="url"; REPOSITORY="repository"; CLOUD_ACCOUNT="cloud_account"; HOST="host"; CONTAINER_IMAGE="container_image"; KUBERNETES_CLUSTER="kubernetes_cluster"; CUSTOM="custom"


class AssetCriticality(str, Enum):
    CRITICAL="critical"; HIGH="high"; MEDIUM="medium"; LOW="low"; UNCLASSIFIED="unclassified"


class AssetEnvironment(str, Enum):
    PRODUCTION="production"; STAGING="staging"; DEVELOPMENT="development"; TESTING="testing"; INTERNAL="internal"; EXTERNAL="external"; UNKNOWN="unknown"


class AssetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=240)
    asset_type: AssetType
    canonical_identifier: str = Field(min_length=1, max_length=1000)
    environment: AssetEnvironment = AssetEnvironment.UNKNOWN
    criticality: AssetCriticality = AssetCriticality.UNCLASSIFIED
    owner_user_id: UUID | None = None
    description: str | None = Field(default=None, max_length=20000)
    source: str = Field(default="manual", min_length=2, max_length=120, pattern=r"^[A-Za-z0-9][A-Za-z0-9 ._:/-]*$")
    external_id: str | None = Field(default=None, max_length=240)
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("name", "canonical_identifier", "description", "source", "external_id")
    @classmethod
    def trim(cls, value): return value.strip() if value is not None else None

    @field_validator("metadata_json")
    @classmethod
    def metadata_is_safe(cls, value): return validate_metadata(value)


class AssetUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=2, max_length=240)
    canonical_identifier: str | None = Field(default=None, min_length=1, max_length=1000)
    environment: AssetEnvironment | None = None
    criticality: AssetCriticality | None = None
    owner_user_id: UUID | None = None
    description: str | None = Field(default=None, max_length=20000)
    metadata_json: dict[str, Any] | None = None
    tags: list[str] | None = Field(default=None, max_length=50)

    @field_validator("name", "canonical_identifier", "description")
    @classmethod
    def trim(cls, value): return value.strip() if value is not None else None

    @field_validator("metadata_json")
    @classmethod
    def metadata_is_safe(cls, value): return validate_metadata(value) if value is not None else None

    @model_validator(mode="after")
    def change_required(self):
        if not (self.model_fields_set - {"version"}): raise ValueError("At least one asset field must be supplied")
        for field in {"name", "canonical_identifier", "environment", "criticality", "metadata_json"} & self.model_fields_set:
            if getattr(self, field) is None: raise ValueError(f"{field} cannot be null")
        return self


class AssetVersion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)


class AssetOwner(BaseModel):
    id: UUID; email: str | None = None; display_name: str | None = None


class AssetCompact(BaseModel):
    id: UUID; name: str; asset_type: AssetType; canonical_identifier: str; is_active: bool


class AssetSummary(AssetCompact):
    workspace_id: UUID; organization_id: UUID; normalized_identifier: str
    environment: AssetEnvironment; criticality: AssetCriticality; owner: AssetOwner | None = None
    description: str | None = None; source: str; external_id: str | None = None
    first_seen_at: datetime; last_seen_at: datetime; metadata_json: dict[str, Any]
    tags: list[str] = Field(default_factory=list); related_findings_count: int = 0
    version: int; created_at: datetime; updated_at: datetime


class RelatedFinding(BaseModel):
    id: UUID; title: str; severity: str; status: str; updated_at: datetime


class AssetActivity(BaseModel):
    id: UUID; action: str; actor_email: str | None = None; created_at: datetime


class AssetDetail(AssetSummary):
    related_findings: list[RelatedFinding] = Field(default_factory=list)
    activity: list[AssetActivity] = Field(default_factory=list)


class AssetPage(BaseModel):
    items: list[AssetSummary]; page: int; page_size: int; total: int; pages: int

    @classmethod
    def create(cls, items, page, page_size, total):
        return cls(items=items, page=page, page_size=page_size, total=total, pages=ceil(total/page_size) if total else 0)
