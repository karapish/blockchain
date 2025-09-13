// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Tornado-style ETH mixer with variable deposit amounts (educational only!)
 *
 * What this contract tries to illustrate:
 * - Users can deposit ETH along with a "commitment" (a hash that should bind a secret, a nullifier, and amount).
 * - Each deposit is inserted into a Merkle tree (a cryptographic tree structure that lets you prove membership).
 * - Later, a user can "withdraw" by revealing a nullifier and a Merkle root that proves their deposit exists.
 *
 * IMPORTANT LIMITATION (read this!):
 * - This contract does NOT verify any zero-knowledge proof.
 * - That means there's NO privacy and NO cryptographic proof that the withdrawal matches a prior deposit.
 * - It is purely for educational purposes to show the moving parts of a mixer-like design.
 *
 * Glossary:
 * - "Commitment": A hash of secret data (and often amount), which represents a deposit leaf in a Merkle tree.
 * - "Nullifier": A unique value used to prevent a deposit from being withdrawn twice.
 * - "Merkle root": A single hash that summarizes all leaves in a Merkle tree; used to prove membership.
 *
 * Security notes:
 * - Without zkSNARK verification, an attacker could try to withdraw without a valid deposit. Do NOT use in production.
 * - This contract stores a shortlist of recent roots; production systems manage a rolling window to limit storage.
 */

contract VariableMixer {
    // Depth of the Merkle tree (number of levels). A deeper tree can hold more deposits.
    uint32 public constant TREE_DEPTH = 20; // capacity ≈ 2^20 leaves

    // Tracks which nullifiers (anonymity set spend identifiers) have been used to prevent double-withdrawals.
    mapping(bytes32 => bool) public nullifiers;

    // filledSubtrees[i] stores the last "filled" node at tree level i while we incrementally build roots.
    bytes32[TREE_DEPTH] public filledSubtrees;

    // History of recent Merkle roots (so withdrawers can use slightly older roots as well).
    bytes32[] public roots;

    // Index of the next leaf position (how many leaves inserted so far).
    uint32 public nextIndex = 0;

    // The current Merkle root after the latest deposit.
    bytes32 public currentRoot;

    // Log deposit and withdrawal actions for off-chain indexers and user UIs.
    event Deposit(bytes32 commitment, uint256 amount, uint32 index);
    event Withdrawal(address to, uint256 amount, bytes32 nullifier);

    constructor() {
        // initialize empty tree:
        // Start with "zero" at the leaf level, then hash pairs of zeros up to the root.
        // This sets a deterministic "all zero" base tree before any deposits happen.
        bytes32 zero = bytes32(0);
        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            filledSubtrees[i] = zero;                       // remember the last filled node for this level
            zero = keccak256(abi.encodePacked(zero, zero)); // parent hash of two zeros
        }
        currentRoot = zero;          // the root of an empty tree
        roots.push(currentRoot);     // store it in history
    }

    /**
     * deposit
     *
     * - User sends ETH (msg.value) and provides a "commitment" (= future leaf).
     * - We insert commitment into the "nextIndex" leaf position.
     * - We compute the path to the root by combining with either:
     *     - a "zero" sibling (if the right child doesn't exist yet), or
     *     - an existing filled subtree (if left child already set).
     *
     * Notes for beginners:
     * - require(msg.value > 0): enforce a positive deposit.
     * - Index arithmetic:
     *    - If index is even → we place on the "left", then hash(left, zero).
     *    - If index is odd  → place on the "right", then hash(prevFilledLeft, right).
     */
    function deposit(bytes32 commitment) external payable {
        require(msg.value > 0, "Must deposit > 0 ETH");

        uint32 index = nextIndex;
        require(index < uint32(1 << TREE_DEPTH), "Tree full"); // avoid overflow beyond tree capacity

        bytes32 hash = commitment; // start with the leaf
        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            if (index % 2 == 0) {
                // We're on the "left" side; remember this node for the level,
                // then combine with a zero (as a placeholder for a missing right node).
                filledSubtrees[i] = hash;
                hash = keccak256(abi.encodePacked(hash, bytes32(0)));
            } else {
                // We're on the "right" side; combine with the previously stored left node.
                hash = keccak256(abi.encodePacked(filledSubtrees[i], hash));
            }
            index /= 2; // move up to the parent index for the next level
        }

        // Update the current root and append to the history of roots
        currentRoot = hash;
        roots.push(currentRoot);

        emit Deposit(commitment, msg.value, nextIndex);
        nextIndex++; // advance for the next deposit
    }

    /**
     * withdraw
     *
     * EDUCATIONAL WARNING:
     * - In a real mixer (e.g., Tornado Cash), this function would verify a zero-knowledge proof that:
     *   1) The nullifier corresponds to a commitment in the Merkle tree (membership)
     *   2) The amount and recipient match what was committed
     * - Here, we DO NOT verify any proof. Therefore, it is NOT secure and NOT private.
     *
     * Parameters:
     * - nullifierHash: unique ID for a spent commitment so it cannot be withdrawn twice
     * - root: a known Merkle root (must be within stored history)
     * - amount: how much ETH to withdraw (should match the original deposit in a real mixer)
     * - to: the recipient address (could be a fresh address for privacy in real systems)
     */
    function withdraw(
        bytes32 nullifierHash,
        bytes32 root,
        uint256 amount,
        address payable to
    ) external {
        require(!nullifiers[nullifierHash], "Nullifier used"); // block double-withdraw
        require(isKnownRoot(root), "Invalid root");            // only accept recent/known roots

        // NOTE: In Tornado-style systems, a zkSNARK proves that (nullifierHash, amount) match a leaf under `root`.
        // Here we have no proof verification, so this is NOT SAFE for real funds.

        nullifiers[nullifierHash] = true; // mark as spent
        to.transfer(amount);              // transfer ETH to the recipient

        emit Withdrawal(to, amount, nullifierHash);
    }

    /**
     * isKnownRoot
     *
     * - Returns true if `root` is in the recent roots history.
     * - We restrict the search to the last ~30 roots to limit gas cost as storage grows.
     * - Real mixers maintain a sliding window of valid roots for performance and security reasons.
     */
    function isKnownRoot(bytes32 root) public view returns (bool) {
        // start from either 0 or (length - 30) to cap loop size
        for (uint i = roots.length > 30 ? roots.length - 30 : 0; i < roots.length; i++) {
            if (roots[i] == root) return true;
        }
        return false;
    }
}
