# Deployment Specification: Infrastructure & Operations

## Overview
Liquidity Vector utilizes a decoupled deployment strategy to optimize for scalability and developer experience. The frontend is hosted on **Vercel** for global edge performance, while the backend logic engine is hosted on **Railway** for robust container orchestration.

## Prerequisites
- **Railway Account**: For logic layer orchestration.
- **Vercel Account**: For presentation layer hosting.
- **RPC Access**: API keys for Alchemy or Infura (Ethereum, Arbitrum, Base, Optimism).

## Deployment Topology
The system utilizes a two-tier strictly separated structure:
1. **Presentation Layer (Vercel)**: Next.js 15 application deployed directly from the repository root.
2. **Logic Layer (Railway)**: FastAPI backend deployed via Docker using the `api/Dockerfile`.

## Environment Configuration

### Frontend (Vercel)
| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_BACKEND_URL` | The public URL of the Railway backend (e.g., `https://api.rahilbhavan.com`). |
| `NEXT_PUBLIC_API_BASE_URL` | Set to `/api/backend` to utilize the Next.js proxy. |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Google Gemini API key for advisory logic. |

### Backend (Railway)
| Variable | Purpose |
| :--- | :--- |
| `ALLOWED_ORIGINS` | CORS whitelist set to the Vercel frontend URL. |
| `ENVIRONMENT` | Set to `production`. |
| `RPC_URL_*` | Premium RPC endpoints for gas and state queries. |

## Deployment Procedure

### Phase 1: Smart Contract Deployment (Foundry)
1. Navigate to the `contracts/` directory.
2. Execute the deployment script:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --verify
```

### Phase 2: Backend Deployment (Railway)
1. Point your Railway service to the GitHub repository.
2. Ensure `railway.json` is present in the root; it will automatically trigger the build using `api/Dockerfile`.
3. Configure the environment variables in the Railway dashboard.

### Phase 3: Frontend Deployment (Vercel)
1. Import the repository into Vercel.
2. Add the frontend environment variables.
3. Vercel will automatically detect the Next.js project and deploy.

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