// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyContractV1 is Initializable {
    uint256 public value;

    function initialize(uint256 _val) public initializer {
        value = _val;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}


/// @custom:oz-upgrades-from example.sol:MyContractV1
contract MyContractV2 is Initializable {
    uint256 public value;

    function initialize(uint256 _val) public initializer {
        value = _val;
    }

    function getValue() public view returns (uint256) {
        return value;
    }

    function increment() public {
        value += 1;
    }
}
