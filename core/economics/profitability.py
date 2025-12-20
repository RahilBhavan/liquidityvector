"""
Profitability matrix generator for Heatmap visualization.

This module generates pre-calculated profitability data for various
capital amounts and time horizons. Frontend should display this directly.
"""

from typing import Dict, List, Optional
from .costs import calculate_cost_ratio


# Default configuration matching frontend Heatmap component
DEFAULT_CAPITAL_MULTIPLIERS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 5.0]
DEFAULT_TIME_HORIZONS = [7, 14, 30, 90, 180, 365]


def generate_profitability_matrix(
    base_capital: float,
    total_cost: float,
    target_apy: float,
    capital_multipliers: Optional[List[float]] = None,
    time_horizons: Optional[List[int]] = None,
) -> Dict[str, Dict[str, float]]:
    """
    Generate profitability matrix for the Heatmap component.

    Returns pre-calculated profits for all capital/time combinations.
    Frontend should display this directly, NOT recalculate.

    Args:
        base_capital: Original capital amount in USD
        total_cost: Total round-trip cost for base capital
        target_apy: Target pool APY as percentage
        capital_multipliers: List of multipliers (e.g., [0.5, 1.0, 2.0])
        time_horizons: List of day values (e.g., [7, 30, 90, 365])

    Returns:
        Nested dict: {multiplier: {days: profit}}
        Keys are strings for JSON compatibility
    """
    if capital_multipliers is None:
        capital_multipliers = DEFAULT_CAPITAL_MULTIPLIERS
    if time_horizons is None:
        time_horizons = DEFAULT_TIME_HORIZONS

    # Calculate cost ratio for proportional scaling
    cost_ratio = calculate_cost_ratio(total_cost, base_capital)

    matrix: Dict[str, Dict[str, float]] = {}

    for multiplier in capital_multipliers:
        # Scale capital
        sim_capital = base_capital * multiplier

        # Scale cost proportionally
        sim_cost = sim_capital * cost_ratio

        # Calculate daily yield for this capital level
        daily_yield = (sim_capital * (target_apy / 100)) / 365

        # Create time horizon entries
        matrix[str(multiplier)] = {}

        for days in time_horizons:
            # Gross profit = yield earned over time
            gross_profit = daily_yield * days

            # Net profit = gross - costs
            net_profit = gross_profit - sim_cost

            matrix[str(multiplier)][str(days)] = round(net_profit, 2)

    return matrix


def get_profitability(
    capital: float,
    cost_ratio: float,
    target_apy: float,
    days: int,
) -> float:
    """
    Calculate profitability for a single capital/time combination.

    Args:
        capital: Capital amount in USD
        cost_ratio: Cost as ratio of capital (e.g., 0.02 for 2%)
        target_apy: Target APY as percentage
        days: Time horizon in days

    Returns:
        Net profit in USD
    """
    # Total cost for this capital level
    total_cost = capital * cost_ratio

    # Daily yield
    daily_yield = (capital * (target_apy / 100)) / 365

    # Gross profit
    gross_profit = daily_yield * days

    # Net profit
    return gross_profit - total_cost


def find_minimum_profitable_capital(
    base_capital: float,
    total_cost: float,
    target_apy: float,
    target_days: int,
    precision: float = 100.0,
) -> Optional[float]:
    """
    Find the minimum capital needed to be profitable within target days.

    Uses binary search to find the threshold.

    Args:
        base_capital: Reference capital for cost ratio calculation
        total_cost: Total round-trip cost at base capital
        target_apy: Target APY as percentage
        target_days: Time horizon in days
        precision: USD precision for search

    Returns:
        Minimum capital needed, or None if no profitable point exists
    """
    cost_ratio = calculate_cost_ratio(total_cost, base_capital)

    # Binary search bounds
    low = precision
    high = base_capital * 10  # Upper bound at 10x base capital

    # Check if even max capital is profitable
    max_profit = get_profitability(high, cost_ratio, target_apy, target_days)
    if max_profit <= 0:
        return None

    # Binary search
    while high - low > precision:
        mid = (low + high) / 2
        profit = get_profitability(mid, cost_ratio, target_apy, target_days)

        if profit > 0:
            high = mid
        else:
            low = mid

    return round(high, 2)


def get_configuration() -> Dict[str, List]:
    """
    Return default configuration for matrix generation.

    Useful for frontend to know what dimensions to expect.
    """
    return {
        "capital_multipliers": DEFAULT_CAPITAL_MULTIPLIERS,
        "time_horizons": DEFAULT_TIME_HORIZONS,
    }
