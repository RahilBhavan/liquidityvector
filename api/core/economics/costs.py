from pydantic import BaseModel

class RoundTripCosts(BaseModel):
    entry_bridge_fee: float
    entry_source_gas: float
    entry_dest_gas: float
    entry_total: float
    exit_bridge_fee: float
    exit_source_gas: float
    exit_dest_gas: float
    exit_total: float
    total_round_trip: float

def calculate_round_trip_costs(
    entry_bridge_fee: float,
    entry_source_gas: float,
    entry_dest_gas: float,
    exit_bridge_fee: float,
    exit_source_gas: float,
    exit_dest_gas: float,
    symmetric: bool = False
) -> RoundTripCosts:
    """
    Calculates the total cost structure for entering and exiting a position.
    """
    entry_total = entry_bridge_fee + entry_source_gas + entry_dest_gas
    
    # If explicitly symmetric assumption is permitted, reusing entry costs for exit
    if symmetric:
        exit_total = entry_total
        exit_bridge_fee = entry_bridge_fee
        exit_source_gas = entry_source_gas
        exit_dest_gas = entry_dest_gas
    else:
        exit_total = exit_bridge_fee + exit_source_gas + exit_dest_gas

    return RoundTripCosts(
        entry_bridge_fee=entry_bridge_fee,
        entry_source_gas=entry_source_gas,
        entry_dest_gas=entry_dest_gas,
        entry_total=entry_total,
        exit_bridge_fee=exit_bridge_fee,
        exit_source_gas=exit_source_gas,
        exit_dest_gas=exit_dest_gas,
        exit_total=exit_total,
        total_round_trip=entry_total + exit_total
    )
