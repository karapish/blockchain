// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/console.sol"; // only works locally (Anvil/Foundry/Hardhat)

library Logger {
    event LogValue(string label, uint256 value);
    event LogAddress(string label, address value);
    event LogBytes(string label, bytes value);
    event LogString(string label, string value);

    // Helper: detects if we’re on a local dev chain (Anvil=31337, Hardhat=31337)
    function isLocal() internal view returns (bool) {
        return block.chainid == 31337 || block.chainid == 1337;
    }

    function logValue(string memory label, uint256 val) internal {
        if (isLocal()) {
            console.log(label, val);
        } else {
            emit LogValue(label, val);
        }
    }

    function logAddress(string memory label, address val) internal {
        if (isLocal()) {
            console.log(label, val);
        } else {
            emit LogAddress(label, val);
        }
    }

    function logBytes(string memory label, bytes memory val) internal {
        if (isLocal()) {
            console.log(label);
            console.logBytes(val);
        } else {
            emit LogBytes(label, val);
        }
    }

    function logString(string memory label, string memory val) internal {
        if (isLocal()) {
            console.log(label, val);
        } else {
            emit LogString(label, val);
        }
    }
}