// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import "../ERC20Token.sol";

// run a Foundry deployment script for your ERC20 token (`MyToken`) using Foundry:
contract Deploy is Script {
    function run() external {
        // Start broadcasting TXs to the network
        vm.startBroadcast();

        // Deploy contract with constructor args (name and symbol)
        new ERC20Token("GK TOKEN", "GKT");

        vm.stopBroadcast();
    }
}

