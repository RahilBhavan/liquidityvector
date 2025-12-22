"""
Aggregator service for Liquidity Vector API.
Orchestrates yield, gas, and bridge services to perform route analysis.
"""

import logging
import asyncio
from typing import Optional, List, Tuple, Any
import httpx

from .models import (
    Chain, Pool, RouteCalculation, AnalyzeRequest,
    CostBreakdown, CostBreakdownEntry, ChartDataPoint,
    BridgeQuote, BridgeQuoteResult, GasCostEstimate
)
from .yield_service import YieldService
from .gas_service import GasService
from .bridge_service import BridgeService
from .exceptions import ExternalAPIError

logger = logging.getLogger("liquidityvector.aggregator")

# Risk score thresholds for level calculation
RISK_THRESHOLDS = {
    1: 90,  # Excellent: score >= 90
    2: 80,  # Good: score >= 80
    3: 70,  # Moderate: score >= 70
    4: 60,  # Elevated: score >= 60
    5: 0,   # High: score < 60
}

# L2->L1 exit gas multiplier (canonical bridges are slower/costlier)
L2_TO_L1_GAS_MULTIPLIER = 2.5

# Fallback bridge fee as ratio of capital
FALLBACK_BRIDGE_FEE_RATIO = 0.002
FALLBACK_SLIPPAGE_BPS = 50
FALLBACK_DURATION_SEC = 300


class AggregatorService:
    """Orchestrator service for DeFi route analysis."""

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        shared_client = client or httpx.AsyncClient(timeout=10.0)
        self._owns_client = client is None
        self.yield_service = YieldService(shared_client)
        self.gas_service = GasService(shared_client)
        self.bridge_service = BridgeService(shared_client)

    async def close(self) -> None:
        """Close all service connections."""
        await asyncio.gather(
            self.yield_service.close(),
            self.gas_service.close(),
            self.bridge_service.close(),
            return_exceptions=True
        )

    async def fetch_top_pools(self) -> List[dict]:
        """Fetch top yield pools from aggregator."""
        return await self.yield_service.fetch_top_pools()

    async def get_current_yield(self, chain: str) -> dict:
        """Get current market yield for a chain."""
        return await self.yield_service.get_current_yield(chain)

    async def get_native_token_price(self, chain: Chain) -> float:
        """Get native token price for a chain."""
        return await self.gas_service.get_native_token_price(chain)

    async def analyze_route(self, request: AnalyzeRequest) -> RouteCalculation:
        """
        Perform complete route analysis with round-trip costs.

        Parallelizes network calls for optimal performance.
        """
        from .core.economics.costs import calculate_round_trip_costs
        from .core.economics.breakeven import calculate_breakeven
        from .core.economics.profitability import generate_profitability_matrix

        target_chain = self._normalize_chain(request.target_chain)

        # Fetch all external data in parallel
        source_gas, target_gas, entry_quote, exit_quote = await self._fetch_route_data(
            request, target_chain
        )

        # Calculate bridge risk
        bridge_risk = self.bridge_service.get_bridge_risk(
            request.current_chain,
            target_chain.value,
            bridge_name=entry_quote.selected_quote.bridge_name
        )

        # Calculate exit destination gas with L2->L1 adjustment
        exit_dest_gas = self._calculate_exit_gas(
            source_gas.total_cost_usd,
            request.current_chain,
            target_chain
        )

        # Compute round-trip costs
        round_trip = calculate_round_trip_costs(
            entry_bridge_fee=entry_quote.selected_quote.total_fee_usd,
            entry_source_gas=source_gas.total_cost_usd,
            entry_dest_gas=target_gas.total_cost_usd,
            exit_bridge_fee=exit_quote.selected_quote.total_fee_usd,
            exit_source_gas=target_gas.total_cost_usd,
            exit_dest_gas=exit_dest_gas,
            symmetric=False
        )

        # Economic analysis
        total_cost = round_trip.total_round_trip
        breakeven = calculate_breakeven(total_cost, request.capital, request.pool_apy)
        profitability = generate_profitability_matrix(
            request.capital, total_cost, request.pool_apy
        )

        return self._build_route_calculation(
            request=request,
            target_chain=target_chain,
            round_trip=round_trip,
            breakeven=breakeven,
            profitability=profitability,
            bridge_risk=bridge_risk,
            entry_quote=entry_quote
        )

    async def _fetch_route_data(
        self,
        request: AnalyzeRequest,
        target_chain: Chain
    ) -> Tuple[GasCostEstimate, GasCostEstimate, BridgeQuoteResult, BridgeQuoteResult]:
        """Fetch all route data in parallel with proper error handling."""
        tasks = [
            self.gas_service.estimate_gas_cost_v2(
                request.current_chain, request.wallet_address
            ),
            self.gas_service.estimate_gas_cost_v2(
                target_chain, request.wallet_address
            ),
            self.bridge_service.get_bridge_quote_v2(
                request.current_chain, target_chain,
                request.capital, request.wallet_address
            ),
            self.bridge_service.get_bridge_quote_v2(
                target_chain, request.current_chain,
                request.capital, request.wallet_address
            )
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        return self._process_parallel_results(results, request)

    def _normalize_chain(self, chain_str: str) -> Chain:
        """Normalize chain string to Chain enum."""
        chain_lower = chain_str.lower().strip()

        # Handle common aliases
        aliases = {
            "bsc": Chain.BNBChain,
            "bnb chain": Chain.BNBChain,
            "binance": Chain.BNBChain,
            "binance smart chain": Chain.BNBChain,
        }

        if chain_lower in aliases:
            return aliases[chain_lower]

        # Try direct enum match
        try:
            return Chain(chain_str)
        except ValueError:
            pass

        # Try case-insensitive match
        for chain in Chain:
            if chain.value.lower() == chain_lower:
                return chain

        raise ValueError(f"Invalid chain: {chain_str}")

    def _process_parallel_results(
        self,
        results: List[Any],
        request: AnalyzeRequest
    ) -> Tuple[GasCostEstimate, GasCostEstimate, BridgeQuoteResult, BridgeQuoteResult]:
        """Process parallel task results with fallback handling."""
        source_gas: Optional[GasCostEstimate] = None
        target_gas: Optional[GasCostEstimate] = None
        entry_quote: Optional[BridgeQuoteResult] = None
        exit_quote: Optional[BridgeQuoteResult] = None

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"Parallel task {i} failed: {result}")
                if i < 2:
                    # Gas estimation is critical
                    raise ExternalAPIError(f"Gas estimation failed: {result}")
                else:
                    # Bridge quote can use fallback
                    fallback = self._create_fallback_quote(request.capital)
                    if i == 2:
                        entry_quote = fallback
                    else:
                        exit_quote = fallback
            else:
                if i == 0:
                    source_gas = result
                elif i == 1:
                    target_gas = result
                elif i == 2:
                    entry_quote = result
                else:
                    exit_quote = result

        # Ensure all required results are present
        if not all([source_gas, target_gas, entry_quote, exit_quote]):
            raise ExternalAPIError("Incomplete route data")

        return source_gas, target_gas, entry_quote, exit_quote

    def _create_fallback_quote(self, capital: float) -> BridgeQuoteResult:
        """Create a fallback bridge quote when API fails."""
        fallback = BridgeQuote(
            provider="Fallback",
            bridge_name="Estimated",
            total_fee_usd=capital * FALLBACK_BRIDGE_FEE_RATIO,
            min_amount_received=capital * (1 - FALLBACK_BRIDGE_FEE_RATIO),
            estimated_duration_sec=FALLBACK_DURATION_SEC,
            slippage_bps=FALLBACK_SLIPPAGE_BPS
        )
        return BridgeQuoteResult(
            selected_quote=fallback,
            all_quotes=[fallback],
            confidence_score=0.5
        )

    def _calculate_exit_gas(
        self,
        base_gas: float,
        source_chain: Chain,
        target_chain: Chain
    ) -> float:
        """Calculate exit gas with L2->L1 adjustment."""
        if source_chain == Chain.Ethereum and target_chain != Chain.Ethereum:
            return base_gas * L2_TO_L1_GAS_MULTIPLIER
        return base_gas

    def _calculate_risk_level(self, risk_score: int) -> int:
        """Convert risk score to 1-5 level."""
        for level, threshold in RISK_THRESHOLDS.items():
            if risk_score >= threshold:
                return level
        return 5

    def _build_route_calculation(
        self,
        request: AnalyzeRequest,
        target_chain: Chain,
        round_trip,
        breakeven,
        profitability: dict,
        bridge_risk: dict,
        entry_quote: BridgeQuoteResult
    ) -> RouteCalculation:
        """Build the final route calculation response."""
        risk_level = self._calculate_risk_level(bridge_risk["risk_score"])

        return RouteCalculation(
            target_pool=Pool(
                chain=target_chain.value,
                project=request.project,
                symbol=request.token_symbol,
                tvlUsd=request.tvl_usd,
                apy=request.pool_apy,
                pool=request.pool_id
            ),
            bridge_cost=round_trip.entry_bridge_fee,
            gas_cost=round_trip.entry_source_gas + round_trip.entry_dest_gas,
            total_cost=round_trip.total_round_trip,
            breakeven_hours=breakeven.breakeven_hours,
            net_profit_30d=(breakeven.daily_yield_usd * 30) - round_trip.total_round_trip,
            risk_level=risk_level,
            risk_score=bridge_risk["risk_score"],  # Use the actual calculated risk score (0-100)
            bridge_name=entry_quote.selected_quote.bridge_name,
            estimated_time=bridge_risk["estimated_time"],
            has_exploits=bridge_risk["has_exploits"],
            bridge_metadata=bridge_risk["bridge_metadata"],
            daily_yield_usd=breakeven.daily_yield_usd,
            breakeven_days=breakeven.breakeven_days,
            breakeven_chart_data=[
                ChartDataPoint(day=int(p["day"]), profit=p["profit"])
                for p in breakeven.chart_data
            ],
            profitability_matrix=profitability,
            cost_breakdown=CostBreakdown(
                entry=CostBreakdownEntry(
                    bridge_fee=round_trip.entry_bridge_fee,
                    source_gas=round_trip.entry_source_gas,
                    dest_gas=round_trip.entry_dest_gas,
                    total=round_trip.entry_total
                ),
                exit=CostBreakdownEntry(
                    bridge_fee=round_trip.exit_bridge_fee,
                    source_gas=round_trip.exit_source_gas,
                    dest_gas=round_trip.exit_dest_gas,
                    total=round_trip.exit_total
                ),
                round_trip_total=round_trip.total_round_trip
            ),
            risk_warnings=[],
            tvl_source="live"
        )

# Singleton instance
_service: Optional[AggregatorService] = None


def get_service() -> AggregatorService:
    """Get or create the singleton AggregatorService instance."""
    global _service
    if _service is None:
        _service = AggregatorService()
    return _service


async def cleanup_service() -> None:
    """Clean up the singleton service and release resources."""
    global _service
    if _service is not None:
        await _service.close()
        _service = None