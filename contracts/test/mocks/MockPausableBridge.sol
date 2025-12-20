// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPausableBridge
 * @notice Mock bridge for testing pause/unpause functionality
 * @dev Simulates a bridge contract with configurable state
 */
contract MockPausableBridge {
    bool private _paused;
    uint256 private _tvl;
    uint256 private _lastActivityBlock;

    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        _paused = false;
        _tvl = 100_000_000e18; // 100M default
        _lastActivityBlock = block.number;
    }

    /// @notice Check if bridge is paused
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

    /// @notice Get last activity block
    function lastActivityBlock() external view returns (uint256) {
        return _lastActivityBlock;
    }

    /// @notice Set last activity block for testing
    function setLastActivityBlock(uint256 blockNum) external {
        _lastActivityBlock = blockNum;
    }

    /// @notice Simulate activity
    function simulateActivity() external {
        _lastActivityBlock = block.number;
    }

    /// @notice Fallback to accept ETH
    receive() external payable {}
}
