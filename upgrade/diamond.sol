// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Diamond {
    // Mapping from function selector → facet (contract) address
    mapping(bytes4 => address) public selectorToFacet;

    // Add, replace, or remove facets
    function diamondCut(
        address facet,
        bytes4[] calldata selectors,
        bool add
    ) external {
        require(msg.sender == owner, "Not owner");
        for (uint i = 0; i < selectors.length; i++) {
            bytes4 sel = selectors[i];
            if (add) {
                selectorToFacet[sel] = facet;
            } else {
                delete selectorToFacet[sel];
            }
        }
    }

    fallback() external payable {
        address facet = selectorToFacet[msg.sig];
        require(facet != address(0), "Function not found");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}