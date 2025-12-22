def generate_profitability_matrix(
    capital: float,
    total_cost: float,
    apy: float
) -> dict[str, dict[str, float]]:
    """
    Generates a matrix of Profit/Loss for different time horizons.
    Used for the heatmap visualization.
    """
    daily_yield = (capital * apy) / 365.0
    
    # Simple single-dimension check for now, expanded in full feature
    timeframes = [7, 30, 90]
    
    matrix = {}
    
    # In a full update, this would iterate over capital ranges too
    # For now, we return P/L for the current capital at different days
    capital_key = f"${int(capital)}"
    matrix[capital_key] = {}
    
    for days in timeframes:
        profit = (daily_yield * days) - total_cost
        matrix[capital_key][f"{days}d"] = round(profit, 2)
        
    return matrix
