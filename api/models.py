"""
Pydantic models matching frontend TypeScript interfaces.
Uses snake_case for Python/JSON, frontend maps to camelCase.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class Chain(str, Enum):
    """Supported blockchain networks."""
    Ethereum = "Ethereum"
    Arbitrum = "Arbitrum"
    Base = "Base"
    Optimism = "Optimism"
    Polygon = "Polygon"
    Avalanche = "Avalanche"
    BNBChain = "BNB Chain"

    @classmethod
    def from_string(cls, value: str) -> "Chain":
        """Convert string to Chain with alias support."""
        aliases = {
            "bsc": cls.BNBChain,
            "binance": cls.BNBChain,
            "binance smart chain": cls.BNBChain,
        }
        lower_val = value.lower().strip()
        if lower_val in aliases:
            return aliases[lower_val]
        for chain in cls:
            if chain.value.lower() == lower_val:
                return chain
        return cls(value)


class Pool(BaseModel):
    """Yield pool data from aggregators like DefiLlama."""
    chain: str
    project: str
    symbol: str
    tvl_usd: float = Field(alias="tvlUsd")
    apy: float
    pool: str  # Unique identifier

    class Config:
        populate_by_name = True


class ExploitData(BaseModel):
    """Historical exploit information for a bridge."""
    year: int
    amount: str
    description: str
    report_url: str


class BridgeMetadata(BaseModel):
    """Bridge infrastructure details."""
    name: str
    type: str  # Canonical, Intent, LayerZero, Liquidity
    age_years: float
    tvl: float  # In millions
    has_exploits: bool
    base_time: int  # Base bridge time in minutes
    exploit_data: Optional[ExploitData] = None


class CostBreakdownEntry(BaseModel):
    """Cost breakdown for one direction (entry or exit)."""
    bridge_fee: float
    source_gas: float
    dest_gas: float
    total: float


class CostBreakdown(BaseModel):
    """Complete round-trip cost breakdown."""
    entry: CostBreakdownEntry
    exit: CostBreakdownEntry
    round_trip_total: float


class ChartDataPoint(BaseModel):
    """Single data point for breakeven chart."""
    day: int
    profit: float


class RouteCalculation(BaseModel):
    """Complete route analysis result with pre-calculated visualization data."""
    target_pool: Pool
    bridge_cost: float
    gas_cost: float
    total_cost: float  # Now includes round-trip costs
    breakeven_hours: float
    net_profit_30d: float
    risk_level: int  # 1-5 scale
    bridge_name: str
    estimated_time: str
    has_exploits: bool
    bridge_metadata: Optional[BridgeMetadata] = None

    # NEW: Pre-calculated fields for frontend consumption
    # These eliminate the need for frontend to recalculate
    daily_yield_usd: float = 0.0
    breakeven_days: float = 0.0
    breakeven_chart_data: list[ChartDataPoint] = []
    profitability_matrix: dict[str, dict[str, float]] = {}
    cost_breakdown: Optional[CostBreakdown] = None

    # NEW: Risk assessment details
    risk_warnings: list[str] = []
    tvl_source: str = "fallback"  # "live", "cached", or "fallback"


class AnalyzeRequest(BaseModel):
    """Request payload for /analyze endpoint."""
    capital: float = Field(..., gt=0, description="Capital must be positive")
    current_chain: Chain
    target_chain: str
    pool_id: str
    pool_apy: float = Field(..., ge=0, description="APY cannot be negative")
    project: str
    token_symbol: str
    tvl_usd: float
    wallet_address: str  # Required for accurate bridge quotes


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str


# === NEW: Production-grade cost estimation models ===

class GasCostEstimate(BaseModel):
    """Deterministic gas cost estimate using EIP-1559 fee data."""
    estimated_gas_limit: int
    base_fee_gwei: float
    priority_fee_gwei: float
    max_fee_per_gas_gwei: float
    total_cost_usd: float
    native_token_price_usd: float
    confidence_score: float  # 0.0-1.0
    error_bound_usd: float


class BridgeQuote(BaseModel):
    """Single bridge quote from an aggregator."""
    provider: str  # "Li.Fi", "Socket", "Across"
    bridge_name: str  # "Stargate", "Hop", etc.
    total_fee_usd: float
    min_amount_received: float
    estimated_duration_sec: int
    slippage_bps: int  # Basis points (100 = 1%)


class BridgeQuoteResult(BaseModel):
    """Aggregated bridge quote result with all options."""
    selected_quote: BridgeQuote
    all_quotes: list[BridgeQuote]
    confidence_score: float  # Based on quote variance


class YieldResponse(BaseModel):
    """Current yield data for a chain."""
    current_yield: float
    chain: str
    source: str  # "market_average" or "fallback"
