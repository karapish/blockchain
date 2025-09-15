// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

abstract contract UUPSUpgradeable {
    // Storage slot defined by EIP-1967 for implementation address
    bytes32 private constant _IMPLEMENTATION_SLOT = keccak256("eip1967.proxy.implementation") - 1;

    // Public function to upgrade, only if authorized
    function upgradeTo(address newImpl) external virtual {
        require(_authorizeUpgrade(newImpl), "Not authorized");
        _setImplementation(newImpl);
    }

    // Override to define who can upgrade (e.g. owner, multisig)
    function _authorizeUpgrade(address newImpl) internal view virtual;

    // Internal write to implementation slot
    function _setImplementation(address newImpl) private {
        assembly {
            sstore(_IMPLEMENTATION_SLOT, newImpl)
        }
    }

    // Read implementation address
    function _getImplementation() internal view returns (address impl) {
        assembly {
            impl := sload(_IMPLEMENTATION_SLOT)
        }
    }
}

contract MyContract is UUPSUpgradeable {
    address public owner;

    function initialize(address _owner) external {
        require(owner == address(0), "Already initialized");
        owner = _owner;
    }

    function _authorizeUpgrade(address newImpl) internal view override {
        require(msg.sender == owner, "Only owner");
    }

    // Example logic
    function doSomething() external view returns (uint) {
        return 42;
    }
}