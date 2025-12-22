# Liquidity Vector API - Technical Reference

## Authentication Model
The current version of the API operates as a public utility within specified network boundaries. Ingress is managed via:
- **CORS Whitelisting**: Restricted to specific frontend origins defined in the `ALLOWED_ORIGINS` environment variable.
- **Client Validation**: Frontend requests must include a valid Ethereum `wallet_address` parameter for gas estimation context.

## Rate Limiting & Quotas
Rate limiting is enforced at the API layer using the `slowapi` implementation of the Token Bucket algorithm.
- **Yield Endpoints**: 30 requests per minute per IP.
- **Analysis Endpoints**: 60 requests per minute per IP.
- **HTTP Headers**:
  - `X-RateLimit-Limit`: Maximum requests per window.
  - `X-RateLimit-Remaining`: Remaining requests in current window.
  - `X-RateLimit-Reset`: Time until window reset.

## Endpoint Specifications

### GET /health
**Purpose:** Service health check and circuit breaker status report.
**Response Format:**
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

### GET /pools
**Purpose:** Fetch top USDC yield opportunities filtered by TVL and APY thresholds.
**Response Format:**
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

### POST /analyze
**Purpose:** Execute multi-dimensional route analysis for cross-chain arbitrage.
**Request Format:**
```json
{
  "capital": 10000,
  "current_chain": "Ethereum",
  "target_chain": "Arbitrum",
  "pool_id": "0x...",
  "pool_apy": 6.5,
  "wallet_address": "0x..."
}
```
**Parameters:**
- `capital` (float, required): Total USD allocation for the trade.
- `current_chain` (string, required): Source network name.
- `target_chain` (string, required): Destination network name.
- `wallet_address` (string, required): Valid 0x-prefixed Ethereum address.

**Response Format:**
```json
{
  "total_cost": 20.80,
  "breakeven_hours": 48.5,
  "net_profit_30d": 145.20,
  "risk_level": 2,
  "bridge_name": "Arbitrum Bridge",
  "estimated_time": "10 minutes",
  "bridge_metadata": { ... },
  "profitability_matrix": { ... }
}
```

## Error Conditions
- **422 Unprocessable Entity**: Triggered when `capital` <= 0 or when input parameters fail schema validation.
- **429 Too Many Requests**: Triggered when the client exceeds the defined rate limit buckets.
- **503 Service Unavailable**: Triggered when a critical upstream dependency (e.g., Li.Fi) is unreachable and the local circuit breaker is open.