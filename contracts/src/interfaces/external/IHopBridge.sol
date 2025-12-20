// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHopBridge
 * @notice Interface for Hop Protocol bridge contracts
 * @dev Used for querying pause state and bridge configuration
 */
interface IHopBridge {
    /// @notice Check if the bridge is paused
    function paused() external view returns (bool);

    /// @notice Get the L1 canonical token address
    function l1CanonicalToken() external view returns (address);

    /// @notice Get the L1 bridge address
    function l1BridgeAddress() external view returns (address);

    /// @notice Get the chain ID
    function getChainId() external view returns (uint256);

    /// @notice Get the governance address
    function governance() external view returns (address);

    /// @notice Get the hToken address
    function hToken() external view returns (address);

    /// @notice Get the AMM wrapper address (if applicable)
    function ammWrapper() external view returns (address);
}
