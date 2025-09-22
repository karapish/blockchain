# 🧑‍💻 Blockchain Developer – Likely First Coding Assignment

## 🔍 Likely Assignment Topics

| Task Area | What They Might Ask | Key Aspects Evaluated |
|-----------|---------------------|------------------------|
| **Token Contracts** | Implement an ERC-20 (basic or extended with burning/minting, pausing, roles). | Standard compliance, security (overflow checks, access control), gas efficiency. |
| **Notarization / Hash Storage** | Contract that accepts a file/document hash and stores it with timestamp. | Data integrity, event logging, gas cost, retrieval functions. |
| **Upgradeable Contracts** | Implement proxy/upgradeable pattern with safe storage layout. | Understanding of `delegatecall`, storage collisions, versioning, initializers. |
| **Access Control & Roles** | Add `owner`, `admin`, or multi-sig permissions. | Correct use of modifiers, avoiding privilege escalation. |
| **Security Corner Cases** | Defend against reentrancy, overflow, DoS, unsafe external calls. | Apply security best practices, awareness of common exploits. |
| **Gas Optimization** | Write efficient loops, minimize storage writes, avoid duplication. | Correct use of `memory` vs `storage`, optimized data structures. |
| **Oracle / External Data** | Integrate mock oracle (e.g., price feed) and react to inputs. | Handle oracle failures gracefully, fallback logic. |
| **Testing & Deployment** | Write unit tests (Hardhat, Foundry), deploy on testnet. | Test coverage, failure case handling, clean deployment scripts. |

---

## 🔧 Example Assignment Prompt

> *“Write a Solidity contract called `DocumentNotary` with the following:*
> - *Function `notarize(bytes32 documentHash)` stores the hash with timestamp and emits an event.*
> - *Function `verify(bytes32 documentHash) returns (uint256 timestamp)` retrieves when it was notarized.*
> - *Only an `admin` role can revoke a notarization.*
> - *Add ability to upgrade the contract logic safely.*
> - *Write unit tests including edge cases: same hash notarized twice, revoked hashes, non-admin attempts, and gas usage of repeated notarization.”*

---

## 🔍 What They’re Testing
- Correct Solidity syntax (0.8.x or newer).
- Awareness of `storage` vs `memory` vs `calldata`.
- Security best practices (e.g., reentrancy protection, access control).
- Testability and coverage.
- Clean, understandable, and well-documented code.  


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