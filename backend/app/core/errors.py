from dataclasses import dataclass


@dataclass
class UpstreamServiceError(Exception):
    message: str
    status_code: int = 502
    code: str = "upstream_service_error"

    def __str__(self) -> str:
        return self.message


class PermissionDeniedError(UpstreamServiceError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message=message, status_code=403, code="permission_denied")
