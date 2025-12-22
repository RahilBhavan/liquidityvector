from pydantic import BaseModel

class RiskScore(BaseModel):
    overall_score: int
    breakdown: dict[str, int | str]

def calculate_risk_score(
    bridge_type: str,
    tvl_usd: float,
    age_years: float,
    has_exploits: bool,
    exploit_total_lost: float = 0.0,
    is_contract_verified: bool = True,
    source_chain: str = "",
    target_chain: str = ""
) -> RiskScore:
    """
    Calculates the V-Score for a given protocol based on the architecture guidelines.
    
    Weights:
    - Bridge Type (Architecture): 25%
    - TVL (Liquidity): 20%
    - Age (Maturity): 20%
    - Verification: 10%
    - Chain Maturity: 5%
    - History (Exploits): Penalty
    """
    score = 0.0
    
    # 1. Architecture (25pts)
    if bridge_type == "Native" or bridge_type == "Canonical":
        score += 25
    elif bridge_type == "Trust-minimized":
        score += 20
    elif bridge_type == "Liquidity Network":
        score += 15
    elif bridge_type == "External Validator":
        score += 10
    else:
        score += 5

    # 2. TVL (20pts)
    if tvl_usd > 1_000_000_000: # > 1B
        score += 20
    elif tvl_usd > 100_000_000: # > 100M
        score += 15
    elif tvl_usd > 10_000_000: # > 10M
        score += 10
    elif tvl_usd > 1_000_000: # > 1M
        score += 5
    
    # 3. Age (20pts)
    if age_years > 4:
        score += 20
    elif age_years > 2:
        score += 15
    elif age_years > 1:
        score += 10
    else:
        score += 5

    # 4. Verification (10pts)
    if is_contract_verified:
        score += 10

    # 5. Chain Maturity (5pts)
    # Give full points for now, can clarify logic later
    score += 5

    # 6. Exploit Penalty
    if has_exploits:
        # Severe penalty for exploits
        score -= 40
        if exploit_total_lost > 10_000_000:
            score -= 20 # Extra penalty for massive losses

    # Cap score
    final_score = max(0, min(100, int(score)))

    return RiskScore(
        overall_score=final_score,
        breakdown={
            "type": bridge_type,
            "tvl": f"${tvl_usd:,.0f}",
            "age": f"{age_years} yrs",
            "exploits": "YES" if has_exploits else "None"
        }
    )
