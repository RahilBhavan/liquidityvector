# LiquidityVector

<div align="center">
<img width="1200" height="475" alt="LiquidityVector Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**A DeFi decision engine that analyzes stablecoin yields across blockchains to calculate breakeven times for capital rotation, featuring Gemini AI risk analysis.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Smart Contracts](#smart-contracts)
- [Risk Analysis System](#risk-analysis-system)
- [Frontend Features](#frontend-features)
- [Configuration](#configuration)
- [Development](#development)

---

## 🎯 Overview

LiquidityVector is a sophisticated cross-chain yield optimization platform that helps DeFi users make informed decisions about moving capital between blockchains. The platform combines real-time yield data, advanced gas cost estimation, bridge fee analysis, and AI-powered risk assessment to determine whether a cross-chain capital rotation is profitable.

### Core Problem It Solves

When considering moving capital from one blockchain to another for better yields, users need to answer:
- **Is it worth it?** After accounting for gas fees and bridge costs, will the higher yield actually result in net profit?
- **How long until breakeven?** When will the additional yield cover the migration costs?
- **What are the risks?** Are the bridges and protocols safe to use?
- **What's the 30-day projection?** What's the expected net profit over a month?

LiquidityVector answers all these questions with institutional-grade calculations and real-time data.

---

## ✨ Key Features

### 🔍 **Real-Time Yield Aggregation**
- Fetches live USDC yield opportunities from DeFiLlama across 7+ major chains
- Filters pools by TVL ($10M+ minimum) and APY
- Ranks opportunities by profitability

### 💰 **Advanced Cost Analysis**
- **EIP-1559 Gas Estimation**: Uses Exponential Moving Average (EMA) and variance calculation for accurate fee prediction
- **Bridge Fee Quoting**: Integrates with Li.Fi for real-time bridge quotes
- **Round-Trip Cost Calculation**: Accounts for both entry and exit costs
- **Cost Breakdown**: Detailed breakdown of gas costs (source + destination) and bridge fees

### 📊 **Breakeven Analysis**
- Calculates exact breakeven time in hours and days
- Pre-generates profit trajectory chart data
- 30-day net profit projections
- Profitability matrix for different capital amounts and timeframes

### 🛡️ **Comprehensive Risk Assessment**
- **Multi-Factor Risk Scoring** (1-5 scale):
  - Bridge architecture type (Canonical, Intent, LayerZero, Liquidity)
  - Protocol age (Lindy Effect)
  - TVL depth and liquidity
  - Historical exploit data from REKT database
  - Contract verification status
  - Chain maturity
- **Live Data Integration**: Fetches TVL from DefiLlama, contract info from Etherscan
- **Security Warnings**: Flags routes with historical exploits or high risk

### 🤖 **AI-Powered Advisory**
- Gemini AI integration for intelligent route analysis
- Context-aware recommendations: "STRONG BUY", "HOLD", or "CAUTION"
- Risk score analysis based on protocol reputation
- Personalized advice based on user's capital and risk tolerance

### 🔗 **Wallet Integration**
- RainbowKit integration for multi-chain wallet connection
- Auto-populate capital from wallet balance
- Chain detection and synchronization
- Support for Ethereum, Arbitrum, Base, Optimism, Polygon, Avalanche, and BNB Chain

### 📈 **Interactive Visualizations**
- **Breakeven Chart**: Visual profit trajectory over time
- **Heatmap**: Profitability matrix across different scenarios
- **Route Comparison Table**: Side-by-side comparison of all opportunities
- **Bridge Metadata Modal**: Detailed infrastructure analysis

### ⚡ **Production-Grade Reliability**
- Circuit breaker pattern for external API failures
- Rate limiting (30-60 requests/minute per IP)
- TTL caching for gas prices and yield data
- Comprehensive error handling and fallback mechanisms
- Health check endpoint with circuit breaker status

---

## 🏗️ Architecture

LiquidityVector follows a **hybrid architecture** with clear separation between frontend and backend:

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Next.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │   Advisor    │  │   Charts    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                          │                                 │
│                    API Service Layer                       │
└───────────────────────────┼─────────────────────────────────┘
                            │ REST API
┌───────────────────────────┼─────────────────────────────────┐
│                    FastAPI Backend (Python)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Services   │  │ Risk Engine  │  │  Economics   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                          │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         External APIs & Data Sources                 │  │
│  │  DeFiLlama | Li.Fi | Etherscan | CoinGecko | REKT   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│              Smart Contracts (Foundry/Solidity)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │BridgeRegistry│  │HealthChecker │  │StateMonitor  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Backend Architecture

**Microservices-Style Monolith** using FastAPI:
- **API Layer** (`api/main.py`): REST endpoints, request validation, rate limiting, CORS
- **Service Layer** (`api/services.py`): Core business logic, data orchestration
- **Model Layer** (`api/models.py`): Pydantic schemas for type safety
- **Resilience Layer** (`api/resilience.py`): Circuit breakers, caching, rate limiting
- **Core Modules**:
  - `core/economics/`: Breakeven calculations, profitability analysis
  - `core/risk/`: Risk scoring, bridge metadata, exploit data

### Frontend Architecture

**Next.js 15 with React 19**:
- **App Router**: Modern Next.js routing
- **Component-Based**: Modular, reusable React components
- **State Management**: React hooks + TanStack Query for server state
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth transitions
- **Wallet Integration**: Wagmi + RainbowKit for Web3 connectivity

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.1.0
- **React**: 19.0.0
- **TypeScript**: 5.8.2
- **Styling**: Tailwind CSS 3.4.17
- **Web3**: Wagmi 2.14.6, RainbowKit 2.2.2, Viem 2.21.54
- **Data Fetching**: TanStack React Query 5.62.8
- **Charts**: Recharts 3.6.0
- **Animations**: Framer Motion 12.23.26
- **AI Integration**: Google GenAI SDK 1.34.0

### Backend
- **Framework**: FastAPI 0.109.0+
- **Python**: 3.8+
- **HTTP Client**: Httpx 0.26.0+
- **Validation**: Pydantic 2.5.0+
- **Resilience**: 
  - SlowAPI 0.1.9+ (Rate limiting)
  - Pybreaker 1.0.1+ (Circuit breakers)
  - Cachetools 5.3.0+ (TTL caching)
- **Server**: Uvicorn 0.27.0+

### Smart Contracts
- **Framework**: Foundry
- **Language**: Solidity 0.8.20
- **Libraries**: 
  - OpenZeppelin Contracts
  - Forge Std

### External Integrations
- **DeFiLlama**: Yield data aggregation
- **Li.Fi**: Bridge fee quoting
- **Etherscan**: Contract verification and on-chain data
- **CoinGecko**: Native token prices
- **REKT Database**: Historical exploit data
- **Gemini AI**: Risk analysis and recommendations

---

## 📁 Project Structure

```
liquidityvector_gemini/
├── api/                          # FastAPI backend
│   ├── __init__.py
│   ├── main.py                   # API routes and middleware
│   ├── models.py                 # Pydantic schemas
│   ├── services.py               # Core business logic
│   └── resilience.py             # Circuit breakers, caching
│
├── app/                          # Next.js frontend
│   ├── components/              # React components
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── RouteCard.tsx        # Route display card
│   │   ├── Advisor.tsx          # AI advisor component
│   │   ├── BreakevenChart.tsx   # Profit trajectory chart
│   │   ├── Heatmap.tsx          # Profitability matrix
│   │   ├── Header.tsx           # App header
│   │   └── Sidebar.tsx          # Settings sidebar
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
│
├── core/                         # Core Python modules
│   ├── economics/               # Economic calculations
│   │   ├── breakeven.py         # Breakeven analysis
│   │   ├── costs.py             # Cost calculations
│   │   └── profitability.py     # Profitability metrics
│   └── risk/                    # Risk analysis
│       ├── engine.py            # Risk engine
│       ├── scoring.py           # Risk scoring logic
│       └── data_sources/        # External data sources
│           ├── defillama.py    # DeFiLlama integration
│           ├── etherscan.py    # Etherscan integration
│           ├── rekt_database.py # REKT database
│           └── __init__.py
│
├── contracts/                    # Smart contracts
│   ├── src/
│   │   ├── core/                # Core contracts
│   │   │   ├── BridgeRegistry.sol
│   │   │   ├── BridgeHealthChecker.sol
│   │   │   └── BridgeStateMonitor.sol
│   │   ├── interfaces/         # Interface definitions
│   │   └── libraries/           # Shared libraries
│   ├── test/                    # Foundry tests
│   ├── script/                  # Deployment scripts
│   ├── foundry.toml             # Foundry configuration
│   └── lib/                     # Dependencies (forge-std, openzeppelin)
│
├── lib/                          # Shared frontend utilities
│   ├── services/
│   │   ├── apiService.ts        # Backend API client
│   │   └── geminiService.ts     # Gemini AI integration
│   ├── wagmi.config.ts          # Wagmi configuration
│   └── rainbowTheme.ts          # RainbowKit theme
│
├── hooks/                        # React hooks
│   ├── useAutoCapital.ts        # Wallet balance hook
│   └── useWalletBalance.ts      # Balance fetching
│
├── providers/                   # React providers
│   └── WalletProvider.tsx      # Wallet context
│
├── types/                        # TypeScript type definitions
│   └── index.ts
│
├── package.json                  # Frontend dependencies
├── requirements.txt             # Backend dependencies
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **Python**: 3.8 or higher
- **Foundry**: For smart contract development (optional)
- **Git**: For version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd liquidityvector_gemini
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Gemini AI API Key (required for AI advisor)
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   
   # Backend API URL (default: http://localhost:8000)
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   
   # Optional: Backend environment variables
   # ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
   ```

   For the backend, create a `.env` file in the root (optional):
   ```env
   # RPC URLs for gas estimation (optional, uses public RPCs if not set)
   MAINNET_RPC_URL=your_mainnet_rpc_url
   ARBITRUM_RPC_URL=your_arbitrum_rpc_url
   BASE_RPC_URL=your_base_rpc_url
   # ... etc for other chains
   
   # Etherscan API keys (optional, for contract verification)
   ETHERSCAN_API_KEY=your_etherscan_key
   ARBISCAN_API_KEY=your_arbiscan_key
   # ... etc
   ```

### Running the Application

1. **Start the backend API** (Terminal 1)
   ```bash
   # From the root directory
   cd api  # or just run from root if api is in PYTHONPATH
   uvicorn api.main:app --reload --port 8000
   ```
   
   Or using Python directly:
   ```bash
   python -m uvicorn api.main:app --reload --port 8000
   ```

2. **Start the frontend** (Terminal 2)
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs (Swagger UI)

### Building for Production

**Frontend:**
```bash
npm run build
npm start
```

**Backend:**
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:8000
```

### Endpoints

#### `GET /health`
Health check endpoint with circuit breaker status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "circuits": {
    "defillama": "closed",
    "lifi": "closed",
    "etherscan": "closed"
  }
}
```

#### `GET /pools`
Fetch top USDC yield pools from DeFiLlama.

**Rate Limit:** 30 requests/minute

**Response:**
```json
[
  {
    "pool": "0x...",
    "project": "Aave",
    "chain": "Ethereum",
    "apy": 5.2,
    "tvlUsd": 15000000,
    "symbol": "USDC"
  }
]
```

#### `POST /analyze`
Analyze a cross-chain route for profitability and risk.

**Rate Limit:** 60 requests/minute

**Request Body:**
```json
{
  "capital": 10000,
  "current_chain": "Ethereum",
  "target_chain": "Arbitrum",
  "pool_id": "0x...",
  "pool_apy": 6.5,
  "project": "Aave",
  "token_symbol": "USDC",
  "tvl_usd": 15000000,
  "wallet_address": "0x..."
}
```

**Response:**
```json
{
  "target_pool": { ... },
  "bridge_cost": 12.50,
  "gas_cost": 8.30,
  "total_cost": 20.80,
  "breakeven_hours": 48.5,
  "breakeven_days": 2.02,
  "net_profit_30d": 145.20,
  "risk_level": 2,
  "bridge_name": "Arbitrum Bridge",
  "estimated_time": "10 minutes",
  "has_exploits": false,
  "bridge_metadata": {
    "name": "Arbitrum Bridge",
    "type": "Canonical",
    "age_years": 3.2,
    "tvl": 2500,
    "has_exploits": false,
    "base_time": 10
  },
  "daily_yield_usd": 1.78,
  "breakeven_chart_data": [
    { "day": 0, "profit": -20.80 },
    { "day": 1, "profit": -19.02 },
    ...
  ],
  "profitability_matrix": { ... },
  "cost_breakdown": {
    "entry": {
      "bridge_fee": 5.00,
      "source_gas": 4.50,
      "dest_gas": 3.80,
      "total": 13.30
    },
    "exit": {
      "bridge_fee": 5.00,
      "source_gas": 1.20,
      "dest_gas": 1.30,
      "total": 7.50
    },
    "round_trip_total": 20.80
  },
  "risk_warnings": [],
  "tvl_source": "live"
}
```

#### `GET /yield/{chain}`
Get market average yield for a specific chain.

**Rate Limit:** 30 requests/minute

**Response:**
```json
{
  "chain": "Ethereum",
  "current_yield": 4.8,
  "pool_count": 12
}
```

#### `GET /price/{chain}`
Get live native token price for a chain.

**Rate Limit:** 60 requests/minute

**Response:**
```json
{
  "chain": "Ethereum",
  "price_usd": 2450.50
}
```

### Error Responses

All endpoints may return standard HTTP error codes:
- `400`: Bad Request (validation error)
- `422`: Unprocessable Entity (insufficient liquidity)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable (external API error)

Error response format:
```json
{
  "detail": "Error message",
  "error_type": "ExternalAPIError"
}
```

---

## 🔐 Smart Contracts

LiquidityVector includes a suite of smart contracts for on-chain bridge monitoring and risk assessment.

### Core Contracts

#### `BridgeRegistry.sol`
Central registry for bridge contracts across multiple chains. Maintains a mapping of bridge addresses and their metadata.

#### `BridgeHealthChecker.sol`
On-chain health monitoring for bridge contracts. Checks for:
- Pausable state
- Upgradeable proxy status
- Contract verification
- Recent activity

#### `BridgeStateMonitor.sol`
Continuous monitoring of bridge state changes. Emits events for:
- Pause/unpause events
- Upgrade events
- Ownership changes

### Testing

```bash
cd contracts
forge test
```

### Deployment

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
```

---

## 🛡️ Risk Analysis System

LiquidityVector implements a comprehensive multi-factor risk scoring system:

### Risk Factors

1. **Bridge Architecture** (0-25 points)
   - Canonical bridges: 25 points (highest trust)
   - Intent-based (Across): 22 points
   - LayerZero: 20 points
   - Liquidity networks: 15 points

2. **Protocol Age** (0-20 points)
   - Lindy Effect: 4 points per year, max 20
   - Protocols < 1 year old flagged with warning

3. **TVL Depth** (0-20 points)
   - $1B+: 20 points
   - $500M-$1B: 18 points
   - $100M-$500M: 15 points
   - $50M-$100M: 12 points
   - < $50M: 8 points

4. **Exploit History** (0-35 points penalty)
   - No exploits: 0 penalty
   - Historical exploits: -15 to -35 points
   - Recent exploits (< 1 year): Maximum penalty

5. **Contract Verification** (0-10 points)
   - Verified contracts: 10 points
   - Unverified: 0 points

6. **Chain Maturity** (0-10 points)
   - Mature chains (Ethereum, Arbitrum, Optimism, Polygon): 10 points
   - Newer chains (Base, Avalanche, BNB Chain): 5 points

### Risk Levels

- **Level 1-2**: Low Risk (Green) - Safe for institutional capital
- **Level 3**: Medium Risk (Yellow) - Acceptable for most users
- **Level 4-5**: High Risk (Red) - Requires careful consideration

### Data Sources

- **Live TVL**: DeFiLlama API
- **Contract Info**: Etherscan API
- **Exploit Data**: REKT Database (local)
- **Fallback Data**: Hardcoded defaults for reliability

---

## 🎨 Frontend Features

### Dashboard
- Real-time route analysis
- Interactive route comparison table
- Pagination for large result sets
- Filtering by risk tolerance

### Route Card
- Key metrics display
- Visual risk indicators
- Bridge metadata
- Quick action buttons

### Breakeven Chart
- Profit trajectory visualization
- Interactive tooltips
- Breakeven point highlighting
- Time-based profit projection

### Heatmap
- Profitability matrix
- Capital amount vs. timeframe
- Color-coded profit zones
- Interactive exploration

### AI Advisor
- Gemini AI-powered analysis
- Context-aware recommendations
- Risk score breakdown
- Personalized advice

### Bridge Metadata Modal
- Detailed infrastructure analysis
- Security history
- Exploit data (if applicable)
- Protocol age and TVL

---

## ⚙️ Configuration

### Frontend Configuration

**Next.js Config** (`next.config.ts`):
- Image optimization
- Environment variables
- Build settings

**Wagmi Config** (`lib/wagmi.config.ts`):
- Supported chains
- RPC endpoints
- Wallet connectors

### Backend Configuration

**Resilience Settings** (`api/resilience.py`):
- Circuit breaker thresholds
- Cache TTL values
- Rate limit configurations

**Service Settings** (`api/services.py`):
- DeFiLlama API endpoints
- Li.Fi integration settings
- Gas estimation parameters

---

## 🔧 Development

### Running Tests

**Backend:**
```bash
# Python tests (if available)
pytest

# Type checking
mypy api/ core/
```

**Frontend:**
```bash
# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

**Smart Contracts:**
```bash
cd contracts
forge test
forge test --gas-report
```

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Strict mode enabled, use interfaces/types
- **Solidity**: Follow Solidity Style Guide

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

[Add your license information here]

---

## 🙏 Acknowledgments

- **DeFiLlama** for yield data aggregation
- **Li.Fi** for bridge fee quoting
- **OpenZeppelin** for secure smart contract libraries
- **RainbowKit** for wallet integration
- **Google Gemini** for AI-powered analysis

---

## 📧 Support

For issues, questions, or contributions, please open an issue on GitHub or contact the maintainers.

---

<div align="center">
<strong>Built with ❤️ for the DeFi community</strong>
</div>
