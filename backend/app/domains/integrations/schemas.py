from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CredentialFieldSchema(BaseModel):
    key: str
    label: str
    field_type: Literal["password", "text", "url"]
    required: bool
    min_length: int
    max_length: int
    pattern: str | None = None
    placeholder: str | None = None


class IntegrationCapabilitiesSchema(BaseModel):
    web_supported: bool
    desktop_supported: bool
    requires_local_agent: bool
    test_connection: bool
    can_manage: bool = False


class IntegrationState(BaseModel):
    provider: str
    display_name: str
    description: str
    documentation_url: str
    setup_instructions: str
    icon: str
    masked_value_format: str
    credential_fields: list[CredentialFieldSchema]
    runtime_mode: Literal["web", "desktop"]
    configured: bool
    status: str
    masked_hint: str | None = None
    last_tested_at: datetime | None = None
    last_successful_test_at: datetime | None = None
    updated_at: datetime | None = None
    capabilities: IntegrationCapabilitiesSchema


class IntegrationCredentialWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    credentials: dict[str, str] = Field(min_length=1, max_length=10)


class IntegrationTestResult(BaseModel):
    provider: str
    status: str
    tested_at: datetime
    message: str
