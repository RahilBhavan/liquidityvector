"""
Rekt.news exploit database for historical security incident tracking.

NOTE: rekt.news doesn't have a public API, so this uses a curated local database
that should be periodically updated from their leaderboard and articles.

Data sources for updates:
- https://rekt.news/leaderboard/
- DeFiLlama hacks: https://defillama.com/hacks
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger("liquidityvector.risk.rekt")


@dataclass
class ExploitRecord:
    """Record of a security exploit/hack."""

    protocol: str
    date: datetime
    amount_lost_usd: float
    amount_recovered_usd: float
    category: str  # "bridge", "defi", "rug", "flash_loan"
    description: str
    source_url: str
    post_mortem_url: Optional[str] = None

    @property
    def net_loss(self) -> float:
        """Net loss after any recovered funds."""
        return max(0, self.amount_lost_usd - self.amount_recovered_usd)


class RektDatabaseService:
    """
    Track historical exploits from rekt.news and similar sources.

    This is a curated database that should be updated periodically.
    Bridge-specific exploits are prioritized for this use case.
    """

    # Curated list of notable bridge exploits
    # Sources: rekt.news, DeFiLlama hacks database
    CURATED_EXPLOITS: List[ExploitRecord] = [
        # Major bridge exploits
        ExploitRecord(
            protocol="Ronin Bridge",
            date=datetime(2022, 3, 23),
            amount_lost_usd=625_000_000,
            amount_recovered_usd=0,
            category="bridge",
            description="Compromised validator private keys allowed unauthorized withdrawals",
            source_url="https://rekt.news/ronin-rekt/",
            post_mortem_url="https://roninblockchain.substack.com/p/community-alert-ronin-validators",
        ),
        ExploitRecord(
            protocol="Wormhole",
            date=datetime(2022, 2, 2),
            amount_lost_usd=326_000_000,
            amount_recovered_usd=326_000_000,  # Jump covered losses
            category="bridge",
            description="Signature verification bypass in Solana guardian set",
            source_url="https://rekt.news/wormhole-rekt/",
        ),
        ExploitRecord(
            protocol="Nomad",
            date=datetime(2022, 8, 1),
            amount_lost_usd=190_000_000,
            amount_recovered_usd=36_000_000,
            category="bridge",
            description="Improper message validation allowed fake proofs",
            source_url="https://rekt.news/nomad-rekt/",
        ),
        ExploitRecord(
            protocol="Harmony Horizon",
            date=datetime(2022, 6, 23),
            amount_lost_usd=100_000_000,
            amount_recovered_usd=0,
            category="bridge",
            description="Compromised multisig keys (2-of-5)",
            source_url="https://rekt.news/harmony-rekt/",
        ),
        ExploitRecord(
            protocol="Multichain",
            date=datetime(2023, 7, 7),
            amount_lost_usd=126_000_000,
            amount_recovered_usd=0,
            category="bridge",
            description="CEO arrested, MPC keys possibly compromised",
            source_url="https://rekt.news/multichain-rekt/",
        ),
        ExploitRecord(
            protocol="Synapse",
            date=datetime(2021, 11, 9),
            amount_lost_usd=8_000_000,
            amount_recovered_usd=8_000_000,  # White hat recovered
            category="bridge",
            description="Vulnerability in AMM pool logic allowing skewed trades",
            source_url="https://medium.com/synapse-protocol/synapse-post-mortem-11-09-f4f8a54d1c3a",
        ),
        ExploitRecord(
            protocol="Poly Network",
            date=datetime(2021, 8, 10),
            amount_lost_usd=611_000_000,
            amount_recovered_usd=611_000_000,  # Returned by hacker
            category="bridge",
            description="Cross-chain signature verification flaw",
            source_url="https://rekt.news/polynetwork-rekt/",
        ),
        ExploitRecord(
            protocol="Qubit",
            date=datetime(2022, 1, 27),
            amount_lost_usd=80_000_000,
            amount_recovered_usd=0,
            category="bridge",
            description="Deposit function logic error on BSC bridge",
            source_url="https://rekt.news/qubit-rekt/",
        ),
        ExploitRecord(
            protocol="Meter",
            date=datetime(2022, 2, 5),
            amount_lost_usd=4_300_000,
            amount_recovered_usd=0,
            category="bridge",
            description="Trust assumption violation in wrapped token handling",
            source_url="https://rekt.news/meter-rekt/",
        ),
        # Intent-based and newer bridges (no major exploits yet)
        # Stargate, Across, Hop, etc. - no entries needed if no exploits
    ]

    def __init__(self, additional_exploits: Optional[List[ExploitRecord]] = None):
        """
        Initialize database with curated and optional additional exploits.

        Args:
            additional_exploits: Additional exploit records to include
        """
        self._exploits_by_protocol: Dict[str, List[ExploitRecord]] = {}
        self._load_data(additional_exploits)

    def _load_data(self, additional: Optional[List[ExploitRecord]] = None):
        """Load and index exploit data."""
        all_exploits = self.CURATED_EXPLOITS.copy()
        if additional:
            all_exploits.extend(additional)

        for exploit in all_exploits:
            protocol_key = exploit.protocol.lower()
            if protocol_key not in self._exploits_by_protocol:
                self._exploits_by_protocol[protocol_key] = []
            self._exploits_by_protocol[protocol_key].append(exploit)

        # Sort by date descending within each protocol
        for exploits in self._exploits_by_protocol.values():
            exploits.sort(key=lambda x: x.date, reverse=True)

        logger.info(f"Loaded {len(all_exploits)} exploit records for {len(self._exploits_by_protocol)} protocols")

    def get_exploits(self, protocol_name: str) -> List[ExploitRecord]:
        """Get all known exploits for a protocol."""
        return self._exploits_by_protocol.get(protocol_name.lower(), [])

    def has_exploits(self, protocol_name: str) -> bool:
        """Check if protocol has any recorded exploits."""
        return protocol_name.lower() in self._exploits_by_protocol

    def get_total_lost(self, protocol_name: str) -> float:
        """Get total USD lost (net of recoveries) for a protocol."""
        exploits = self.get_exploits(protocol_name)
        return sum(e.net_loss for e in exploits)

    def get_latest_exploit(self, protocol_name: str) -> Optional[ExploitRecord]:
        """Get most recent exploit for a protocol."""
        exploits = self.get_exploits(protocol_name)
        return exploits[0] if exploits else None

    def get_bridge_exploits(self) -> List[ExploitRecord]:
        """Get all bridge-category exploits."""
        result = []
        for exploits in self._exploits_by_protocol.values():
            result.extend(e for e in exploits if e.category == "bridge")
        result.sort(key=lambda x: x.amount_lost_usd, reverse=True)
        return result

    def get_all_protocols_with_exploits(self) -> List[str]:
        """Get list of all protocols with recorded exploits."""
        return list(self._exploits_by_protocol.keys())

    def add_exploit(self, exploit: ExploitRecord):
        """Add a new exploit record dynamically."""
        protocol_key = exploit.protocol.lower()
        if protocol_key not in self._exploits_by_protocol:
            self._exploits_by_protocol[protocol_key] = []
        self._exploits_by_protocol[protocol_key].append(exploit)
        # Re-sort
        self._exploits_by_protocol[protocol_key].sort(key=lambda x: x.date, reverse=True)
