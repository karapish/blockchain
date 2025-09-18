//
// 🧑‍💻 Mock Blockchain Developer Coding Assignment
//

// ## ❓ Q1: Implement a basic ERC-20 token with minting, burning, and access control.
/*
ERC-20 is the fungible token standard. Would want to see:
- Proper standard compliance (`totalSupply`, `balanceOf`, `transfer`, `approve`, `transferFrom`).
- Minting restricted to an owner/admin.
- Burning available to token holders.
- Events emitted for transparency.
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor()
        ERC20("My Token", "MYT")
        Ownable(msg.sender) {
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

/*
❓ Q2: Build a DocumentNotary contract that stores a file hash with timestamp and allows verification.
✅ Response

A notary service requires:

    notarize(hash) → saves hash + timestamp.

    verify(hash) → returns timestamp and revocation status.

    Only admin can revoke.

    Events emitted for notarization and revocation.
*/

// 💻 Solidity Code (Document Notary)
contract DocumentNotary is Ownable {
    // Structure to store details about each notarized document
    struct Record {
        uint256 timestamp;  // The time at which the document was notarized (block timestamp)
        bool revoked;       // Flag indicating if the document has been revoked
    }

    // Mapping from document hash to its associated record
    // Stores information about notarization and revocation state for each document hash
    mapping(bytes32 => Record) private records;

    // Event emitted whenever a document is successfully notarized
    // The document hash and the timestamp of notarization are indexed and stored in logs
    event Notarized(bytes32 indexed docHash, uint256 timestamp);

    // Event emitted whenever a document is revoked by the owner
    // The document hash and revocation timestamp are logged for transparency
    event Revoked(bytes32 indexed docHash, uint256 timestamp);

    // Function to notarize a document by its hash
    // Anyone can call this function
    // Throws an error if the document hash has already been notarized
    function notarize(bytes32 docHash) external {
        // Check if the document has not been previously notarized (timestamp == 0 means no record)
        require(records[docHash].timestamp == 0, "Already notarized");

        // Create a new record with current block timestamp and mark as not revoked
        records[docHash] = Record(block.timestamp, false);

        // Emit a Notarized event indicating successful notarization
        emit Notarized(docHash, block.timestamp);
    }

    // View function to verify notarization status of a document hash
    // Returns the timestamp of notarization and whether it has been revoked
    function verify(bytes32 docHash) external view returns (uint256, bool) {
        // Load record from storage into memory
        Record memory rec = records[docHash];

        // Return timestamp and revocation status
        return (rec.timestamp, rec.revoked);
    }

    // Function to revoke a previously notarized document
    // Only the contract owner (deployer or assigned) can call this
    function revoke(bytes32 docHash) external onlyOwner {
        // Check if the document hash was notarized before revocation can occur
        require(records[docHash].timestamp != 0, "Not found");

        // Check if the document has not been revoked already
        require(!records[docHash].revoked, "Already revoked");

        // Mark the document as revoked in the records mapping
        records[docHash].revoked = true;

        // Emit a Revoked event to log the revocation on the blockchain
        emit Revoked(docHash, block.timestamp);
    }
}

/*
❓ Q3: How to make DocumentNotary upgradeable?
✅ Response

Use proxy pattern (Transparent Proxy or UUPS from OpenZeppelin).

Store state in the proxy, logic in implementation contracts.

Replace constructors with initialize() functions.

Manage upgrades with onlyOwner or governance mechanism.

❓ Q4: Security considerations in these contracts?
✅ Response

Reentrancy: Avoid external calls before state changes, use ReentrancyGuard if needed.

Access control: Restrict minting and revoking to onlyOwner.

Gas optimization: Use calldata for external inputs, minimize storage writes.

Events: Emit events for every state change to ensure auditability.

Upgradeable contracts: Prevent storage slot collisions and follow OpenZeppelin patterns.


❓ Q5: Unit tests (example cases)
✅ Response

Using Hardhat/Foundry tests should cover:

Mint and burn correctly update balances.

Notarize a hash → verify returns correct timestamp.

Attempt to re-notarize the same hash → should revert.

Non-owner attempts to revoke → should revert.

Owner revokes a hash → verify returns revoked = true.

Measure gas usage of notarization and verify it’s efficient

*/
