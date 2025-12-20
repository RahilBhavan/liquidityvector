"""
External data source clients for risk assessment.

Provides:
- DefiLlama: Live TVL data for bridges
- Etherscan: Contract verification and age
- Rekt Database: Historical exploit tracking
"""

from .defillama import DefiLlamaService, BridgeTVLData
from .etherscan import EtherscanService, ContractVerification
from .rekt_database import RektDatabaseService, ExploitRecord

__all__ = [
    "DefiLlamaService",
    "BridgeTVLData",
    "EtherscanService",
    "ContractVerification",
    "RektDatabaseService",
    "ExploitRecord",
]
