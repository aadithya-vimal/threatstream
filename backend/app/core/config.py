from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ThreatStream Application Security API"
    ENABLE_BACKGROUND_TASKS: bool = False
    CORS_ALLOW_ORIGINS: str = ""

    DATABASE_URL: str = ""
    DATABASE_URL_DIRECT: str = ""
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    CLERK_JWT_ISSUER: str = ""
    CLERK_JWKS_URL: str = ""
    CLERK_AUDIENCE: str = ""
    CLERK_AUTHORIZED_PARTY: str = ""
    CLERK_JWKS_CACHE_SECONDS: int = 300
    CLERK_JWKS_TIMEOUT_SECONDS: float = 3.0

    CREDENTIAL_ENCRYPTION_KEY: str = ""
    CREDENTIAL_KEY_VERSION: int = 1

    # IOC enrichment provider keys
    VIRUSTOTAL_API_KEY: str = ""
    HYBRIDANALYSIS_API_KEY: str = ""
    ABUSEIPDB_API_KEY: str = ""
    GREYNOISE_API_KEY: str = ""
    SHODAN_API_KEY: str = ""
    CENSYS_API_ID: str = ""
    CENSYS_API_SECRET: str = ""
    OTX_API_KEY: str = ""
    MISP_URL: str = ""
    MISP_API_KEY: str = ""
    OPENCTI_URL: str = ""
    OPENCTI_API_KEY: str = ""
    ANYRUN_API_KEY: str = ""

    # Worker configuration
    MAX_CONCURRENT_JOBS: int = 5
    JOB_POLL_INTERVAL_SECONDS: float = 2.0

    @property
    def cors_allow_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ALLOW_ORIGINS.split(",") if origin.strip()]
        return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]

settings = Settings()
