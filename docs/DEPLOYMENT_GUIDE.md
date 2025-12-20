# Full Production Deployment Guide

This guide outlines the end-to-end process for deploying the LiquidityVector application to a production environment. It covers Smart Contracts, Backend API, and the Next.js Frontend.

## 📋 Prerequisites

*   **Cloud Provider Account**: AWS, Google Cloud, or DigitalOcean (for VPS/Container hosting).
*   **Vercel Account**: (Recommended) For Frontend hosting.
*   **Ethereum Wallet**: Private key with funds (Sepolia ETH for testnet, Real ETH/USDC for mainnet).
*   **RPC URL**: Access to an Ethereum node (e.g., Alchemy, Infura).
*   **Domain Name**: (Optional) For custom DNS.

---

## 🏗 Phase 1: Smart Contracts (Foundry)

Before deploying the app, the contracts must be live on-chain so the API and Frontend can reference them.

### 1. Configuration
Ensure your `.env` (or CI secrets) contains:
```bash
PRIVATE_KEY=0x...
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
ETHERSCAN_API_KEY=... # For verification
```

### 2. Deployment Command
Run this from the `contracts/` directory:

```bash
# Deploy to Sepolia Testnet
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --verify

# Capture the deployed addresses!
# You will need these for the Frontend and Backend config.
```

---

## 🚀 Phase 2: Backend API (Docker/Cloud)

The backend is a Python FastAPI service. We recommend deploying it as a Docker container.

### Option A: Docker Compose on VPS (DigitalOcean/EC2)

1.  **Provision Server**: Ubuntu 22.04 LTS with Docker & Docker Compose installed.
2.  **Clone & Configure**:
    ```bash
    git clone https://github.com/YourOrg/liquidityvector.git
    cd liquidityvector
    
    # Create Production Env File
    cp .env.example .env.production
    nano .env.production
    # Set ENVIRONMENT=production
    # Set ALLOWED_ORIGINS=https://your-frontend-domain.com
    ```
3.  **Start Service**:
    ```bash
    docker-compose -f api/docker-compose.yml up -d --build
    ```
4.  **Setup SSL (Caddy/Nginx)**:
    *   Use a reverse proxy like Caddy to handle HTTPS automatically.
    *   Expose port 443 -> Container port 8000.

### Option B: Cloud Run / AWS App Runner (Serverless Container)

1.  **Build & Push Image**:
    ```bash
    docker build -t gcr.io/your-project/api:latest api/
    docker push gcr.io/your-project/api:latest
    ```
2.  **Deploy**:
    *   Select the image.
    *   Set Environment Variables (`ALLOWED_ORIGINS`, `RPC_URL`).
    *   Map port 8000.

---

## 🌐 Phase 3: Frontend (Next.js)

The frontend connects users to the backend and the blockchain.

### Option A: Vercel (Recommended)

1.  **Connect Repo**: Import the GitHub repository into Vercel.
2.  **Build Settings**:
    *   Framework: Next.js
    *   Root Directory: `./`
    *   Build Command: `npm run build`
    *   Output Directory: `.next`
3.  **Environment Variables**:
    *   `NEXT_PUBLIC_BACKEND_URL`: The URL of your deployed Backend (Phase 2).
    *   `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your project ID.
    *   `NEXT_PUBLIC_API_BASE_URL`: `/api/backend` (if using Vercel Rewrites) or full URL.
4.  **Deploy**: Click "Deploy". Vercel handles SSL and CDN.

### Option B: Docker

1.  **Build Container**:
    ```bash
    docker build -t frontend:latest .
    ```
2.  **Run**:
    ```bash
    docker run -p 3000:3000 -e NEXT_PUBLIC_BACKEND_URL=... frontend:latest
    ```

---

## 🔄 Phase 4: CI/CD Pipeline Integration

Ensure your GitHub Actions (`.github/workflows/ci.yml`) are configured to automate this:

1.  **Secrets**: Add `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_KEY` (for VPS) or Cloud Credentials to GitHub Secrets.
2.  **Continuous Deployment**:
    *   Add a step to `ci.yml` that runs on `push` to `main`:
    *   **Frontend**: Vercel automatically deploys on push.
    *   **Backend**: Add a step to `docker push` and trigger a web-hook or SSH command to update the server.

---

## 🛡️ Phase 5: Verification & Monitoring

1.  **Health Check**:
    ```bash
    curl https://api.yourdomain.com/health
    # Expected: {"status": "healthy", ...}
    ```
2.  **Alert Verification**:
    ```bash
    curl https://api.yourdomain.com/debug/test-alert
    # Confirm your monitoring system (Slack/PagerDuty) received the notification.
    ```
3.  **Frontend Smoke Test**:
    *   Visit the site.
    *   Connect Wallet.
    *   Verify data loads from the API.

## 🆘 Rollback

See [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md) for detailed steps on reverting changes if deployment fails.
