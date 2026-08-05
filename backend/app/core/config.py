"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings. Values are read from environment or a .env file."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "MedGuard AI Backend"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "sqlite:///./medguard.db"

    # Directories
    upload_dir: str = "uploads"
    demo_data_dir: str = "demo-data"

    # AI provider
    openai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    vector_database_url: str = ""
    drug_interaction_api_key: str = ""

    # Upload limits
    max_upload_size_mb: int = 15

    # CORS
    cors_origins: str = "*"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def allowed_origins(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        if not p.is_absolute():
            p = Path(BASE_DIR) / p
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def demo_data_path(self) -> Path:
        p = Path(self.demo_data_dir)
        if not p.is_absolute():
            p = Path(BASE_DIR).parent / p
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()

