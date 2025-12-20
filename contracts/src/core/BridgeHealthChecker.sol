// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IBridgeHealthChecker.sol";
import "../interfaces/IBridgeRegistry.sol";
import "../interfaces/IBridgeStateMonitor.sol";
import "../libraries/BridgeTypes.sol";
import "../libraries/RiskScoring.sol";

/**
 * @title BridgeHealthChecker
 * @notice Performs real-time health checks on bridge contracts
 * @dev Designed for gas efficiency (<100k gas per bridge check)
 *
 * Features:
 * - Queries paused() state on bridge contracts
 * - Caches health reports to reduce gas costs
 * - Integrates with registry and monitor contracts
 * - Circuit breaker pattern for external call failures
 */
contract BridgeHealthChecker is IBridgeHealthChecker, AccessControl, Pausable, ReentrancyGuard {
    using BridgeTypes for *;

    // ============ Roles ============
    bytes32 public constant HEALTH_CHECKER_ROLE = keccak256("HEALTH_CHECKER_ROLE");
    bytes32 public constant CIRCUIT_BREAKER_ROLE = keccak256("CIRCUIT_BREAKER_ROLE");

    // ============ State ============
    IBridgeRegistry public immutable registry;
    IBridgeStateMonitor public stateMonitor;

    mapping(bytes32 => BridgeHealthReport) private _cachedReports;
    mapping(bytes32 => uint256) private _lastCheckBlock;
    mapping(bytes32 => uint256) private _consecutiveFailures;

    uint256 public circuitBreakerThreshold;
    mapping(bytes32 => bool) private _circuitBroken;

    // ============ Constructor ============

    /**
     * @notice Initialize health checker with dependencies
     * @param _registry Address of BridgeRegistry contract
     * @param _stateMonitor Address of BridgeStateMonitor contract
     * @param admin Multi-sig admin address
     */
    constructor(
        address _registry,
        address _stateMonitor,
        address admin
    ) {
        require(_registry != address(0), "Invalid registry");
        require(admin != address(0), "Invalid admin");

        registry = IBridgeRegistry(_registry);
        if (_stateMonitor != address(0)) {
            stateMonitor = IBridgeStateMonitor(_stateMonitor);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(HEALTH_CHECKER_ROLE, admin);
        _grantRole(CIRCUIT_BREAKER_ROLE, admin);

        circuitBreakerThreshold = 5;
    }

    // ============ Health Checks ============

    /// @inheritdoc IBridgeHealthChecker
    function checkBridgeHealth(bytes32 bridgeId)
        external
        override
        nonReentrant
        whenNotPaused
        returns (BridgeHealthReport memory report)
    {
        require(!_circuitBroken[bridgeId], "Circuit breaker open");

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);
        require(config.isActive, "Bridge not active");

        // Check cooldown (skip if never checked before)
        IBridgeRegistry.GlobalConfig memory globalConfig = registry.getGlobalConfig();
        if (_lastCheckBlock[bridgeId] > 0 &&
            block.number - _lastCheckBlock[bridgeId] < globalConfig.healthCheckCooldown) {
            return _cachedReports[bridgeId];
        }

        // Perform health check
        report = _performHealthCheck(bridgeId, config);

        // Cache result
        _cachedReports[bridgeId] = report;
        _lastCheckBlock[bridgeId] = block.number;
        _consecutiveFailures[bridgeId] = 0; // Reset on success

        emit BridgeHealthChecked(bridgeId, report.status, report.riskScore, block.timestamp);

        return report;
    }

    /// @inheritdoc IBridgeHealthChecker
    function batchCheckHealth(bytes32[] calldata bridgeIds)
        external
        override
        nonReentrant
        whenNotPaused
        returns (BridgeHealthReport[] memory reports)
    {
        reports = new BridgeHealthReport[](bridgeIds.length);

        for (uint256 i = 0; i < bridgeIds.length; i++) {
            if (_circuitBroken[bridgeIds[i]]) {
                reports[i] = _cachedReports[bridgeIds[i]];
                reports[i].status = BridgeStatus.UNKNOWN;
                continue;
            }

            try this.checkBridgeHealthInternal(bridgeIds[i]) returns (BridgeHealthReport memory r) {
                reports[i] = r;
            } catch {
                reports[i] = _cachedReports[bridgeIds[i]];
                reports[i].status = BridgeStatus.UNKNOWN;
                _handleCheckFailure(bridgeIds[i], "Batch check failed");
            }
        }

        return reports;
    }

    /**
     * @notice Internal health check function for try/catch pattern
     * @param bridgeId Bridge identifier
     * @return report Health report
     */
    function checkBridgeHealthInternal(bytes32 bridgeId)
        external
        returns (BridgeHealthReport memory report)
    {
        require(msg.sender == address(this), "Internal only");

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);
        require(config.isActive, "Bridge not active");

        report = _performHealthCheck(bridgeId, config);

        _cachedReports[bridgeId] = report;
        _lastCheckBlock[bridgeId] = block.number;
        _consecutiveFailures[bridgeId] = 0;

        emit BridgeHealthChecked(bridgeId, report.status, report.riskScore, block.timestamp);

        return report;
    }

    /// @inheritdoc IBridgeHealthChecker
    function getCachedHealth(bytes32 bridgeId)
        external
        view
        override
        returns (BridgeHealthReport memory)
    {
        return _cachedReports[bridgeId];
    }

    /// @inheritdoc IBridgeHealthChecker
    function isBridgeSafe(bytes32 bridgeId, uint256 minRiskScore)
        external
        view
        override
        returns (bool isSafe, string memory reason)
    {
        BridgeHealthReport memory report = _cachedReports[bridgeId];

        if (report.status == BridgeStatus.UNKNOWN) {
            return (false, "No health data available");
        }

        if (report.status == BridgeStatus.PAUSED) {
            return (false, "Bridge is paused");
        }

        if (report.status == BridgeStatus.QUARANTINED) {
            return (false, "Bridge is quarantined");
        }

        if (report.status == BridgeStatus.LOW_LIQUIDITY) {
            return (false, "Insufficient liquidity");
        }

        if (report.status == BridgeStatus.INACTIVE) {
            return (false, "Bridge inactive");
        }

        if (report.status == BridgeStatus.UPGRADED_PENDING) {
            return (false, "Implementation upgrade pending review");
        }

        if (report.riskScore < minRiskScore) {
            return (false, "Risk score below threshold");
        }

        return (true, "");
    }

    /// @inheritdoc IBridgeHealthChecker
    function getOperationalBridges(uint256 minTvl, uint256 minRiskScore)
        external
        view
        override
        returns (bytes32[] memory)
    {
        bytes32[] memory allBridges = registry.getActiveBridges();

        // First pass: count qualifying bridges
        uint256 count = 0;
        for (uint256 i = 0; i < allBridges.length; i++) {
            BridgeHealthReport memory report = _cachedReports[allBridges[i]];
            if (
                report.status == BridgeStatus.OPERATIONAL &&
                report.tvlUsd >= minTvl &&
                report.riskScore >= minRiskScore
            ) {
                count++;
            }
        }

        // Second pass: populate result
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allBridges.length; i++) {
            BridgeHealthReport memory report = _cachedReports[allBridges[i]];
            if (
                report.status == BridgeStatus.OPERATIONAL &&
                report.tvlUsd >= minTvl &&
                report.riskScore >= minRiskScore
            ) {
                result[index] = allBridges[i];
                index++;
            }
        }

        return result;
    }

    // ============ Internal ============

    function _performHealthCheck(
        bytes32 bridgeId,
        IBridgeRegistry.BridgeConfig memory config
    ) internal returns (BridgeHealthReport memory report) {
        report.lastCheckTimestamp = block.timestamp;

        // Check quarantine status first (if monitor is set)
        bool isQuarantined = false;
        if (address(stateMonitor) != address(0)) {
            (isQuarantined, ) = stateMonitor.isQuarantined(bridgeId);
        }
        report.isQuarantined = isQuarantined;

        if (isQuarantined) {
            report.status = BridgeStatus.QUARANTINED;
            report.riskScore = 0;
            return report;
        }

        // Check pause state on bridge contract
        (bool isPaused, ) = BridgeTypes.checkPaused(config.contractAddress);
        report.isPaused = isPaused;

        if (isPaused) {
            report.status = BridgeStatus.PAUSED;
            report.riskScore = 0;
            return report;
        }

        // Check implementation for proxies
        bool isImplWhitelisted = true;
        if (config.isProxy) {
            address currentImpl = BridgeTypes.getImplementation(config.contractAddress);
            if (currentImpl != address(0)) {
                report.currentImplHash = BridgeTypes.getCodeHash(currentImpl);
                isImplWhitelisted = registry.isImplementationWhitelisted(bridgeId, currentImpl);
            }

            if (!isImplWhitelisted) {
                report.status = BridgeStatus.UPGRADED_PENDING;
            }
        }

        // Get TVL from bridge contract
        report.tvlUsd = BridgeTypes.getTvl(config.contractAddress);

        if (report.tvlUsd < config.minTvlUsd && report.status != BridgeStatus.UPGRADED_PENDING) {
            report.status = BridgeStatus.LOW_LIQUIDITY;
        }

        // Use current block as last activity (actual implementation would query indexer)
        report.lastActivityBlock = block.number;

        // Calculate risk score
        report.riskScore = RiskScoring.calculateRiskScore(
            config,
            report.tvlUsd,
            isPaused,
            isQuarantined,
            isImplWhitelisted
        );

        // Set operational if no issues found
        if (report.status == BridgeStatus.UNKNOWN) {
            report.status = BridgeStatus.OPERATIONAL;
        }

        return report;
    }

    function _handleCheckFailure(bytes32 bridgeId, string memory reason) internal {
        _consecutiveFailures[bridgeId]++;

        emit HealthCheckFailed(bridgeId, reason, block.timestamp);

        if (_consecutiveFailures[bridgeId] >= circuitBreakerThreshold) {
            _circuitBroken[bridgeId] = true;
            emit CircuitBreakerTriggered(bridgeId, _consecutiveFailures[bridgeId], block.timestamp);
        }
    }

    // ============ Circuit Breaker Management ============

    /// @inheritdoc IBridgeHealthChecker
    function resetCircuitBreaker(bytes32 bridgeId)
        external
        override
        onlyRole(CIRCUIT_BREAKER_ROLE)
    {
        _circuitBroken[bridgeId] = false;
        _consecutiveFailures[bridgeId] = 0;
        emit CircuitBreakerReset(bridgeId, block.timestamp);
    }

    /// @inheritdoc IBridgeHealthChecker
    function isCircuitBroken(bytes32 bridgeId) external view override returns (bool) {
        return _circuitBroken[bridgeId];
    }

    /**
     * @notice Update state monitor address
     * @param _stateMonitor New state monitor address
     */
    function setStateMonitor(address _stateMonitor)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        stateMonitor = IBridgeStateMonitor(_stateMonitor);
    }

    /**
     * @notice Update circuit breaker threshold
     * @param threshold New threshold
     */
    function setCircuitBreakerThreshold(uint256 threshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(threshold > 0, "Invalid threshold");
        circuitBreakerThreshold = threshold;
    }

    /**
     * @notice Get consecutive failures for a bridge
     * @param bridgeId Bridge identifier
     * @return count Consecutive failure count
     */
    function getConsecutiveFailures(bytes32 bridgeId) external view returns (uint256) {
        return _consecutiveFailures[bridgeId];
    }

    /**
     * @notice Get last check block for a bridge
     * @param bridgeId Bridge identifier
     * @return blockNumber Block of last check
     */
    function getLastCheckBlock(bytes32 bridgeId) external view returns (uint256) {
        return _lastCheckBlock[bridgeId];
    }

    // ============ Emergency ============

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
