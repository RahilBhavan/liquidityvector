# Technical Specification: System Architecture

## Overview
Liquidity Vector utilizes a decoupled, hybrid microservices architecture designed for high-concurrency financial simulations. The system explicitly separates data aggregation and mathematical modeling (Python) from the interactive presentation layer (Next.js), ensuring that computation-heavy workloads do not block the user interface.

## Computation Engine (Backend)
The computation engine is built using **FastAPI** and **Python 3.11**. It functions as a stateless orchestration layer.

### Async Aggregator Service
The `AggregatorService` manages the lifecycle of a route analysis request. It implements a non-blocking scatter-gather pattern to minimize total latency.
- **Concurrency**: Leverages `asyncio.gather` to fetch gas prices, bridge quotes, and yield metrics simultaneously.
- **Resilience**: Integrated circuit breakers (`pybreaker`) monitor the error rates of external dependencies (e.g., Li.Fi, DeFiLlama).
- **Timeouts**: Aggregated requests are bounded by a 1.5s timeout to maintain p95 latency targets.

### Economic Modeling Core
The core logic resides in `core/economics/` and is strictly deterministic.
- **Profitability Matrix**: Utilizes NumPy-style broadcasting to generate a multidimensional grid of outcomes (Capital x Time).
- **NPV Calculation**: Implements Net Present Value logic to account for round-trip friction costs (Entry Gas + Bridge Fee + Slippage + Exit Gas).

## Presentation Layer (Frontend)
The frontend is implemented with **Next.js 15** and **React 19**, focusing on cognitive clarity and low interaction latency.

### Rendering Strategy
- **React Server Components (RSC)**: Used for initial shell rendering and SEO optimization.
- **Client-Side Hydration**: Interactive charts (`Recharts`) and wallet synchronization (`Wagmi`) are hydrated on the client.
- **Code Splitting**: The `InfrastructureModal` and complex SVG charts are lazy-loaded to minimize initial bundle size.

## Data Schema & Models
The system enforces strict type safety across the stack using Pydantic (Backend) and TypeScript (Frontend).

### Core Analysis Model
```typescript
interface RouteCalculation {
  targetPool: Pool;
  bridgeCost: number;
  gasCost: number;
  totalCost: number;
  breakevenHours: number;
  netProfit30d: number;
  riskLevel: number;
  bridgeMetadata: BridgeMetadata | null;
  profitabilityMatrix: Record<string, Record<string, number>>;
}
```

## Internal API Communication
Communication between the presentation and computation layers is conducted via a RESTful JSON API.
- **Security**: The backend enforces a strict CORS policy and Pydantic-based ingress validation.
- **Caching**: The `apiService.ts` implements a TTL-based cache (30s) to prevent redundant network calls during rapid parameter toggling.

## External Service Integration
The system aggregates data from five primary categories of external providers:
1. **Yield Data**: DeFiLlama (REST)
2. **Bridge Quotes**: Li.Fi (REST)
3. **Chain State/Gas**: Decentralized RPC Nodes (JSON-RPC)
4. **Contract Info**: Etherscan/Arbiscan (REST)
5. **Historical Hacks**: Internal REKT Knowledge Base (Static JSON)
