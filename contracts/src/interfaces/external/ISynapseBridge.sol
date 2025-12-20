// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISynapseBridge
 * @notice Interface for Synapse Protocol bridge contracts
 * @dev Used for querying pause state and bridge status
 */
interface ISynapseBridge {
    /// @notice Check if the bridge is paused
    function paused() external view returns (bool);

    /// @notice Get the bridge version
    function bridgeVersion() external view returns (uint256);

    /// @notice Get the chain gas amount
    function chainGasAmount() external view returns (uint256);

    /// @notice Get the start block number
    function startBlockNumber() external view returns (uint256);

    /// @notice Get the WETH address
    function WETH_ADDRESS() external view returns (address);

    /// @notice Get the fee rate
    function getFeeRate(address tokenAddress) external view returns (uint256);
}
