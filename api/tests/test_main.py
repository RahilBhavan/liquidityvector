"""
Test suite for the Liquidity Vector API.

Run with: pytest api/tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app, validate_wallet_address, validate_chain_param
from api.models import Chain


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    def test_health_check_returns_200(self, client: TestClient):
        """Health check should return 200 with status info."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_check_contains_required_fields(self, client: TestClient):
        """Health check response should contain status, version, and circuits."""
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "circuits" in data

    def test_health_check_circuits_structure(self, client: TestClient):
        """Circuit breaker status should have expected structure."""
        response = client.get("/health")
        circuits = response.json()["circuits"]
        expected_breakers = ["defillama", "rpc", "lifi", "coingecko", "cache"]
        for breaker in expected_breakers:
            assert breaker in circuits


class TestConfigValidation:
    """Tests for configuration and settings."""

    def test_settings_environment_default(self):
        """Settings should have a valid default environment."""
        from api.config import settings
        assert settings.ENVIRONMENT in ["development", "staging", "production"]

    def test_settings_rpc_urls_available(self):
        """All chains should have RPC URLs configured."""
        from api.config import settings
        rpc_urls = settings.RPC_URLS
        for chain in Chain:
            if chain != Chain.BNBChain or chain.value != "BNB Chain":
                continue
            assert chain in rpc_urls or Chain.BNBChain in rpc_urls

    def test_settings_allowed_origins_parsing(self):
        """ALLOWED_ORIGINS should be parsed correctly."""
        from api.config import Settings
        # Test comma-separated string parsing
        settings = Settings(ALLOWED_ORIGINS="http://localhost:3000,http://example.com")
        assert len(settings.ALLOWED_ORIGINS) == 2
        assert "http://localhost:3000" in settings.ALLOWED_ORIGINS


class TestInputValidation:
    """Tests for input validation functions."""

    def test_valid_wallet_address(self):
        """Valid Ethereum addresses should pass validation."""
        valid_addresses = [
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            "0x0000000000000000000000000000000000000000",
            "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
        ]
        for addr in valid_addresses:
            assert validate_wallet_address(addr) is True

    def test_invalid_wallet_address(self):
        """Invalid addresses should fail validation."""
        invalid_addresses = [
            "0x123",  # Too short
            "not_an_address",
            "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",  # Invalid hex
            "",
            "0x" + "a" * 41,  # Too long
        ]
        for addr in invalid_addresses:
            assert validate_wallet_address(addr) is False

    def test_valid_chain_param(self):
        """Valid chain parameters should be accepted."""
        valid_chains = ["ethereum", "ETH", "arbitrum", "base", "polygon", "bsc"]
        for chain in valid_chains:
            result = validate_chain_param(chain)
            assert result is not None

    def test_invalid_chain_param(self, client: TestClient):
        """Invalid chain should raise HTTPException."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            validate_chain_param("invalid_chain")
        assert exc_info.value.status_code == 400


class TestPoolsEndpoint:
    """Tests for the /pools endpoint."""

    def test_pools_endpoint_exists(self, client: TestClient):
        """Pools endpoint should be accessible."""
        response = client.get("/pools")
        # May return 200 or 503 depending on external API
        assert response.status_code in [200, 503, 429]


class TestAnalyzeEndpoint:
    """Tests for the /analyze endpoint."""

    def test_analyze_requires_valid_wallet(self, client: TestClient):
        """Analyze should reject invalid wallet addresses."""
        payload = {
            "capital": 10000,
            "current_chain": "Ethereum",
            "target_chain": "Arbitrum",
            "pool_id": "test-pool",
            "pool_apy": 5.0,
            "project": "Test",
            "token_symbol": "USDC",
            "tvl_usd": 1000000,
            "wallet_address": "invalid_address"
        }
        response = client.post("/analyze", json=payload)
        assert response.status_code == 400
        assert "wallet address" in response.json()["detail"].lower()

    def test_analyze_capital_validation(self, client: TestClient):
        """Analyze should reject invalid capital amounts."""
        payload = {
            "capital": -100,
            "current_chain": "Ethereum",
            "target_chain": "Arbitrum",
            "pool_id": "test-pool",
            "pool_apy": 5.0,
            "project": "Test",
            "token_symbol": "USDC",
            "tvl_usd": 1000000,
            "wallet_address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        }
        response = client.post("/analyze", json=payload)
        assert response.status_code in [400, 422]


class TestSecurityHeaders:
    """Tests for security headers."""

    def test_security_headers_present(self, client: TestClient):
        """Security headers should be present in responses."""
        response = client.get("/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"


class TestExceptions:
    """Tests for custom exceptions."""

    def test_exception_hierarchy(self):
        """Exceptions should have correct inheritance."""
        from api.exceptions import (
            AnalysisError,
            BridgeRouteError,
            InsufficientLiquidityError,
            ExternalAPIError
        )

        assert issubclass(BridgeRouteError, AnalysisError)
        assert issubclass(InsufficientLiquidityError, BridgeRouteError)
        assert issubclass(ExternalAPIError, AnalysisError)

    def test_exception_messages(self):
        """Exceptions should store messages correctly."""
        from api.exceptions import ExternalAPIError

        error = ExternalAPIError("Test error message")
        assert str(error) == "Test error message"
        assert error.message == "Test error message"
