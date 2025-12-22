export interface VScoreInputs {
    tvlUsd: number;
    auditStatus?: 'Verified' | 'Unverified' | 'Warning';
    bridgeMetadata?: {
        ageYears: number;
        hasExploits: boolean;
    };
}

export interface VScoreResult {
    total: number;
    breakdown: {
        base: number;
        tvlFactor: number;
        auditFactor: number;
        timeFactor: number;
        exploitPenalty: number;
    };
}

/**
 * Calculate V-Score (Vector Safety Score)
 * A risk-decisive metric emphasizing TVL depth and security history.
 * Logic ported from apiService.ts
 */
export function calculateVScore(inputs: VScoreInputs): VScoreResult {
    const BASE_SCORE = 10.0;
    let score = BASE_SCORE;

    // 1. TVL Factor (Logarithmic Scaling)
    // High TVL (> $100M) is safer. Low TVL (< $1M) is risky.
    const tvl = inputs.tvlUsd;
    let tvlFactor = 0;

    if (tvl >= 100_000_000) tvlFactor = 0; // No penalty
    else if (tvl >= 10_000_000) tvlFactor = -0.5; // Slight penalty
    else if (tvl >= 1_000_000) tvlFactor = -2.0; // Moderate penalty
    else tvlFactor = -4.0; // Severe penalty for low liquidity

    score += tvlFactor;

    // 2. Audit Factor
    let auditFactor = 0;
    if (inputs.auditStatus === 'Unverified') auditFactor = -2.0;
    else if (inputs.auditStatus === 'Warning') auditFactor = -3.0;

    score += auditFactor;

    // 3. Time/Age Factor (Lindy Effect)
    let timeFactor = 0;
    if (inputs.bridgeMetadata) {
        if (inputs.bridgeMetadata.ageYears < 1) timeFactor = -2.0; // New bridge risk
        else if (inputs.bridgeMetadata.ageYears >= 4) timeFactor = +0.5; // Battle-tested bonus
    }
    score += timeFactor;

    // 4. Exploit Penalty
    let exploitPenalty = 0;
    if (inputs.bridgeMetadata?.hasExploits) {
        exploitPenalty = -5.0; // Major penalty for history of hacks
        score += exploitPenalty;
    }

    // Clamp score between 0 and 10
    score = Math.min(Math.max(score, 0), 10);

    return {
        total: parseFloat(score.toFixed(1)),
        breakdown: {
            base: BASE_SCORE,
            tvlFactor,
            auditFactor,
            timeFactor,
            exploitPenalty
        }
    };
}
