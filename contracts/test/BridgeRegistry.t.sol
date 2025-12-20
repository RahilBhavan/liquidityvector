// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BridgeRegistry} from "../src/core/BridgeRegistry.sol";
import {IBridgeRegistry} from "../src/interfaces/IBridgeRegistry.sol";
import {MockPausableBridge} from "./mocks/MockPausableBridge.sol";
import {MockUpgradeableBridge, MockImplementationV1, MockImplementationV2} from "./mocks/MockUpgradeableBridge.sol";

contract BridgeRegistryTest is Test {
    BridgeRegistry public registry;
    MockPausableBridge public mockBridge;
    MockUpgradeableBridge public mockProxyBridge;
    MockImplementationV1 public implV1;

    address public admin = makeAddr("admin");
    address public user = makeAddr("user");

    bytes32 public bridgeId;
    bytes32 public proxyBridgeId;

    function setUp() public {
        vm.startPrank(admin);

        // Deploy registry
        registry = new BridgeRegistry(admin);

        // Deploy mock bridges
        mockBridge = new MockPausableBridge();
        implV1 = new MockImplementationV1();
        mockProxyBridge = new MockUpgradeableBridge(address(implV1));

        // Register non-proxy bridge
        IBridgeRegistry.BridgeConfig memory config = IBridgeRegistry.BridgeConfig({
            bridgeId: bytes32(0),
            name: "TestBridge",
            bridgeType: IBridgeRegistry.BridgeType.LIQUIDITY,
            contractAddress: address(mockBridge),
            implementationAddress: address(0),
            isProxy: false,
            isActive: true,
            minTvlUsd: 10_000_000e18,
            maxInactivityPeriod: 7200,
            ageMonths: 24,
            hasKnownExploits: false
        });

        bridgeId = registry.registerBridge(config);

        // Register proxy bridge
        IBridgeRegistry.BridgeConfig memory proxyConfig = IBridgeRegistry.BridgeConfig({
            bridgeId: bytes32(0),
            name: "ProxyBridge",
            bridgeType: IBridgeRegistry.BridgeType.INTENT,
            contractAddress: address(mockProxyBridge),
            implementationAddress: address(implV1),
            isProxy: true,
            isActive: true,
            minTvlUsd: 50_000_000e18,
            maxInactivityPeriod: 7200,
            ageMonths: 18,
            hasKnownExploits: false
        });

        proxyBridgeId = registry.registerBridge(proxyConfig);

        vm.stopPrank();
    }

    // ============ Registration Tests ============

    function test_registerBridge_success() public view {
        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);

        assertEq(config.name, "TestBridge");
        assertEq(config.contractAddress, address(mockBridge));
        assertEq(uint256(config.bridgeType), uint256(IBridgeRegistry.BridgeType.LIQUIDITY));
        assertTrue(config.isActive);
        assertFalse(config.isProxy);
    }

    function test_registerBridge_proxyWithWhitelistedImpl() public view {
        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(proxyBridgeId);

        assertTrue(config.isProxy);
        assertEq(config.implementationAddress, address(implV1));
        assertTrue(registry.isImplementationWhitelisted(proxyBridgeId, address(implV1)));
    }

    function test_registerBridge_revertDuplicate() public {
        vm.prank(admin);
        IBridgeRegistry.BridgeConfig memory config = IBridgeRegistry.BridgeConfig({
            bridgeId: bytes32(0),
            name: "TestBridge",
            bridgeType: IBridgeRegistry.BridgeType.LIQUIDITY,
            contractAddress: address(mockBridge),
            implementationAddress: address(0),
            isProxy: false,
            isActive: true,
            minTvlUsd: 0,
            maxInactivityPeriod: 0,
            ageMonths: 0,
            hasKnownExploits: false
        });

        vm.expectRevert("Bridge already exists");
        registry.registerBridge(config);
    }

    function test_registerBridge_revertUnauthorized() public {
        vm.prank(user);
        IBridgeRegistry.BridgeConfig memory config = IBridgeRegistry.BridgeConfig({
            bridgeId: bytes32(0),
            name: "NewBridge",
            bridgeType: IBridgeRegistry.BridgeType.LIQUIDITY,
            contractAddress: address(mockBridge),
            implementationAddress: address(0),
            isProxy: false,
            isActive: true,
            minTvlUsd: 0,
            maxInactivityPeriod: 0,
            ageMonths: 0,
            hasKnownExploits: false
        });

        vm.expectRevert();
        registry.registerBridge(config);
    }

    // ============ Update Tests ============

    function test_updateBridge_success() public {
        vm.prank(admin);
        IBridgeRegistry.BridgeConfig memory config = IBridgeRegistry.BridgeConfig({
            bridgeId: bridgeId,
            name: "TestBridge",
            bridgeType: IBridgeRegistry.BridgeType.LIQUIDITY,
            contractAddress: address(mockBridge),
            implementationAddress: address(0),
            isProxy: false,
            isActive: true,
            minTvlUsd: 20_000_000e18, // Updated
            maxInactivityPeriod: 7200,
            ageMonths: 24,
            hasKnownExploits: true // Updated
        });

        registry.updateBridge(bridgeId, config);

        IBridgeRegistry.BridgeConfig memory updated = registry.getBridge(bridgeId);
        assertEq(updated.minTvlUsd, 20_000_000e18);
        assertTrue(updated.hasKnownExploits);
    }

    // ============ Deactivation Tests ============

    function test_deactivateBridge_success() public {
        vm.prank(admin);
        registry.deactivateBridge(bridgeId, "Security concern");

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);
        assertFalse(config.isActive);

        bytes32[] memory activeBridges = registry.getActiveBridges();
        assertEq(activeBridges.length, 1); // Only proxy bridge remains
    }

    function test_reactivateBridge_success() public {
        vm.startPrank(admin);
        registry.deactivateBridge(bridgeId, "Test");
        registry.reactivateBridge(bridgeId);
        vm.stopPrank();

        IBridgeRegistry.BridgeConfig memory config = registry.getBridge(bridgeId);
        assertTrue(config.isActive);
    }

    // ============ Implementation Whitelisting Tests ============

    function test_whitelistImplementation_success() public {
        MockImplementationV2 implV2 = new MockImplementationV2();

        vm.prank(admin);
        registry.whitelistImplementation(proxyBridgeId, address(implV2));

        assertTrue(registry.isImplementationWhitelisted(proxyBridgeId, address(implV2)));
    }

    function test_whitelistImplementation_revertNonProxy() public {
        MockImplementationV2 implV2 = new MockImplementationV2();

        vm.prank(admin);
        vm.expectRevert("Bridge is not a proxy");
        registry.whitelistImplementation(bridgeId, address(implV2));
    }

    function test_revokeImplementation_success() public {
        vm.prank(admin);
        registry.revokeImplementation(proxyBridgeId, address(implV1));

        assertFalse(registry.isImplementationWhitelisted(proxyBridgeId, address(implV1)));
    }

    // ============ Global Config Tests ============

    function test_setGlobalConfig_success() public {
        IBridgeRegistry.GlobalConfig memory newConfig = IBridgeRegistry.GlobalConfig({
            defaultMinTvlUsd: 20_000_000e18,
            defaultMaxInactivity: 14400,
            circuitBreakerThreshold: 10,
            healthCheckCooldown: 50
        });

        vm.prank(admin);
        registry.setGlobalConfig(newConfig);

        IBridgeRegistry.GlobalConfig memory config = registry.getGlobalConfig();
        assertEq(config.defaultMinTvlUsd, 20_000_000e18);
        assertEq(config.circuitBreakerThreshold, 10);
    }

    // ============ Query Tests ============

    function test_getBridgesByType() public view {
        bytes32[] memory liquidityBridges = registry.getBridgesByType(
            IBridgeRegistry.BridgeType.LIQUIDITY
        );
        assertEq(liquidityBridges.length, 1);
        assertEq(liquidityBridges[0], bridgeId);

        bytes32[] memory intentBridges = registry.getBridgesByType(
            IBridgeRegistry.BridgeType.INTENT
        );
        assertEq(intentBridges.length, 1);
        assertEq(intentBridges[0], proxyBridgeId);
    }

    function test_computeBridgeId() public view {
        bytes32 computed = registry.computeBridgeId("TestBridge");
        assertEq(computed, bridgeId);
    }

    function test_getActiveBridges() public view {
        bytes32[] memory activeBridges = registry.getActiveBridges();
        assertEq(activeBridges.length, 2);
    }

    // ============ Emergency Tests ============

    function test_pause_success() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(admin);
        vm.expectRevert();
        registry.registerBridge(
            IBridgeRegistry.BridgeConfig({
                bridgeId: bytes32(0),
                name: "NewBridge",
                bridgeType: IBridgeRegistry.BridgeType.LIQUIDITY,
                contractAddress: address(mockBridge),
                implementationAddress: address(0),
                isProxy: false,
                isActive: true,
                minTvlUsd: 0,
                maxInactivityPeriod: 0,
                ageMonths: 0,
                hasKnownExploits: false
            })
        );
    }
}
