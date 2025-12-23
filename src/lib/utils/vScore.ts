export interface VScoreFactors {
    total: number;
    tvlFactor: number;
    auditFactor: number;
    timeFactor: number;
    exploitPenalty: number;
}

export interface VScoreInput {
    tvlUsd: number;
    auditStatus?: 'Verified' | 'Warning' | 'High Risk';
    bridgeMetadata?: {
        ageYears: number;
        hasExploits: boolean;
    };
}

export function calculateVScore(input: VScoreInput): VScoreFactors {
    let score = 10.0;

    // 1. TVL Factor
    let tvlFactor = 0;
    if (input.tvlUsd >= 100_000_000) tvlFactor = 0;
    else if (input.tvlUsd >= 10_000_000) tvlFactor = -0.5;
    else if (input.tvlUsd >= 1_000_000) tvlFactor = -2.0;
    else tvlFactor = -4.0;
    score += tvlFactor;

    // 2. Audit Factor
    let auditFactor = 0;
    if (input.auditStatus === 'Warning') auditFactor = -2.0;
    if (input.auditStatus === 'High Risk') auditFactor = -5.0;
    score += auditFactor;

    // 3. Time Factor
    let timeFactor = 0;
    if (input.bridgeMetadata) {
        if (input.bridgeMetadata.ageYears < 1) timeFactor = -2.0;
        else if (input.bridgeMetadata.ageYears >= 4) timeFactor = +0.5;
    }
    score += timeFactor;

    // 4. Exploit Penalty
    let exploitPenalty = 0;
    if (input.bridgeMetadata?.hasExploits) {
        exploitPenalty = -5.0;
        score += exploitPenalty;
    }

    score = Math.min(Math.max(score, 0), 10);

    return {
        total: parseFloat(score.toFixed(1)),
        tvlFactor,
        auditFactor,
        timeFactor,
        exploitPenalty
    };
}

export function estimateNodeMetrics(type: string, label: string) {
    const isL2 = label.toLowerCase().includes('base') || label.toLowerCase().includes('optimism') || label.toLowerCase().includes('arbitrum');
    const isMainnet = label.toLowerCase().includes('ethereum') || label.toLowerCase().includes('mainnet');

    if (type === 'bridge') {
        const baseGas = isMainnet ? 15.00 : 0.50;
        const baseTime = isL2 ? 5 : 20; // Minutes

        return {
            gas: (baseGas).toFixed(2),
            time: baseTime,
            bridgeFee: '2.50',
            slippage: '0.05',
        };
    }

    if (type === 'swap') {
        const baseGas = isMainnet ? 8.00 : 0.20;
        return {
            gas: (baseGas).toFixed(2),
            slippage: '0.10',
        };
    }

    if (type === 'pool') {
        // Estimate APY based on keywords
        let baseApy = 5.0;
        if (label.toLowerCase().includes('stable')) baseApy = 3.5;
        if (label.toLowerCase().includes('eth')) baseApy = 4.2;
        if (label.toLowerCase().includes('volatile') || label.toLowerCase().includes('degen')) baseApy = 15.0;

        return {
            apy: baseApy.toFixed(2),
            poolDepth: '$50M+'
        };
    }

    return {};
}
