```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Minimal Beacon interface: exposes the implementation address getter
interface IBeacon {
    function implementation() external view returns (address);
}

// Simple Beacon contract that stores the implementation address and an owner
contract Beacon {
    address public implementation;    // current implementation (logic) contract address
    address public owner;             // owner who is allowed to upgrade the implementation

    // Constructor: set initial implementation and owner on deploy
    constructor(address _impl) {
        implementation = _impl;      // store the provided implementation address
        owner = msg.sender;          // set deployer as owner
    }

    // Upgrade function: only owner can change the implementation address
    function upgradeTo(address newImpl) external {
        require(msg.sender == owner, "Not owner"); // ensure caller is owner
        implementation = newImpl;                  // update implementation for all proxies that use this beacon
    }
}

// A minimal BeaconProxy that fetches implementation from the beacon and delegatecalls it
contract BeaconProxy {
    address public beacon;             // address of the Beacon contract this proxy reads implementation from

    // Constructor: store the beacon address at deployment
    constructor(address _beacon) {
        beacon = _beacon;              // set beacon reference
    }

    // Fallback receives all calls (both calldata and value) and forwards them to implementation
    fallback() external payable {
        // Ask the beacon for the current implementation address
        address impl = IBeacon(beacon).implementation();  // read implementation from beacon
        require(impl != address(0), "No implementation"); // ensure beacon returned a valid address

        // Inline assembly to perform delegatecall with the original calldata and return/propagate result
        assembly {
            // copy calldata to memory position 0
            calldatacopy(0, 0, calldatasize())
            // perform delegatecall:
            // - gas(): forward all remaining gas
            // - impl: target implementation address
            // - input mem ptr = 0
            // - input size = calldatasize()
            // - output mem ptr = 0
            // - output size = 0 (we don't know it yet)
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            // copy returned data to memory position 0
            returndatacopy(0, 0, returndatasize())
            // if delegatecall returned 0 -> revert with returned data
            switch result
                case 0 {revert(0, returndatasize())}
                // otherwise return returned data back to caller
                default {return (0, returndatasize())}
            }
        }

    // Allow receiving ETH via plain transfers (optional; fallback marked payable already handles this)
    receive() external payable {}
}