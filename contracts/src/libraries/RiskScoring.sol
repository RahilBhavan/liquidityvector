// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BridgeTypes} from "./BridgeTypes.sol";
import {IBridgeRegistry} from "../interfaces/IBridgeRegistry.sol";

/**
 * @title RiskScoring
 * @notice Library for calculating bridge risk scores
 * @dev Implements the same 6-factor scoring logic as Python services.py for consistency
 *
 * Factors:
 * A: Bridge Architecture Type (base score)
 * B: Protocol Age (Lindy effect)
 * C: TVL Assessment
 * D: Historical Security Incidents
 * E: Current State (paused/quarantined)
 * F: Proxy Implementation Status
 */
library RiskScoring {
    /**
     * @notice Calculate risk score for a bridge
     * @param config Bridge configuration from registry
     * @param tvlUsd Current TVL in USD (18 decimals)
     * @param isPaused Whether bridge is paused
     * @param isQuarantined Whether bridge is quarantined
     * @param isImplementationWhitelisted For proxies, whether impl is approved
     * @return score Risk score 0-100 (higher is safer)
     */
    function calculateRiskScore(
        IBridgeRegistry.BridgeConfig memory config,
        uint256 tvlUsd,
        bool isPaused,
        bool isQuarantined,
        bool isImplementationWhitelisted
    ) internal pure returns (uint256 score) {
        // Factor A: Bridge Architecture Type (base score)
        if (config.bridgeType == IBridgeRegistry.BridgeType.CANONICAL) {
            score = BridgeTypes.CANONICAL_BASE_SCORE;
        } else if (config.bridgeType == IBridgeRegistry.BridgeType.INTENT) {
            score = BridgeTypes.INTENT_BASE_SCORE;
        } else if (config.bridgeType == IBridgeRegistry.BridgeType.LAYERZERO) {
            score = BridgeTypes.LAYERZERO_BASE_SCORE;
        } else if (config.bridgeType == IBridgeRegistry.BridgeType.LIQUIDITY) {
            score = BridgeTypes.LIQUIDITY_BASE_SCORE;
        } else {
            score = BridgeTypes.DEFAULT_BASE_SCORE;
        }

        // Factor B: Protocol Age (Lindy Effect)
        // +2 points per year of operation, capped at +10
        uint256 ageYears = config.ageMonths / 12;
        uint256 ageBonus = ageYears * BridgeTypes.AGE_BONUS_PER_YEAR;
        if (ageBonus > BridgeTypes.MAX_AGE_BONUS) {
            ageBonus = BridgeTypes.MAX_AGE_BONUS;
        }
        score += ageBonus;

        // Factor C: TVL Assessment
        if (tvlUsd >= BridgeTypes.TVL_HIGH_THRESHOLD) {
            // High TVL: +4 points (indicates trust and liquidity depth)
            score += BridgeTypes.HIGH_TVL_BONUS;
        } else if (tvlUsd < BridgeTypes.TVL_LOW_THRESHOLD) {
            // Low TVL: -8 points (liquidity risk)
            if (score > BridgeTypes.LOW_TVL_PENALTY) {
                score -= BridgeTypes.LOW_TVL_PENALTY;
            } else {
                score = 1;
            }
        }

        // Factor D: Historical Security Incidents
        if (config.hasKnownExploits) {
            if (score > BridgeTypes.EXPLOIT_PENALTY) {
                score -= BridgeTypes.EXPLOIT_PENALTY;
            } else {
                score = 1;
            }
        }

        // Factor E: Current State (paused or quarantined)
        // Critical: These conditions result in zero score
        if (isPaused || isQuarantined) {
            return 0;
        }

        // Factor F: Proxy Implementation Status
        if (config.isProxy && !isImplementationWhitelisted) {
            // Unknown implementation is a significant risk
            if (score > BridgeTypes.UNWHITELISTED_IMPL_PENALTY) {
                score -= BridgeTypes.UNWHITELISTED_IMPL_PENALTY;
            } else {
                score = 1;
            }
        }

        // Clamp to valid range [1, 100]
        if (score > BridgeTypes.MAX_RISK_SCORE) {
            score = BridgeTypes.MAX_RISK_SCORE;
        }
        if (score < 1) {
            score = 1;
        }

        return score;
    }

    /**
     * @notice Convert risk score to risk level (1-5 scale)
     * @param score Risk score (0-100)
     * @return level Risk level (1=safest, 5=riskiest)
     */
    function scoreToRiskLevel(uint256 score) internal pure returns (uint256 level) {
        if (score >= 90) {
            return 1; // Excellent
        } else if (score >= 80) {
            return 2; // Good
        } else if (score >= 70) {
            return 3; // Moderate
        } else if (score >= 60) {
            return 4; // Elevated
        } else {
            return 5; // High Risk
        }
    }

    /**
     * @notice Check if a score meets minimum safety requirements
     * @param score Risk score to check
     * @param minScore Minimum acceptable score
     * @return isSafe True if score meets requirements
     */
    function meetsMinimumScore(uint256 score, uint256 minScore)
        internal
        pure
        returns (bool isSafe)
    {
        return score >= minScore && score > 0;
    }
}
