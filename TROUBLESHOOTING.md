# Production Setup Checklist

If you are "not able to calculate valid routes", it is 99% likely due to missing Environment Variables in Vercel or Railway.

## 1. Railway (Backend) Variables
Go to your Railway Project > Variables and ensure these are set:

- `ALLOWED_ORIGINS`: Set this to your Vercel URL (e.g., `https://liquidity-vector.vercel.app` or `*` for testing).
- `REDIS_URL`: `redis://redis:6379/0` (Internal) or the public URL provided by Railway Redis.
- `ENVIRONMENT`: `production`

## 2. Vercel (Frontend) Variables
Go to your Vercel Project > Settings > Environment Variables and set:

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | Your Railway URL (e.g., `https://backend-production.up.railway.app`) **IMPORTANT**: Do not add `/api` if your backend routes don't use it, but our code expects root. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Your ID from WalletConnect Cloud. |
| `NEXT_PUBLIC_VAULT_ADDRESS_ARBITRUM` | Your deployed contract address (see DEPLOYMENT.md). |

## 3. Debugging Steps
1.  Open your Vercel App in Chrome.
2.  Right-click > **Inspect** > **Console**.
3.  Look for the message: `[LiquidityVector] API Configured: ...`
    - If it says `http://localhost:8000`, you missed `NEXT_PUBLIC_API_BASE_URL` in Vercel.
4.  Go to the **Network** tab and try to calculate a route.
    - If the request is Red (Blocked), check the "Response" tab.
    - **CORS Error**: Means Railway `ALLOWED_ORIGINS` is missing your Vercel domain.
    - **404 Not Found**: Means the URL is wrong.
    - **500 Internal Server Error**: Click it and check the response body for `ModuleNotFoundError` or similar.
