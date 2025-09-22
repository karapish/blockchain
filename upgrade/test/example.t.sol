// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import {Upgrades, Options} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {MyContractV1, MyContractV2} from "../example.sol";

contract UpgradeTest is Test {
    address public proxy;

    function setUp() public {
        Options memory opts;
        opts.unsafeSkipAllChecks = true;

        // Deploy transparent proxy pointing to V1
        proxy = Upgrades.deployTransparentProxy(
            "example.sol:MyContractV1",
            address(this),   // initial owner of ProxyAdmin
            abi.encodeCall(MyContractV1.initialize, (42)),
            opts
        );
    }

    function testUpgrade() public {
        Options memory opts;
        opts.unsafeSkipAllChecks = true;

        // check initial behavior
        MyContractV1 instance1 = MyContractV1(proxy);
        assertEq(instance1.getValue(), 42);

        // Upgrade to V2, and call increment during upgrade
        Upgrades.upgradeProxy(
            proxy,
            "example.sol:MyContractV2",
            abi.encodeCall(MyContractV2.increment, ()),
            opts
        );

        // After upgrade
        MyContractV2 instance2 = MyContractV2(proxy);
        // value was 42, and increment adds 1
        assertEq(instance2.getValue(), 43);
    }
}
