// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IBridgeStateMonitor.sol";
import "../interfaces/IBridgeRegistry.sol";
import "../libraries/BridgeTypes.sol";

/**
 * @title BridgeStateMonitor
 * @notice Monitors and records bridge state changes (pause, upgrade, etc.)
 * @dev Provides quarantine functionality for compromised bridges
 *
 * Security Model:
 * - MONITOR_ROLE can record events (automated off-chain monitors)
 * - QUARANTINE_ROLE can quarantine bridges (security team)
 * - RELEASE_ROLE can release from quarantine (requires multi-sig)
 */
contract BridgeStateMonitor is IBridgeStateMonitor, AccessControl, Pausable, ReentrancyGuard {
    using BridgeTypes for *;

    // ============ Roles ============
    bytes32 public constant MONITOR_ROLE = keccak256("MONITOR_ROLE");
    bytes32 public constant QUARANTINE_ROLE = keccak256("QUARANTINE_ROLE");
    bytes32 public constant RELEASE_ROLE = keccak256("RELEASE_ROLE");

    // ============ State ============
    IBridgeRegistry public immutable registry;

    mapping(bytes32 => QuarantineRecord) private _quarantineRecords;
    mapping(bytes32 => bool) private _isQuarantined;
    mapping(bytes32 => SecurityEvent[]) private _securityEvents;
    mapping(bytes32 => address) private _currentImplementations;
    mapping(bytes32 => bool) private _isPaused;

    // ============ Constructor ============

    /**
     * @notice Initialize state monitor
     * @param _registry Address of BridgeRegistry
     * @param admin Multi-sig admin address
     */
    constructor(address _registry, address admin) {
        require(_registry != address(0), "Invalid registry");
        require(admin != address(0), "Invalid admin");

        registry = IBridgeRegistry(_registry);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MONITOR_ROLE, admin);
        _grantRole(QUARANTINE_ROLE, admin);
        _grantRole(RELEASE_ROLE, admin);
    }

    // ============ Event Recording ============

    /// @inheritdoc IBridgeStateMonitor
    function recordPauseEvent(bytes32 bridgeId)
        external
        override
        onlyRole(MONITOR_ROLE)
        whenNotPaused
    {
        require(!_isPaused[bridgeId], "Already recorded as paused");

        _isPaused[bridgeId] = true;

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);

        SecurityEvent memory evt = SecurityEvent({
            bridgeId: bridgeId,
            eventType: SecurityEventType.PAUSED,
            affectedContract: config.contractAddress,
            oldValue: bytes32(0),
            newValue: bytes32(uint256(1)), // 1 = paused
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        _securityEvents[bridgeId].push(evt);

        emit BridgePaused(bridgeId, config.contractAddress, block.timestamp);
    }

    /// @inheritdoc IBridgeStateMonitor
    function recordUnpauseEvent(bytes32 bridgeId)
        external
        override
        onlyRole(MONITOR_ROLE)
        whenNotPaused
    {
        require(_isPaused[bridgeId], "Not recorded as paused");

        _isPaused[bridgeId] = false;

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);

        SecurityEvent memory evt = SecurityEvent({
            bridgeId: bridgeId,
            eventType: SecurityEventType.UNPAUSED,
            affectedContract: config.contractAddress,
            oldValue: bytes32(uint256(1)),
            newValue: bytes32(0), // 0 = unpaused
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        _securityEvents[bridgeId].push(evt);

        emit BridgeUnpaused(bridgeId, config.contractAddress, block.timestamp);
    }

    /// @inheritdoc IBridgeStateMonitor
    function recordUpgradeEvent(bytes32 bridgeId, address newImplementation)
        external
        override
        onlyRole(MONITOR_ROLE)
        whenNotPaused
    {
        require(newImplementation != address(0), "Invalid implementation");

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);
        require(config.isProxy, "Bridge is not a proxy");

        address oldImpl = _currentImplementations[bridgeId];
        _currentImplementations[bridgeId] = newImplementation;

        SecurityEvent memory evt = SecurityEvent({
            bridgeId: bridgeId,
            eventType: SecurityEventType.UPGRADED,
            affectedContract: config.contractAddress,
            oldValue: bytes32(uint256(uint160(oldImpl))),
            newValue: bytes32(uint256(uint160(newImplementation))),
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        _securityEvents[bridgeId].push(evt);

        // Check if new implementation is whitelisted
        bool isWhitelisted = registry.isImplementationWhitelisted(bridgeId, newImplementation);

        if (!isWhitelisted) {
            emit AnomalyDetected(
                bridgeId,
                "UNWHITELISTED_UPGRADE",
                abi.encode(newImplementation),
                block.timestamp
            );
        }

        emit BridgeUpgraded(
            bridgeId,
            config.contractAddress,
            oldImpl,
            newImplementation,
            block.timestamp
        );
    }

    // ============ Quarantine ============

    /// @inheritdoc IBridgeStateMonitor
    function quarantineBridge(bytes32 bridgeId, string calldata reason)
        external
        override
        onlyRole(QUARANTINE_ROLE)
        nonReentrant
    {
        require(!_isQuarantined[bridgeId], "Already quarantined");
        require(bytes(reason).length > 0, "Reason required");

        // Verify bridge exists
        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);
        require(config.contractAddress != address(0), "Bridge not found");

        _isQuarantined[bridgeId] = true;
        _quarantineRecords[bridgeId] = QuarantineRecord({
            bridgeId: bridgeId,
            quarantinedAt: block.timestamp,
            quarantinedBy: msg.sender,
            reason: reason,
            requiresMultisigRelease: true
        });

        SecurityEvent memory evt = SecurityEvent({
            bridgeId: bridgeId,
            eventType: SecurityEventType.QUARANTINED,
            affectedContract: config.contractAddress,
            oldValue: bytes32(0),
            newValue: bytes32(uint256(1)),
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        _securityEvents[bridgeId].push(evt);

        emit BridgeQuarantined(bridgeId, msg.sender, reason, block.timestamp);
    }

    /// @inheritdoc IBridgeStateMonitor
    function releaseBridge(bytes32 bridgeId)
        external
        override
        onlyRole(RELEASE_ROLE) // Multi-sig required
        nonReentrant
    {
        require(_isQuarantined[bridgeId], "Not quarantined");

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);

        _isQuarantined[bridgeId] = false;

        SecurityEvent memory evt = SecurityEvent({
            bridgeId: bridgeId,
            eventType: SecurityEventType.RELEASED_FROM_QUARANTINE,
            affectedContract: config.contractAddress,
            oldValue: bytes32(uint256(1)),
            newValue: bytes32(0),
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        _securityEvents[bridgeId].push(evt);

        emit BridgeReleasedFromQuarantine(bridgeId, msg.sender, block.timestamp);
    }

    /// @inheritdoc IBridgeStateMonitor
    function isQuarantined(bytes32 bridgeId)
        external
        view
        override
        returns (bool, QuarantineRecord memory)
    {
        return (_isQuarantined[bridgeId], _quarantineRecords[bridgeId]);
    }

    // ============ Queries ============

    /// @inheritdoc IBridgeStateMonitor
    function getSecurityEvents(bytes32 bridgeId, uint256 fromBlock, uint256 toBlock)
        external
        view
        override
        returns (SecurityEvent[] memory)
    {
        SecurityEvent[] storage allEvents = _securityEvents[bridgeId];

        // Count matching events
        uint256 count = 0;
        for (uint256 i = 0; i < allEvents.length; i++) {
            if (allEvents[i].blockNumber >= fromBlock && allEvents[i].blockNumber <= toBlock) {
                count++;
            }
        }

        // Build result
        SecurityEvent[] memory result = new SecurityEvent[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allEvents.length; i++) {
            if (allEvents[i].blockNumber >= fromBlock && allEvents[i].blockNumber <= toBlock) {
                result[index] = allEvents[i];
                index++;
            }
        }

        return result;
    }

    /// @inheritdoc IBridgeStateMonitor
    function getImplementationStatus(bytes32 bridgeId)
        external
        view
        override
        returns (address implementation, bool isWhitelisted)
    {
        implementation = _currentImplementations[bridgeId];
        if (implementation == address(0)) {
            IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);
            implementation = config.implementationAddress;
        }
        isWhitelisted = registry.isImplementationWhitelisted(bridgeId, implementation);
    }

    /// @inheritdoc IBridgeStateMonitor
    function isPausedRecorded(bytes32 bridgeId) external view override returns (bool) {
        return _isPaused[bridgeId];
    }

    /// @inheritdoc IBridgeStateMonitor
    function getSecurityEventCount(bytes32 bridgeId) external view override returns (uint256) {
        return _securityEvents[bridgeId].length;
    }

    /**
     * @notice Get the latest security event for a bridge
     * @param bridgeId Bridge identifier
     * @return evt Latest security event (empty if none)
     */
    function getLatestSecurityEvent(bytes32 bridgeId)
        external
        view
        returns (SecurityEvent memory evt)
    {
        SecurityEvent[] storage events = _securityEvents[bridgeId];
        if (events.length > 0) {
            evt = events[events.length - 1];
        }
    }

    /**
     * @notice Check if a bridge has any recorded security events
     * @param bridgeId Bridge identifier
     * @return hasEvents True if bridge has security events
     */
    function hasSecurityEvents(bytes32 bridgeId) external view returns (bool) {
        return _securityEvents[bridgeId].length > 0;
    }

    // ============ Emergency ============

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
