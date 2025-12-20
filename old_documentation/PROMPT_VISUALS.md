# Prompt: Implement Profit vs. Time Breakeven Chart

**Context:**
The application calculates a "Breakeven" point for DeFi yield migration (i.e., when the extra yield earned covers the cost of moving funds). Currently, this is displayed as text (e.g., "Breakeven in 7.3 days").

**Objective:**
We want to **visualize** this trajectory so users can intuitively understand their investment timeline. We need a Line Chart that starts at a negative value (the cost) and trends upward, crossing zero at the breakeven day.

---

## Instructions for the AI Assistant

Please implement a new React component to visualize the profitability curve.

### 1. Install Dependencies
If not already available, please use **Recharts** for the visualization. It is lightweight and composable.
`npm install recharts`

### 2. Create Component: `components/BreakevenChart.tsx`
Create a responsive line chart component with the following specifications:

*   **Props:**
    *   `migrationCost`: number (The initial cost, e.g., 50.00)
    *   `dailyYieldDelta`: number (The *extra* profit per day, e.g., 2.50)
    *   `timeframeDays`: number (Default to 30, or `breakevenDays * 1.5` if longer)

*   **Data Generation Logic:**
    *   Generate an array of data points for the X-axis (Days).
    *   **Formula:** `Profit = (Day * dailyYieldDelta) - migrationCost`
    *   **Day 0:** Should be ` -migrationCost`.
    *   **Breakeven Day:** The line should cross $0.

*   **Visual Style:**
    *   **X-Axis:** "Days"
    *   **Y-Axis:** "Net Profit ($)"
    *   **Reference Line:** Add a horizontal reference line at `y=0` to clearly mark the profitability threshold.
    *   **Colors:**
        *   Line color: A vibrant purple/indigo to match the theme (e.g., `#6366f1`).
        *   Grid: Subtle grey.
    *   **Tooltip:** Custom tooltip showing "Day X: $Y Profit".

### 3. Integrate into Dashboard
*   Update `components/Dashboard.tsx` to import and render `<BreakevenChart />`.
*   Place it inside the "Analysis" section, likely below the "Breakeven Time" text card.
*   Pass the calculated `totalCost` and `dailyYieldDelta` (derived from the API response or current mock logic) as props.

### 4. Example Data Structure
Ensure the chart handles the "No Profit" case gracefully (i.e., if `dailyYieldDelta <= 0`, show a flat or downward line indicating it never breaks even).

---

**Technical Constraint:**
*   Use Tailwind CSS for container styling (e.g., `w-full h-64`).
*   Ensure the chart is responsive (use `<ResponsiveContainer>`).
