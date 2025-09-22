// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

// Transparent Proxy — proxy holds the implementation address and upgrade logic; only admin can call upgrades.
// Regular users interact transparently; admin uses special interface.

import "./logger.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TransparentProxy {
    address public Implementation;    // logic contract address
    address public Admin;             // who can upgrade

    constructor(address _impl) {
        Implementation = _impl;
        Admin = msg.sender;           // admin set at deployment
    }

    // Only admin can switch implementation
    function upgradeTo(address newImpl) external {
        require(msg.sender == Admin, "Not admin");
        Implementation = newImpl;
    }

    receive() external payable {
        string memory message = string(abi.encodePacked(
        "Received ETH ",
            Strings.toString(msg.value)
        ));
        Logger.logString("Proxy", message);
    }

    // Fallback: delegate all calls to implementation
    fallback() external payable {
        Logger.logString("Proxy", "Fallback called as");
        Logger.logAddress("Proxy", msg.sender);

        address impl = Implementation;
        require(impl != address(0), "No implementation");

        // Delegatecall preserves msg.sender, context; storage in proxy is used
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(
                gas(),          // forward all gas
                impl,           // call implementation
                0,              // input data start
                calldatasize(),
                0,              // output buffer start
                0
            )
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
}