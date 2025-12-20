// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArbitrumGateway
 * @notice Interface for Arbitrum Gateway Router contracts
 * @dev Used for querying pause state and gateway configuration
 */
interface IArbitrumGateway {
    /// @notice Get the gateway for a specific token
    function getGateway(address token) external view returns (address);

    /// @notice Get the L2 token address for an L1 token
    function calculateL2TokenAddress(address l1Token) external view returns (address);

    /// @notice Get the default gateway
    function defaultGateway() external view returns (address);

    /// @notice Get the inbox address
    function inbox() external view returns (address);

    /// @notice Get the router address
    function router() external view returns (address);

    /// @notice Get the counterpart gateway
    function counterpartGateway() external view returns (address);

    // ============ Events ============

    event DepositInitiated(
        address l1Token,
        address indexed from,
        address indexed to,
        uint256 indexed sequenceNumber,
        uint256 amount
    );

    event WithdrawalFinalized(
        address l1Token,
        address indexed from,
        address indexed to,
        uint256 indexed exitNum,
        uint256 amount
    );

    event GatewaySet(
        address indexed l1Token,
        address indexed gateway
    );
}
