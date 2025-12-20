"""
Risk Engine - Orchestrates live data fetching and risk scoring.

Combines data from DefiLlama, Etherscan, and Rekt.news to provide
comprehensive risk assessment for bridge protocols.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import Dict, Optional

import httpx

from .scoring import RiskBreakdown, calculate_risk_score
from .data_sources.defillama import DefiLlamaService, BridgeTVLData
from .data_sources.etherscan import EtherscanService, ContractVerification
from .data_sources.rekt_database import RektDatabaseService, ExploitRecord

logger = logging.getLogger("liquidityvector.risk.engine")


@dataclass
class LiveBridgeMetadata:
    """Bridge metadata enhanced with live data from multiple sources."""

    name: str
    bridge_type: str

    # Live data from DefiLlama
    tvl_usd: float
    tvl_source: str  # "live", "cached", or "fallback"

    # Live data from Etherscan
    contract_verified: bool
    contract_age_years: float
    verification_source: str

    # From Rekt.news database
    has_exploits: bool
    total_exploit_loss: float
    latest_exploit: Optional[ExploitRecord]

    # Computed risk assessment
    risk_breakdown: RiskBreakdown


# Fallback data when live APIs fail
# Based on historical averages and known protocol data
FALLBACK_BRIDGE_DATA: Dict[str, Dict] = {
    "stargate": {
        "type": "LayerZero",
        "tvl": 450_000_000,
        "age": 2.5,
        "verified": True,
    },
    "across": {
        "type": "Intent",
        "tvl": 200_000_000,
        "age": 2.0,
        "verified": True,
    },
    "hop": {
        "type": "Liquidity",
        "tvl": 65_000_000,
        "age": 3.5,
        "verified": True,
    },
    "synapse": {
        "type": "Liquidity",
        "tvl": 110_000_000,
        "age": 2.8,
        "verified": True,
    },
    "native bridge": {
        "type": "Canonical",
        "tvl": 5_000_000_000,
        "age": 4.0,
        "verified": True,
    },
    "cbridge": {
        "type": "Liquidity",
        "tvl": 150_000_000,
        "age": 2.5,
        "verified": True,
    },
    "multichain": {
        "type": "Liquidity",
        "tvl": 0,  # Defunct after exploit
        "age": 3.0,
        "verified": True,
    },
}


class RiskEngine:
    """
    Orchestrates live data fetching and risk scoring.

    Implements graceful degradation with fallbacks when APIs fail.
    """

    def __init__(
        self,
        defillama: Optional[DefiLlamaService] = None,
        etherscan: Optional[EtherscanService] = None,
        rekt_db: Optional[RektDatabaseService] = None,
        etherscan_api_keys: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize Risk Engine with data source clients.

        Args:
            defillama: DefiLlama service (created if not provided)
            etherscan: Etherscan service (created if not provided)
            rekt_db: Rekt database service (created if not provided)
            etherscan_api_keys: API keys for Etherscan (optional)
        """
        self._http_client: Optional[httpx.AsyncClient] = None
        self._defillama = defillama
        self._etherscan = etherscan
        self._rekt_db = rekt_db or RektDatabaseService()
        self._etherscan_api_keys = etherscan_api_keys or {}

    async def _ensure_services(self):
        """Initialize services lazily."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=10.0)

        if self._defillama is None:
            self._defillama = DefiLlamaService(client=self._http_client)

        if self._etherscan is None:
            self._etherscan = EtherscanService(
                api_keys=self._etherscan_api_keys,
                client=self._http_client,
            )

    async def close(self):
        """Cleanup resources."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    async def get_bridge_risk(
        self,
        bridge_name: str,
        source_chain: str,
        target_chain: str,
        contract_address: Optional[str] = None,
    ) -> LiveBridgeMetadata:
        """
        Fetch live data and compute comprehensive risk score.

        Implements fallback hierarchy:
        1. Try all live sources in parallel
        2. Use cached data if available
        3. Fall back to hardcoded defaults

        Args:
            bridge_name: Name of the bridge protocol
            source_chain: Source chain name
            target_chain: Target chain name
            contract_address: Optional contract address for verification

        Returns:
            LiveBridgeMetadata with risk assessment
        """
        await self._ensure_services()

        # Parallel fetch from all sources
        tvl_task = self._fetch_tvl(bridge_name)
        contract_task = self._fetch_contract_info(contract_address, source_chain)

        results = await asyncio.gather(tvl_task, contract_task, return_exceptions=True)

        tvl_data = results[0] if not isinstance(results[0], Exception) else None
        contract_data = results[1] if not isinstance(results[1], Exception) else None

        # Get exploit data (sync, from local database)
        exploits = self._rekt_db.get_exploits(bridge_name)
        has_exploits = len(exploits) > 0
        total_loss = self._rekt_db.get_total_lost(bridge_name)
        latest_exploit = self._rekt_db.get_latest_exploit(bridge_name)

        # Apply fallbacks
        fallback = FALLBACK_BRIDGE_DATA.get(bridge_name.lower(), {})

        # TVL with fallback
        if tvl_data:
            tvl_usd = tvl_data.tvl_usd
            tvl_source = "live"
        elif fallback:
            tvl_usd = fallback.get("tvl", 50_000_000)
            tvl_source = "fallback"
        else:
            tvl_usd = 50_000_000  # Conservative default
            tvl_source = "default"

        # Bridge type
        bridge_type = fallback.get("type", "Liquidity")

        # Contract verification and age
        if contract_data:
            is_verified = contract_data.is_verified
            age_years = contract_data.age_years
            verification_source = "live"
        elif fallback:
            is_verified = fallback.get("verified", True)
            age_years = fallback.get("age", 1.0)
            verification_source = "fallback"
        else:
            is_verified = True  # Assume verified if unknown
            age_years = 1.0
            verification_source = "default"

        # Calculate risk score with live data
        risk = calculate_risk_score(
            bridge_type=bridge_type,
            tvl_usd=tvl_usd,
            age_years=age_years,
            has_exploits=has_exploits,
            exploit_total_lost=total_loss,
            is_contract_verified=is_verified,
            source_chain=source_chain,
            target_chain=target_chain,
        )

        logger.info(
            f"Risk assessment for {bridge_name}: "
            f"score={risk.overall_score}, level={risk.risk_level}, "
            f"tvl_source={tvl_source}"
        )

        return LiveBridgeMetadata(
            name=bridge_name,
            bridge_type=bridge_type,
            tvl_usd=tvl_usd,
            tvl_source=tvl_source,
            contract_verified=is_verified,
            contract_age_years=age_years,
            verification_source=verification_source,
            has_exploits=has_exploits,
            total_exploit_loss=total_loss,
            latest_exploit=latest_exploit,
            risk_breakdown=risk,
        )

    async def _fetch_tvl(self, bridge_name: str) -> Optional[BridgeTVLData]:
        """Fetch TVL with error handling."""
        try:
            return await self._defillama.get_bridge_tvl(bridge_name)
        except Exception as e:
            logger.warning(f"Failed to fetch TVL for {bridge_name}: {e}")
            return None

    async def _fetch_contract_info(
        self,
        address: Optional[str],
        chain: str,
    ) -> Optional[ContractVerification]:
        """Fetch contract info with error handling."""
        if not address:
            return None

        try:
            return await self._etherscan.get_contract_info(address, chain)
        except Exception as e:
            logger.warning(f"Failed to fetch contract info for {address}: {e}")
            return None

    def get_fallback_data(self, bridge_name: str) -> Dict:
        """Get fallback data for a bridge without API calls."""
        return FALLBACK_BRIDGE_DATA.get(bridge_name.lower(), {})

    def is_known_bridge(self, bridge_name: str) -> bool:
        """Check if bridge is in our known database."""
        return bridge_name.lower() in FALLBACK_BRIDGE_DATA
