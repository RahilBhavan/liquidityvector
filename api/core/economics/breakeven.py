from pydantic import BaseModel

class BreakevenResult(BaseModel):
    daily_yield_usd: float
    breakeven_hours: float
    breakeven_days: float
    chart_data: list[dict]

def calculate_breakeven(
    total_cost: float,
    capital: float,
    apy: float
) -> BreakevenResult:
    """
    Calculates the time required to recover costs from yield.
    Formula: Breakeven (Days) = Cost / (Capital * (APY/365))
    """
    if capital <= 0 or apy <= 0:
        return BreakevenResult(
            daily_yield_usd=0,
            breakeven_hours=9999,
            breakeven_days=999,
            chart_data=[]
        )

    annual_yield = capital * apy
    daily_yield = annual_yield / 365.0
    hourly_yield = daily_yield / 24.0

    if daily_yield == 0:
         return BreakevenResult(
            daily_yield_usd=0,
            breakeven_hours=9999,
            breakeven_days=999,
            chart_data=[]
        )

    breakeven_days = total_cost / daily_yield
    breakeven_hours = total_cost / hourly_yield

    # Generate simple projection chart data (30 days)
    chart_data = []
    for day in range(1, 31):
        profit = (daily_yield * day) - total_cost
        chart_data.append({"day": day, "profit": profit})

    return BreakevenResult(
        daily_yield_usd=daily_yield,
        breakeven_hours=round(breakeven_hours, 1),
        breakeven_days=round(breakeven_days, 1),
        chart_data=chart_data
    )
