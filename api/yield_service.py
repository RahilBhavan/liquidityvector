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

    async def fetch_pool_history(self, pool_id: str) -> List[dict]:
        """
        Fetch historical APY data for a specific pool from DefiLlama.
        
        Args:
            pool_id: The unique pool identifier from DefiLlama
            
        Returns:
            List of historical data points with timestamp and apy
        """
        try:
            async def _fetch_history():
                response = await self._client.get(
                    f"https://yields.llama.fi/chart/{pool_id}",
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()

            data = await call_async(defillama_breaker, _fetch_history)
            return data.get("data", [])

        except CircuitBreakerError:
            logger.error("DefiLlama circuit breaker OPEN for history fetch")
            raise ExternalAPIError("DefiLlama API unavailable - circuit breaker open")
        except Exception as e:
            logger.error(f"Failed to fetch pool history: {e}")
            raise ExternalAPIError(f"Failed to fetch pool history: {e}")

    def calculate_yield_statistics(self, history: List[dict]) -> dict:
        """
        Calculate statistical metrics from historical APY data.
        
        Args:
            history: List of historical data points with 'apy' field
            
        Returns:
            Dict with mean, std, min, max, median statistics
        """
        import statistics
        
        apys = [point.get("apy", 0) for point in history if point.get("apy") is not None]
        
        if not apys:
            return {
                "mean": 0.0,
                "std": 0.0,
                "min": 0.0,
                "max": 0.0,
                "median": 0.0,
                "count": 0,
            }
        
        return {
            "mean": round(statistics.mean(apys), 2),
            "std": round(statistics.stdev(apys), 2) if len(apys) > 1 else 0.0,
            "min": round(min(apys), 2),
            "max": round(max(apys), 2),
            "median": round(statistics.median(apys), 2),
            "count": len(apys),
        }

    def generate_histogram_bins(self, history: List[dict], num_bins: int = 15) -> List[dict]:
        """
        Generate histogram bin data for visualization.
        
        Args:
            history: List of historical data points with 'apy' field
            num_bins: Number of bins for the histogram
            
        Returns:
            List of bin objects with range_start, range_end, count, frequency
        """
        apys = [point.get("apy", 0) for point in history if point.get("apy") is not None]
        
        if not apys or len(apys) < 2:
            return []
        
        min_apy = min(apys)
        max_apy = max(apys)
        
        # Handle edge case where all APYs are the same
        if max_apy == min_apy:
            return [{
                "range_start": round(min_apy - 0.5, 2),
                "range_end": round(max_apy + 0.5, 2),
                "count": len(apys),
                "frequency": 1.0,
            }]
        
        bin_width = (max_apy - min_apy) / num_bins
        bins = []
        
        for i in range(num_bins):
            bin_start = min_apy + i * bin_width
            bin_end = bin_start + bin_width
            
            # Last bin includes the max value
            if i == num_bins - 1:
                count = sum(1 for apy in apys if bin_start <= apy <= bin_end)
            else:
                count = sum(1 for apy in apys if bin_start <= apy < bin_end)
            
            bins.append({
                "range_start": round(bin_start, 2),
                "range_end": round(bin_end, 2),
                "count": count,
                "frequency": round(count / len(apys), 4),
            })
        
        return bins

