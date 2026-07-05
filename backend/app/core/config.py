import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ThreatStream Operations Backend"
    
    # Supabase configurations
    SUPABASE_URL: str = Field(default="http://localhost:54321", env="SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="mock-service-role-key", env="SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_JWT_SECRET: str = Field(default="mock-jwt-secret", env="SUPABASE_JWT_SECRET")

    # Worker configuration
    MAX_CONCURRENT_JOBS: int = Field(default=5, env="MAX_CONCURRENT_JOBS")
    JOB_POLL_INTERVAL_SECONDS: float = Field(default=2.0, env="JOB_POLL_INTERVAL_SECONDS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
