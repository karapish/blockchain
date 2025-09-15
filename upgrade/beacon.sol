// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBeacon {
    function implementation() external view returns (address);
}

contract Beacon {
    address public implementation;    // logic contract address
    address public owner;

    constructor(address _impl) {
        implementation = _impl;
        owner = msg.sender;
    }

    function upgradeTo(address newImpl) external {
        require(msg.sender == owner, "Not owner");
        implementation = newImpl;      // changes implementation for all proxies
    }
}

contract BeaconProxy {
    address public beacon;             // points to beacon

    constructor(address _beacon) {
        beacon = _beacon;
    }

    fallback() external payable {
        address impl = IBeacon(beacon).implementation();
        require(impl != address(0), "No implementation");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}