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

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IBKRToken is ERC20, Ownable {
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

💻 Solidity Code (Document Notary)


import "@openzeppelin/contracts/access/Ownable.sol";

contract DocumentNotary is Ownable {
struct Record {
uint256 timestamp;
bool revoked;
}

mapping(bytes32 => Record) private records;

event Notarized(bytes32 indexed docHash, uint256 timestamp);
event Revoked(bytes32 indexed docHash, uint256 timestamp);

function notarize(bytes32 docHash) external {
require(records[docHash].timestamp == 0, "Already notarized");
records[docHash] = Record(block.timestamp, false);
emit Notarized(docHash, block.timestamp);
}

function verify(bytes32 docHash) external view returns (uint256, bool) {
Record memory rec = records[docHash];
return (rec.timestamp, rec.revoked);
}

function revoke(bytes32 docHash) external onlyOwner {
require(records[docHash].timestamp != 0, "Not found");
require(!records[docHash].revoked, "Already revoked");
records[docHash].revoked = true;
emit Revoked(docHash, block.timestamp);
}
}


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

Measure gas usage of notarization and verify it’s efficient*/
