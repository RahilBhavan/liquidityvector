# Deployment Specification: Infrastructure & Operations

## Overview
This document specifies the production deployment topology and operational requirements for the Liquidity Vector system. The system is designed for containerized orchestration to ensure environment parity across staging and production.

## Prerequisites
- **Docker**: Version 24.0 or higher.
- **Docker Compose**: Version 2.20 or higher.
- **Vercel CLI**: (Optional) For frontend-only deployments.
- **RPC Access**: API keys for Alchemy or Infura (Ethereum, Arbitrum, Base, Optimism).

## Deployment Topology
The system utilizes a three-tier containerized structure:
1. **Presentation Layer**: Next.js 15 standalone build.
2. **Logic Layer**: FastAPI backend with Uvicorn workers.
3. **Orchestration**: Docker Compose for service networking and dependency management.

## Environment Configuration
The following variables must be defined in the production environment:

| Category | Variable | Purpose |
| :--- | :--- | :--- |
| **Frontend** | `NEXT_PUBLIC_API_BASE_URL` | Endpoint for the FastAPI logic layer. |
| **Frontend** | `NEXT_PUBLIC_GEMINI_API_KEY` | Key for AI-powered advisory features. |
| **Backend** | `ALLOWED_ORIGINS` | CORS whitelist for the presentation layer. |
| **Blockchain**| `MAINNET_RPC_URL` | Provider for Ethereum gas estimation. |

## Deployment Procedure

### Phase 1: Smart Contract Deployment (Foundry)
1. Navigate to the `contracts/` directory.
2. Execute the deployment script:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --verify
```

### Phase 2: Backend API Initialization
1. Build the backend image:
```bash
docker build -t liquidityvector-api:latest ./api
```
2. Initialize the container:
```bash
docker run -d -p 8000:8000 --env-file .env liquidityvector-api:latest
```

### Phase 3: Frontend Deployment
1. Build and serve the Next.js standalone application:
```bash
docker build -t liquidityvector-web:latest .
docker run -d -p 3000:3000 liquidityvector-web:latest
```

## Monitoring & Health Checks
Active monitoring is conducted via the `/health` endpoint on the API layer.
- **Circuit State**: Exposes if external API circuits (Li.Fi, DeFiLlama) are open or closed.
- **Latency Monitoring**: API request timers track external provider performance.

## Verification
1.  **Health Check**:
    ```bash
    curl https://api.rahilbhavan.com/health
    ```
2.  **Alert Verification**:
    ```bash
    curl https://api.rahilbhavan.com/debug/test-alert
    ```