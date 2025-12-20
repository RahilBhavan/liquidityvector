"""
Etherscan API client for contract verification and age data.

Supports multiple chains via chain-specific Etherscan APIs.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Optional

import httpx

logger = logging.getLogger("liquidityvector.risk.etherscan")


@dataclass
class ContractVerification:
    """Contract verification and metadata."""

    address: str
    chain: str
    is_verified: bool
    contract_name: Optional[str]
    compiler_version: Optional[str]
    creation_tx_hash: Optional[str]
    creation_timestamp: Optional[datetime]
    age_years: float
    source_code_available: bool


class EtherscanService:
    """
    Verify contract status and age from Etherscan and chain explorers.

    Supports:
    - Ethereum (etherscan.io)
    - Arbitrum (arbiscan.io)
    - Base (basescan.org)
    - Optimism (optimistic.etherscan.io)
    - Polygon (polygonscan.com)
    - Avalanche (snowtrace.io)
    - BSC (bscscan.com)
    """

    # Chain-specific API endpoints
    ENDPOINTS = {
        "ethereum": "https://api.etherscan.io",
        "arbitrum": "https://api.arbiscan.io",
        "base": "https://api.basescan.org",
        "optimism": "https://api-optimistic.etherscan.io",
        "polygon": "https://api.polygonscan.com",
        "avalanche": "https://api.snowtrace.io",
        "bsc": "https://api.bscscan.com",
        "bnb chain": "https://api.bscscan.com",
    }

    CACHE_TTL = timedelta(hours=1)  # Contract data rarely changes

    def __init__(
        self,
        api_keys: Optional[Dict[str, str]] = None,
        client: Optional[httpx.AsyncClient] = None,
    ):
        """
        Initialize Etherscan service.

        Args:
            api_keys: Dict mapping chain name to API key
            client: Optional shared HTTP client
        """
        self._api_keys = api_keys or {}
        self._client = client
        self._owns_client = client is None
        self._cache: Dict[str, tuple[ContractVerification, datetime]] = {}

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

    async def get_contract_info(
        self,
        address: str,
        chain: str,
    ) -> Optional[ContractVerification]:
        """
        Fetch contract verification and creation info.

        Args:
            address: Contract address (0x...)
            chain: Chain name (e.g., "ethereum", "arbitrum")

        Returns:
            ContractVerification or None if not found
        """
        cache_key = f"{chain.lower()}:{address.lower()}"

        # Check cache
        if cache_key in self._cache:
            data, cached_at = self._cache[cache_key]
            if datetime.now() - cached_at < self.CACHE_TTL:
                logger.debug(f"Cache hit for contract: {address}")
                return data

        endpoint = self.ENDPOINTS.get(chain.lower())
        if not endpoint:
            logger.warning(f"Unsupported chain: {chain}")
            return None

        api_key = self._api_keys.get(chain.lower(), "")
        client = await self._get_client()

        try:
            # Get source code (tells us if verified)
            source_response = await client.get(
                f"{endpoint}/api",
                params={
                    "module": "contract",
                    "action": "getsourcecode",
                    "address": address,
                    "apikey": api_key,
                },
            )
            source_data = source_response.json()

            # Parse verification status
            is_verified = False
            contract_name = None
            compiler_version = None

            if source_data.get("status") == "1" and source_data.get("result"):
                result = source_data["result"][0]
                source_code = result.get("SourceCode", "")
                is_verified = bool(source_code and source_code != "")
                contract_name = result.get("ContractName")
                compiler_version = result.get("CompilerVersion")

            # Try to get creation info
            creation_timestamp = None
            creation_tx_hash = None
            age_years = 0.0

            try:
                creation_response = await client.get(
                    f"{endpoint}/api",
                    params={
                        "module": "contract",
                        "action": "getcontractcreation",
                        "contractaddresses": address,
                        "apikey": api_key,
                    },
                )
                creation_data = creation_response.json()

                if creation_data.get("status") == "1" and creation_data.get("result"):
                    creation_tx_hash = creation_data["result"][0].get("txHash")

                    # Get transaction timestamp
                    if creation_tx_hash:
                        tx_response = await client.get(
                            f"{endpoint}/api",
                            params={
                                "module": "proxy",
                                "action": "eth_getTransactionByHash",
                                "txhash": creation_tx_hash,
                                "apikey": api_key,
                            },
                        )
                        tx_data = tx_response.json()

                        if tx_data.get("result"):
                            block_number = tx_data["result"].get("blockNumber")
                            if block_number:
                                # Get block timestamp
                                block_response = await client.get(
                                    f"{endpoint}/api",
                                    params={
                                        "module": "proxy",
                                        "action": "eth_getBlockByNumber",
                                        "tag": block_number,
                                        "boolean": "false",
                                        "apikey": api_key,
                                    },
                                )
                                block_data = block_response.json()
                                if block_data.get("result"):
                                    timestamp_hex = block_data["result"].get("timestamp")
                                    if timestamp_hex:
                                        timestamp = int(timestamp_hex, 16)
                                        creation_timestamp = datetime.fromtimestamp(timestamp)
                                        age_days = (datetime.now() - creation_timestamp).days
                                        age_years = age_days / 365

            except Exception as e:
                logger.warning(f"Failed to get creation info for {address}: {e}")

            verification = ContractVerification(
                address=address,
                chain=chain,
                is_verified=is_verified,
                contract_name=contract_name,
                compiler_version=compiler_version,
                creation_tx_hash=creation_tx_hash,
                creation_timestamp=creation_timestamp,
                age_years=age_years,
                source_code_available=is_verified,
            )

            self._cache[cache_key] = (verification, datetime.now())
            return verification

        except httpx.HTTPError as e:
            logger.error(f"Etherscan API error for {chain}: {e}")
            return None

    def get_cached_contract(self, address: str, chain: str) -> Optional[ContractVerification]:
        """Get cached contract data without API call."""
        cache_key = f"{chain.lower()}:{address.lower()}"
        if cache_key in self._cache:
            return self._cache[cache_key][0]
        return None
