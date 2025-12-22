# Deployment & Integration Guide

This guide explains how to deploy the Liquidity Vector smart contracts and connect them to your Vercel (Frontend) and Railway (Backend) environments.

## 1. Deploy Smart Contracts

First, deploy your contracts to the desired chain (e.g., Arbitrum, Base, or Mainnet).

### Prerequisites
- **RPC URL**: From Alchemy/Infura.
- **Private Key**: Deployer wallet (ensure it has gas).
- **Etherscan Key**: For verification.

### Command
Run the Foundry script:

```bash
# Example: Deploying to Arbitrum
source .env
forge script contracts/script/Deploy.s.sol \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

### Output
The script will output the deployed addresses:
```text
=== Deployment Complete ===
Chain ID: 42161
LiquidityVault: 0x1234...ABCD  <-- SAVE THIS ADDRESS
```

---

## 2. Connect to Vercel (Frontend)

The frontend needs the contract address to interact with it (read balances, deposit, withdraw).

1.  Go to your **Vercel Project Settings** > **Environment Variables**.
2.  Add the address for the corresponding chain:

| Variable Name | Value |
| :--- | :--- |
| `NEXT_PUBLIC_VAULT_ADDRESS_ARBITRUM` | `0x1234...ABCD` |
| `NEXT_PUBLIC_VAULT_ADDRESS_MAINNET` | `(Mainnet Address)` |

3.  **Redeploy** your frontend for the changes to take effect.

### Usage in Code
The app uses `src/config/contracts.ts` to automatically select the correct address based on the user's connected chain:

```typescript
import { getVaultAddress } from '@/config/contracts';
import { useChainId } from 'wagmi';

const chainId = useChainId();
const vaultAddress = getVaultAddress(chainId);
```

---

## 3. Connect to Railway (Backend)

If your backend needs to monitor the vault (for the Bridge Health Checker or Risk Engine), add the address there too.

1.  Go to **Railway** > **Variables**.
2.  Add the variable: `LIQUIDITY_VAULT_ADDRESS=0x1234...ABCD`.
3.  The service will auto-restart.

---

## 4. Verification

After connecting:
1.  Open the App.
2.  Connect Wallet to the deployed chain (e.g., Arbitrum).
3.  Check if the Dashboard loads data without errors.
4.  (Optional) Perform a small "Deposit" to verify the interaction works.
