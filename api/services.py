"""
Core business logic for the Liquidity Vector API.
Aggregates yield data, calculates gas costs, and simulates bridge routes.
"""

import logging
import httpx
from typing import Optional
from .models import (
    Chain, Pool, BridgeMetadata, ExploitData,
    RouteCalculation, AnalyzeRequest
)
from .resilience import (
    defillama_breaker,
    rpc_breaker,
    lifi_breaker,
    coingecko_breaker,
    gas_price_cache,
    fee_history_cache,
    native_price_cache,
    bridge_quote_cache,
    CircuitBreakerError,
    RateLimitError,
    call_async,
)
from .models import GasCostEstimate, BridgeQuote, BridgeQuoteResult

logger = logging.getLogger("liquidityvector.services")

# --- Custom Exceptions ---
class AnalysisError(Exception):
    """Base exception for analysis failures."""
    pass

class BridgeRouteError(AnalysisError):
    """Raised when a bridge route cannot be found or is invalid."""
    pass

class InsufficientLiquidityError(BridgeRouteError):
    """Raised when the target bridge has insufficient liquidity."""
    pass

class ExternalAPIError(AnalysisError):
    """Raised when an external API (Li.Fi, RPC) fails."""
    pass

# Chain ID mappings for external APIs
CHAIN_IDS = {
    Chain.Ethereum: 1,
    Chain.Arbitrum: 42161,
    Chain.Base: 8453,
    Chain.Optimism: 10,
    Chain.Polygon: 137,
    Chain.Avalanche: 43114,
    Chain.BNBChain: 56,
}

# CoinGecko token IDs for native tokens
NATIVE_TOKEN_IDS = {
    Chain.Ethereum: "ethereum",
    Chain.Arbitrum: "ethereum",      # Uses ETH
    Chain.Base: "ethereum",          # Uses ETH
    Chain.Optimism: "ethereum",      # Uses ETH
    Chain.Polygon: "matic-network",
    Chain.Avalanche: "avalanche-2",
    Chain.BNBChain: "binancecoin",
}

# USDC contract addresses per chain (for bridge quotes)
USDC_ADDRESSES = {
    Chain.Ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    Chain.Arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    Chain.Base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    Chain.Optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    Chain.Polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    Chain.Avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    Chain.BNBChain: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
}


# RPC endpoints for gas price fetching
RPC_URLS = {
    Chain.Ethereum: "https://eth.llamarpc.com",
    Chain.Arbitrum: "https://arb1.arbitrum.io/rpc",
    Chain.Base: "https://mainnet.base.org",
    Chain.Optimism: "https://mainnet.optimism.io",
    Chain.Polygon: "https://polygon-rpc.com",
    Chain.Avalanche: "https://api.avax.network/ext/bc/C/rpc",
    Chain.BNBChain: "https://bsc-dataseed.binance.org",
}

# Gas limits per chain for typical DeFi interactions (approval + deposit)
BASE_GAS_LIMITS = {
    Chain.Ethereum: 220_000,
    Chain.Arbitrum: 600_000,
    Chain.Base: 350_000,
    Chain.Optimism: 400_000,
    Chain.Polygon: 300_000,
    Chain.Avalanche: 250_000,
    Chain.BNBChain: 200_000,
}

# Bridge protocol metadata with security profiles
BRIDGE_OPTIONS: list[BridgeMetadata] = [
    BridgeMetadata(
        name="Stargate",
        type="LayerZero",
        age_years=2.5,
        tvl=450,
        has_exploits=False,
        base_time=2
    ),
    BridgeMetadata(
        name="Across",
        type="Intent",
        age_years=1.5,
        tvl=200,
        has_exploits=False,
        base_time=1
    ),
    BridgeMetadata(
        name="Hop",
        type="Liquidity",
        age_years=3.5,
        tvl=65,
        has_exploits=False,
        base_time=10
    ),
    BridgeMetadata(
        name="Synapse",
        type="Liquidity",
        age_years=2.8,
        tvl=110,
        has_exploits=True,
        base_time=4,
        exploit_data=ExploitData(
            year=2021,
            amount="$8M",
            description="Vulnerability in AMM pool logic allowing skewed trades.",
            report_url="https://rekt.news/"
        )
    ),
    BridgeMetadata(
        name="Native Bridge",
        type="Canonical",
        age_years=4.0,
        tvl=5000,
        has_exploits=False,
        base_time=20
    ),
]

class AggregatorService:
    """Service for aggregating DeFi data and calculating optimal routes."""

    def __init__(self):
        self._client = httpx.AsyncClient(timeout=10.0)

    async def close(self):
        await self._client.aclose()

    async def fetch_top_pools(self) -> list[dict]:
        """Fetch top USDC pools from DefiLlama yields API with circuit breaker protection."""
        try:
            # Circuit breaker protected API call using call_async for async functions
            async def _fetch_from_api():
                response = await self._client.get(
                    "https://yields.llama.fi/pools",
                    timeout=5.0  # Explicit timeout for this call
                )
                response.raise_for_status()
                return response.json()

            data = await call_async(defillama_breaker, _fetch_from_api)

            # Filter: USDC, supported chains, TVL > 10M, APY > 0
            # Note: DefiLlama uses "BSC" but our Chain enum uses "BNB Chain"
            supported_chains = ("Ethereum", "Arbitrum", "Base", "Optimism", "Polygon", "Avalanche", "BSC", "BNB Chain")
            filtered = [
                p for p in data.get("data", [])
                if p.get("symbol") == "USDC"
                and p.get("chain") in supported_chains
                and p.get("tvlUsd", 0) > 10_000_000
                and p.get("apy", 0) > 0
            ]

            # Sort by APY descending
            sorted_pools = sorted(filtered, key=lambda x: x.get("apy", 0), reverse=True)

            # Get top 3 per chain
            result = []
            # Normalize chain names - DefiLlama uses "BSC" but we use "BNB Chain"
            counts = {"Ethereum": 0, "Arbitrum": 0, "Base": 0, "Optimism": 0, "Polygon": 0, "Avalanche": 0, "BSC": 0, "BNB Chain": 0}

            for pool in sorted_pools:
                chain = pool.get("chain")
                # Normalize "BSC" to "BNB Chain" for consistency
                if chain == "BSC":
                    chain = "BNB Chain"
                
                if counts.get(chain, 0) < 3:
                    result.append({
                        "chain": chain,
                        "project": pool.get("project"),
                        "symbol": pool.get("symbol"),
                        "tvlUsd": pool.get("tvlUsd"),
                        "apy": pool.get("apy"),
                        "pool": pool.get("pool")
                    })
                    counts[chain] = counts.get(chain, 0) + 1

            logger.info(f"Fetched {len(result)} pools from DefiLlama")
            if not result:
                raise ValueError("No USDC pools found matching criteria")
            return result

        except CircuitBreakerError:
            logger.error("DefiLlama circuit breaker OPEN - service unavailable")
            raise RuntimeError("DefiLlama API unavailable - circuit breaker open")
        except Exception as e:
            logger.error(f"DefiLlama API error: {e}")
            raise RuntimeError(f"Failed to fetch pools from DefiLlama: {e}")

    async def get_current_yield(self, chain: str) -> dict:
        """
        Fetch market average yield for a chain from top pools.

        Returns the average APY across all USDC pools on the specified chain.
        """
        try:
            pools = await self.fetch_top_pools()
            # Filter pools for the specified chain (case-insensitive)
            chain_pools = [p for p in pools if p.get('chain', '').lower() == chain.lower()]

            if chain_pools:
                avg_yield = sum(p.get('apy', 0) for p in chain_pools) / len(chain_pools)
                logger.info(f"Calculated average yield for {chain}: {avg_yield:.2f}%")
                return {
                    "current_yield": round(avg_yield, 2),
                    "chain": chain,
                    "source": "market_average"
                }

            logger.warning(f"No pools found for chain {chain}, returning 0")
            return {
                "current_yield": 0.0,
                "chain": chain,
                "source": "fallback"
            }
        except Exception as e:
            logger.error(f"Failed to get current yield for {chain}: {e}")
            raise RuntimeError(f"Failed to get current yield for {chain}: {e}")

    async def get_gas_price(self, chain: Chain) -> float:
        """Fetch current gas price from chain RPC with caching and circuit breaker."""
        # Check cache first to reduce RPC calls
        cache_key = f"gas_{chain.value}"
        if cache_key in gas_price_cache:
            logger.debug(f"Gas price cache hit for {chain.value}")
            return gas_price_cache[cache_key]

        try:
            # Circuit breaker protected RPC call using call_async for async functions
            async def _fetch_gas_price():
                response = await self._client.post(
                    RPC_URLS[chain],
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_gasPrice",
                        "params": [],
                        "id": 1
                    },
                    timeout=3.0  # Short timeout for RPC calls
                )
                data = response.json()
                if "error" in data:
                    raise ValueError(f"RPC error: {data['error']}")
                wei = int(data.get("result", "0x0"), 16)
                return wei / 1e9  # Convert to Gwei

            price = await call_async(rpc_breaker, _fetch_gas_price)
            gas_price_cache[cache_key] = price  # Cache for 30 seconds
            logger.debug(f"Gas price for {chain.value}: {price:.2f} Gwei (cached)")
            return price

        except CircuitBreakerError:
            logger.error(f"RPC circuit breaker OPEN for {chain.value}")
            raise RuntimeError(f"RPC unavailable for {chain.value} - circuit breaker open")
        except Exception as e:
            logger.error(f"Gas price fetch failed for {chain.value}: {e}")
            raise RuntimeError(f"Failed to fetch gas price for {chain.value}: {e}")

    async def _get_native_token_price(self, chain: Chain) -> float:
        """
        Fetch native token price from CoinGecko with caching and exponential backoff for rate limits.
        """
        import asyncio
        import random

        token_id = NATIVE_TOKEN_IDS.get(chain, "ethereum")
        cache_key = f"price_{token_id}"

        # Check cache first
        cached_price = native_price_cache.get(cache_key)
        if cached_price:
            return cached_price

        max_retries = 3
        base_delay = 1  # seconds

        for attempt in range(max_retries):
            try:
                # Circuit breaker protected call
                async def _fetch_price():
                    response = await self._client.get(
                        "https://api.coingecko.com/api/v3/simple/price",
                        params={"ids": token_id, "vs_currencies": "usd"},
                        timeout=5.0
                    )
                    if response.status_code == 429:
                        raise RateLimitError("CoinGecko rate limit exceeded")
                    response.raise_for_status()
                    data = response.json()
                    # Add robust validation
                    if not isinstance(data, dict) or token_id not in data or "usd" not in data[token_id]:
                        raise ValueError(f"Invalid response format for {token_id}")
                    price = data[token_id]["usd"]
                    if not isinstance(price, (int, float)) or price <= 0:
                        raise ValueError(f"Invalid price value for {token_id}: {price}")
                    return price

                price = await call_async(coingecko_breaker, _fetch_price)

                # Cache and return on success
                native_price_cache[cache_key] = price
                if token_id == "ethereum":
                    for eth_chain in [Chain.Ethereum, Chain.Arbitrum, Chain.Base, Chain.Optimism]:
                        native_price_cache[f"price_{NATIVE_TOKEN_IDS[eth_chain]}"] = price
                
                logger.debug(f"Fetched native token price for {token_id}: ${price}")
                return price

            except RateLimitError as e:
                if attempt < max_retries - 1:
                    delay = (base_delay * 2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Rate limited on attempt {attempt + 1}. Retrying in {delay:.2f}s...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All retries failed for {token_id} due to rate limiting.")
                    # Fallthrough to use fallback logic
                    break
            
            except CircuitBreakerError as e:
                logger.error(f"CoinGecko circuit breaker is open for {token_id}.")
                # Fallthrough to use fallback logic
                break

            except Exception as e:
                logger.error(f"Failed to fetch {token_id} price: {e}")
                # Fallthrough to use fallback logic
                break
        
        # Fallback logic if all retries/attempts fail
        logger.warning(f"Using fallback for {token_id} price.")
        if cached_price:
            return cached_price
        
        fallback_prices = { "ethereum": 2500.0, "matic-network": 0.8, "avalanche-2": 35.0, "binancecoin": 300.0 }
        return fallback_prices.get(token_id, 100.0)


    async def _fetch_fee_history(self, chain: Chain) -> dict:
        """Fetch EIP-1559 fee history for base fee prediction."""
        cache_key = f"fee_history_{chain.value}"

        if cache_key in fee_history_cache:
            return fee_history_cache[cache_key]

        try:
            # Circuit breaker protected call using call_async for async functions
            async def _fetch():
                response = await self._client.post(
                    RPC_URLS[chain],
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_feeHistory",
                        "params": ["0x5", "latest", [25, 50, 75]],  # Last 5 blocks
                        "id": 1
                    },
                    timeout=3.0
                )
                data = response.json()
                if "error" in data:
                    raise ValueError(f"RPC error: {data['error']}")
                return data.get("result", {})

            result = await call_async(rpc_breaker, _fetch)
            fee_history_cache[cache_key] = result
            return result

        except Exception as e:
            logger.warning(f"Fee history fetch failed for {chain.value}: {e}")
            return {}

    def _calculate_base_fee_prediction(self, fee_history: dict) -> float:
        """Calculate predicted base fee using EMA of historical data."""
        base_fees_hex = fee_history.get("baseFeePerGas", [])
        if not base_fees_hex:
            return 25.0 * 1e9  # Fallback 25 Gwei in wei

        # Convert hex to int and calculate EMA
        base_fees = [int(bf, 16) for bf in base_fees_hex if bf]
        if not base_fees:
            return 25.0 * 1e9

        # Simple EMA with alpha=0.5
        ema = base_fees[0]
        alpha = 0.5
        for fee in base_fees[1:]:
            ema = alpha * fee + (1 - alpha) * ema

        return ema

    def _calculate_priority_fee(self, fee_history: dict) -> float:
        """Calculate priority fee from historical percentiles (p50)."""
        reward = fee_history.get("reward", [])
        if not reward:
            return 1.5 * 1e9  # Fallback 1.5 Gwei in wei

        # Use median (index 1 = 50th percentile) from each block
        p50_fees = []
        for block_rewards in reward:
            if len(block_rewards) > 1:
                p50_fees.append(int(block_rewards[1], 16))

        if not p50_fees:
            return 1.5 * 1e9

        # Return median of p50s
        p50_fees.sort()
        return p50_fees[len(p50_fees) // 2]

    async def estimate_gas_cost_v2(self, chain: Chain, wallet_address: Optional[str] = None) -> GasCostEstimate:
        """
        Production-grade gas cost estimation using EIP-1559 fee data and dynamic simulation.

        DETERMINISTIC: No random multipliers. Uses fixed 10% safety buffer for price.
        DYNAMIC: Attempts to simulate real transaction gas usage via eth_estimateGas.
        """
        # Parallelize fee history and token price fetching
        import asyncio
        fee_history_task = self._fetch_fee_history(chain)
        native_price_task = self._get_native_token_price(chain)
        
        fee_history, native_price = await asyncio.gather(fee_history_task, native_price_task)

        # Calculate base fee prediction (EMA)
        base_fee_wei = self._calculate_base_fee_prediction(fee_history)

        # Calculate priority fee (p50)
        priority_fee_wei = self._calculate_priority_fee(fee_history)

        # DETERMINISTIC 10% safety buffer (NOT random)
        SAFETY_BUFFER = 1.10
        max_fee_wei = (base_fee_wei + priority_fee_wei) * SAFETY_BUFFER

        # --- Dynamic Gas Limit Estimation ---
        # Default to hardcoded limit
        gas_limit = BASE_GAS_LIMITS.get(chain, 200_000)
        
        # Try to estimate dynamically if USDC address is known
        usdc_address = USDC_ADDRESSES.get(chain)
        if usdc_address:
            try:
                # Construct a standard ERC20 Approve transaction
                # Selector: 0x095ea7b3 (approve(address,uint256))
                # Spender: Random address (0x...dead)
                # Amount: Max uint
                spender = "0x000000000000000000000000000000000000dead"
                data_payload = (
                    "0x095ea7b3" + 
                    spender[2:].zfill(64) + 
                    "f" * 64
                )
                
                # Use provided wallet or a safe default "from" address
                from_addr = wallet_address if wallet_address else "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"

                async def _estimate_rpc():
                    response = await self._client.post(
                        RPC_URLS[chain],
                        json={
                            "jsonrpc": "2.0",
                            "method": "eth_estimateGas",
                            "params": [{
                                "from": from_addr,
                                "to": usdc_address,
                                "data": data_payload
                            }],
                            "id": 1
                        },
                        timeout=2.0
                    )
                    data = response.json()
                    if "error" in data:
                        raise ValueError(f"RPC error: {data['error']}")
                    return int(data.get("result", "0x0"), 16)

                # Call with circuit breaker
                approval_gas = await call_async(rpc_breaker, _estimate_rpc)
                
                if approval_gas > 0:
                    # Heuristic: DeFi Interaction (Deposit) ~= 3-4x Approval cost
                    # This scales automatically with the chain's gas counting logic
                    dynamic_limit = int(approval_gas * 4)
                    
                    # Sanity check: Don't let it drift too far from baseline
                    # Accept if within 50% - 300% of baseline, otherwise clamp
                    if dynamic_limit > gas_limit * 3:
                         gas_limit = gas_limit * 3
                    elif dynamic_limit < gas_limit * 0.5:
                         gas_limit = int(gas_limit * 0.5)
                    else:
                         gas_limit = dynamic_limit
                    
                    logger.debug(f"Dynamic gas estimation for {chain.value}: {approval_gas} (approve) -> {gas_limit} (total)")
            
            except Exception as e:
                logger.debug(f"Dynamic gas estimation failed for {chain.value} (using fallback): {e}")

        # Calculate total cost in wei
        total_cost_wei = gas_limit * max_fee_wei

        # Convert to USD
        total_cost_usd = (total_cost_wei / 1e18) * native_price

        # Calculate confidence based on fee volatility
        base_fees_hex = fee_history.get("baseFeePerGas", [])
        if len(base_fees_hex) >= 2:
            base_fees = [int(bf, 16) for bf in base_fees_hex if bf]
            if base_fees:
                avg = sum(base_fees) / len(base_fees)
                variance = sum((f - avg) ** 2 for f in base_fees) / len(base_fees)
                std_dev = variance ** 0.5
                volatility_pct = (std_dev / avg) * 100 if avg > 0 else 0
                confidence = max(0.5, min(0.99, 1.0 - (volatility_pct / 50)))
            else:
                confidence = 0.7
        else:
            confidence = 0.7  # Lower confidence without history

        error_bound = total_cost_usd * (1 - confidence)

        return GasCostEstimate(
            estimated_gas_limit=gas_limit,
            base_fee_gwei=base_fee_wei / 1e9,
            priority_fee_gwei=priority_fee_wei / 1e9,
            max_fee_per_gas_gwei=max_fee_wei / 1e9,
            total_cost_usd=total_cost_usd,
            native_token_price_usd=native_price,
            confidence_score=confidence,
            error_bound_usd=error_bound
        )

    async def get_bridge_quote_v2(
        self,
        source: Chain,
        dest: Chain,
        amount_usd: float,
        wallet_address: str
    ) -> BridgeQuoteResult:
        """
        Production bridge quote using Li.Fi aggregator API.

        Requires a valid wallet address for accurate quote estimation.
        Fetches real quotes with actual fees, slippage, and execution times.
        """
        if not wallet_address or wallet_address == "0x0000000000000000000000000000000000000000":
            raise ValueError("Valid wallet address required for bridge quote")
        # Handle same-chain transfers (no bridge needed)
        if source == dest:
            logger.info("Same-chain transfer detected, skipping Li.Fi quote.")
            quote = BridgeQuote(
                provider="Native",
                bridge_name="Local Transfer",
                total_fee_usd=0.0,
                min_amount_received=amount_usd,
                estimated_duration_sec=30,  # ~2 blocks
                slippage_bps=0
            )
            return BridgeQuoteResult(
                selected_quote=quote,
                all_quotes=[quote],
                confidence_score=1.0
            )

        # Check cache first
        cache_key = f"bridge_{source.value}_{dest.value}_{int(amount_usd)}"
        if cache_key in bridge_quote_cache:
            cached = bridge_quote_cache[cache_key]
            return BridgeQuoteResult(**cached)

        # Convert USD to USDC amount (6 decimals)
        amount_wei = int(amount_usd * 1e6)

        try:
            # Circuit breaker protected call using call_async for async functions
            async def _fetch_lifi_quote():
                response = await self._client.get(
                    "https://li.quest/v1/quote",
                    params={
                        "fromChain": str(CHAIN_IDS[source]),
                        "toChain": str(CHAIN_IDS[dest]),
                        "fromToken": USDC_ADDRESSES[source],
                        "toToken": USDC_ADDRESSES[dest],
                        "fromAmount": str(amount_wei),
                        "fromAddress": wallet_address,
                        "slippage": "0.005",  # 0.5% max slippage
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()

            data = await call_async(lifi_breaker, _fetch_lifi_quote)

            # Parse Li.Fi response
            estimate = data.get("estimate", {})
            tool_data = data.get("toolDetails", {})

            # Calculate fees from estimate
            from_amount = int(data.get("action", {}).get("fromAmount", amount_wei))
            to_amount = int(estimate.get("toAmount", from_amount))
            to_amount_min = int(estimate.get("toAmountMin", to_amount))

            # Fee = difference between from and to (in USD)
            fee_in_token = (from_amount - to_amount) / 1e6
            total_fee_usd = max(0, fee_in_token)

            # Gas costs from estimate
            gas_costs = estimate.get("gasCosts", [])
            gas_fee_usd = sum(float(g.get("amountUSD", 0)) for g in gas_costs)
            total_fee_usd += gas_fee_usd

            # Slippage in basis points
            if from_amount > 0:
                slippage_bps = int(((from_amount - to_amount_min) / from_amount) * 10000)
            else:
                slippage_bps = 50  # Default 0.5%

            # Execution time
            execution_duration = estimate.get("executionDuration", 300)

            quote = BridgeQuote(
                provider="Li.Fi",
                bridge_name=tool_data.get("name", data.get("tool", "Unknown")),
                total_fee_usd=round(total_fee_usd, 2),
                min_amount_received=to_amount_min / 1e6,  # Convert back to USD
                estimated_duration_sec=execution_duration,
                slippage_bps=slippage_bps
            )

            result = BridgeQuoteResult(
                selected_quote=quote,
                all_quotes=[quote],
                confidence_score=0.90  # High confidence with live data
            )

            # Cache the result
            bridge_quote_cache[cache_key] = result.model_dump()
            logger.info(f"Li.Fi quote: {source.value} -> {dest.value}, fee: ${total_fee_usd:.2f}")

            return result

        except CircuitBreakerError:
            logger.error("Li.Fi circuit breaker OPEN")
            raise ExternalAPIError("Li.Fi bridge aggregator unavailable - circuit breaker open")
        except httpx.HTTPStatusError as e:
            logger.error(f"Li.Fi API error: {e}")
            if e.response.status_code == 400 or e.response.status_code == 422:
                # Often implies no route found or insufficient liquidity
                raise InsufficientLiquidityError(
                    f"No valid route found from {source.value} to {dest.value} for ${amount_usd}. "
                    "This often indicates insufficient liquidity or high slippage on the bridge."
                )
            elif e.response.status_code == 429:
                raise ExternalAPIError("Rate limit exceeded for bridge quote API.")
            else:
                raise BridgeRouteError(f"Bridge quote failed: {e.response.text}")
        except Exception as e:
            logger.error(f"Li.Fi quote failed: {e}")
            raise BridgeRouteError(f"Failed to get bridge quote from Li.Fi: {str(e)}")

    def get_bridge_risk(self, source: Chain, target: str, bridge_name: Optional[str] = None) -> dict:
        """Calculate bridge risk score and select appropriate bridge."""
        if source.value == target:
            native_meta = BridgeMetadata(
                name="Native",
                type="Native",
                age_years=10,
                tvl=0,
                has_exploits=False,
                base_time=0
            )
            return {
                "risk_score": 100,
                "bridge_name": "Native Transfer",
                "estimated_time": "Instant",
                "has_exploits": False,
                "bridge_metadata": native_meta
            }

        selected_bridge = None
        
        # Calculate route hash and L1 involvement (needed for later calculations)
        route_string = f"{source.value}-{target}"
        route_hash = sum(ord(c) for c in route_string)
        is_l1_involved = source == Chain.Ethereum or target == "Ethereum"
        
        # If a specific bridge is requested (e.g. from Li.Fi quote), try to find it
        if bridge_name:
            # Normalize name for matching
            name_lower = bridge_name.lower()
            # simple fuzzy match or direct check
            for b in BRIDGE_OPTIONS:
                if b.name.lower() in name_lower or name_lower in b.name.lower():
                    selected_bridge = b
                    break
        
        # Fallback: Deterministic selection based on route hash if not found or not provided
        if not selected_bridge:
            if bridge_name:
                logger.warning(f"Bridge '{bridge_name}' not found in metadata database. Using generic fallback.")

            if is_l1_involved:
                # L1 moves use high-TVL or canonical bridges
                l1_options = [b for b in BRIDGE_OPTIONS if b.tvl > 300 or b.type == "Canonical"]
                selected_bridge = l1_options[route_hash % len(l1_options)]
            else:
                # L2-L2 prioritizes speed
                l2_options = [b for b in BRIDGE_OPTIONS if b.type != "Canonical"]
                selected_bridge = l2_options[route_hash % len(l2_options)]

        # Dynamic risk scoring
        score = 0

        # Factor A: Bridge architecture baseline
        type_scores = {
            "Canonical": 95,
            "Intent": 88,
            "LayerZero": 85,
            "Liquidity": 78
        }
        score = type_scores.get(selected_bridge.type, 75)

        # Factor B: Protocol maturity (Lindy effect)
        age_bonus = min(selected_bridge.age_years * 2, 10)
        score += age_bonus

        # Factor C: TVL
        if selected_bridge.tvl > 1000:
            score += 4
        elif selected_bridge.tvl < 100:
            score -= 8

        # Factor D: Historical security incidents
        if selected_bridge.has_exploits:
            score -= 20

        # Factor E: Chain environment
        if target == "Base" or source == Chain.Base:
            score -= 4

        # Factor F: Network jitter simulation
        jitter = (route_hash % 5) - 2  # Range: -2 to +2
        score += jitter

        # Clamp score
        score = max(1, min(99, round(score)))

        # Dynamic time estimation
        time = selected_bridge.base_time
        if selected_bridge.type == "Canonical" and is_l1_involved:
            time = 15 + (route_hash % 10)
        else:
            time = max(1, time + (route_hash % 3) - 1)

        return {
            "risk_score": score,
            "bridge_name": f"{selected_bridge.name} ({selected_bridge.type})",
            "estimated_time": f"~{time} min",
            "has_exploits": selected_bridge.has_exploits,
            "bridge_metadata": selected_bridge
        }

    def _score_to_risk_level(self, score: int) -> int:
        """Convert 0-100 risk score to 1-5 risk level (inverted - lower is safer)."""
        if score >= 90:
            return 1
        elif score >= 80:
            return 2
        elif score >= 70:
            return 3
        elif score >= 60:
            return 4
        else:
            return 5

    async def analyze_route(self, request: AnalyzeRequest) -> RouteCalculation:
        """
        Perform complete route analysis with ROUND-TRIP costs.

        Uses:
        - Core library for breakeven and profitability calculations
        - estimate_gas_cost_v2() for deterministic EIP-1559 gas estimation
        - get_bridge_quote_v2() for real Li.Fi bridge quotes
        - Round-trip cost calculation (entry + exit)
        """
        # Import core library functions
        from core.economics.costs import calculate_round_trip_costs
        from core.economics.breakeven import calculate_breakeven
        from core.economics.profitability import generate_profitability_matrix

        # Normalize target chain string (handle BSC alias)
        target_chain_str = request.target_chain
        if target_chain_str.upper() == "BSC" or target_chain_str.lower() == "bsc":
            target_chain_str = "BNB Chain"
        
        try:
            target_chain_enum = Chain(target_chain_str)
        except ValueError:
            # Try to find matching chain by case-insensitive comparison
            chain_map = {
                "ethereum": Chain.Ethereum,
                "arbitrum": Chain.Arbitrum,
                "base": Chain.Base,
                "optimism": Chain.Optimism,
                "polygon": Chain.Polygon,
                "avalanche": Chain.Avalanche,
                "bnb chain": Chain.BNBChain,
                "bsc": Chain.BNBChain,
            }
            target_chain_enum = chain_map.get(target_chain_str.lower())
            if not target_chain_enum:
                raise ValueError(f"'{request.target_chain}' is not a valid Chain. Supported chains: {', '.join([c.value for c in Chain])}")

        # Parallelize gas estimation for both chains
        import asyncio
        source_gas_task = self.estimate_gas_cost_v2(request.current_chain, request.wallet_address)
        target_gas_task = self.estimate_gas_cost_v2(target_chain_enum, request.wallet_address)
        
        # Parallelize bridge quotes for both entry and return legs
        entry_quote_task = self.get_bridge_quote_v2(
            request.current_chain,
            target_chain_enum,
            request.capital,
            request.wallet_address
        )
        exit_quote_task = self.get_bridge_quote_v2(
            target_chain_enum,
            request.current_chain,
            request.capital,
            request.wallet_address
        )

        # Execute all high-latency network tasks in parallel with individual error handling
        # Use return_exceptions=True to handle individual failures gracefully
        results = await asyncio.gather(
            source_gas_task, target_gas_task, entry_quote_task, exit_quote_task,
            return_exceptions=True
        )
        
        source_gas_estimate, target_gas_estimate, bridge_quote_result, exit_quote_result = results
        
        # Handle individual failures with fallbacks
        if isinstance(source_gas_estimate, Exception):
            logger.warning(f"Source gas estimation failed: {source_gas_estimate}, using fallback")
            try:
                source_gas_estimate = await self.estimate_gas_cost_v2(request.current_chain, request.wallet_address)
            except Exception as e:
                logger.error(f"Source gas fallback also failed: {e}")
                raise ExternalAPIError(f"Failed to estimate gas costs: {e}")
        
        if isinstance(target_gas_estimate, Exception):
            logger.warning(f"Target gas estimation failed: {target_gas_estimate}, using fallback")
            try:
                target_gas_estimate = await self.estimate_gas_cost_v2(target_chain_enum, request.wallet_address)
            except Exception as e:
                logger.error(f"Target gas fallback also failed: {e}")
                raise ExternalAPIError(f"Failed to estimate gas costs: {e}")
        
        if isinstance(bridge_quote_result, Exception):
            logger.warning(f"Entry bridge quote failed: {bridge_quote_result}, using fallback")
            try:
                bridge_quote_result = await self.get_bridge_quote_v2(
                    request.current_chain,
                    target_chain_enum,
                    request.capital,
                    request.wallet_address
                )
            except Exception as e:
                logger.error(f"Entry bridge quote fallback also failed: {e}")
                # If Li.Fi is unavailable, create a fallback quote
                if isinstance(e, (ExternalAPIError, CircuitBreakerError)):
                    logger.warning("Li.Fi unavailable, using estimated fallback bridge quote")
                    from .models import BridgeQuote, BridgeQuoteResult
                    fallback_quote = BridgeQuote(
                        provider="Fallback",
                        bridge_name="Estimated Bridge",
                        total_fee_usd=request.capital * 0.001,  # 0.1% estimated fee
                        min_amount_received=request.capital * 0.999,
                        estimated_duration_sec=300,
                        slippage_bps=50
                    )
                    bridge_quote_result = BridgeQuoteResult(
                        selected_quote=fallback_quote,
                        all_quotes=[fallback_quote],
                        confidence_score=0.5
                    )
                else:
                    raise BridgeRouteError(f"Failed to get bridge quote: {e}")
        
        bridge_quote = bridge_quote_result.selected_quote
        
        # Handle exit quote with fallback
        if isinstance(exit_quote_result, Exception):
            logger.warning(f"Exit bridge quote failed: {exit_quote_result}, using entry quote as fallback")
            exit_bridge_fee = bridge_quote.total_fee_usd
        else:
            exit_bridge_fee = exit_quote_result.selected_quote.total_fee_usd
        
        logger.debug(f"Parallel analysis complete. Exit bridge fee: ${exit_bridge_fee:.2f}")

        # Get bridge risk assessment (for metadata and risk scoring)
        # Pass the actual bridge name from the quote to ensure risk score matches the route
        bridge_risk = self.get_bridge_risk(
            request.current_chain, 
            request.target_chain, 
            bridge_name=bridge_quote.bridge_name
        )

        # L2 -> L1 Surcharge: Withdrawals to Ethereum L1 are significantly more expensive
        # than bridging from L1 to L2 due to finalization costs.
        exit_dest_gas = source_gas_estimate.total_cost_usd
        if request.current_chain == Chain.Ethereum and target_chain_enum != Chain.Ethereum:
            # 2.5x multiplier for L1 finalization/claim gas costs
            exit_dest_gas *= 2.5
            logger.debug(f"Applied 2.5x L2->L1 withdrawal surcharge: ${exit_dest_gas:.2f}")

        # Calculate ROUND-TRIP costs using core library
        round_trip = calculate_round_trip_costs(
            entry_bridge_fee=bridge_quote.total_fee_usd,
            entry_source_gas=source_gas_estimate.total_cost_usd,
            entry_dest_gas=target_gas_estimate.total_cost_usd,
            exit_bridge_fee=exit_bridge_fee,
            exit_source_gas=target_gas_estimate.total_cost_usd,
            exit_dest_gas=exit_dest_gas,
            symmetric=False  # Use explicitly calculated exit costs
        )

        # Total cost now includes BOTH entry and exit
        total_cost = round_trip.total_round_trip

        # Calculate breakeven using core library (with pre-generated chart data)
        breakeven_result = calculate_breakeven(
            total_cost=total_cost,
            capital=request.capital,
            target_apy=request.pool_apy,
            timeframe_days=90
        )

        # Generate profitability matrix for Heatmap
        profitability_matrix = generate_profitability_matrix(
            base_capital=request.capital,
            total_cost=total_cost,
            target_apy=request.pool_apy
        )

        # 30-day net profit (using round-trip costs)
        net_profit_30d = (breakeven_result.daily_yield_usd * 30) - total_cost

        # Build target pool object
        target_pool = Pool(
            chain=request.target_chain,
            project=request.project,
            symbol=request.token_symbol,
            tvlUsd=request.tvl_usd,
            apy=request.pool_apy,
            pool=request.pool_id
        )

        # Convert risk score to risk level
        risk_level = self._score_to_risk_level(bridge_risk["risk_score"])

        # Use bridge name from Li.Fi quote if available, otherwise from risk assessment
        bridge_name = bridge_quote.bridge_name if bridge_quote.provider != "Fallback" else bridge_risk["bridge_name"]

        # Use estimated time from Li.Fi quote (convert seconds to minutes)
        if bridge_quote.provider != "Fallback":
            estimated_time = f"~{bridge_quote.estimated_duration_sec // 60} min"
        else:
            estimated_time = bridge_risk["estimated_time"]

        # Build cost breakdown for transparency
        from .models import CostBreakdown, CostBreakdownEntry, ChartDataPoint

        cost_breakdown = CostBreakdown(
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
        )

        # Convert chart data to Pydantic models
        chart_data = [
            ChartDataPoint(day=int(p["day"]), profit=p["profit"])
            for p in breakeven_result.chart_data
        ]

        return RouteCalculation(
            target_pool=target_pool,
            bridge_cost=round_trip.entry_bridge_fee,  # Entry bridge fee for display
            gas_cost=round_trip.entry_source_gas + round_trip.entry_dest_gas,  # Entry gas
            total_cost=total_cost,  # Full round-trip cost
            breakeven_hours=breakeven_result.breakeven_hours,
            net_profit_30d=net_profit_30d,
            risk_level=risk_level,
            bridge_name=bridge_name,
            estimated_time=estimated_time,
            has_exploits=bridge_risk["has_exploits"],
            bridge_metadata=bridge_risk["bridge_metadata"],
            # NEW: Pre-calculated fields
            daily_yield_usd=breakeven_result.daily_yield_usd,
            breakeven_days=breakeven_result.breakeven_days,
            breakeven_chart_data=chart_data,
            profitability_matrix=profitability_matrix,
            cost_breakdown=cost_breakdown,
            risk_warnings=[],  # TODO: Integrate with risk engine warnings
            tvl_source="fallback"  # TODO: Update when risk engine is integrated
        )


# Singleton instance
_service: Optional[AggregatorService] = None


def get_service() -> AggregatorService:
    """Get or create the aggregator service singleton."""
    global _service
    if _service is None:
        _service = AggregatorService()
    return _service


async def cleanup_service():
    """Cleanup service resources."""
    global _service
    if _service:
        await _service.close()
        _service = None
