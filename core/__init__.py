"""
Core business logic library for Liquidity Vector.

This package contains all business logic that is shared across:
- API backend
- Future CLI tool
- Any other consumers

All calculations should be performed here, not in the frontend.
"""

from .economics import breakeven, costs, profitability
from .risk import engine, scoring

__all__ = [
    "breakeven",
    "costs",
    "profitability",
    "engine",
    "scoring",
]
