# 💧 Liquidity Vector

**The Intelligent DeFi Decision Engine.**  
Optimize your cross-chain capital allocation with real-time breakeven analysis, AI risk scoring, and a human-centered interface.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-blue)](https://www.docker.com/)

---

## 🎯 The Problem
DeFi yields are fragmented. While high APYs on new chains are tempting, the "friction costs"—gas fees, bridge tolls, slippage, and time—often make rotation unprofitable for smaller capital sizes.

**Liquidity Vector** answers the critical question: *"Is it worth moving my money?"*

---

## ✨ Key Innovations

### 📈 Multi-Dimensional Breakeven Engine
Calculates the exact **Breakeven Horizon** (in days/hours) for any rotation. It accounts for:
- Round-trip gas costs (Source + Destination).
- Bridge fees and estimated slippage.
- Opportunity cost of time-to-liquidity.

### 🛡️ Security Dossiers (Real-World Intel)
Moves beyond raw numbers to provide qualitative risk assessment.
- **V-Score**: A 1-100 security rating based on bridge architecture, TVL depth, and Lindy Effect.
- **Historical Context**: Built-in data on major historical exploits (e.g., Multichain $126M, Wormhole $320M) to warn users about fragile infrastructure.

### 🍏 Apple-Inspired Minimalist UI
A radical departure from cluttered DeFi dashboards. Optimized for **Focus** and **Empathy**:
- Glassmorphism effects for visual depth.
- Generous whitespace to reduce cognitive load.
- Seamless "Vibe Shifts" between Monochrome, Amber, and Green terminal themes.

---

## 🏗️ Technical Architecture

### **The Engine (Backend: Python/FastAPI)**
- **Async Aggregator**: Concurrently queries multiple RPC nodes and bridge APIs (Li.Fi) using `asyncio` for sub-second analysis.
- **Economic Model**: Implements vectorized profitability matrices to simulate 30+ scenarios (Time x Capital) instantly.
- **Resilience Layer**: Robust circuit breakers and TTL caching to handle blockchain RPC instability.

### **The Interface (Frontend: Next.js/React)**
- **Real-time Visualization**: High-performance Area Charts (Recharts) showing profit accumulation zones.
- **Web3 Ready**: Integrated with **RainbowKit** and **Wagmi** for seamless wallet connectivity and chain synchronization.
- **Vibe Coding Workflow**: Built using high-level architectural direction and rapid AI-assisted iteration cycles.

---

## 🚀 Quick Start

### **Docker (Recommended)**
Run the entire stack (Frontend + API) with a single command:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
- **UI**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:8000](http://localhost:8000)

### **Manual Setup**
1. **Backend**:
   ```bash
   pip install -r api/requirements.txt
   uvicorn api.main:app --reload
   ```
2. **Frontend**:
   ```bash
   npm install
   npm run dev
   ```

---

## 🧠 Methodology: Vibe Coding
This project was developed using the **Vibe Coding** philosophy:
1. **Architect as Pilot**: Defining high-level system design and unique value propositions.
2. **AI as Navigator**: Using state-of-the-art AI agents to handle boilerplate, CSS implementation, and complex data normalization.
3. **Rapid Pivot**: Demonstrating the agility to completely refactor the design system from "Retro Terminal" to "Modern Minimalist" in a single development session.

---

## 📁 Project Structure
- `/api`: FastAPI backend and aggregator logic.
- `/app`: Next.js 15 frontend with the Apple Minimalist design system.
- `/core`: Core economic modeling and risk scoring modules.
- `/contracts`: (Optional) Solidity monitors for bridge health.
- `/docs`: Detailed project analysis and strategic release guides.

---

## 🙏 Acknowledgments
- **DeFiLlama** for institutional-grade yield data.
- **Li.Fi** for cross-chain bridge aggregation.
- **RainbowKit** for the world-class wallet experience.

---

<div align="center">
  <strong>Built for the future of capital efficiency.</strong>
</div>