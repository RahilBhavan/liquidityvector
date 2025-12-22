"""
Gas estimation service for blockchain transactions.
Provides EIP-1559 gas cost predictions using RPC data.
"""

import logging
import asyncio
import random
from typing import Optional, Dict

from .base_service import BaseService
from .models import Chain, GasCostEstimate
from .constants import NATIVE_TOKEN_IDS, USDC_ADDRESSES, BASE_GAS_LIMITS
from .constants import NATIVE_TOKEN_IDS, USDC_ADDRESSES, BASE_GAS_LIMITS
from .core.config import settings
from .exceptions import ExternalAPIError

from .resilience import (
    rpc_breaker, coingecko_breaker, gas_price_cache,
    native_price_cache, fee_history_cache, call_async,
    CircuitBreakerError, RateLimitError
)

logger = logging.getLogger("liquidityvector.gas_service")

# Default gas prices in Gwei when RPC fails
DEFAULT_BASE_FEE_GWEI = 25.0
DEFAULT_PRIORITY_FEE_GWEI = 1.5

# EIP-1559 fee multiplier (10% buffer)
FEE_BUFFER_MULTIPLIER = 1.10

# Gas limit scaling factors
GAS_LIMIT_MIN_SCALE = 0.5
GAS_LIMIT_MAX_SCALE = 3.0
GAS_APPROVAL_MULTIPLIER = 4

# Default confidence score
DEFAULT_CONFIDENCE = 0.85

# Fallback token prices (USD)
FALLBACK_PRICES: Dict[str, float] = {
    "ethereum": 2500.0,
    "matic-network": 0.8,
    "avalanche-2": 35.0,
    "binancecoin": 300.0,
}

# Rate limit retry configuration
MAX_RETRY_ATTEMPTS = 3
BASE_RETRY_DELAY_SEC = 1.0


class GasService(BaseService):
    """Service for gas estimation and native token prices."""

    async def get_gas_price(self, chain: Chain) -> float:
        """
        Fetch current gas price from chain RPC.

        Args:
            chain: Target blockchain

        Returns:
            Gas price in Gwei

        Raises:
            ExternalAPIError: If RPC call fails
        """
        cache_key = f"gas_{chain.value}"
        if cache_key in gas_price_cache:
            return gas_price_cache[cache_key]

        try:
            async def _fetch_gas_price():
                response = await self._client.post(
                    settings.RPC_URLS[chain],
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_gasPrice",
                        "params": [],
                        "id": 1
                    },
                    timeout=3.0
                )
                data = response.json()
                if "error" in data:
                    raise ValueError(f"RPC error: {data['error']}")
                return int(data.get("result", "0x0"), 16) / 1e9

            price = await call_async(rpc_breaker, _fetch_gas_price)
            gas_price_cache[cache_key] = price
            return price
        except CircuitBreakerError:
            logger.warning(f"Circuit breaker open for RPC, using default gas price")
            return DEFAULT_BASE_FEE_GWEI
        except Exception as e:
            logger.error(f"Gas price fetch failed for {chain.value}: {e}")
            raise ExternalAPIError(f"Failed to fetch gas price for {chain.value}: {e}")

    async def get_native_token_price(self, chain: Chain) -> float:
        """
        Fetch native token price from CoinGecko with retry logic.

        Args:
            chain: Target blockchain

        Returns:
            Token price in USD
        """
        token_id = NATIVE_TOKEN_IDS.get(chain, "ethereum")
        cache_key = f"price_{token_id}"

        cached_price = native_price_cache.get(cache_key)
        if cached_price is not None:
            return cached_price

        for attempt in range(MAX_RETRY_ATTEMPTS):
            try:
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
                    return data[token_id]["usd"]

                price = await call_async(coingecko_breaker, _fetch_price)
                native_price_cache[cache_key] = price
                return price

            except RateLimitError:
                if attempt < MAX_RETRY_ATTEMPTS - 1:
                    delay = (BASE_RETRY_DELAY_SEC * (2 ** attempt)) + random.uniform(0, 1)
                    logger.warning(f"Rate limited, retrying in {delay:.1f}s")
                    await asyncio.sleep(delay)
            except CircuitBreakerError:
                logger.warning(f"CoinGecko circuit breaker open for {token_id}")
                break
            except Exception as e:
                logger.error(f"Failed to fetch {token_id} price: {e}")
                break

        # Return cached or fallback price
        return cached_price or FALLBACK_PRICES.get(token_id, 100.0)

    async def estimate_gas_cost_v2(
        self,
        chain: Chain,
        wallet_address: Optional[str] = None
    ) -> GasCostEstimate:
        """
        EIP-1559 gas cost estimation with dynamic gas limit.

        Args:
            chain: Target blockchain
            wallet_address: Optional wallet for gas estimation

        Returns:
            Complete gas cost estimate
        """
        fee_history, native_price = await asyncio.gather(
            self._fetch_fee_history(chain),
            self.get_native_token_price(chain)
        )

        base_fee_wei = self._calculate_base_fee_prediction(fee_history)
        priority_fee_wei = self._calculate_priority_fee(fee_history)
        max_fee_wei = (base_fee_wei + priority_fee_wei) * FEE_BUFFER_MULTIPLIER

        gas_limit = await self._estimate_dynamic_gas_limit(chain, wallet_address)
        total_cost_usd = (gas_limit * max_fee_wei / 1e18) * native_price

        return GasCostEstimate(
            estimated_gas_limit=gas_limit,
            base_fee_gwei=base_fee_wei / 1e9,
            priority_fee_gwei=priority_fee_wei / 1e9,
            max_fee_per_gas_gwei=max_fee_wei / 1e9,
            total_cost_usd=total_cost_usd,
            native_token_price_usd=native_price,
            confidence_score=DEFAULT_CONFIDENCE,
            error_bound_usd=total_cost_usd * (1 - DEFAULT_CONFIDENCE)
        )

    async def _fetch_fee_history(self, chain: Chain) -> dict:
        """Fetch EIP-1559 fee history from RPC."""
        cache_key = f"fee_history_{chain.value}"
        if cache_key in fee_history_cache:
            return fee_history_cache[cache_key]

        try:
            async def _fetch():
                response = await self._client.post(
                    settings.RPC_URLS[chain],
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_feeHistory",
                        "params": ["0x5", "latest", [25, 50, 75]],
                        "id": 1
                    },
                    timeout=3.0
                )
                return response.json().get("result", {})

            result = await call_async(rpc_breaker, _fetch)
            fee_history_cache[cache_key] = result
            return result

        except (CircuitBreakerError, Exception) as e:
            logger.warning(f"Fee history fetch failed for {chain.value}: {e}")
            return {}

    def _calculate_base_fee_prediction(self, fee_history: dict) -> float:
        """Calculate predicted base fee using EMA."""
        base_fees_hex = fee_history.get("baseFeePerGas", [])
        base_fees = [int(bf, 16) for bf in base_fees_hex if bf]

        if not base_fees:
            return DEFAULT_BASE_FEE_GWEI * 1e9

        # Exponential moving average
        ema = base_fees[0]
        for fee in base_fees[1:]:
            ema = 0.5 * fee + 0.5 * ema

        return ema

    def _calculate_priority_fee(self, fee_history: dict) -> float:
        """Calculate priority fee from reward percentiles."""
        reward = fee_history.get("reward", [])
        if not reward:
            return DEFAULT_PRIORITY_FEE_GWEI * 1e9

        # Extract p50 fees (index 1)
        p50_fees = []
        for r in reward:
            if len(r) > 1:
                try:
                    p50_fees.append(int(r[1], 16))
                except (ValueError, TypeError):
                    continue

        if not p50_fees:
            return DEFAULT_PRIORITY_FEE_GWEI * 1e9

        p50_fees.sort()
        return p50_fees[len(p50_fees) // 2]

    async def _estimate_dynamic_gas_limit(
        self,
        chain: Chain,
        wallet_address: Optional[str]
    ) -> int:
        """
        Estimate dynamic gas limit based on actual contract calls.

        Falls back to base gas limits if estimation fails.
        """
        base_limit = BASE_GAS_LIMITS.get(chain, 200_000)
        usdc_address = USDC_ADDRESSES.get(chain)

        if not usdc_address:
            return base_limit

        try:
            # Use provided wallet or a known address for estimation
            from_addr = wallet_address if wallet_address else "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

            # ERC20 approve signature + spender + amount
            data_payload = (
                "0x095ea7b3"
                + "000000000000000000000000000000000000dead".zfill(64)
                + "f" * 64
            )

            async def _estimate():
                resp = await self._client.post(
                    settings.RPC_URLS[chain],
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
                result = resp.json().get("result", "0x0")
                return int(result, 16)

            approval_gas = await call_async(rpc_breaker, _estimate)

            if approval_gas > 0:
                dynamic = int(approval_gas * GAS_APPROVAL_MULTIPLIER)
                min_limit = int(base_limit * GAS_LIMIT_MIN_SCALE)
                max_limit = int(base_limit * GAS_LIMIT_MAX_SCALE)
                return max(min_limit, min(max_limit, dynamic))

        except (CircuitBreakerError, Exception) as e:
            logger.debug(f"Dynamic gas estimation failed for {chain.value}: {e}")

        return base_limit
