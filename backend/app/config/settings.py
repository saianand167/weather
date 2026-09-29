import os
from functools import lru_cache
from typing import List, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Rainfall Intelligence"
    APP_SUBTITLE: str = "Regime-Aware Rainfall Forecast Intelligence Platform"
    SIH_PROBLEM_CODE: str = "SIH26080"
    DEVELOPER_CREDIT: str = "SIH26080 Rainfall Intelligence Platform"
    
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    API_V1_STR: str = "/api"
    
    # Database Configuration (PostgreSQL / SQLite)
    DATABASE_URL: str = "sqlite:///./rainfall_intelligence.db"
    
    # Live NWP Meteorological API
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    WEATHER_API_KEY: str = ""

    # MOSDAC (ISRO Meteorological & Oceanographic Satellite Data Archival Centre)
    MOSDAC_USERNAME: str = ""
    MOSDAC_PASSWORD: str = ""

    # LLM Assistant Configuration (Groq / OpenAI)
    GROQ_API_KEY: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_PROVIDER: str = "groq"
    LLM_TIMEOUT_SECONDS: int = 25

    # Twilio / Dispatch (Optional)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TEST_PHONE_NUMBER: str = ""
    
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000,"
        "https://rainfall-intelligence-1.onrender.com,https://rainfall-intelligence.onrender.com,"
        "https://rainfall-intelligence-frontend.onrender.com,https://weather-saianand167.vercel.app,"
        "https://weather.vercel.app,*"
    )

    @model_validator(mode="after")
    def populate_fallbacks(self):
        # Fallback LLM_API_KEY from GROQ_API_KEY if not explicitly set
        if not self.LLM_API_KEY and self.GROQ_API_KEY:
            self.LLM_API_KEY = self.GROQ_API_KEY
            self.LLM_PROVIDER = "groq"
            if not self.LLM_BASE_URL or "openai.com" in self.LLM_BASE_URL:
                self.LLM_BASE_URL = "https://api.groq.com/openai/v1"
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        defaults = [
            "https://rainfall-intelligence-1.onrender.com",
            "https://rainfall-intelligence.onrender.com",
            "https://rainfall-intelligence-frontend.onrender.com",
            "http://localhost:5173",
            "http://localhost:3000"
        ]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
