# Liquidity Vector - Cross-Chain Yield Arbitrage Engine

## Purpose & Scope
Liquidity Vector is a deterministic financial execution engine designed to quantify and optimize cross-chain yield arbitrage strategies. The system unbundles the "friction trap" of DeFi rotations by calculating institutional-grade breakeven horizons, accounting for round-trip gas costs, bridge slippage, and time-to-liquidity. Its scope is limited to stablecoin yield analysis across EVM-compatible networks, providing a binary decision framework for capital rotation.

## Core Architecture
The system employs a hybrid microservices topology:
- **Computation Engine (FastAPI/Python 3.11)**: Orchestrates asynchronous data aggregation from multiple RPC providers and DeFi primitives. Implements vectorized economic modeling for sub-millisecond profitability simulations.
- **Presentation Layer (Next.js 15)**: A human-centered interface optimized for cognitive focus, utilizing server-side rendering (SSR) for shell integrity and client-side hydration for real-time interactivity.
- **Data Layer (Stateless)**: Real-time fanned-out queries to DeFiLlama (Yield), Li.Fi (Bridging), and decentralized RPC nodes (Gas/State).

## Key Technical Decisions
- **Python for Economic Core**: Selected for NumPy-based vectorization capabilities, enabling the simultaneous simulation of 30+ capital/time scenarios in under 2ms.
- **Asyncio Scatter-Gather**: Backend service utilizes non-blocking I/O to query 6+ external endpoints concurrently, reducing total request latency from ~4.5s to <800ms.
- **Statelessness**: The system maintains no persistent database for core analytics, ensuring infinite horizontal scalability and simplified deployment cycles.
- **Circuit Breaker Integration**: Employs the pybreaker pattern to mitigate cascading failures from upstream RPC or API timeouts.

## Prerequisites & Dependencies
- **Runtime**: Docker 24.0+, Docker Compose 2.20+
- **Backend**: Python 3.11, FastAPI 0.109+, Httpx 0.26+
- **Frontend**: Node.js 20.x, Next.js 15.1, Tailwind CSS 3.4
- **Blockchain**: Alchemy/Infura API keys (optional), WalletConnect Project ID

## 🚀 Deployment

### **Docker (Recommended)**
Run the entire stack (Frontend + API) with a single command:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
- **UI**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:8000](http://localhost:8000)

### **Railway Deployment**
This project is optimized for deployment on [Railway](https://railway.app/).

1.  **Create Two Services**: Create one service for the Frontend and one for the Backend.
2.  **Frontend Configuration**:
    - **Source**: Root directory.
    - **Dockerfile**: `Dockerfile.frontend`.
    - **Env Vars**: Set `NEXT_PUBLIC_BACKEND_URL` to your Backend's Railway URL.
3.  **Backend Configuration**:
    - **Source**: `./api` directory.
    - **Dockerfile**: `api/Dockerfile`.
    - **Env Vars**: Set `ALLOWED_ORIGINS` to your Frontend's Railway URL.

---

## 🔧 Environment Configuration

## Development Workflow
- **Linting**: Enforced via ESLint (Frontend) and Black (Backend).
- **Testing**: Frontend unit tests via Vitest; Backend integration tests via Pytest.
- **CI/CD**: GitHub Actions pipeline validates linting, test coverage, and build success on every PR to `main` or `develop`.

## Deployment Topology
The system is designed for containerized orchestration.
- **Frontend Container**: Serving standalone Next.js build via Node.js runner.
- **API Container**: Serving FastAPI via Uvicorn with multiple worker processes.
- **Reverse Proxy**: Nginx (optional) for TLS termination and header normalization.

## Monitoring & Observability
- **Health Checks**: `/health` endpoint exposes circuit breaker states and service uptime.
- **Logging**: Structured JSON logging implemented in the FastAPI backend for ELK/Datadog ingestion.
- **Performance**: Lighthouse metrics monitored for Core Web Vitals (Target: LCP < 1.2s, CLS 0.00).

## Security Considerations
- **V-Score Algorithm**: A 100-point deterministic risk model evaluating bridge architecture (25%), protocol maturity (20%), TVL depth (20%), exploit history (20% penalty), contract verification (10%), and chain maturity (5%).
- **CORS Policy**: Strictly enforced via `ALLOWED_ORIGINS` environment variables.
- **Input Validation**: Pydantic models enforce strict schema validation for all API ingress points.

## Performance Characteristics
- **Matrix Generation**: < 2ms for a 6x5 profitability grid.
- **Request Latency**: p95 < 800ms under standard network conditions.
- **Throughput**: ~500 req/sec per backend instance (t3.medium baseline).
