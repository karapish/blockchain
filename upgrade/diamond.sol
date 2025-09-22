// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Diamond {
    // owner who can manage facets
    address public owner;

    // Mapping from function selector → facet address
    mapping(bytes4 => address) public selectorToFacet;

    // Event for facet changes
    event DiamondCut(address indexed facet, bytes4[] selectors, bool added);

    modifier onlyOwner() {
        require(msg.sender == owner, "Diamond: Not owner");
        _;
    }

    // Initialize owner (once)
    constructor(address _owner) {
        require(_owner != address(0), "Diamond: owner zero");
        owner = _owner;
    }

    // Add, replace, or remove facets
    function diamondCut(
        address facet,
        bytes4[] calldata selectors,
        bool add
    ) external onlyOwner {
        require(facet != address(0) || !add, "Diamond: facet zero when adding");

        for (uint256 i = 0; i < selectors.length; i++) {
            bytes4 sel = selectors[i];
            if (add) {
                selectorToFacet[sel] = facet;
            } else {
                delete selectorToFacet[sel];
            }
        }

        emit DiamondCut(facet, selectors, add);
    }

    fallback() external payable {
        address facet = selectorToFacet[msg.sig];
        require(facet != address(0), "Diamond: Function not found");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {
        // optional: allow receiving ETH
    }
}