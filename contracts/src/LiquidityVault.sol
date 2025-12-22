// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LiquidityVault
 * @notice Automated Cross-Chain Yield Vault (ERC-4626)
 * @dev Implements a standard yield bearing vault with management/performance fees.
 */
contract LiquidityVault is ERC4626, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // --- Events ---
    event Harvested(address indexed harvester, uint256 profit, uint256 performanceFee, uint256 managementFee);
    event FeesUpdated(uint256 newManagementFee, uint256 newPerformanceFee);
    
    // --- Constants ---
    uint256 public constant MAX_FEE_BPS = 1000; // 10% Max Fee Cap
    uint256 public constant BPS_DENOMINATOR = 10000;

    // --- State Variables ---
    uint256 public managementFeeBps = 100; // 1%
    uint256 public performanceFeeBps = 1000; // 10%
    address public feeRecipient;

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _owner,
        address _feeRecipient
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(_owner) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Updates fee configuration
     * @param _managementFeeBps annual management fee in basis points
     * @param _performanceFeeBps performance fee on profit in basis points
     */
    function setFees(uint256 _managementFeeBps, uint256 _performanceFeeBps) external onlyOwner {
        require(_managementFeeBps <= MAX_FEE_BPS, "Mgmt fee too high");
        require(_performanceFeeBps <= MAX_FEE_BPS, "Perf fee too high");
        managementFeeBps = _managementFeeBps;
        performanceFeeBps = _performanceFeeBps;
        emit FeesUpdated(_managementFeeBps, _performanceFeeBps);
    }

    /**
     * @notice Pause vault deposits/withdrawals
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause vault
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Creates a new share based on deposited assets
     * @dev Overridden to add whenNotPaused modifier
     */
    function deposit(uint256 assets, address receiver) public override whenNotPaused returns (uint256) {
        return super.deposit(assets, receiver);
    }

    /**
     * @notice Creates a new share based on deposited assets
     * @dev Overridden to add whenNotPaused modifier
     */
    function mint(uint256 shares, address receiver) public override whenNotPaused returns (uint256) {
        return super.mint(shares, receiver);
    }

    /**
     * @notice Burns shares to withdraw assets
     * @dev Overridden to add whenNotPaused modifier
     */
    function withdraw(uint256 assets, address receiver, address owner) public override whenNotPaused returns (uint256) {
        return super.withdraw(assets, receiver, owner);
    }

    /**
     * @notice Burns shares to withdraw assets
     * @dev Overridden to add whenNotPaused modifier
     */
    function redeem(uint256 shares, address receiver, address owner) public override whenNotPaused returns (uint256) {
        return super.redeem(shares, receiver, owner);
    }

    /**
     * @notice Harvests yields and takes fees.
     * @dev Placeholder logic for strategy execution and fee taking. It currently assumes the balance increase is profit.
     */
    function harvest() external onlyOwner {
        uint256 totalAssetsBefore = totalAssets();
        // In a real strategy, we would pull funds from underlying protocols here.
        // For now, checks current balance vs accounted strategy funds (simplified).
        
        // Fee logic would go here.
        // This is a simplified placeholder.
    }
}
