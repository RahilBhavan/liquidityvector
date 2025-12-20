"""
DefiLlama API client for fetching live bridge TVL data.

Provides real-time Total Value Locked data for bridge protocols.
Includes caching to respect rate limits.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger("liquidityvector.risk.defillama")


@dataclass
class BridgeTVLData:
    """TVL data for a bridge protocol."""

    name: str
    display_name: str
    tvl_usd: float
    volume_24h: float
    volume_change_24h: float  # Percentage
    chains_supported: List[str]
    last_updated: datetime


class DefiLlamaService:
    """
    Fetch live TVL data for bridges from DefiLlama.

    Uses the bridges.llama.fi API endpoint.
    """

    BASE_URL = "https://bridges.llama.fi"
    CACHE_TTL = timedelta(minutes=5)  # TVL data can be slightly stale

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._client = client
        self._owns_client = client is None
        self._cache: Dict[str, tuple[BridgeTVLData, datetime]] = {}
        self._all_bridges_cache: Optional[tuple[List[BridgeTVLData], datetime]] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    async def close(self):
        """Close HTTP client if we own it."""
        if self._owns_client and self._client:
            await self._client.aclose()
            self._client = None

    async def get_bridge_tvl(self, bridge_name: str) -> Optional[BridgeTVLData]:
        """
        Fetch TVL data for a specific bridge.

        Args:
            bridge_name: Name of the bridge (e.g., "Stargate", "Across")

        Returns:
            BridgeTVLData or None if not found
        """
        cache_key = bridge_name.lower()

        # Check cache
        if cache_key in self._cache:
            data, cached_at = self._cache[cache_key]
            if datetime.now() - cached_at < self.CACHE_TTL:
                logger.debug(f"Cache hit for bridge: {bridge_name}")
                return data

        # Fetch all bridges and find match
        all_bridges = await self.get_all_bridges()

        for bridge in all_bridges:
            if bridge.name.lower() == cache_key or bridge.display_name.lower() == cache_key:
                self._cache[cache_key] = (bridge, datetime.now())
                return bridge

        logger.warning(f"Bridge not found in DefiLlama: {bridge_name}")
        return None

    async def get_all_bridges(self) -> List[BridgeTVLData]:
        """
        Fetch TVL data for all bridges.

        Uses caching to reduce API calls.
        """
        # Check cache
        if self._all_bridges_cache:
            data, cached_at = self._all_bridges_cache
            if datetime.now() - cached_at < self.CACHE_TTL:
                return data

        client = await self._get_client()

        try:
            response = await client.get(f"{self.BASE_URL}/bridges")
            response.raise_for_status()
            data = response.json()

            bridges = []
            for bridge in data.get("bridges", []):
                try:
                    bridge_data = BridgeTVLData(
                        name=bridge.get("name", "Unknown"),
                        display_name=bridge.get("displayName", bridge.get("name", "Unknown")),
                        tvl_usd=float(bridge.get("lastDailyVolume", 0)),
                        volume_24h=float(bridge.get("currentDayVolume", 0)),
                        volume_change_24h=float(bridge.get("change_1d", 0)),
                        chains_supported=bridge.get("chains", []),
                        last_updated=datetime.now(),
                    )
                    bridges.append(bridge_data)
                except (ValueError, KeyError) as e:
                    logger.warning(f"Failed to parse bridge data: {e}")
                    continue

            self._all_bridges_cache = (bridges, datetime.now())
            logger.info(f"Fetched {len(bridges)} bridges from DefiLlama")
            return bridges

        except httpx.HTTPError as e:
            logger.error(f"DefiLlama API error: {e}")
            # Return cached data if available
            if self._all_bridges_cache:
                return self._all_bridges_cache[0]
            return []

    def get_cached_bridge(self, bridge_name: str) -> Optional[BridgeTVLData]:
        """
        Get cached bridge data without making API call.

        Useful for fallback when API is unavailable.
        """
        cache_key = bridge_name.lower()
        if cache_key in self._cache:
            return self._cache[cache_key][0]
        return None
