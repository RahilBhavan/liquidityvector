"""
Liquidity Vector API - FastAPI Backend

Exposes Python backend logic via REST API for the React frontend.
Provides real-time yield data, gas calculations, and route analysis.
"""

import logging
import re
import os
import contextlib
from contextlib import asynccontextmanager

# Performance Optimizations
import uvloop
from fastapi.responses import ORJSONResponse, JSONResponse
from fastapi.middleware.gzip import GZipMiddleware

from fastapi import FastAPI, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .models import AnalyzeRequest, RouteCalculation, YieldResponse, Chain, PreflightRequest, RiskCheckResponse
from .services import get_service, cleanup_service
from .exceptions import ExternalAPIError, InsufficientLiquidityError, BridgeRouteError
from .resilience import get_circuit_states
# Updated config import
from .core.config import settings
from .core.cache import RedisCache

# Install uvloop for faster event loop
uvloop.install()

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

# Initialize health router first to ensure it's lightweight
health_router = APIRouter()

@health_router.get("/health")
async def health_check():
    logger.info("Health check endpoint reached")
    return {"status": "ok", "platform": settings.platform}

@health_router.get("/")
async def root_check():
    return {"status": "ok", "message": "Liquidity Vector API is running"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("Initializing Liquidity Vector API...")
    
    # Initialize Redis
    try:
        cache = RedisCache.get_instance()
        await cache.redis.ping()
        logger.info("Redis connection established.")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

    # Validate security but don't crash startup
    try:
        settings.validate_production_security()
    except Exception as e:
        logger.error(f"Security validation failed: {e}")
    yield
    await cleanup_service()
    if RedisCache._instance:
        await RedisCache._instance.close()

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app = FastAPI(
    title="Liquidity Vector API",
    version="1.0.0",
    lifespan=lifespan,
    default_response_class=ORJSONResponse
)

# 1. Include health router BEFORE main middleware
app.include_router(health_router)

# 2. Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 3. Add Middlewares
app.add_middleware(GZipMiddleware, minimum_size=1000) # Compress responses > 1KB
app.add_middleware(SecurityHeadersMiddleware)

origins = [str(origin) for origin in settings.ALLOWED_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    max_age=600,
)

# --- Custom Exception Handlers ---
@app.exception_handler(ExternalAPIError)
async def external_api_exception_handler(request: Request, exc: ExternalAPIError):
    return JSONResponse(status_code=503, content={"detail": str(exc), "error_type": "ExternalAPIError"})

@app.exception_handler(InsufficientLiquidityError)
async def liquidity_exception_handler(request: Request, exc: InsufficientLiquidityError):
    return JSONResponse(status_code=422, content={"detail": str(exc), "error_type": "InsufficientLiquidityError"})

@app.exception_handler(BridgeRouteError)
async def route_exception_handler(request: Request, exc: BridgeRouteError):
    return JSONResponse(status_code=400, content={"detail": str(exc), "error_type": "BridgeRouteError"})

def validate_wallet_address(address: str) -> bool:
    return bool(ETH_ADDRESS_PATTERN.match(address))

@app.get("/status")
async def system_status():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "circuits": get_circuit_states()
    }

@app.get("/pools")
@limiter.limit("30/minute")
async def get_pools(request: Request):
    service = get_service()
    try:
        pools = await service.fetch_top_pools()
        return pools
    except Exception as e:
        logger.error(f"Failed to fetch pools: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze", response_model=RouteCalculation)
@limiter.limit("60/minute")
async def analyze_route(request: Request, body: AnalyzeRequest):
    if not validate_wallet_address(body.wallet_address):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    
    service = get_service()
    try:
        result = await service.analyze_route(body)
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Analysis failed")


@app.post("/preflight", response_model=list[RiskCheckResponse])
@limiter.limit("60/minute")
async def preflight_checks(request: Request, body: PreflightRequest):
    """Run pre-flight safety checks before migration."""
    import httpx
    from .sentinel_service import SentinelService
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        sentinel = SentinelService(client)
        try:
            checks = await sentinel.run_preflight_checks(
                migration_amount=body.capital,
                target_pool_tvl=body.pool_tvl,
                target_chain=body.target_chain,
                protocol_name=body.project,
                risk_score=body.risk_score,
            )
            return [RiskCheckResponse(
                name=c.name,
                status=c.status,
                message=c.message,
                severity=c.severity
            ) for c in checks]
        except Exception as e:
            logger.error(f"Pre-flight checks failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Pre-flight checks failed")

@app.get("/yield/{chain}", response_model=YieldResponse)
@limiter.limit("30/minute")
async def get_current_yield(request: Request, chain: str):
    service = get_service()
    try:
        return await service.get_current_yield(chain)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/price/{chain}")
@limiter.limit("60/minute")
async def get_native_token_price(request: Request, chain: str):
    from .models import Chain
    from urllib.parse import unquote
    service = get_service()
    try:
        decoded_chain = unquote(chain).lower().strip()
        chain_map = {"ethereum": Chain.Ethereum, "eth": Chain.Ethereum, "arbitrum": Chain.Arbitrum, "arb": Chain.Arbitrum, "base": Chain.Base, "optimism": Chain.Optimism, "op": Chain.Optimism, "polygon": Chain.Polygon, "matic": Chain.Polygon, "avalanche": Chain.Avalanche, "avax": Chain.Avalanche, "bnb chain": Chain.BNBChain, "bsc": Chain.BNBChain}
        chain_enum = chain_map.get(decoded_chain)
        if not chain_enum:
            raise HTTPException(status_code=400, detail="Unsupported chain")
        price = await service.get_native_token_price(chain_enum)
        return {"chain": chain, "price_usd": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/pool/{pool_id}/history")
@limiter.limit("30/minute")
async def get_pool_history(request: Request, pool_id: str, days: int = 30):
    """
    Get historical APY data and stability metrics for a pool.
    
    Args:
        pool_id: DefiLlama pool identifier
        days: Number of days to look back (default 30)
    """
    from datetime import datetime, timedelta
    
    service = get_service()
    try:
        # Fetch full history
        history = await service.yield_service.fetch_pool_history(pool_id)
        
        # Filter to requested timeframe
        if history:
            cutoff_timestamp = (datetime.now() - timedelta(days=days)).timestamp()
            recent_history = [
                p for p in history 
                if p.get("timestamp", 0) > cutoff_timestamp
            ]
        else:
            recent_history = []
        
        # Calculate statistics and histogram
        statistics = service.yield_service.calculate_yield_statistics(recent_history)
        histogram = service.yield_service.generate_histogram_bins(recent_history)
        
        return {
            "pool_id": pool_id,
            "days": days,
            "data_points": len(recent_history),
            "statistics": statistics,
            "histogram": histogram,
        }
    except Exception as e:
        logger.error(f"Failed to get pool history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)