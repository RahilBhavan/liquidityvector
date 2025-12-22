"""
Custom exceptions for the Liquidity Vector API.

This module defines a hierarchy of exceptions for handling different
error scenarios in the route analysis pipeline.

Exception Hierarchy:
    AnalysisError (base)
    ├── BridgeRouteError
    │   └── InsufficientLiquidityError
    └── ExternalAPIError

Usage:
    from api.exceptions import ExternalAPIError, BridgeRouteError

    try:
        result = await service.analyze_route(request)
    except ExternalAPIError as e:
        # Handle external API failures (503)
    except BridgeRouteError as e:
        # Handle invalid routes (400)
"""


class AnalysisError(Exception):
    """
    Base exception for route analysis failures.

    All analysis-related exceptions should inherit from this class
    to allow catch-all handling at the API layer.

    Attributes:
        message: Human-readable error description
    """

    def __init__(self, message: str = "Analysis failed"):
        self.message = message
        super().__init__(self.message)


class BridgeRouteError(AnalysisError):
    """
    Raised when a bridge route cannot be found or is invalid.

    This includes scenarios where:
    - No bridge supports the requested chain pair
    - The bridge is temporarily unavailable
    - Route validation fails

    HTTP Status: 400 Bad Request
    """

    def __init__(self, message: str = "Bridge route unavailable"):
        super().__init__(message)


class InsufficientLiquidityError(BridgeRouteError):
    """
    Raised when the target bridge has insufficient liquidity.

    This occurs when the requested transfer amount exceeds
    the available liquidity in the bridge's pool.

    HTTP Status: 422 Unprocessable Entity
    """

    def __init__(self, message: str = "Insufficient bridge liquidity"):
        super().__init__(message)


class ExternalAPIError(AnalysisError):
    """
    Raised when an external API call fails.

    This includes failures from:
    - Li.Fi bridge aggregator
    - Chain RPC endpoints
    - CoinGecko price API
    - DefiLlama yield API

    HTTP Status: 503 Service Unavailable
    """

    def __init__(self, message: str = "External API unavailable"):
        super().__init__(message)


class ConfigurationError(AnalysisError):
    """
    Raised when there's a configuration issue.

    This includes:
    - Missing required environment variables
    - Invalid configuration values
    - Missing RPC endpoints

    HTTP Status: 500 Internal Server Error
    """

    def __init__(self, message: str = "Configuration error"):
        super().__init__(message)
