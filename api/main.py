"""
Liquidity Vector API - FastAPI Backend

Exposes Python backend logic via REST API for the React frontend.
Provides real-time yield data, gas calculations, and route analysis.
"""

import logging
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .models import AnalyzeRequest, RouteCalculation, YieldResponse, Chain
from .services import get_service, cleanup_service
from .exceptions import ExternalAPIError, InsufficientLiquidityError, BridgeRouteError
from .resilience import get_circuit_states
from .config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("liquidityvector")

# Rate limiter using client IP address
limiter = Limiter(key_func=get_remote_address)

# Ethereum address validation regex
ETH_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Cache control for API responses
        if request.url.path.startswith("/api") or request.url.path in ["/pools", "/analyze"]:
            response.headers["Cache-Control"] = "no-store, max-age=0"

        return response


def validate_wallet_address(address: str) -> bool:
    """Validate Ethereum wallet address format."""
    return bool(ETH_ADDRESS_PATTERN.match(address))


def validate_chain_param(chain: str) -> str:
    """Validate and normalize chain parameter."""
    chain_lower = chain.lower().strip()
    valid_chains = {
        "ethereum", "eth",
        "arbitrum", "arb",
        "base",
        "optimism", "op",
        "polygon", "matic",
        "avalanche", "avax",
        "bnb chain", "bnbchain", "bsc", "binance"
    }
    if chain_lower not in valid_chains:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported chain: {chain}. Valid chains: Ethereum, Arbitrum, Base, Optimism, Polygon, Avalanche, BNB Chain"
        )
    return chain_lower


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    # Startup: Validate security settings
    settings.validate_production_security()
    # service is lazily initialized
    yield
    # Shutdown: cleanup resources
    await cleanup_service()


app = FastAPI(
    title="Liquidity Vector API",
    description="DeFi route analysis and yield optimization engine",
    version="1.0.0",
    lifespan=lifespan
)

# Attach rate limiter to app state and add exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Custom Exception Handlers ---
@app.exception_handler(ExternalAPIError)
async def external_api_exception_handler(request: Request, exc: ExternalAPIError):
    logger.error(f"External API Error: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": str(exc), "error_type": "ExternalAPIError"}
    )

@app.exception_handler(InsufficientLiquidityError)
async def liquidity_exception_handler(request: Request, exc: InsufficientLiquidityError):
    logger.warning(f"Liquidity Error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "error_type": "InsufficientLiquidityError"}
    )

@app.exception_handler(BridgeRouteError)
async def route_exception_handler(request: Request, exc: BridgeRouteError):
    logger.warning(f"Route Error: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc), "error_type": "BridgeRouteError"}
    )

# Security headers middleware (must be added first)
app.add_middleware(SecurityHeadersMiddleware)

# CORS Configuration - Managed via config.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
    max_age=600,  # Cache preflight requests for 10 minutes
)


@app.get("/health")
async def health_check():
    """Health check endpoint with circuit breaker status for monitoring."""
    circuits = get_circuit_states()
    return {
        "status": "healthy",
        "version": "1.0.0",
        "circuits": circuits
    }


@app.get("/debug/test-alert")
async def trigger_test_alert():
    """Simulates a critical error to verify alerting pipelines."""
    logger.critical("ALERT_VERIFICATION_TEST: Manually triggered critical event for monitoring validation.")
    return {"status": "alert_triggered", "message": "Critical log entry generated"}



@app.get("/pools")
@limiter.limit("30/minute")
async def get_pools(request: Request):
    """
    Fetch top USDC yield pools from DefiLlama.

    Returns top 3 pools per supported chain (Ethereum, Arbitrum, Base)
    filtered by TVL > $10M and APY > 0.

    Rate limited to 30 requests per minute per IP.
    """
    service = get_service()
    try:
        pools = await service.fetch_top_pools()
        logger.info(f"Pools endpoint: returned {len(pools)} pools")
        return pools
    except Exception as e:
        logger.error(f"Failed to fetch pools: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch pools: {str(e)}")


@app.post("/analyze", response_model=RouteCalculation)
@limiter.limit("60/minute")
async def analyze_route(request: Request, body: AnalyzeRequest):
    """
    Analyze a cross-chain route for profitability and risk.

    Calculates:
    - Gas costs for source and target chains
    - Bridge fees and slippage
    - Breakeven time in hours
    - 30-day net profit projection
    - Risk level (1-5 scale)
    - Bridge metadata and security history

    Rate limited to 60 requests per minute per IP.
    """
    # Input validation
    if not validate_wallet_address(body.wallet_address):
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address format. Must be a valid Ethereum address (0x...)"
        )

    if body.capital <= 0 or body.capital > 100_000_000:
        raise HTTPException(
            status_code=400,
            detail="Capital must be between 0 and 100,000,000 USD"
        )

    if body.pool_apy < 0 or body.pool_apy > 1000:
        raise HTTPException(
            status_code=400,
            detail="APY must be between 0% and 1000%"
        )

    service = get_service()
    try:
        # Normalize target_chain string (handle BSC alias)
        target_chain_normalized = body.target_chain
        if target_chain_normalized.upper() == "BSC":
            target_chain_normalized = "BNB Chain"

        # Create a new request with normalized chain
        normalized_request = AnalyzeRequest(
            capital=body.capital,
            current_chain=body.current_chain,
            target_chain=target_chain_normalized,
            pool_id=body.pool_id,
            pool_apy=body.pool_apy,
            project=body.project,
            token_symbol=body.token_symbol,
            tvl_usd=body.tvl_usd,
            wallet_address=body.wallet_address
        )

        result = await service.analyze_route(normalized_request)
        logger.info(f"Analyze endpoint: {body.current_chain.value} -> {normalized_request.target_chain}")
        return result

    except ValueError as e:
        logger.warning(f"Validation error in analyze: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ExternalAPIError as e:
        logger.error(f"External API error in analyze: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except InsufficientLiquidityError as e:
        logger.warning(f"Insufficient liquidity in analyze: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except BridgeRouteError as e:
        logger.warning(f"Bridge route error in analyze: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")


@app.get("/yield/{chain}", response_model=YieldResponse)
@limiter.limit("30/minute")
async def get_current_yield(request: Request, chain: str):
    """
    Get market average yield for a specific chain.

    Returns the average APY across all USDC pools on the specified chain.
    Useful for comparing current positions against market opportunities.

    Rate limited to 30 requests per minute per IP.
    """
    service = get_service()
    try:
        result = await service.get_current_yield(chain)
        logger.info(f"Yield endpoint: {chain} -> {result['current_yield']}%")
        return result
    except Exception as e:
        logger.error(f"Failed to get yield for {chain}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get yield: {str(e)}")


@app.get("/price/{chain}")
@limiter.limit("60/minute")
async def get_native_token_price(request: Request, chain: str):
    """
    Get live native token price for a chain from CoinGecko.

    Returns the current USD price of the native token (ETH, MATIC, AVAX, BNB).
    Used for wallet balance USD conversion.

    Rate limited to 60 requests per minute per IP.
    """
    from .models import Chain

    service = get_service()
    try:
        # Map chain string to Chain enum (handle various aliases)
        chain_lower = chain.lower().strip()
        chain_map = {
            "ethereum": Chain.Ethereum,
            "eth": Chain.Ethereum,
            "arbitrum": Chain.Arbitrum,
            "arb": Chain.Arbitrum,
            "base": Chain.Base,
            "optimism": Chain.Optimism,
            "op": Chain.Optimism,
            "polygon": Chain.Polygon,
            "matic": Chain.Polygon,
            "avalanche": Chain.Avalanche,
            "avax": Chain.Avalanche,
            "bnb chain": Chain.BNBChain,
            "bnbchain": Chain.BNBChain,
            "bsc": Chain.BNBChain,
            "binance": Chain.BNBChain,
            "binance smart chain": Chain.BNBChain,
        }
        chain_enum = chain_map.get(chain_lower)
        if not chain_enum:
            raise HTTPException(status_code=400, detail=f"Unsupported chain: {chain}")

        price = await service.get_native_token_price(chain_enum)
        logger.info(f"Price endpoint: {chain} -> ${price:.2f}")
        return {"chain": chain, "price_usd": price}
    except Exception as e:
        logger.error(f"Failed to get price for {chain}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get price: {str(e)}")


# Entry point for uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
