from dataclasses import asdict, dataclass
import re

from fastapi import HTTPException, status


@dataclass(frozen=True)
class CredentialField:
    key: str
    label: str
    field_type: str
    required: bool
    min_length: int
    max_length: int
    pattern: str | None = None
    placeholder: str | None = None


@dataclass(frozen=True)
class IntegrationCapability:
    web_supported: bool
    desktop_supported: bool
    requires_local_agent: bool
    test_connection: bool


@dataclass(frozen=True)
class ProviderDefinition:
    provider: str
    display_name: str
    description: str
    documentation_url: str
    setup_instructions: str
    icon: str
    masked_value_format: str
    credential_fields: tuple[CredentialField, ...]
    capabilities: IntegrationCapability


VIRUSTOTAL = ProviderDefinition(
    provider="virustotal",
    display_name="VirusTotal",
    description="Store a workspace-owned VirusTotal API key for future reputation lookups.",
    documentation_url="https://docs.virustotal.com/reference/overview",
    setup_instructions="Create an API key in your VirusTotal account, then paste it here. ThreatStream never displays it again after saving.",
    icon="shield",
    masked_value_format="••••••••{last4}",
    credential_fields=(
        CredentialField(
            key="api_key",
            label="API key",
            field_type="password",
            required=True,
            min_length=64,
            max_length=64,
            pattern=r"^[A-Fa-f0-9]{64}$",
            placeholder="64-character VirusTotal API key",
        ),
    ),
    capabilities=IntegrationCapability(
        web_supported=True,
        desktop_supported=True,
        requires_local_agent=False,
        test_connection=True,
    ),
)

PROVIDERS = {VIRUSTOTAL.provider: VIRUSTOTAL}
RUNTIME_MODE = "web"


def get_provider(provider_id: str) -> ProviderDefinition:
    provider = PROVIDERS.get(provider_id.lower())
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
    return provider


def validate_credentials(provider: ProviderDefinition, credentials: dict[str, str]) -> dict[str, str]:
    definitions = {field.key: field for field in provider.credential_fields}
    if set(credentials) - set(definitions):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Unexpected credential fields")
    normalized: dict[str, str] = {}
    for key, definition in definitions.items():
        value = credentials.get(key, "").strip()
        if definition.required and not value:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"{definition.label} is required")
        if value and not definition.min_length <= len(value) <= definition.max_length:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"{definition.label} has an invalid length")
        if value and definition.pattern and not re.fullmatch(definition.pattern, value):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"{definition.label} has an invalid format")
        if value:
            normalized[key] = value
    return normalized


def public_provider(provider: ProviderDefinition) -> dict:
    return {
        "provider": provider.provider,
        "display_name": provider.display_name,
        "description": provider.description,
        "documentation_url": provider.documentation_url,
        "setup_instructions": provider.setup_instructions,
        "icon": provider.icon,
        "masked_value_format": provider.masked_value_format,
        "credential_fields": [asdict(field) for field in provider.credential_fields],
        "capabilities": asdict(provider.capabilities),
        "runtime_mode": RUNTIME_MODE,
    }
