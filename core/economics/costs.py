"""
Round-trip cost calculations for DeFi yield farming.

This module provides accurate cost calculation that includes both
entry (bridge in) and exit (bridge out) costs for realistic breakeven analysis.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RoundTripCosts:
    """Complete round-trip cost breakdown for a yield farming route."""

    # Entry costs (moving capital to destination chain)
    entry_bridge_fee: float
    entry_source_gas: float
    entry_dest_gas: float
    entry_total: float

    # Exit costs (returning capital to original chain)
    exit_bridge_fee: float
    exit_source_gas: float  # Now the destination chain
    exit_dest_gas: float  # Now the original source chain
    exit_total: float

    # Combined totals
    total_round_trip: float

    # Convenience accessors
    one_way_cost: float
    symmetric_cost: float


def calculate_round_trip_costs(
    entry_bridge_fee: float,
    entry_source_gas: float,
    entry_dest_gas: float,
    exit_bridge_fee: Optional[float] = None,
    exit_source_gas: Optional[float] = None,
    exit_dest_gas: Optional[float] = None,
    symmetric: bool = True,
) -> RoundTripCosts:
    """
    Calculate complete round-trip costs for yield farming.

    For accurate breakeven analysis, we must account for the full cost of:
    1. Moving capital TO the destination chain (entry)
    2. Moving capital BACK to the original chain (exit)

    Args:
        entry_bridge_fee: Bridge protocol fee for entry (one-way)
        entry_source_gas: Gas cost on source chain for approval + deposit
        entry_dest_gas: Gas cost on destination chain for claiming + deposit
        exit_bridge_fee: Bridge fee for exit (optional, defaults to entry fee)
        exit_source_gas: Gas on exit source (optional, defaults to swapped)
        exit_dest_gas: Gas on exit destination (optional, defaults to swapped)
        symmetric: If True, exit costs mirror entry costs with swapped gas

    Returns:
        RoundTripCosts with complete breakdown
    """
    # Calculate entry total
    entry_total = entry_bridge_fee + entry_source_gas + entry_dest_gas

    # Calculate exit costs
    if symmetric:
        # Symmetric assumption: exit mirrors entry
        # Bridge fee is the same
        # Gas costs swap (destination becomes source and vice versa)
        _exit_bridge_fee = entry_bridge_fee
        _exit_source_gas = entry_dest_gas  # Was dest, now source
        _exit_dest_gas = entry_source_gas  # Was source, now dest
    else:
        # Use provided exit costs or default to mirrored
        _exit_bridge_fee = exit_bridge_fee if exit_bridge_fee is not None else entry_bridge_fee
        _exit_source_gas = exit_source_gas if exit_source_gas is not None else entry_dest_gas
        _exit_dest_gas = exit_dest_gas if exit_dest_gas is not None else entry_source_gas

    exit_total = _exit_bridge_fee + _exit_source_gas + _exit_dest_gas
    total_round_trip = entry_total + exit_total

    return RoundTripCosts(
        # Entry
        entry_bridge_fee=entry_bridge_fee,
        entry_source_gas=entry_source_gas,
        entry_dest_gas=entry_dest_gas,
        entry_total=entry_total,
        # Exit
        exit_bridge_fee=_exit_bridge_fee,
        exit_source_gas=_exit_source_gas,
        exit_dest_gas=_exit_dest_gas,
        exit_total=exit_total,
        # Combined
        total_round_trip=total_round_trip,
        one_way_cost=entry_total,
        symmetric_cost=total_round_trip,
    )


def calculate_cost_ratio(total_cost: float, capital: float) -> float:
    """
    Calculate cost as a ratio of capital.

    Useful for scaling costs proportionally in simulations.

    Args:
        total_cost: Total USD cost
        capital: Capital amount in USD

    Returns:
        Cost ratio (e.g., 0.02 for 2% cost)
    """
    if capital <= 0:
        return 0.0
    return total_cost / capital
