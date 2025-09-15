// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../ERC20Token.sol";

contract ERC20TokenOnchainTest is Test {
    ERC20Token private token;

    // Replace with your deployed contract address on Anvil
    address constant private deployedAddress = 0x5FbDB2315678afecb367f032d93F642f64180aa3;

    function setUp() public {
        // Attach to the deployed contract
        token = ERC20Token(deployedAddress);
    }

    function testNameAndSymbol() public {
        // Check the name
        assertEq(token.name(), "GK TOKEN");

        // Check the symbol
        assertEq(token.symbol(), "GKT");
    }

    function testOwner() public {
        // The owner should be the deployer (first Anvil account by default)
        assertEq(token.Owner(), 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }
}