import logging
from typing import List
from .base_service import BaseService
from .resilience import defillama_breaker, call_async, CircuitBreakerError
from .exceptions import ExternalAPIError

logger = logging.getLogger("liquidityvector.yield_service")

class YieldService(BaseService):
    """Service for fetching yield and pool data."""

    async def fetch_top_pools(self) -> List[dict]:
        """Fetch top USDC pools from DefiLlama yields API with circuit breaker protection."""
        try:
            async def _fetch_from_api():
                response = await self._client.get(
                    "https://yields.llama.fi/pools",
                    timeout=5.0
                )
                response.raise_for_status()
                return response.json()

            data = await call_async(defillama_breaker, _fetch_from_api)

            supported_chains = ("Ethereum", "Arbitrum", "Base", "Optimism", "Polygon", "Avalanche", "BSC", "BNB Chain")
            filtered = [
                p for p in data.get("data", [])
                if p.get("symbol") == "USDC"
                and p.get("chain") in supported_chains
                and p.get("tvlUsd", 0) > 10_000_000
                and p.get("apy", 0) > 0
            ]

            sorted_pools = sorted(filtered, key=lambda x: x.get("apy", 0), reverse=True)
            result = []
            counts = {c: 0 for c in supported_chains}
            # Add mapping for normalization
            counts["BNB Chain"] = 0 

            for pool in sorted_pools:
                chain = pool.get("chain")
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

            return result

        except CircuitBreakerError:
            logger.error("DefiLlama circuit breaker OPEN")
            raise ExternalAPIError("DefiLlama API unavailable - circuit breaker open")
        except Exception as e:
            logger.error(f"DefiLlama API error: {e}")
            raise ExternalAPIError(f"Failed to fetch pools from DefiLlama: {e}")

    async def get_current_yield(self, chain: str) -> dict:
        """Fetch market average yield for a chain."""
        try:
            pools = await self.fetch_top_pools()
            chain_pools = [p for p in pools if p.get('chain', '').lower() == chain.lower()]

            if chain_pools:
                avg_yield = sum(p.get('apy', 0) for p in chain_pools) / len(chain_pools)
                return {
                    "current_yield": round(avg_yield, 2),
                    "chain": chain,
                    "source": "market_average"
                }

            return {
                "current_yield": 0.0,
                "chain": chain,
                "source": "fallback"
            }
        except Exception as e:
            logger.error(f"Failed to get current yield for {chain}: {e}")
            raise ExternalAPIError(f"Failed to get current yield for {chain}: {e}")
