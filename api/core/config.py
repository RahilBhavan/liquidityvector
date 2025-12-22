"""
Application configuration with security-focused defaults.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Dict, Any, Union
import logging
import os

from ..models import Chain

logger = logging.getLogger("liquidityvector.config")


class Settings(BaseSettings):
    """
    Application settings managed by Pydantic.
    Reads from environment variables and provides validation.
    """

    # CORS Configuration
    # Default to localhost for development convenience. 
    # In production, this MUST be overridden by environment variable.
    # Changed to Any to prevent Pydantic from automatically trying to JSON-decode 
    # comma-separated environment variables.
    ALLOWED_ORIGINS: Any = ["http://localhost:3000", "http://localhost:5173"]

    # Environment (development, staging, production)
    ENVIRONMENT: str = "development"

    # Rate limiting configuration
    RATE_LIMIT_PER_MINUTE: int = 60

    # Request timeout in seconds
    REQUEST_TIMEOUT: float = 10.0

    # Redis Configuration
    REDIS_URL: str = "redis://redis:6379/0"

    # RPC Endpoints - can be overridden via environment variables
    # Format: RPC_URL_ETHEREUM, RPC_URL_ARBITRUM, etc.
    RPC_URL_ETHEREUM: str = "https://eth.llamarpc.com"
    RPC_URL_ARBITRUM: str = "https://arb1.arbitrum.io/rpc"
    RPC_URL_BASE: str = "https://mainnet.base.org"
    RPC_URL_OPTIMISM: str = "https://mainnet.optimism.io"
    RPC_URL_POLYGON: str = "https://polygon-rpc.com"
    RPC_URL_AVALANCHE: str = "https://api.avax.network/ext/bc/C/rpc"
    RPC_URL_BNBCHAIN: str = "https://bsc-dataseed.binance.org"

    @property
    def RPC_URLS(self) -> Dict[Chain, str]:
        """Get RPC URLs mapped by Chain enum."""
        return {
            Chain.Ethereum: self.RPC_URL_ETHEREUM,
            Chain.Arbitrum: self.RPC_URL_ARBITRUM,
            Chain.Base: self.RPC_URL_BASE,
            Chain.Optimism: self.RPC_URL_OPTIMISM,
            Chain.Polygon: self.RPC_URL_POLYGON,
            Chain.Avalanche: self.RPC_URL_AVALANCHE,
            Chain.BNBChain: self.RPC_URL_BNBCHAIN,
        }

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_railway(self) -> bool:
        """Automatic detection for Railway platform."""
        return "RAILWAY_ENVIRONMENT" in os.environ

    @property
    def is_vercel(self) -> bool:
        """Automatic detection for Vercel platform."""
        return "VERCEL" in os.environ or "VERCEL_ENV" in os.environ

    @property
    def platform(self) -> str:
        if self.is_railway: return "railway"
        if self.is_vercel: return "vercel"
        return "local"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from comma-separated string or list."""
        if isinstance(v, str):
            if not v or v.strip() == "":
                return []
            if v == "*":
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v if v else []

    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def validate_environment(cls, v):
        """Validate environment value."""
        valid_envs = {"development", "staging", "production"}
        env = str(v).lower().strip()
        if env not in valid_envs:
            logger.warning(
                f"Unknown ENVIRONMENT '{v}', defaulting to 'development'. "
                f"Valid values: {valid_envs}"
            )
            return "development"
        return env

    def validate_production_security(self) -> None:
        """
        Enforce security rules for production environment.
        Logs warnings for misconfigurations.
        """
        if not self.is_production:
            return

        # Check CORS configuration
        if not self.ALLOWED_ORIGINS:
            logger.warning(
                "PRODUCTION SECURITY WARNING: ALLOWED_ORIGINS is empty. "
                "API will reject all CORS requests from browsers."
            )

        # Check for dangerous wildcard
        for origin in self.ALLOWED_ORIGINS:
            if origin == "*":
                logger.error(
                    "SECURITY CRITICAL: Wildcard '*' in ALLOWED_ORIGINS is unsafe "
                    "for production! This allows any website to make requests."
                )
                # Optionally raise in strict mode
                if os.getenv("STRICT_SECURITY", "").lower() == "true":
                    raise ValueError("Wildcard CORS origin not allowed in production")

            # Warn about HTTP origins in production
            if origin.startswith("http://") and "localhost" not in origin:
                logger.warning(
                    f"SECURITY WARNING: Non-HTTPS origin '{origin}' in production. "
                    "Consider using HTTPS for all production origins."
                )

        logger.info(
            f"Production security validation complete. "
            f"CORS origins: {len(self.ALLOWED_ORIGINS)}"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars


# Create singleton settings instance
settings = Settings()
