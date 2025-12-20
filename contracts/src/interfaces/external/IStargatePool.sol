// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStargatePool
 * @notice Interface for Stargate LayerZero pool contracts
 * @dev Used for querying pause state and liquidity
 */
interface IStargatePool {
    /// @notice Check if the pool is paused
    function paused() external view returns (bool);

    /// @notice Get total liquidity in the pool
    function totalLiquidity() external view returns (uint256);

    /// @notice Get the pool ID
    function poolId() external view returns (uint256);

    /// @notice Get the token address
    function token() external view returns (address);

    /// @notice Get local decimals
    function localDecimals() external view returns (uint256);

    /// @notice Get shared decimals for cross-chain
    function sharedDecimals() external view returns (uint256);

    /// @notice Get total weight for fee calculation
    function totalWeight() external view returns (uint256);
}
