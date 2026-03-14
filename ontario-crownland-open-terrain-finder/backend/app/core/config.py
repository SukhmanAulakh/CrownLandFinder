"""
Application settings loaded from environment and optional .env file.

Used by the FastAPI app and DB/session configuration. All defaults are
safe for local Docker development; override via env vars in production.
"""
from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, PostgresDsn, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Ontario Crown Land Open Terrain Finder"
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "postgres"
    DATABASE_URL: Optional[PostgresDsn] = None

    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
