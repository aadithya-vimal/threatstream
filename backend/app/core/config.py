from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ThreatStream Operations Backend"
    ENABLE_BACKGROUND_TASKS: bool = Field(default=False, env="ENABLE_BACKGROUND_TASKS")
    CORS_ALLOW_ORIGINS: str = Field(default="", env="CORS_ALLOW_ORIGINS")
    
    # Supabase configurations
    SUPABASE_URL: str = Field(default="", env="SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", env="SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_JWT_SECRET: str = Field(default="", env="SUPABASE_JWT_SECRET")

    # IOC enrichment provider keys
    VIRUSTOTAL_API_KEY: str = Field(default="", env="VIRUSTOTAL_API_KEY")
    HYBRIDANALYSIS_API_KEY: str = Field(default="", env="HYBRIDANALYSIS_API_KEY")
    ABUSEIPDB_API_KEY: str = Field(default="", env="ABUSEIPDB_API_KEY")
    GREYNOISE_API_KEY: str = Field(default="", env="GREYNOISE_API_KEY")
    SHODAN_API_KEY: str = Field(default="", env="SHODAN_API_KEY")
    CENSYS_API_ID: str = Field(default="", env="CENSYS_API_ID")
    CENSYS_API_SECRET: str = Field(default="", env="CENSYS_API_SECRET")
    OTX_API_KEY: str = Field(default="", env="OTX_API_KEY")
    MISP_URL: str = Field(default="", env="MISP_URL")
    MISP_API_KEY: str = Field(default="", env="MISP_API_KEY")
    OPENCTI_URL: str = Field(default="", env="OPENCTI_URL")
    OPENCTI_API_KEY: str = Field(default="", env="OPENCTI_API_KEY")
    ANYRUN_API_KEY: str = Field(default="", env="ANYRUN_API_KEY")

    # Worker configuration
    MAX_CONCURRENT_JOBS: int = Field(default=5, env="MAX_CONCURRENT_JOBS")
    JOB_POLL_INTERVAL_SECONDS: float = Field(default=2.0, env="JOB_POLL_INTERVAL_SECONDS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_allow_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ALLOW_ORIGINS.split(",") if origin.strip()]
        return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]

settings = Settings()
