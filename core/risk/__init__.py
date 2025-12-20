"""
Risk assessment engine for bridge and protocol evaluation.

Provides:
- Live data fetching from DefiLlama, Etherscan, Rekt.news
- Multi-factor risk scoring algorithm
- Risk engine orchestration
"""

from .scoring import RiskBreakdown, RiskFactor, calculate_risk_score
from .engine import RiskEngine, LiveBridgeMetadata

__all__ = [
    "RiskBreakdown",
    "RiskFactor",
    "calculate_risk_score",
    "RiskEngine",
    "LiveBridgeMetadata",
]
