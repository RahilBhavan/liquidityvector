import logging
from typing import Optional
from .base_service import BaseService
from .models import Chain, BridgeMetadata, BridgeQuote, BridgeQuoteResult
from .constants import CHAIN_IDS, USDC_ADDRESSES, BRIDGE_OPTIONS
from .exceptions import ExternalAPIError
from .resilience import lifi_breaker, bridge_quote_cache, call_async
from core.risk.scoring import calculate_risk_score
import httpx

logger = logging.getLogger("liquidityvector.bridge_service")

class BridgeService(BaseService):
    """Service for bridge quotes and risk analysis."""

    def __init__(self, client: httpx.AsyncClient):
        super().__init__(client)

    async def get_bridge_quote_v2(self, source: Chain, dest: Chain, amount_usd: float, wallet_address: str) -> BridgeQuoteResult:
        """Fetch bridge quote from Li.Fi."""
        if source == dest:
            quote = BridgeQuote(provider="Native", bridge_name="Local Transfer", total_fee_usd=0.0, min_amount_received=amount_usd, estimated_duration_sec=30, slippage_bps=0)
            return BridgeQuoteResult(selected_quote=quote, all_quotes=[quote], confidence_score=1.0)

        cache_key = f"bridge_{source.value}_{dest.value}_{int(amount_usd)}"
        if cache_key in bridge_quote_cache:
            return BridgeQuoteResult(**bridge_quote_cache[cache_key])

        try:
            async def _fetch():
                resp = await self._client.get(
                    "https://li.quest/v1/quote",
                    params={
                        "fromChain": str(CHAIN_IDS[source]), "toChain": str(CHAIN_IDS[dest]),
                        "fromToken": USDC_ADDRESSES[source], "toToken": USDC_ADDRESSES[dest],
                        "fromAmount": str(int(amount_usd * 1e6)), "fromAddress": wallet_address, "slippage": "0.005"
                    },
                    timeout=10.0
                )
                resp.raise_for_status()
                return resp.json()

            data = await call_async(lifi_breaker, _fetch)
            estimate = data.get("estimate", {})
            from_amt = int(data.get("action", {}).get("fromAmount", amount_usd * 1e6))
            to_amt_min = int(estimate.get("toAmountMin", from_amt))
            
            gas_fee = sum(float(g.get("amountUSD", 0)) for g in estimate.get("gasCosts", []))
            total_fee = max(0, (from_amt - int(estimate.get("toAmount", from_amt))) / 1e6) + gas_fee

            quote = BridgeQuote(
                provider="Li.Fi",
                bridge_name=data.get("toolDetails", {}).get("name", data.get("tool", "Unknown")),
                total_fee_usd=round(total_fee, 2),
                min_amount_received=to_amt_min / 1e6,
                estimated_duration_sec=estimate.get("executionDuration", 300),
                slippage_bps=int(((from_amt - to_amt_min) / from_amt) * 10000) if from_amt > 0 else 50
            )
            res = BridgeQuoteResult(selected_quote=quote, all_quotes=[quote], confidence_score=0.9)
            bridge_quote_cache[cache_key] = res.model_dump()
            return res
        except Exception as e:
            logger.error(f"Li.Fi quote failed: {e}")
            raise ExternalAPIError(f"Failed to get bridge quote: {e}")

    def get_bridge_risk(self, source: Chain, target: str, bridge_name: Optional[str] = None) -> dict:
        """Calculate bridge risk score using the rigorous RiskEngine logic."""
        if source.value == target:
            meta = BridgeMetadata(name="Native", type="Native", age_years=10, tvl=0, has_exploits=False, base_time=0)
            return {"risk_score": 100, "bridge_name": "Native Transfer", "estimated_time": "Instant", "has_exploits": False, "bridge_metadata": meta}

        route_hash = sum(ord(c) for c in f"{source.value}-{target}")
        is_l1 = source == Chain.Ethereum or target == "Ethereum"
        
        # Select bridge metadata
        selected = next((b for b in BRIDGE_OPTIONS if bridge_name and (b.name.lower() in bridge_name.lower() or bridge_name.lower() in b.name.lower())), None)
        if not selected:
            options = [b for b in BRIDGE_OPTIONS if b.tvl > 300 or b.type == "Canonical"] if is_l1 else [b for b in BRIDGE_OPTIONS if b.type != "Canonical"]
            selected = options[route_hash % len(options)]

        # Use the formal Risk Calculation
        # Convert TVL from millions to raw USD for the scoring engine
        risk_breakdown = calculate_risk_score(
            bridge_type=selected.type,
            tvl_usd=selected.tvl * 1_000_000,
            age_years=selected.age_years,
            has_exploits=selected.has_exploits,
            exploit_total_lost=0.0,  # Could be enhanced with actual exploit data
            is_contract_verified=True,  # Assuming major protocols are verified
            source_chain=source.value,
            target_chain=target
        )
        score = risk_breakdown.overall_score

        # Calculate time estimate (keep existing logic for now as it's separate from risk)
        time = selected.base_time + (route_hash % 3) - 1
        if selected.type == "Canonical" and is_l1: time = 15 + (route_hash % 10)

        return {
            "risk_score": score,
            "bridge_name": f"{selected.name} ({selected.type})",
            "estimated_time": f"~{max(1, time)} min",
            "has_exploits": selected.has_exploits,
            "bridge_metadata": selected
        }
