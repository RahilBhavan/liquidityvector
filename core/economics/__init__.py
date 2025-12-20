"""
Economic calculations for DeFi yield optimization.

Provides:
- Round-trip cost calculations
- Breakeven analysis
- Profitability matrix generation
"""

from .costs import RoundTripCosts, calculate_round_trip_costs
from .breakeven import BreakevenResult, calculate_breakeven
from .profitability import generate_profitability_matrix

__all__ = [
    "RoundTripCosts",
    "calculate_round_trip_costs",
    "BreakevenResult",
    "calculate_breakeven",
    "generate_profitability_matrix",
]
