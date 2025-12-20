// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridgeHealthChecker
 * @notice Interface for querying real-time bridge operational status
 * @dev Designed for gas efficiency (<100k gas per bridge check)
 */
interface IBridgeHealthChecker {
    // ============ Enums ============

    /// @notice Operational status of a bridge
    enum BridgeStatus {
        UNKNOWN,          // 0: Never checked or data unavailable
        OPERATIONAL,      // 1: Fully operational
        PAUSED,           // 2: Bridge is paused
        LOW_LIQUIDITY,    // 3: TVL below minimum threshold
        INACTIVE,         // 4: No recent activity
        QUARANTINED,      // 5: Manually quarantined for security
        UPGRADED_PENDING  // 6: Recently upgraded, pending review
    }

    // ============ Structs ============

    /// @notice Complete health report for a bridge
    struct BridgeHealthReport {
        BridgeStatus status;
        uint256 riskScore;         // 0-100, higher is safer
        uint256 tvlUsd;            // Current TVL in USD (18 decimals)
        uint256 lastActivityBlock; // Block number of last transaction
        uint256 lastCheckTimestamp;
        bool isPaused;
        bool isQuarantined;
        bytes32 currentImplHash;   // Hash of current implementation (for proxies)
    }

    // ============ Events ============

    /// @notice Emitted when a bridge health check is performed
    event BridgeHealthChecked(
        bytes32 indexed bridgeId,
        BridgeStatus status,
        uint256 riskScore,
        uint256 timestamp
    );

    /// @notice Emitted when health check fails due to external call failure
    event HealthCheckFailed(
        bytes32 indexed bridgeId,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when circuit breaker is triggered
    event CircuitBreakerTriggered(
        bytes32 indexed bridgeId,
        uint256 consecutiveFailures,
        uint256 timestamp
    );

    /// @notice Emitted when circuit breaker is reset
    event CircuitBreakerReset(
        bytes32 indexed bridgeId,
        uint256 timestamp
    );

    // ============ Health Checks ============

    /**
     * @notice Check health of a single bridge
     * @param bridgeId Unique identifier for the bridge (keccak256 of name)
     * @return report Complete health report
     */
    function checkBridgeHealth(bytes32 bridgeId)
        external
        returns (BridgeHealthReport memory report);

    /**
     * @notice Batch check health of multiple bridges (gas optimized)
     * @param bridgeIds Array of bridge identifiers
     * @return reports Array of health reports
     */
    function batchCheckHealth(bytes32[] calldata bridgeIds)
        external
        returns (BridgeHealthReport[] memory reports);

    /**
     * @notice Get cached health report (view function, no state update)
     * @param bridgeId Bridge identifier
     * @return report Last cached health report
     */
    function getCachedHealth(bytes32 bridgeId)
        external
        view
        returns (BridgeHealthReport memory report);

    /**
     * @notice Check if a bridge is safe to use for routing
     * @param bridgeId Bridge identifier
     * @param minRiskScore Minimum acceptable risk score (0-100)
     * @return isSafe True if bridge meets safety criteria
     * @return reason Human-readable reason if not safe
     */
    function isBridgeSafe(bytes32 bridgeId, uint256 minRiskScore)
        external
        view
        returns (bool isSafe, string memory reason);

    /**
     * @notice Get all operational bridges meeting criteria
     * @param minTvl Minimum TVL in USD (18 decimals)
     * @param minRiskScore Minimum risk score
     * @return bridgeIds Array of qualifying bridge IDs
     */
    function getOperationalBridges(uint256 minTvl, uint256 minRiskScore)
        external
        view
        returns (bytes32[] memory bridgeIds);

    // ============ Circuit Breaker ============

    /**
     * @notice Reset circuit breaker for a bridge
     * @param bridgeId Bridge identifier
     */
    function resetCircuitBreaker(bytes32 bridgeId) external;

    /**
     * @notice Check if circuit breaker is open for a bridge
     * @param bridgeId Bridge identifier
     * @return isOpen True if circuit breaker is open
     */
    function isCircuitBroken(bytes32 bridgeId) external view returns (bool isOpen);
}
