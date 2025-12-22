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
logger.info("Initializing Liquidity Vector API...")

# ... existing code ...

# CORS Configuration - Managed via config.py
# If wildcard is used, we must handle allow_credentials carefully to avoid startup crash
origins = [str(origin) for origin in settings.ALLOWED_ORIGINS]
allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=not allow_all, # credentials cannot be used with wildcard in FastAPI/Starlette
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
    max_age=600,
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
    from urllib.parse import unquote

    service = get_service()
    try:
        # Decode URL-encoded chain name (handles spaces like "bnb chain")
        decoded_chain = unquote(chain)
        # Map chain string to Chain enum (handle various aliases)
        chain_lower = decoded_chain.lower().strip()
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
            logger.warning(f"Unsupported chain requested: {chain} (decoded: {decoded_chain}, lower: {chain_lower})")
            raise HTTPException(status_code=400, detail=f"Unsupported chain: {chain}. Supported chains: ethereum, arbitrum, base, optimism, polygon, avalanche, bnb chain")

        price = await service.get_native_token_price(chain_enum)
        logger.info(f"Price endpoint: {chain} -> ${price:.2f}")
        return {"chain": chain, "price_usd": price}
    except HTTPException:
        # Re-raise HTTP exceptions (like 400 for unsupported chain)
        raise
    except Exception as e:
        logger.error(f"Failed to get price for {chain}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get price: {str(e)}")


# Entry point for uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
