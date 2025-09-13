// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Tornado-style ETH mixer with variable deposit amounts (educational only!)
 * - Users deposit any ETH amount
 * - Commitment = keccak256(secret, nullifier, amount)
 * - Commitments stored in Merkle tree
 * - Withdrawals require nullifier + amount and root membership
 *
 * ⚠️ NOT private, no zkSNARK verification.
 */

contract VariableMixer {
    uint32 public constant TREE_DEPTH = 20;

    mapping(bytes32 => bool) public nullifiers; // prevent double-withdraw
    bytes32[TREE_DEPTH] public filledSubtrees;
    bytes32[] public roots;

    uint32 public nextIndex = 0;
    bytes32 public currentRoot;

    event Deposit(bytes32 commitment, uint256 amount, uint32 index);
    event Withdrawal(address to, uint256 amount, bytes32 nullifier);

    constructor() {
        // initialize empty tree
        bytes32 zero = bytes32(0);
        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            filledSubtrees[i] = zero;
            zero = keccak256(abi.encodePacked(zero, zero));
        }
        currentRoot = zero;
        roots.push(currentRoot);
    }

    // deposit any ETH amount
    function deposit(bytes32 commitment) external payable {
        require(msg.value > 0, "Must deposit > 0 ETH");

        uint32 index = nextIndex;
        require(index < uint32(1 << TREE_DEPTH), "Tree full");

        bytes32 hash = commitment;
        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            if (index % 2 == 0) {
                filledSubtrees[i] = hash;
                hash = keccak256(abi.encodePacked(hash, bytes32(0)));
            } else {
                hash = keccak256(abi.encodePacked(filledSubtrees[i], hash));
            }
            index /= 2;
        }
        currentRoot = hash;
        roots.push(currentRoot);

        emit Deposit(commitment, msg.value, nextIndex);
        nextIndex++;
    }

    // withdraw to a new address
    function withdraw(
        bytes32 nullifierHash,
        bytes32 root,
        uint256 amount,
        address payable to
    ) external {
        require(!nullifiers[nullifierHash], "Nullifier used");
        require(isKnownRoot(root), "Invalid root");

        // In Tornado: zkSNARK ensures commitment matches (secret, nullifier, amount)
        // Here: we skip zkSNARK, so this is not private or secure

        nullifiers[nullifierHash] = true;
        to.transfer(amount);

        emit Withdrawal(to, amount, nullifierHash);
    }

    function isKnownRoot(bytes32 root) public view returns (bool) {
        for (uint i = roots.length > 30 ? roots.length - 30 : 0; i < roots.length; i++) {
            if (roots[i] == root) return true;
        }
        return false;
    }
}