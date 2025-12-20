"""
Risk scoring algorithm for bridge and protocol assessment.

Provides multi-factor risk analysis using live data from:
- DefiLlama (TVL)
- Etherscan (contract verification, age)
- Rekt.news (exploit history)

Scoring breakdown (100 points total):
- Bridge Type:        0-25 points
- Protocol Age:       0-20 points
- TVL Depth:          0-20 points
- Exploit History:    0-20 points (penalty)
- Contract Verified:  0-10 points
- Chain Maturity:     0-5 points
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class RiskFactor(Enum):
    """Individual risk factors used in scoring."""

    BRIDGE_TYPE = "bridge_type"
    PROTOCOL_AGE = "protocol_age"
    TVL_DEPTH = "tvl_depth"
    EXPLOIT_HISTORY = "exploit_history"
    CONTRACT_VERIFICATION = "contract_verification"
    CHAIN_MATURITY = "chain_maturity"


@dataclass
class RiskBreakdown:
    """Complete risk assessment with factor breakdown."""

    # Overall scores
    overall_score: int  # 0-100, higher is safer
    risk_level: int  # 1-5, lower is safer

    # Factor breakdown
    factors: Dict[RiskFactor, int] = field(default_factory=dict)

    # Warnings and explanations
    warnings: List[str] = field(default_factory=list)

    # Source metadata
    metadata: Dict = field(default_factory=dict)


# Bridge architecture type scores (baseline)
BRIDGE_TYPE_SCORES = {
    "Canonical": 25,  # Native bridge, highest trust
    "Intent": 22,  # Intent-based (Across)
    "LayerZero": 20,  # Messaging protocol
    "Liquidity": 15,  # Liquidity network (higher risk)
}

# Mature chains with established infrastructure
MATURE_CHAINS = {"Ethereum", "Arbitrum", "Optimism", "Polygon"}

# Newer chains with less battle-testing
NEWER_CHAINS = {"Base", "Avalanche", "BNB Chain"}


def calculate_risk_score(
    bridge_type: str,
    tvl_usd: float,
    age_years: float,
    has_exploits: bool,
    exploit_total_lost: float = 0.0,
    is_contract_verified: bool = True,
    source_chain: str = "Ethereum",
    target_chain: str = "Ethereum",
) -> RiskBreakdown:
    """
    Calculate comprehensive risk score using live data.

    Args:
        bridge_type: Type of bridge ("Canonical", "Intent", "LayerZero", "Liquidity")
        tvl_usd: Total Value Locked in USD
        age_years: Protocol age in years
        has_exploits: Whether protocol has historical exploits
        exploit_total_lost: Total USD lost in exploits (net of recoveries)
        is_contract_verified: Whether contracts are verified on block explorer
        source_chain: Source chain name
        target_chain: Destination chain name

    Returns:
        RiskBreakdown with overall score, risk level, and factor breakdown
    """
    factors: Dict[RiskFactor, int] = {}
    warnings: List[str] = []
    score = 0

    # Factor 1: Bridge Architecture (0-25 points)
    type_score = BRIDGE_TYPE_SCORES.get(bridge_type, 10)
    factors[RiskFactor.BRIDGE_TYPE] = type_score
    score += type_score

    # Factor 2: Protocol Age - Lindy Effect (0-20 points)
    # 4 points per year, max 20
    age_score = min(int(age_years * 4), 20)
    factors[RiskFactor.PROTOCOL_AGE] = age_score
    score += age_score

    if age_years < 1:
        warnings.append("Protocol less than 1 year old")

    # Factor 3: TVL Depth (0-20 points)
    tvl_score = _calculate_tvl_score(tvl_usd)
    factors[RiskFactor.TVL_DEPTH] = tvl_score
    score += tvl_score

    if tvl_usd < 50_000_000:
        warnings.append(f"Low TVL: ${tvl_usd / 1e6:.1f}M")

    # Factor 4: Exploit History (0-20 points, penalty)
    exploit_score, exploit_warning = _calculate_exploit_score(has_exploits, exploit_total_lost)
    factors[RiskFactor.EXPLOIT_HISTORY] = exploit_score
    score += exploit_score

    if exploit_warning:
        warnings.append(exploit_warning)

    # Factor 5: Contract Verification (0-10 points)
    verification_score = 10 if is_contract_verified else 0
    factors[RiskFactor.CONTRACT_VERIFICATION] = verification_score
    score += verification_score

    if not is_contract_verified:
        warnings.append("Contract not verified on block explorer")

    # Factor 6: Chain Maturity (0-5 points)
    chain_score, chain_warning = _calculate_chain_score(source_chain, target_chain)
    factors[RiskFactor.CHAIN_MATURITY] = chain_score
    score += chain_score

    if chain_warning:
        warnings.append(chain_warning)

    # Convert to risk level (1-5, lower is safer)
    risk_level = _score_to_risk_level(score)

    return RiskBreakdown(
        overall_score=score,
        risk_level=risk_level,
        factors=factors,
        warnings=warnings,
        metadata={
            "tvl_usd": tvl_usd,
            "age_years": age_years,
            "bridge_type": bridge_type,
            "has_exploits": has_exploits,
            "is_verified": is_contract_verified,
        },
    )


def _calculate_tvl_score(tvl_usd: float) -> int:
    """Calculate TVL-based score (0-20 points)."""
    if tvl_usd >= 1_000_000_000:  # $1B+
        return 20
    elif tvl_usd >= 500_000_000:  # $500M+
        return 16
    elif tvl_usd >= 100_000_000:  # $100M+
        return 12
    elif tvl_usd >= 50_000_000:  # $50M+
        return 8
    else:
        return 4


def _calculate_exploit_score(has_exploits: bool, total_lost: float) -> tuple[int, Optional[str]]:
    """Calculate exploit history score (0-20, penalty for exploits)."""
    if not has_exploits:
        return 20, None

    # Scale penalty by amount lost
    if total_lost >= 100_000_000:  # $100M+
        return 0, f"Major exploit: ${total_lost / 1e6:.0f}M lost"
    elif total_lost >= 10_000_000:  # $10M+
        return 5, f"Significant exploit: ${total_lost / 1e6:.0f}M lost"
    else:
        return 10, f"Minor exploit: ${total_lost / 1e6:.1f}M lost"


def _calculate_chain_score(source: str, target: str) -> tuple[int, Optional[str]]:
    """Calculate chain maturity score (0-5 points)."""
    source_mature = source in MATURE_CHAINS
    target_mature = target in MATURE_CHAINS

    if source_mature and target_mature:
        return 5, None
    elif source_mature or target_mature:
        return 3, None
    else:
        return 1, "Route involves newer chain infrastructure"


def _score_to_risk_level(score: int) -> int:
    """
    Convert 0-100 score to 1-5 risk level.

    Higher score = safer, so higher score = lower risk level.
    """
    if score >= 90:
        return 1  # Very Safe
    elif score >= 75:
        return 2  # Safe
    elif score >= 60:
        return 3  # Moderate
    elif score >= 40:
        return 4  # Risky
    else:
        return 5  # Very Risky


def get_risk_level_label(risk_level: int) -> str:
    """Get human-readable label for risk level."""
    labels = {
        1: "Very Safe",
        2: "Safe",
        3: "Moderate",
        4: "Risky",
        5: "Very Risky",
    }
    return labels.get(risk_level, "Unknown")
