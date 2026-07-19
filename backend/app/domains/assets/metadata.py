import json
from typing import Any

from fastapi import HTTPException, status


SECRET_KEYS = {"api_key", "apikey", "authorization", "credential", "credentials", "password", "private_key", "secret", "token"}
MAX_METADATA_BYTES = 32_768
MAX_METADATA_DEPTH = 6


def validate_metadata(value: dict[str, Any]) -> dict[str, Any]:
    try:
        encoded = json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Asset metadata must be JSON serializable") from exc
    if len(encoded) > MAX_METADATA_BYTES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Asset metadata exceeds the 32 KiB limit")

    def inspect(item: Any, depth: int) -> None:
        if depth > MAX_METADATA_DEPTH:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Asset metadata nesting is too deep")
        if isinstance(item, dict):
            if not all(isinstance(key, str) and len(key) <= 160 for key in item):
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Asset metadata keys must be short strings")
            for child in item.values(): inspect(child, depth + 1)
        elif isinstance(item, list):
            for child in item: inspect(child, depth + 1)
        elif item is not None and not isinstance(item, (str, int, float, bool)):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Asset metadata contains an unsupported value")

    inspect(value, 1)
    return value


def redact_metadata(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: "[REDACTED]" if key.casefold() in SECRET_KEYS or any(part in key.casefold() for part in ("password", "secret", "token", "private_key", "api_key")) else redact_metadata(child) for key, child in value.items()}
    if isinstance(value, list):
        return [redact_metadata(child) for child in value]
    return value
