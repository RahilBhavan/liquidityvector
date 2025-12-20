// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBridgeRegistry} from "../interfaces/IBridgeRegistry.sol";
import {BridgeTypes} from "../libraries/BridgeTypes.sol";

/**
 * @title BridgeRegistry
 * @notice Central registry for bridge configurations and whitelisted implementations
 * @dev Uses OpenZeppelin AccessControl for multi-sig admin pattern
 *
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles (multi-sig)
 * - REGISTRY_ADMIN_ROLE: Can add/update/deactivate bridges
 * - IMPLEMENTATION_ADMIN_ROLE: Can whitelist/revoke implementations
 * - CONFIG_ADMIN_ROLE: Can update global configuration
 */
contract BridgeRegistry is IBridgeRegistry, AccessControl, Pausable, ReentrancyGuard {
    // ============ Roles ============
    /// @notice Role allowed to manage bridge registrations
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    /// @notice Role allowed to manage implementation whitelists
    bytes32 public constant IMPLEMENTATION_ADMIN_ROLE = keccak256("IMPLEMENTATION_ADMIN_ROLE");
    /// @notice Role allowed to update global configuration
    bytes32 public constant CONFIG_ADMIN_ROLE = keccak256("CONFIG_ADMIN_ROLE");

    // ============ State ============
    mapping(bytes32 => BridgeConfig) private _bridges;
    mapping(bytes32 => mapping(address => bool)) private _whitelistedImplementations;
    mapping(bytes32 => address[]) private _implementationHistory;

    bytes32[] private _allBridgeIds;
    bytes32[] private _activeBridgeIds;

    GlobalConfig private _globalConfig;

    // ============ Constructor ============

    /**
     * @notice Initialize registry with multi-sig admin
     * @param admin Multi-sig wallet address for admin role
     */
    constructor(address admin) {
        require(admin != address(0), "Invalid admin address");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        _grantRole(IMPLEMENTATION_ADMIN_ROLE, admin);
        _grantRole(CONFIG_ADMIN_ROLE, admin);

        // Set default global config
        _globalConfig = GlobalConfig({
            defaultMinTvlUsd: BridgeTypes.DEFAULT_MIN_TVL,
            defaultMaxInactivity: BridgeTypes.DEFAULT_MAX_INACTIVITY,
            circuitBreakerThreshold: 5,
            healthCheckCooldown: BridgeTypes.HEALTH_CHECK_COOLDOWN
        });
    }

    // ============ Bridge Management ============

    /// @inheritdoc IBridgeRegistry
    function registerBridge(BridgeConfig calldata config)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
        whenNotPaused
        nonReentrant
        returns (bytes32 bridgeId)
    {
        bridgeId = keccak256(bytes(config.name));
        require(_bridges[bridgeId].contractAddress == address(0), "Bridge already exists");
        require(config.contractAddress != address(0), "Invalid contract address");
        require(bytes(config.name).length > 0, "Name required");

        BridgeConfig storage newBridge = _bridges[bridgeId];
        newBridge.bridgeId = bridgeId;
        newBridge.name = config.name;
        newBridge.bridgeType = config.bridgeType;
        newBridge.contractAddress = config.contractAddress;
        newBridge.implementationAddress = config.implementationAddress;
        newBridge.isProxy = config.isProxy;
        newBridge.isActive = true;
        newBridge.minTvlUsd = config.minTvlUsd > 0 ? config.minTvlUsd : _globalConfig.defaultMinTvlUsd;
        newBridge.maxInactivityPeriod = config.maxInactivityPeriod > 0
            ? config.maxInactivityPeriod
            : _globalConfig.defaultMaxInactivity;
        newBridge.ageMonths = config.ageMonths;
        newBridge.hasKnownExploits = config.hasKnownExploits;

        _allBridgeIds.push(bridgeId);
        _activeBridgeIds.push(bridgeId);

        // Auto-whitelist initial implementation for proxies
        if (config.isProxy && config.implementationAddress != address(0)) {
            _whitelistedImplementations[bridgeId][config.implementationAddress] = true;
            _implementationHistory[bridgeId].push(config.implementationAddress);
            emit ImplementationWhitelisted(
                bridgeId,
                config.implementationAddress,
                BridgeTypes.getCodeHash(config.implementationAddress)
            );
        }

        emit BridgeRegistered(bridgeId, config.name, config.contractAddress, config.bridgeType);
    }

    /// @inheritdoc IBridgeRegistry
    function updateBridge(bytes32 bridgeId, BridgeConfig calldata config)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
        whenNotPaused
    {
        require(_bridges[bridgeId].contractAddress != address(0), "Bridge not found");

        BridgeConfig storage bridge = _bridges[bridgeId];

        // Track changes for events
        if (bridge.contractAddress != config.contractAddress && config.contractAddress != address(0)) {
            emit BridgeUpdated(
                bridgeId,
                "contractAddress",
                bytes32(uint256(uint160(bridge.contractAddress))),
                bytes32(uint256(uint160(config.contractAddress)))
            );
            bridge.contractAddress = config.contractAddress;
        }

        if (config.minTvlUsd > 0 && bridge.minTvlUsd != config.minTvlUsd) {
            emit BridgeUpdated(
                bridgeId,
                "minTvlUsd",
                bytes32(bridge.minTvlUsd),
                bytes32(config.minTvlUsd)
            );
            bridge.minTvlUsd = config.minTvlUsd;
        }

        if (config.maxInactivityPeriod > 0 && bridge.maxInactivityPeriod != config.maxInactivityPeriod) {
            emit BridgeUpdated(
                bridgeId,
                "maxInactivityPeriod",
                bytes32(bridge.maxInactivityPeriod),
                bytes32(config.maxInactivityPeriod)
            );
            bridge.maxInactivityPeriod = config.maxInactivityPeriod;
        }

        if (bridge.hasKnownExploits != config.hasKnownExploits) {
            emit BridgeUpdated(
                bridgeId,
                "hasKnownExploits",
                bytes32(uint256(bridge.hasKnownExploits ? 1 : 0)),
                bytes32(uint256(config.hasKnownExploits ? 1 : 0))
            );
            bridge.hasKnownExploits = config.hasKnownExploits;
        }
    }

    /// @inheritdoc IBridgeRegistry
    function deactivateBridge(bytes32 bridgeId, string calldata reason)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
    {
        require(_bridges[bridgeId].contractAddress != address(0), "Bridge not found");
        require(_bridges[bridgeId].isActive, "Already deactivated");

        _bridges[bridgeId].isActive = false;
        _removeFromActiveList(bridgeId);

        emit BridgeDeactivated(bridgeId, reason);
    }

    /// @inheritdoc IBridgeRegistry
    function reactivateBridge(bytes32 bridgeId)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
    {
        require(_bridges[bridgeId].contractAddress != address(0), "Bridge not found");
        require(!_bridges[bridgeId].isActive, "Already active");

        _bridges[bridgeId].isActive = true;
        _activeBridgeIds.push(bridgeId);

        emit BridgeReactivated(bridgeId);
    }

    // ============ Implementation Whitelisting ============

    /// @inheritdoc IBridgeRegistry
    function whitelistImplementation(bytes32 bridgeId, address implementation)
        external
        override
        onlyRole(IMPLEMENTATION_ADMIN_ROLE)
    {
        require(_bridges[bridgeId].contractAddress != address(0), "Bridge not found");
        require(_bridges[bridgeId].isProxy, "Bridge is not a proxy");
        require(implementation != address(0), "Invalid implementation");
        require(implementation.code.length > 0, "Implementation has no code");
        require(!_whitelistedImplementations[bridgeId][implementation], "Already whitelisted");

        _whitelistedImplementations[bridgeId][implementation] = true;
        _implementationHistory[bridgeId].push(implementation);

        // Update current implementation in config
        _bridges[bridgeId].implementationAddress = implementation;

        emit ImplementationWhitelisted(
            bridgeId,
            implementation,
            BridgeTypes.getCodeHash(implementation)
        );
    }

    /// @inheritdoc IBridgeRegistry
    function revokeImplementation(bytes32 bridgeId, address implementation)
        external
        override
        onlyRole(IMPLEMENTATION_ADMIN_ROLE)
    {
        require(_whitelistedImplementations[bridgeId][implementation], "Not whitelisted");

        _whitelistedImplementations[bridgeId][implementation] = false;

        emit ImplementationRevoked(bridgeId, implementation);
    }

    /// @inheritdoc IBridgeRegistry
    function isImplementationWhitelisted(bytes32 bridgeId, address implementation)
        external
        view
        override
        returns (bool)
    {
        return _whitelistedImplementations[bridgeId][implementation];
    }

    // ============ Configuration ============

    /// @inheritdoc IBridgeRegistry
    function setGlobalConfig(GlobalConfig calldata config)
        external
        override
        onlyRole(CONFIG_ADMIN_ROLE)
    {
        require(config.defaultMinTvlUsd > 0, "Invalid minTvl");
        require(config.defaultMaxInactivity > 0, "Invalid maxInactivity");
        require(config.circuitBreakerThreshold > 0, "Invalid circuitBreaker");
        require(config.healthCheckCooldown > 0, "Invalid cooldown");

        if (config.defaultMinTvlUsd != _globalConfig.defaultMinTvlUsd) {
            emit GlobalConfigUpdated("defaultMinTvlUsd", _globalConfig.defaultMinTvlUsd, config.defaultMinTvlUsd);
        }
        if (config.defaultMaxInactivity != _globalConfig.defaultMaxInactivity) {
            emit GlobalConfigUpdated("defaultMaxInactivity", _globalConfig.defaultMaxInactivity, config.defaultMaxInactivity);
        }
        if (config.circuitBreakerThreshold != _globalConfig.circuitBreakerThreshold) {
            emit GlobalConfigUpdated("circuitBreakerThreshold", _globalConfig.circuitBreakerThreshold, config.circuitBreakerThreshold);
        }
        if (config.healthCheckCooldown != _globalConfig.healthCheckCooldown) {
            emit GlobalConfigUpdated("healthCheckCooldown", _globalConfig.healthCheckCooldown, config.healthCheckCooldown);
        }

        _globalConfig = config;
    }

    /// @inheritdoc IBridgeRegistry
    function getGlobalConfig() external view override returns (GlobalConfig memory) {
        return _globalConfig;
    }

    // ============ Queries ============

    /// @inheritdoc IBridgeRegistry
    function getBridge(bytes32 bridgeId)
        external
        view
        override
        returns (BridgeConfig memory)
    {
        require(_bridges[bridgeId].contractAddress != address(0), "Bridge not found");
        return _bridges[bridgeId];
    }

    /// @inheritdoc IBridgeRegistry
    function getActiveBridges() external view override returns (bytes32[] memory) {
        return _activeBridgeIds;
    }

    /// @inheritdoc IBridgeRegistry
    function getBridgesByType(BridgeType bridgeType)
        external
        view
        override
        returns (bytes32[] memory)
    {
        uint256 count = 0;
        for (uint256 i = 0; i < _activeBridgeIds.length; i++) {
            if (_bridges[_activeBridgeIds[i]].bridgeType == bridgeType) {
                count++;
            }
        }

        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < _activeBridgeIds.length; i++) {
            if (_bridges[_activeBridgeIds[i]].bridgeType == bridgeType) {
                result[index] = _activeBridgeIds[i];
                index++;
            }
        }

        return result;
    }

    /// @inheritdoc IBridgeRegistry
    function computeBridgeId(string calldata name)
        external
        pure
        override
        returns (bytes32)
    {
        return keccak256(bytes(name));
    }

    /**
     * @notice Get implementation history for a bridge
     * @param bridgeId Bridge identifier
     * @return implementations Array of implementation addresses
     */
    function getImplementationHistory(bytes32 bridgeId)
        external
        view
        returns (address[] memory)
    {
        return _implementationHistory[bridgeId];
    }

    /**
     * @notice Get total number of registered bridges
     * @return count Total bridge count
     */
    function getTotalBridgeCount() external view returns (uint256) {
        return _allBridgeIds.length;
    }

    /**
     * @notice Get total number of active bridges
     * @return count Active bridge count
     */
    function getActiveBridgeCount() external view returns (uint256) {
        return _activeBridgeIds.length;
    }

    // ============ Emergency ============

    /**
     * @notice Pause the registry (emergency)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the registry
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============ Internal ============

    /**
     * @notice Remove a bridge ID from the active list
     * @param bridgeId Bridge identifier to remove
     */
    function _removeFromActiveList(bytes32 bridgeId) internal {
        for (uint256 i = 0; i < _activeBridgeIds.length; i++) {
            if (_activeBridgeIds[i] == bridgeId) {
                _activeBridgeIds[i] = _activeBridgeIds[_activeBridgeIds.length - 1];
                _activeBridgeIds.pop();
                break;
            }
        }
    }
}
