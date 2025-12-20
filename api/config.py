from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
from typing import List, Union
import logging

class Settings(BaseSettings):
    """
    Application settings managed by Pydantic.
    Reads from environment variables and provides validation.
    """
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = []

    # API Keys (Optional with defaults for dev, Required for Prod in theory)
    # Add actual API keys here as needed, e.g., DEFILLAMA_API_KEY: str = ""

    # Environment
    ENVIRONMENT: str = "development"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            if not v or v.strip() == "":
                return []
            # Handle comma-separated strings
            return [origin.strip() for origin in v.split(",")]
        return v

    def validate_production_security(self):
        """
        Enforce security rules for production environment.
        """
        if self.ENVIRONMENT.lower() == "production":
            if not self.ALLOWED_ORIGINS:
                logging.warning("⚠️  PRODUCTION SECURITY WARNING: ALLOWED_ORIGINS is empty. API will reject all CORS requests.")
            
            # Check for generic wildcards which are dangerous in production
            for origin in self.ALLOWED_ORIGINS:
                if str(origin) == "*":
                    logging.error("🚨 SECURITY CRITICAL: Wildcard '*' in ALLOWED_ORIGINS is unsafe for production!")
                    # In a strict mode, we might want to raise an error here
                    # raise ValueError("Wildcard CORS origin not allowed in production")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
