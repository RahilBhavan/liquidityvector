// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockUpgradeableBridge
 * @notice Mock upgradeable proxy bridge for testing upgrade detection
 * @dev Simulates EIP-1967 proxy pattern
 */
contract MockUpgradeableBridge {
    // EIP-1967 implementation slot
    bytes32 private constant IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    address private _implementation;
    bool private _paused;
    uint256 private _tvl;

    event Upgraded(address indexed implementation);
    event Paused(address account);
    event Unpaused(address account);

    constructor(address impl) {
        _implementation = impl;
        _paused = false;
        _tvl = 200_000_000e18; // 200M default
    }

    /// @notice Get current implementation
    function implementation() external view returns (address) {
        return _implementation;
    }

    /// @notice Upgrade to new implementation
    function upgradeTo(address newImplementation) external {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation.code.length > 0, "Implementation has no code");

        address oldImpl = _implementation;
        _implementation = newImplementation;
        emit Upgraded(newImplementation);
    }

    /// @notice Check if paused
    function paused() external view returns (bool) {
        return _paused;
    }

    /// @notice Pause the bridge
    function pause() external {
        _paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause the bridge
    function unpause() external {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Get total liquidity
    function totalLiquidity() external view returns (uint256) {
        return _tvl;
    }

    /// @notice Set TVL for testing
    function setTvl(uint256 tvl) external {
        _tvl = tvl;
    }

    /// @notice Fallback to accept ETH
    receive() external payable {}
}

/**
 * @title MockImplementationV1
 * @notice First version of implementation for testing
 */
contract MockImplementationV1 {
    uint256 public constant VERSION = 1;

    function getVersion() external pure returns (uint256) {
        return VERSION;
    }
}

/**
 * @title MockImplementationV2
 * @notice Second version of implementation for testing upgrades
 */
contract MockImplementationV2 {
    uint256 public constant VERSION = 2;

    function getVersion() external pure returns (uint256) {
        return VERSION;
    }

    function newFeature() external pure returns (string memory) {
        return "New feature in V2";
    }
}
