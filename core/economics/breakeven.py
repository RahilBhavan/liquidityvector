"""
Breakeven analysis for DeFi yield farming routes.

This is the SINGLE SOURCE OF TRUTH for breakeven calculations.
Frontend should NOT recalculate - use pre-generated data from API.
"""

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class BreakevenResult:
    """Complete breakeven analysis result with chart data."""

    # Core metrics
    breakeven_hours: float
    breakeven_days: float
    daily_yield_usd: float
    has_breakeven: bool

    # Pre-generated chart data for frontend
    chart_data: List[Dict[str, float]]

    # Additional context
    total_cost: float
    capital: float
    target_apy: float


def calculate_breakeven(
    total_cost: float,
    capital: float,
    target_apy: float,
    timeframe_days: int = 90,
    max_chart_points: int = 100,
) -> BreakevenResult:
    """
    Calculate breakeven with pre-generated chart data.

    This is the SINGLE SOURCE OF TRUTH for breakeven logic.
    The frontend should display chart_data directly without recalculation.

    Args:
        total_cost: Total round-trip cost in USD (entry + exit)
        capital: Capital amount in USD
        target_apy: Target pool APY as percentage (e.g., 10.0 for 10%)
        timeframe_days: Chart timeframe in days (extended if breakeven is later)
        max_chart_points: Maximum number of data points for chart

    Returns:
        BreakevenResult with all metrics and chart data
    """
    # Calculate daily yield in USD
    # Formula: capital * (APY% / 100) / 365
    daily_yield = (capital * (target_apy / 100)) / 365

    # Breakeven calculation
    if daily_yield > 0:
        breakeven_days = total_cost / daily_yield
        breakeven_hours = breakeven_days * 24
        has_breakeven = True
    elif total_cost <= 0:
        # No cost means immediate profitability
        breakeven_days = 0.0
        breakeven_hours = 0.0
        has_breakeven = True
    else:
        # Zero or negative yield with positive costs = never breaks even
        breakeven_days = float("inf")
        breakeven_hours = float("inf")
        has_breakeven = False

    # Determine chart timeframe
    # Extend to show breakeven point if it's beyond default timeframe
    if has_breakeven and breakeven_days < float("inf"):
        chart_timeframe = max(timeframe_days, int(breakeven_days * 1.5))
    else:
        chart_timeframe = timeframe_days

    # Generate chart data points
    chart_data = _generate_chart_data(
        total_cost=total_cost,
        daily_yield=daily_yield,
        timeframe_days=chart_timeframe,
        max_points=max_chart_points,
    )

    return BreakevenResult(
        breakeven_hours=breakeven_hours,
        breakeven_days=breakeven_days,
        daily_yield_usd=daily_yield,
        has_breakeven=has_breakeven,
        chart_data=chart_data,
        total_cost=total_cost,
        capital=capital,
        target_apy=target_apy,
    )


def _generate_chart_data(
    total_cost: float,
    daily_yield: float,
    timeframe_days: int,
    max_points: int = 100,
) -> List[Dict[str, float]]:
    """
    Generate profit trajectory data points for visualization.

    Creates evenly-spaced data points showing profit over time.
    Profit = (days * daily_yield) - total_cost

    Args:
        total_cost: Total cost in USD
        daily_yield: Daily yield in USD
        timeframe_days: Total days to generate
        max_points: Maximum data points (for performance)

    Returns:
        List of {day, profit} dictionaries
    """
    # Calculate number of points and step size
    num_points = min(timeframe_days + 1, max_points)
    step = timeframe_days / (num_points - 1) if num_points > 1 else 1

    data = []
    for i in range(num_points):
        day = round(i * step)
        # Profit = cumulative yield - initial cost
        profit = (day * daily_yield) - total_cost
        data.append({"day": day, "profit": round(profit, 2)})

    return data


def calculate_profit_at_day(
    day: int,
    daily_yield: float,
    total_cost: float,
) -> float:
    """
    Calculate net profit at a specific day.

    Args:
        day: Day number (0 = entry day)
        daily_yield: Daily yield in USD
        total_cost: Total round-trip cost in USD

    Returns:
        Net profit (negative if still below breakeven)
    """
    return (day * daily_yield) - total_cost


def calculate_30d_metrics(
    daily_yield: float,
    total_cost: float,
) -> Dict[str, float]:
    """
    Calculate standard 30-day profit metrics.

    Args:
        daily_yield: Daily yield in USD
        total_cost: Total round-trip cost in USD

    Returns:
        Dict with gross_profit_30d and net_profit_30d
    """
    gross_profit = daily_yield * 30
    net_profit = gross_profit - total_cost

    return {
        "gross_profit_30d": round(gross_profit, 2),
        "net_profit_30d": round(net_profit, 2),
    }
