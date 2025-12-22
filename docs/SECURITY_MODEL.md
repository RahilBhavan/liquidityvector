# Security Model: The "V-Score"

## 1. Overview
The DeFi ecosystem is plagued by "audit theater"—the false sense of security provided by a simple "Audited" badge. Liquidity Vector introduces the **V-Score (Vector Score)**, a proprietary, data-driven risk metric designed to quantify the *structural* and *historical* safety of cross-chain infrastructure.

Unlike binary "Safe/Unsafe" classifications, the V-Score is a continuous 0-100 scale derived from **six weighted risk vectors**, processed in real-time by the `RiskEngine`.

---

## 2. 🛡️ The Algorithm Logic

The score is calculated using a weighted sum model with non-linear penalties for critical failures.

$$ V_{Score} = \text{Clamp}_{0}^{100} \left( \sum_{i=1}^{6} (F_i \times W_i) - P_{exploits} \right) $$ 

Where:
*   $F_i$ is the normalized factor score (0-100).
*   $W_i$ is the factor weight.
*   $P_{exploits}$ is the penalty for historical security incidents.

### 2.1 The Six Vectors

#### 🏗️ Vector A: Bridge Architecture (Weight: 25%)
Not all bridges are built equal. We prioritize trust-minimized designs over trusted setups.

| Architecture Type | Score | Rationale |
| :--- | :--- | :--- |
| **Canonical** | **25 pts** | Native bridges secured by the consensus of the L1/L2 itself (e.g., Arbitrum Bridge). To break the bridge, you must break the chain. |
| **Intent-Based** | **22 pts** | Protocols like Across/UniswapX. Users don't lock funds; market makers fill orders. If the bridge fails, user funds are simply returned, not stolen. |
| **Light Client** | **20 pts** | LayerZero/Cosmos IBC. Mathematically verifies state headers. Secure, but relies on "Oracle" and "Relayer" liveness/honesty. |
| **Liquidity Network** | **15 pts** | Pool-based bridges (e.g., Synapse, Hop). Vulnerable to honeypot attacks, pool imbalances, or "infinite mint" bugs. |
| **Multisig** | **5 pts** | Bridges secured only by a 5-of-9 multisig. Highly centralized and historically the most hacked architecture (Ronin, Harmony). |

#### ⏳ Vector B: Protocol Maturity (Weight: 20%)
The **Lindy Effect**: The longer a protocol survives in the adversarial "Dark Forest" of DeFi without being hacked, the more likely it is to be secure.
*   **Formula**: $Score = \min(20, \text{Years\_Active} \times 5)$
*   **Cap**: 20 points (achieved at 4 years).
*   **Hard Gate**: Protocols < 6 months old are automatically capped at a V-Score of 50 ("Elevated Risk").

#### 💧 Vector C: Liquidity Depth (Weight: 20%)
Measures the protocol's ability to handle size without slippage or bankruptcy. A bridge with low TVL is easier to manipulate via flash loans.
*   **TVL > $1B**: 20 pts (Institutional Grade)
*   **TVL $500M - $1B**: 18 pts
*   **TVL $100M - $500M**: 15 pts
*   **TVL $10M - $100M**: 10 pts
*   **TVL < $10M**: 5 pts (High risk of slippage/manipulation)

#### 📝 Vector D: Contract Verification (Weight: 10%)
Ensures the code running on-chain matches the published source code.
*   **Verified (Etherscan)**: 10 pts.
*   **Unverified**: 0 pts. *Additionally, unverified contracts trigger an immediate "High Risk" warning in the UI.*

#### ⛓️ Vector E: Chain Maturity (Weight: 5%)
The security of the underlying blockchain itself.
*   **L1 (Ethereum)**: 5 pts.
*   **Mature L2 (Arbitrum, Optimism)**: 5 pts.
*   **Newer L2 (Base, Scroll)**: 4 pts.
*   **Alt-L1 (Avalanche, BSC)**: 3 pts.

#### 🏴‍☠️ Vector F: Exploit History (The Penalty Layer)
This is a **negative weight** applied *after* the base calculation.
*   **Clean Record**: 0 penalty.
*   **Minor Incident (<$1M)**: -15 points.
*   **Major Hack (>$10M)**: -35 points.
*   **Critical Failure (Keys Leaked)**: -50 points.
*   **Recency Multiplier**: If the hack occurred < 1 year ago, the penalty is **doubled**.

---

## 3. 📉 Case Studies

### Scenario A: The "Stargate" Route (Secure)
*   **Architecture**: LayerZero (20 pts)
*   **Age**: ~2.5 Years (12.5 pts)
*   **TVL**: >$300M (15 pts)
*   **Exploits**: None (0 penalty)
*   **Verified**: Yes (10 pts)
*   **Chain**: Ethereum (5 pts)
*   **Total V-Score**: **62.5 + (Base Scaling)** ≈ **85 (Stable)**

### Scenario B: The "Multichain" Route (Critical)
*   **Architecture**: MPC/Liquidity (15 pts)
*   **Age**: 4 Years (20 pts)
*   **TVL**: ~$0 (after collapse) (0 pts)
*   **Exploits**: Major Key Leak (-50 pts * 2 for recency = -100 pts)
*   **Verified**: Yes (10 pts)
*   **Total V-Score**: **0 (Critical)**. *The engine automatically filters this out or marks it in red.*

---

## 4. 🔍 Data Integrity & Oracles

The `RiskEngine` aggregates data from three distinct layers to prevent manipulation:

1.  **Live On-Chain Data**: Queries Etherscan/Arbiscan APIs to verify contract bytecodes and pause states.
2.  **Market Data**: Pulls TVL and Volume from the DeFiLlama API (cached for 1 hour).
3.  **Static Knowledge Base**: The `REKT Database` (internal JSON) stores immutable facts about historical hacks that cannot be queried on-chain.

---

## 5. 🚦 Risk Tiers & User Guidance

The final V-Score maps to actionable tiers for the user:

| Score | Tier | Color | Meaning |
| :--- | :--- | :--- | :--- |
| **90-100** | **Institutional** | 🟢 Green | Comparable to holding ETH on Mainnet. Lowest possible DeFi risk. |
| **70-89** | **Standard** | 🟡 Yellow | Standard smart contract risk. Suitable for yield farming. |
| **50-69** | **Elevated** | 🟠 Orange | New protocol or novel architecture. Limit exposure to <5% of portfolio. |
| **0-49** | **Critical** | 🔴 Red | Known vulnerabilities or historical hacks. **Do not use.** |
