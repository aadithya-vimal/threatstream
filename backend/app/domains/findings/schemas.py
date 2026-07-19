from datetime import datetime
from enum import Enum
from math import ceil
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.domains.assets.schemas import AssetCompact


class FindingStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class FindingSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class EvidenceKind(str, Enum):
    TEXT = "text"
    URL = "url"
    CODE = "code"


class FindingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=3, max_length=240)
    description: str = Field(min_length=3, max_length=20000)
    severity: FindingSeverity
    source: str = Field(default="manual", min_length=2, max_length=120, pattern=r"^[A-Za-z0-9][A-Za-z0-9 ._:/-]*$")
    external_id: str | None = Field(default=None, max_length=240)
    remediation: str | None = Field(default=None, max_length=20000)
    assignee_user_id: UUID | None = None
    asset_id: UUID | None = None

    @field_validator("title", "description", "source", "external_id", "remediation")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class FindingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=3, max_length=240)
    description: str | None = Field(default=None, min_length=3, max_length=20000)
    severity: FindingSeverity | None = None
    remediation: str | None = Field(default=None, max_length=20000)
    resolution_summary: str | None = Field(default=None, max_length=10000)
    assignee_user_id: UUID | None = None
    asset_id: UUID | None = None

    @field_validator("title", "description", "remediation", "resolution_summary")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def require_change(self):
        if not (self.model_fields_set - {"version"}):
            raise ValueError("At least one finding field must be supplied")
        for field in {"title", "description", "severity"} & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class FindingTransition(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    status: FindingStatus
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def trim_note(cls, value: str | None) -> str | None:
        return value.strip() if value else None


class FindingDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)


class EvidenceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    kind: EvidenceKind
    title: str = Field(min_length=2, max_length=200)
    content: str = Field(min_length=1, max_length=30000)

    @field_validator("title", "content")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_url(self):
        if self.kind == EvidenceKind.URL and not self.content.lower().startswith(("https://", "http://")):
            raise ValueError("URL evidence must use http or https")
        return self


class CommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    body: str = Field(min_length=1, max_length=10000)

    @field_validator("body")
    @classmethod
    def trim_body(cls, value: str) -> str:
        return value.strip()


class AssigneeSummary(BaseModel):
    id: UUID
    email: str | None = None
    display_name: str | None = None


class FindingSummary(BaseModel):
    id: UUID
    workspace_id: UUID
    title: str
    description: str
    severity: FindingSeverity
    status: FindingStatus
    source: str
    external_id: str | None = None
    remediation: str | None = None
    resolution_summary: str | None = None
    assignee: AssigneeSummary | None = None
    asset: AssetCompact | None = None
    version: int
    created_at: datetime
    updated_at: datetime
    acknowledged_at: datetime | None = None
    started_at: datetime | None = None
    resolved_at: datetime | None = None
    closed_at: datetime | None = None
    reopened_at: datetime | None = None


class EvidenceSummary(BaseModel):
    id: UUID
    kind: EvidenceKind
    title: str
    content: str
    created_by: UUID
    created_at: datetime


class CommentSummary(BaseModel):
    id: UUID
    body: str
    created_by: UUID
    author_email: str | None = None
    author_name: str | None = None
    created_at: datetime


class ActivitySummary(BaseModel):
    id: UUID
    action: str
    from_status: FindingStatus | None = None
    to_status: FindingStatus | None = None
    changes: dict = Field(default_factory=dict)
    actor_email: str | None = None
    actor_name: str | None = None
    created_at: datetime


class FindingDetail(FindingSummary):
    evidence: list[EvidenceSummary] = Field(default_factory=list)
    comments: list[CommentSummary] = Field(default_factory=list)
    activity: list[ActivitySummary] = Field(default_factory=list)


class FindingPage(BaseModel):
    items: list[FindingSummary]
    page: int
    page_size: int
    total: int
    pages: int

    @classmethod
    def create(cls, items: list[dict], page: int, page_size: int, total: int):
        return cls(items=items, page=page, page_size=page_size, total=total, pages=ceil(total / page_size) if total else 0)
