// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LiquidityVault} from "../src/LiquidityVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1_000_000 * 1e18);
    }
}

contract LiquidityVaultTest is Test {
    LiquidityVault public vault;
    MockERC20 public token;
    address public owner = address(1);
    address public user = address(2);
    address public feeRecipient = address(3);

    function setUp() public {
        vm.startPrank(owner);
        token = new MockERC20();
        vault = new LiquidityVault(
            token,
            "Liquidity Vector Vault",
            "lvUSDC",
            owner,
            feeRecipient
        );
        vm.stopPrank();

        // Setup User
        vm.prank(owner);
        token.transfer(user, 1000 * 1e18);
    }

    function test_Deployment() public {
        assertEq(vault.name(), "Liquidity Vector Vault");
        assertEq(vault.symbol(), "lvUSDC");
        assertEq(vault.asset(), address(token));
        assertEq(vault.owner(), owner);
    }

    function test_Deposit() public {
        uint256 amount = 100 * 1e18;

        vm.startPrank(user);
        token.approve(address(vault), amount);
        uint256 shares = vault.deposit(amount, user);
        vm.stopPrank();

        assertEq(shares, amount, "Shares should match deposit 1:1 initially");
        assertEq(vault.totalAssets(), amount, "Total assets should update");
        assertEq(vault.balanceOf(user), shares, "User should have shares");
    }

    function test_Withdraw() public {
        uint256 amount = 100 * 1e18;

        vm.startPrank(user);
        token.approve(address(vault), amount);
        vault.deposit(amount, user);
        
        uint256 balanceBefore = token.balanceOf(user);
        vault.withdraw(amount, user, user);
        uint256 balanceAfter = token.balanceOf(user);
        
        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, amount, "Should withdraw full amount");
        assertEq(vault.totalAssets(), 0, "Vault should be empty");
    }

    function test_Pause() public {
        vm.prank(owner);
        vault.pause();
        
        vm.startPrank(user);
        token.approve(address(vault), 100);
        vm.expectRevert(); // Should revert with EnforcedPause()
        vault.deposit(100, user);
        vm.stopPrank();
    }
}
