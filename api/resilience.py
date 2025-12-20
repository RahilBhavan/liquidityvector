"""
Resilience utilities for the Liquidity Vector API.
Provides circuit breakers, caching, and monitoring for external API calls.
"""

import logging
import time
from typing import Any, Callable, Coroutine
from cachetools import TTLCache

logger = logging.getLogger("liquidityvector.resilience")


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open and call is rejected."""
    pass


class RateLimitError(Exception):
    """Raised when an API rate limit is exceeded. Should not trigger circuit breaker."""
    pass


class AsyncCircuitBreaker:
    """
    Simple async-compatible circuit breaker implementation.

    States:
    - closed: Normal operation, requests pass through
    - open: Circuit tripped, requests immediately rejected
    - half_open: Testing if service recovered (single request allowed)
    """

    def __init__(
        self,
        name: str,
        fail_max: int = 5,
        reset_timeout: float = 60.0,
        excluded_exceptions: tuple = ()
    ):
        self.name = name
        self.fail_max = fail_max
        self.reset_timeout = reset_timeout
        self.excluded_exceptions = excluded_exceptions

        self._state = "closed"
        self._fail_counter = 0
        self._last_failure_time: float | None = None

    @property
    def current_state(self) -> str:
        """Get current state, checking for timeout-based reset."""
        if self._state == "open" and self._last_failure_time:
            if time.time() - self._last_failure_time >= self.reset_timeout:
                self._state = "half_open"
        return self._state

    @property
    def fail_counter(self) -> int:
        return self._fail_counter

    def _on_success(self) -> None:
        """Record successful call."""
        if self._state == "half_open":
            logger.info(f"Circuit breaker '{self.name}' recovered: half_open -> closed")
        self._state = "closed"
        self._fail_counter = 0
        self._last_failure_time = None

    def _on_failure(self) -> None:
        """Record failed call."""
        self._fail_counter += 1
        self._last_failure_time = time.time()

        if self._fail_counter >= self.fail_max:
            old_state = self._state
            self._state = "open"
            if old_state != "open":
                logger.warning(
                    f"Circuit breaker '{self.name}' state changed: {old_state} -> open "
                    f"(failures: {self._fail_counter})"
                )

    async def call(self, func: Callable[[], Coroutine[Any, Any, Any]]) -> Any:
        """Execute async function through circuit breaker."""
        state = self.current_state

        if state == "open":
            raise CircuitBreakerError(f"Circuit breaker '{self.name}' is OPEN")

        try:
            result = await func()
            self._on_success()
            return result
        except Exception as e:
            # Don't count excluded exceptions as failures
            if not isinstance(e, self.excluded_exceptions):
                self._on_failure()
            raise


async def call_async(breaker: AsyncCircuitBreaker, func: Callable[[], Coroutine[Any, Any, Any]]) -> Any:
    """
    Call an async function through a circuit breaker.

    Convenience wrapper for breaker.call().

    Args:
        breaker: The circuit breaker instance
        func: The async function to call

    Returns:
        The result of the async function
    """
    return await breaker.call(func)


# Re-export for use in services
__all__ = [
    "defillama_breaker",
    "rpc_breaker",
    "lifi_breaker",
    "coingecko_breaker",
    "gas_price_cache",
    "fee_history_cache",
    "native_price_cache",
    "bridge_quote_cache",
    "CircuitBreakerError",
    "RateLimitError",
    "get_circuit_states",
    "call_async",
]


# Circuit breaker for DefiLlama API
# Opens after 5 consecutive failures, resets after 60 seconds
defillama_breaker = AsyncCircuitBreaker(
    name="defillama",
    fail_max=5,
    reset_timeout=60.0,
    excluded_exceptions=(ValueError,),  # Don't count validation errors as failures
)

# Circuit breaker for RPC calls (shared across all chains)
# Higher threshold since we have 7 chains making calls
# Opens after 10 failures, resets after 30 seconds for faster recovery
rpc_breaker = AsyncCircuitBreaker(
    name="rpc",
    fail_max=10,
    reset_timeout=30.0,
    excluded_exceptions=(ValueError,),  # Don't count JSON parsing errors
)

# Circuit breaker for Li.Fi bridge aggregator API
# Opens after 5 failures, resets after 45 seconds
lifi_breaker = AsyncCircuitBreaker(
    name="lifi",
    fail_max=5,
    reset_timeout=45.0,
    excluded_exceptions=(ValueError,),
)

# Circuit breaker for CoinGecko price API
# Opens after 3 failures (rate limits are strict), resets after 60 seconds
# RateLimitError excluded so rate limits don't trigger circuit breaker
coingecko_breaker = AsyncCircuitBreaker(
    name="coingecko",
    fail_max=3,
    reset_timeout=60.0,
    excluded_exceptions=(ValueError, RateLimitError),
)

# Gas price cache with 30-second TTL
# Reduces RPC calls by caching gas prices per chain
gas_price_cache: TTLCache[str, float] = TTLCache(maxsize=20, ttl=30)

# Fee history cache with 15-second TTL (EIP-1559 data)
fee_history_cache: TTLCache[str, dict] = TTLCache(maxsize=20, ttl=15)

# Native token price cache with 60-second TTL
native_price_cache: TTLCache[str, float] = TTLCache(maxsize=10, ttl=60)

# Bridge quote cache with 10-second TTL (quotes are time-sensitive)
bridge_quote_cache: TTLCache[str, dict] = TTLCache(maxsize=50, ttl=10)


def get_circuit_states() -> dict[str, Any]:
    """
    Return current circuit breaker states for health monitoring.

    Returns:
        Dict with state info for each circuit breaker
    """
    return {
        "defillama": {
            "state": str(defillama_breaker.current_state),
            "fail_count": defillama_breaker.fail_counter,
        },
        "rpc": {
            "state": str(rpc_breaker.current_state),
            "fail_count": rpc_breaker.fail_counter,
        },
        "lifi": {
            "state": str(lifi_breaker.current_state),
            "fail_count": lifi_breaker.fail_counter,
        },
        "coingecko": {
            "state": str(coingecko_breaker.current_state),
            "fail_count": coingecko_breaker.fail_counter,
        },
        "cache": {
            "gas_price_entries": len(gas_price_cache),
            "fee_history_entries": len(fee_history_cache),
            "native_price_entries": len(native_price_cache),
            "bridge_quote_entries": len(bridge_quote_cache),
        }
    }
