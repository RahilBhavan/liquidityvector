# Version History

## [1.3.0] - 2025-12-22

### Portfolio Intelligence
- **Health Check System**: Implemented `useOpportunityCost` hook to detect idle wallet assets and calculate potential yield loss.
- **Visual Health Card**: Added "Capital Efficiency" status card to the Dashboard, alerting users to missed opportunities.
- **Real Asset Scanning**: Replaced mock data with `wagmi` integration to scan real user balances for top assets (USDC, DAI, WETH).

### Advanced Risk Engine
- **Risk-Adjusted APY**: Implemented heuristics to discount headline APY by estimated Impermanent Loss risk (e.g. 5.7% drag for volatile pairs).
- **Capital Efficiency Score**: New metric tracking `Return on Cost` to highlight low-fee/high-efficiency L2 routes.
- **Interactive Breakeven**: Added toggles to the Projections chart to visualize "IL Risk" scenarios against the baseline profit curve.

### UI/UX Refinements
- **Typography Overhaul**: Standardized all headers and labels to the Neo-Brutalist system (`Space Mono` for data, `Helvetica` for headers).
- **Specialized Cards**: Redesigned Dashboard stats into purpose-built cards (Market Pulse, Portfolio Health).

## [1.2.1] - 2025-12-21

### Infrastructure & Deployment
- Fixed Docker build failure by migrating from `npm ci` to `npm install` in `Dockerfile.frontend` to handle lockfile inconsistencies.
- Optimized frontend build stage with `build-base` and common native build dependencies for Alpine Linux.
- Implemented root-level `.dockerignore` to prevent host `node_modules` from polluting Docker build context.
- Added `react-is` dependency to resolve `Module not found` error during Turbopack production build.
- Enhanced environment variable handling for production deployment readiness.

## [1.2.0] - 2025-12-20

### Technical Updates
- Implemented "Minimalist" design system across the entire frontend stack.
- Refactored `Dashboard`, `Sidebar`, `Header`, and `RouteCard` to remove legacy high-contrast visual logic.
- Integrated deterministic risk scoring (V-Score) into the `RiskEngine` core.
- Optimized charting performance via component memoization and code splitting.

### Documentation Overhaul
- Transformed entire documentation suite to meet Senior Technical Documentation Architect standards.
- Removed all graphical emojis and placeholders to maintain professional density.
- Standardized documentation templates across README, Architecture, and API reference files.

## [1.1.0] - 2025-12-20

### Backend Initialization
- Launched FastAPI aggregation service with Docker containerization support.
- Implemented async scatter-gather data fetching pattern for external API dependencies.
- Integrated circuit breaker resilience layer via `pybreaker`.
- Developed initial economic modeling for breakeven calculations.

### Smart Contract Integration
- Deployed `BridgeRegistry` and `BridgeHealthChecker` for on-chain infrastructure monitoring.
- Established libraries for cross-chain risk classification.

## [1.0.0] - 2025-12-19

### Initial Release
- Core Next.js application framework established.
- Basic wallet integration via RainbowKit.
- Preliminary yield aggregation logic for Ethereum and L2 networks.