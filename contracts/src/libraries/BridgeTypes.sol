// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BridgeTypes
 * @notice Shared type definitions and constants for bridge monitoring
 * @dev Used across all bridge security monitoring contracts
 */
library BridgeTypes {
    // ============ Bridge IDs (keccak256 of names) ============
    bytes32 public constant STARGATE_ID = keccak256("Stargate");
    bytes32 public constant ACROSS_ID = keccak256("Across");
    bytes32 public constant HOP_ID = keccak256("Hop");
    bytes32 public constant SYNAPSE_ID = keccak256("Synapse");
    bytes32 public constant ARBITRUM_NATIVE_ID = keccak256("ArbitrumNative");
    bytes32 public constant BASE_NATIVE_ID = keccak256("BaseNative");
    bytes32 public constant OPTIMISM_NATIVE_ID = keccak256("OptimismNative");
    bytes32 public constant POLYGON_NATIVE_ID = keccak256("PolygonNative");

    // ============ Risk Score Constants ============
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public constant MIN_SAFE_SCORE = 60;
    uint256 public constant EXPLOIT_PENALTY = 20;
    uint256 public constant AGE_BONUS_PER_YEAR = 2;
    uint256 public constant MAX_AGE_BONUS = 10;
    uint256 public constant HIGH_TVL_BONUS = 4;
    uint256 public constant LOW_TVL_PENALTY = 8;
    uint256 public constant UNWHITELISTED_IMPL_PENALTY = 30;
    uint256 public constant TVL_HIGH_THRESHOLD = 1_000_000_000e18; // $1B USD
    uint256 public constant TVL_LOW_THRESHOLD = 100_000_000e18;    // $100M USD

    // ============ Base Risk Scores by Bridge Type ============
    uint256 public constant CANONICAL_BASE_SCORE = 95;
    uint256 public constant INTENT_BASE_SCORE = 88;
    uint256 public constant LAYERZERO_BASE_SCORE = 85;
    uint256 public constant LIQUIDITY_BASE_SCORE = 78;
    uint256 public constant DEFAULT_BASE_SCORE = 75;

    // ============ Default Thresholds ============
    uint256 public constant DEFAULT_MIN_TVL = 10_000_000e18; // $10M USD
    uint256 public constant DEFAULT_MAX_INACTIVITY = 7200;   // ~1 day in blocks (12s blocks)
    uint256 public constant HEALTH_CHECK_COOLDOWN = 25;      // ~5 minutes in blocks

    // ============ EIP-1967 Slots ============
    /// @dev Storage slot for EIP-1967 implementation address
    bytes32 public constant IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /**
     * @notice Get implementation address from EIP-1967 proxy
     * @param proxy Proxy contract address
     * @return impl Implementation address (address(0) if not a proxy)
     */
    function getImplementation(address proxy) internal view returns (address impl) {
        // Try reading from EIP-1967 slot
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }

        // If direct slot read returns 0, try calling implementation()
        if (impl == address(0)) {
            (bool success, bytes memory data) = proxy.staticcall(
                abi.encodeWithSignature("implementation()")
            );
            if (success && data.length >= 32) {
                impl = abi.decode(data, (address));
            }
        }
    }

    /**
     * @notice Check if contract has paused() function and is paused
     * @param target Contract to check
     * @return isPaused True if contract is paused
     * @return hasPauseFunction True if contract has pause function
     */
    function checkPaused(address target) internal view returns (bool isPaused, bool hasPauseFunction) {
        if (target.code.length == 0) {
            return (false, false);
        }

        (bool success, bytes memory data) = target.staticcall(
            abi.encodeWithSignature("paused()")
        );
        if (success && data.length >= 32) {
            hasPauseFunction = true;
            isPaused = abi.decode(data, (bool));
        }
    }

    /**
     * @notice Safely get TVL from a bridge contract
     * @param target Bridge contract address
     * @return tvl TVL value (0 if unable to fetch)
     */
    function getTvl(address target) internal view returns (uint256 tvl) {
        if (target.code.length == 0) {
            return 0;
        }

        // Try totalLiquidity()
        (bool success, bytes memory data) = target.staticcall(
            abi.encodeWithSignature("totalLiquidity()")
        );
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }

        // Try getPoolLiquidity()
        (success, data) = target.staticcall(
            abi.encodeWithSignature("getPoolLiquidity()")
        );
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }

        // Fallback: check ETH balance (rough estimate)
        return target.balance;
    }

    /**
     * @notice Get code hash of a contract
     * @param target Contract address
     * @return codeHash Hash of the contract bytecode
     */
    function getCodeHash(address target) internal view returns (bytes32 codeHash) {
        assembly {
            codeHash := extcodehash(target)
        }
    }
}
