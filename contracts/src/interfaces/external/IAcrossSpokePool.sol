// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAcrossSpokePool
 * @notice Interface for Across Protocol SpokePool contracts
 * @dev Used for querying pause state and pool status
 */
interface IAcrossSpokePool {
    /// @notice Check if the pool is paused
    function paused() external view returns (bool);

    /// @notice Check if deposits are paused
    function pausedDeposits() external view returns (bool);

    /// @notice Check if fills are paused
    function pausedFills() external view returns (bool);

    /// @notice Get the HubPool address
    function hubPool() external view returns (address);

    /// @notice Get the number of deposits
    function numberOfDeposits() external view returns (uint32);

    /// @notice Get the current time (for testing)
    function getCurrentTime() external view returns (uint256);

    /// @notice Get the chain ID
    function chainId() external view returns (uint256);

    /// @notice Get the WETH address
    function wrappedNativeToken() external view returns (address);
}
