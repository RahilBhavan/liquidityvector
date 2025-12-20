// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridgeStateMonitor
 * @notice Interface for monitoring bridge state changes and security events
 * @dev Emits events for off-chain indexing and alerting systems
 */
interface IBridgeStateMonitor {
    // ============ Enums ============

    /// @notice Types of security events
    enum SecurityEventType {
        PAUSED,
        UNPAUSED,
        UPGRADED,
        OWNERSHIP_TRANSFERRED,
        ADMIN_CHANGED,
        QUARANTINED,
        RELEASED_FROM_QUARANTINE
    }

    // ============ Structs ============

    /// @notice Security event details
    struct SecurityEvent {
        bytes32 bridgeId;
        SecurityEventType eventType;
        address affectedContract;
        bytes32 oldValue;          // Previous implementation hash, owner, etc.
        bytes32 newValue;          // New implementation hash, owner, etc.
        uint256 timestamp;
        uint256 blockNumber;
    }

    /// @notice Quarantine record
    struct QuarantineRecord {
        bytes32 bridgeId;
        uint256 quarantinedAt;
        address quarantinedBy;
        string reason;
        bool requiresMultisigRelease;
    }

    // ============ Events ============

    /// @notice Emitted when a bridge is paused
    event BridgePaused(
        bytes32 indexed bridgeId,
        address indexed bridgeContract,
        uint256 timestamp
    );

    /// @notice Emitted when a bridge is unpaused
    event BridgeUnpaused(
        bytes32 indexed bridgeId,
        address indexed bridgeContract,
        uint256 timestamp
    );

    /// @notice Emitted when a proxy bridge is upgraded
    event BridgeUpgraded(
        bytes32 indexed bridgeId,
        address indexed bridgeContract,
        address oldImplementation,
        address newImplementation,
        uint256 timestamp
    );

    /// @notice Emitted when a bridge is quarantined
    event BridgeQuarantined(
        bytes32 indexed bridgeId,
        address indexed quarantinedBy,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when a bridge is released from quarantine
    event BridgeReleasedFromQuarantine(
        bytes32 indexed bridgeId,
        address indexed releasedBy,
        uint256 timestamp
    );

    /// @notice Emitted when monitoring detects an anomaly
    event AnomalyDetected(
        bytes32 indexed bridgeId,
        string anomalyType,
        bytes data,
        uint256 timestamp
    );

    // ============ Event Recording ============

    /**
     * @notice Record a pause event from external monitoring
     * @param bridgeId Bridge identifier
     * @dev Can only be called by authorized monitors
     */
    function recordPauseEvent(bytes32 bridgeId) external;

    /**
     * @notice Record an unpause event
     * @param bridgeId Bridge identifier
     */
    function recordUnpauseEvent(bytes32 bridgeId) external;

    /**
     * @notice Record an upgrade event for a proxy bridge
     * @param bridgeId Bridge identifier
     * @param newImplementation Address of new implementation
     */
    function recordUpgradeEvent(bytes32 bridgeId, address newImplementation) external;

    // ============ Quarantine ============

    /**
     * @notice Quarantine a bridge (emergency action)
     * @param bridgeId Bridge identifier
     * @param reason Reason for quarantine
     */
    function quarantineBridge(bytes32 bridgeId, string calldata reason) external;

    /**
     * @notice Release a bridge from quarantine (requires multi-sig)
     * @param bridgeId Bridge identifier
     */
    function releaseBridge(bytes32 bridgeId) external;

    /**
     * @notice Check if bridge is quarantined
     * @param bridgeId Bridge identifier
     * @return isQuarantined True if quarantined
     * @return record Quarantine details
     */
    function isQuarantined(bytes32 bridgeId)
        external
        view
        returns (bool isQuarantined, QuarantineRecord memory record);

    // ============ Queries ============

    /**
     * @notice Get all security events for a bridge
     * @param bridgeId Bridge identifier
     * @param fromBlock Starting block
     * @param toBlock Ending block
     * @return events Array of security events
     */
    function getSecurityEvents(bytes32 bridgeId, uint256 fromBlock, uint256 toBlock)
        external
        view
        returns (SecurityEvent[] memory events);

    /**
     * @notice Get current implementation for a proxy bridge
     * @param bridgeId Bridge identifier
     * @return implementation Current implementation address
     * @return isWhitelisted Whether implementation is whitelisted
     */
    function getImplementationStatus(bytes32 bridgeId)
        external
        view
        returns (address implementation, bool isWhitelisted);

    /**
     * @notice Check if a bridge is recorded as paused
     * @param bridgeId Bridge identifier
     * @return isPaused True if paused
     */
    function isPausedRecorded(bytes32 bridgeId) external view returns (bool isPaused);

    /**
     * @notice Get total security events count for a bridge
     * @param bridgeId Bridge identifier
     * @return count Number of security events
     */
    function getSecurityEventCount(bytes32 bridgeId) external view returns (uint256 count);
}
