// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/core/BridgeRegistry.sol";
import "../src/core/BridgeStateMonitor.sol";
import "../src/core/BridgeHealthChecker.sol";

/**
 * @title DeployScript
 * @notice Deployment script for bridge monitoring infrastructure
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address multisig = vm.envAddress("MULTISIG_ADDRESS");

        require(multisig != address(0), "MULTISIG_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Registry
        BridgeRegistry registry = new BridgeRegistry(multisig);
        console.log("BridgeRegistry deployed at:", address(registry));

        // 2. Deploy State Monitor
        BridgeStateMonitor monitor = new BridgeStateMonitor(
            address(registry),
            multisig
        );
        console.log("BridgeStateMonitor deployed at:", address(monitor));

        // 3. Deploy Health Checker
        BridgeHealthChecker checker = new BridgeHealthChecker(
            address(registry),
            address(monitor),
            multisig
        );
        console.log("BridgeHealthChecker deployed at:", address(checker));

        vm.stopBroadcast();

        // Output deployment summary
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Chain ID:", block.chainid);
        console.log("Registry:", address(registry));
        console.log("Monitor:", address(monitor));
        console.log("Checker:", address(checker));
        console.log("Admin Multisig:", multisig);
    }
}

/**
 * @title DeployLocal
 * @notice Local deployment script for testing
 * @dev Run with: forge script script/Deploy.s.sol:DeployLocal --fork-url <RPC_URL> --broadcast
 */
contract DeployLocal is Script {
    function run() external {
        address deployer = vm.addr(1);

        vm.startBroadcast(deployer);

        // Deploy with deployer as admin (for local testing)
        BridgeRegistry registry = new BridgeRegistry(deployer);
        BridgeStateMonitor monitor = new BridgeStateMonitor(address(registry), deployer);
        BridgeHealthChecker checker = new BridgeHealthChecker(
            address(registry),
            address(monitor),
            deployer
        );

        vm.stopBroadcast();

        console.log("Local Deployment:");
        console.log("Registry:", address(registry));
        console.log("Monitor:", address(monitor));
        console.log("Checker:", address(checker));
    }
}
