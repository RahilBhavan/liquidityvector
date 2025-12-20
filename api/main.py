"""
Liquidity Vector API - FastAPI Backend

Exposes Python backend logic via REST API for the React frontend.
Provides real-time yield data, gas calculations, and route analysis.
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .models import AnalyzeRequest, RouteCalculation, YieldResponse
from .services import get_service, cleanup_service, ExternalAPIError, InsufficientLiquidityError, BridgeRouteError
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

# CORS Configuration - Managed via config.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


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

        price = await service._get_native_token_price(chain_enum)
        logger.info(f"Price endpoint: {chain} -> ${price:.2f}")
        return {"chain": chain, "price_usd": price}
    except Exception as e:
        logger.error(f"Failed to get price for {chain}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get price: {str(e)}")


# Entry point for uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
