// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBridgeRegistry
 * @notice Interface for bridge configuration and registry management
 * @dev Uses OpenZeppelin AccessControl for multi-sig admin pattern
 */
interface IBridgeRegistry {
    // ============ Enums ============

    /// @notice Bridge type classification
    enum BridgeType {
        CANONICAL,      // Native L1<->L2 bridges
        INTENT,         // Solver/intent-based (Across)
        LAYERZERO,      // LayerZero messaging (Stargate)
        LIQUIDITY,      // AMM/pool-based (Hop, Synapse)
        MESSAGING       // Generic messaging bridges
    }

    // ============ Structs ============

    /// @notice Complete bridge configuration
    struct BridgeConfig {
        bytes32 bridgeId;              // keccak256(bridgeName)
        string name;                   // Human-readable name
        BridgeType bridgeType;
        address contractAddress;       // Main contract address on this chain
        address implementationAddress; // For proxies, current impl
        bool isProxy;                  // True if upgradeable proxy
        bool isActive;                 // Admin can deactivate
        uint256 minTvlUsd;             // Minimum TVL threshold (18 decimals)
        uint256 maxInactivityPeriod;   // Max blocks without activity
        uint256 ageMonths;             // Protocol age for Lindy scoring
        bool hasKnownExploits;         // Historical exploit flag
    }

    /// @notice Global configuration parameters
    struct GlobalConfig {
        uint256 defaultMinTvlUsd;      // Default: 10M USD
        uint256 defaultMaxInactivity;  // Default: 1 day in blocks
        uint256 circuitBreakerThreshold; // Failures before circuit break
        uint256 healthCheckCooldown;   // Min blocks between checks
    }

    // ============ Events ============

    event BridgeRegistered(
        bytes32 indexed bridgeId,
        string name,
        address contractAddress,
        BridgeType bridgeType
    );

    event BridgeUpdated(
        bytes32 indexed bridgeId,
        string field,
        bytes32 oldValue,
        bytes32 newValue
    );

    event BridgeDeactivated(bytes32 indexed bridgeId, string reason);
    event BridgeReactivated(bytes32 indexed bridgeId);

    event ImplementationWhitelisted(
        bytes32 indexed bridgeId,
        address implementation,
        bytes32 codeHash
    );

    event ImplementationRevoked(
        bytes32 indexed bridgeId,
        address implementation
    );

    event GlobalConfigUpdated(string parameter, uint256 oldValue, uint256 newValue);

    // ============ Bridge Management ============

    /**
     * @notice Register a new bridge
     * @param config Complete bridge configuration
     * @return bridgeId Generated bridge identifier
     */
    function registerBridge(BridgeConfig calldata config)
        external
        returns (bytes32 bridgeId);

    /**
     * @notice Update bridge configuration
     * @param bridgeId Bridge identifier
     * @param config Updated configuration
     */
    function updateBridge(bytes32 bridgeId, BridgeConfig calldata config) external;

    /**
     * @notice Deactivate a bridge (soft delete)
     * @param bridgeId Bridge identifier
     * @param reason Reason for deactivation
     */
    function deactivateBridge(bytes32 bridgeId, string calldata reason) external;

    /**
     * @notice Reactivate a deactivated bridge
     * @param bridgeId Bridge identifier
     */
    function reactivateBridge(bytes32 bridgeId) external;

    // ============ Implementation Whitelisting ============

    /**
     * @notice Whitelist an implementation for a proxy bridge
     * @param bridgeId Bridge identifier
     * @param implementation Implementation contract address
     */
    function whitelistImplementation(bytes32 bridgeId, address implementation) external;

    /**
     * @notice Revoke a whitelisted implementation
     * @param bridgeId Bridge identifier
     * @param implementation Implementation to revoke
     */
    function revokeImplementation(bytes32 bridgeId, address implementation) external;

    /**
     * @notice Check if implementation is whitelisted
     * @param bridgeId Bridge identifier
     * @param implementation Implementation address
     * @return isWhitelisted True if whitelisted
     */
    function isImplementationWhitelisted(bytes32 bridgeId, address implementation)
        external
        view
        returns (bool isWhitelisted);

    // ============ Configuration ============

    /**
     * @notice Update global configuration
     * @param config New global configuration
     */
    function setGlobalConfig(GlobalConfig calldata config) external;

    /**
     * @notice Get global configuration
     * @return config Current global configuration
     */
    function getGlobalConfig() external view returns (GlobalConfig memory config);

    // ============ Queries ============

    /**
     * @notice Get bridge configuration
     * @param bridgeId Bridge identifier
     * @return config Bridge configuration
     */
    function getBridge(bytes32 bridgeId)
        external
        view
        returns (BridgeConfig memory config);

    /**
     * @notice Get all active bridges
     * @return bridgeIds Array of active bridge identifiers
     */
    function getActiveBridges() external view returns (bytes32[] memory bridgeIds);

    /**
     * @notice Get bridges by type
     * @param bridgeType Type of bridge
     * @return bridgeIds Array of matching bridge identifiers
     */
    function getBridgesByType(BridgeType bridgeType)
        external
        view
        returns (bytes32[] memory bridgeIds);

    /**
     * @notice Compute bridge ID from name
     * @param name Bridge name
     * @return bridgeId Computed identifier
     */
    function computeBridgeId(string calldata name)
        external
        pure
        returns (bytes32 bridgeId);
}
