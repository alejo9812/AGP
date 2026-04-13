from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AGP Warehouse Grouping API"
    api_prefix: str = "/api/v1"
    app_env: str = "development"
    database_url: str = "sqlite+pysqlite:///./agp_warehouse.db"
    allow_origins: list[str] = ["http://localhost:5173", "http://localhost:4173"]
    default_warehouse_location: str = "MX-UNASSIGNED"
    enable_demo_mode: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("allow_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

