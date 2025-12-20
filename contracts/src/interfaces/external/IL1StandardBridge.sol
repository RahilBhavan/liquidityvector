// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IL1StandardBridge
 * @notice Interface for OP Stack native bridges (Base, Optimism)
 * @dev Used for querying pause state and deposit tracking
 */
interface IL1StandardBridge {
    /// @notice Check if the bridge is paused
    function paused() external view returns (bool);

    /// @notice Get the messenger address
    function messenger() external view returns (address);

    /// @notice Get the other bridge address (L2)
    function otherBridge() external view returns (address);

    /// @notice Get deposits for a token pair
    function deposits(address l1Token, address l2Token) external view returns (uint256);

    // ============ Events ============

    event ETHDepositInitiated(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes extraData
    );

    event ETHWithdrawalFinalized(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes extraData
    );

    event ERC20DepositInitiated(
        address indexed l1Token,
        address indexed l2Token,
        address indexed from,
        address to,
        uint256 amount,
        bytes extraData
    );

    event ERC20WithdrawalFinalized(
        address indexed l1Token,
        address indexed l2Token,
        address indexed from,
        address to,
        uint256 amount,
        bytes extraData
    );
}
