// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/core/BridgeRegistry.sol";
import "../src/interfaces/IBridgeRegistry.sol";

/**
 * @title ConfigureBridgesScript
 * @notice Configures bridges for Ethereum mainnet
 * @dev Run after Deploy.s.sol to register mainnet bridges
 *
 * Usage:
 * forge script script/ConfigureBridges.s.sol --rpc-url <RPC_URL> --broadcast
 *
 * Required env vars:
 * - PRIVATE_KEY: Deployer private key (must have REGISTRY_ADMIN_ROLE)
 * - REGISTRY_ADDRESS: Address of deployed BridgeRegistry
 */
contract ConfigureBridgesScript is Script {
    // ============ Mainnet Bridge Addresses ============

    // Stargate (LayerZero)
    address constant STARGATE_ORACLE = 0x5a54fe5234E811466D5366846283323c954310B2;

    // Across Protocol
    address constant ACROSS_SPOKEPOOL = 0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5;

    // Hop Protocol
    address constant HOP_USDC_BRIDGE = 0x3666f603Cc164936C1b87e207F36BEBa4AC5f18a;

    // Synapse Protocol
    address constant SYNAPSE_BRIDGE = 0x2796317b0fF8538F253012862c06787Adfb8cEb6;

    // Native Bridges
    address constant ARBITRUM_GATEWAY = 0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef;
    address constant BASE_BRIDGE = 0x3154Cf16ccdb4C6d922629664174b904d80F2C35;
    address constant OPTIMISM_BRIDGE = 0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");

        BridgeRegistry registry = BridgeRegistry(registryAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Register Stargate
        _registerBridge(
            registry,
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "Stargate",
                bridgeType: IBridgeRegistry.BridgeType.LAYERZERO,
                contractAddress: STARGATE_ORACLE,
                implementationAddress: address(0),
                isProxy: false,
                isActive: true,
                minTvlUsd: 100_000_000e18, // $100M
                maxInactivityPeriod: 7200, // ~1 day
                ageMonths: 30, // ~2.5 years
                hasKnownExploits: false
            })
        );

        // Register Across
        _registerBridge(
            registry,
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "Across",
                bridgeType: IBridgeRegistry.BridgeType.INTENT,
                contractAddress: ACROSS_SPOKEPOOL,
                implementationAddress: address(0),
                isProxy: true,
                isActive: true,
                minTvlUsd: 50_000_000e18, // $50M
                maxInactivityPeriod: 7200,
                ageMonths: 18, // ~1.5 years
                hasKnownExploits: false
            })
        );

        // Register Hop
        _registerBridge(
            registry,
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "Hop",
                bridgeType: IBridgeRegistry.BridgeType.LIQUIDITY,
                contractAddress: HOP_USDC_BRIDGE,
                implementationAddress: address(0),
                isProxy: false,
                isActive: true,
                minTvlUsd: 20_000_000e18, // $20M
                maxInactivityPeriod: 7200,
                ageMonths: 42, // ~3.5 years
                hasKnownExploits: false
            })
        );

        // Register Synapse (with exploit flag)
        _registerBridge(
            registry,
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "Synapse",
                bridgeType: IBridgeRegistry.BridgeType.LIQUIDITY,
                contractAddress: SYNAPSE_BRIDGE,
                implementationAddress: address(0),
                isProxy: true,
                isActive: true,
                minTvlUsd: 30_000_000e18, // $30M
                maxInactivityPeriod: 7200,
                ageMonths: 33, // ~2.75 years
                hasKnownExploits: true // Historical exploit in 2021
            })
        );

        // Register Native Bridges
        _registerBridge(
            registry,
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "ArbitrumNative",
                bridgeType: IBridgeRegistry.BridgeType.CANONICAL,
                contractAddress: ARBITRUM_GATEWAY,
                implementationAddress: address(0),
                isProxy: false,
                isActive: true,
                minTvlUsd: 0, // Canonical bridges have special trust
                maxInactivityPeriod: 14400, // 2 days for canonical
                ageMonths: 48, // ~4 years
                hasKnownExploits: false
            })
        );

        _registerBridge(
            registry,
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "BaseNative",
                bridgeType: IBridgeRegistry.BridgeType.CANONICAL,
                contractAddress: BASE_BRIDGE,
                implementationAddress: address(0),
                isProxy: true,
                isActive: true,
                minTvlUsd: 0,
                maxInactivityPeriod: 14400,
                ageMonths: 18, // ~1.5 years
                hasKnownExploits: false
            })
        );

        _registerBridge(
            registry,
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "OptimismNative",
                bridgeType: IBridgeRegistry.BridgeType.CANONICAL,
                contractAddress: OPTIMISM_BRIDGE,
                implementationAddress: address(0),
                isProxy: true,
                isActive: true,
                minTvlUsd: 0,
                maxInactivityPeriod: 14400,
                ageMonths: 48, // ~4 years
                hasKnownExploits: false
            })
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== Bridge Configuration Complete ===");
        console.log("Total bridges registered: 7");
    }

    function _registerBridge(
        BridgeRegistry registry,
        IBridgeRegistry.BridgeConfig memory config
    ) internal {
        bytes32 bridgeId = registry.registerBridge(config);
        console.log("Registered:", config.name);
        console.log("  Bridge ID:", vm.toString(bridgeId));
        console.log("  Address:", config.contractAddress);
        console.log("  Type:", uint256(config.bridgeType));
    }
}
