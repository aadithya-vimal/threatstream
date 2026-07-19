from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIRECTORY / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ThreatStream Application Security API"
    CORS_ALLOW_ORIGINS: str = ""

    DATABASE_URL: str = ""
    DATABASE_URL_DIRECT: str = ""
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    SCAN_WORKER_POLL_SECONDS: float = 3.0
    SCAN_WORKER_LEASE_SECONDS: int = 90
    SCAN_WORKER_HEARTBEAT_SECONDS: int = 20
    SCAN_WORKER_RECOVERY_SECONDS: int = 30
    SCAN_WORKER_SHUTDOWN_GRACE_SECONDS: int = 30
    SCAN_WORKER_CONCURRENCY: int = 1
    SCAN_JOB_MAX_ATTEMPTS: int = 3

    NEON_AUTH_ISSUER: str = ""
    NEON_AUTH_JWKS_URL: str = ""
    NEON_AUTH_AUDIENCE: str = ""
    NEON_AUTH_JWT_ALGORITHMS: str = "EdDSA,RS256,ES256"
    NEON_AUTH_JWKS_CACHE_SECONDS: int = 300
    NEON_AUTH_JWKS_TIMEOUT_SECONDS: float = 3.0

    CREDENTIAL_ENCRYPTION_KEY: str = ""
    CREDENTIAL_KEY_VERSION: int = 1

    @property
    def cors_allow_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ALLOW_ORIGINS.split(",") if origin.strip()]
        return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def neon_auth_jwt_algorithms(self) -> list[str]:
        return [algorithm.strip() for algorithm in self.NEON_AUTH_JWT_ALGORITHMS.split(",") if algorithm.strip()]

settings = Settings()
