# Liquidity Vector
### Cross-Chain Yield Arbitrage Engine

![Status](https://img.shields.io/badge/Status-Operational-005C42) ![Version](https://img.shields.io/badge/Version-2.0.0-0038A8) ![License](https://img.shields.io/badge/License-MIT-C7B299)

Liquidity Vector is a deterministic financial execution engine designed to optimize cross-chain yield arbitrage strategies. The system unbundles the "friction trap" of DeFi rotations by calculating institutional-grade breakeven horizons.

This version (v2.0 "Digital Philately") introduces a complete redesign featuring a Risograph-inspired aesthetic, improved backend performance via Redis/uvloop, and a simplified ERC-4626 vault architecture.

---

## 🎨 Design System: "Digital Philately"
The interface mimics high-precision printed artifacts (stamps, tickets, labels) on a neutral paper background.
- **Palette**: Paper White (`#F4F1EA`), Sumi Black (`#111111`), International Orange (`#FF2E00`).
- **Typography**: `Helvetica` (Headlines) and `Space Mono` (Data).
- **Physics**: CSS-based "Sawtooth" edges for stamp components.

## 🏗 Architecture

### Hybrid Topology
- **Frontend (Presentation)**: Next.js 15 (App Router), Zustand, TanStack Query, Tailwind CSS. Hosted on Vercel.
- **Backend (Computation)**: Python 3.11, FastAPI, uvloop, orjson, Redis. Hosted on Railway.
- **Smart Contracts (Execution)**: Solidity 0.8.24, Foundry, ERC-4626.

### Directory Structure
```
/
├── api/                    # FastAPI Backend
│   ├── core/               # Configuration & Cache logic
│   ├── ...
├── src/                    # Frontend (Next.js)
│   ├── features/           # Feature Modules (Dashboard, etc)
│   ├── components/         # Shared UI (including StampCard)
│   ├── app/                # App Router
├── contracts/              # Foundry Project
│   ├── src/                # Smart Contracts (LiquidityVault)
│   ├── script/             # Deployment Scripts
│   ├── test/               # Forge Tests
└── ...
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Foundry (for contracts)

### Development
1. **Infrastructure (Redis)**
   ```bash
   docker-compose up -d redis
   ```

2. **Backend**
   ```bash
   cd api
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

3. **Frontend**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`.

4. **Smart Contracts**
   ```bash
   cd contracts
   forge build
   forge test
   ```

---

## 📦 Deployment

### Backend (Railway)
The `api/Dockerfile` is optimized for production. Ensure the following environment variables are set in Railway:
- `REDIS_URL`: Connection string for Redis.
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins.

### Frontend (Vercel)
The project is configured for Vercel. Ensure the following environment variables are set:
- `NEXT_PUBLIC_BACKEND_URL`: URL of your deployed Railway backend.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect ID.

### Smart Contracts
Use the provided script to deploy the `LiquidityVault` and monitoring infrastructure:
```bash
forge script contracts/script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
```

---

## 🔒 Security
- **V-Score**: Proprietary risk scoring algorithm for protocol monitoring.
- **CSP**: Strict Content Security Policy headers enabled.
- **Audits**: Contracts are currently **UNAUDITED**. Use at your own risk.

## 📄 License
MIT
