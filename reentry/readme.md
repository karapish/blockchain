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


## OpenZeppelin `ReentrancyGuard` / `nonReentrant`

### What it does
- Blocks a function from being **re-entered** while it’s still executing.
- Add `nonReentrant` to any vulnerable function.

---

### How it works (internally)

```solidity
uint256 private constant _NOT_ENTERED = 1;
uint256 private constant _ENTERED     = 2;
uint256 private _status = _NOT_ENTERED;

modifier nonReentrant() {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
    _;
    _status = _NOT_ENTERED;
}
```

### Safe-withdraw example
```solidity
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeVault is ReentrancyGuard {
    mapping(address => uint256) public bal;

    function deposit() external payable { bal[msg.sender] += msg.value; }

    function withdraw(uint256 amt) external nonReentrant {
        require(bal[msg.sender] >= amt, "not enough");
        bal[msg.sender] -= amt;                   // effects first
        (bool ok, ) = msg.sender.call{value: amt}("");
        require(ok, "transfer failed");
    }
}
```

Attack demo (fails)
```solidity
// Attacker contract with line-by-line comments
contract Attacker {
   SafeVault public vault;                     // reference to the target SafeVault contract (public getter)

   constructor(address v) {                    // constructor runs once at deployment
      vault = SafeVault(v);                   // cast provided address to SafeVault and store it
   }

   // fallback that receives plain Ether transfers and can execute code when contract gets ETH
   receive() external payable {                // special receive() called when contract receives ETH with empty calldata
      // If the vault still has balance, call withdraw(1 ether) on the vault.
      // This call happens *during* the vault's external call back into this contract,
      // enabling a reentrancy attempt (which fails if ReentrancyGuard is active).
      if (address(vault).balance > 0) vault.withdraw(1 ether);
   }

   function attack() external payable {        // public entry to start the attack; payable to fund deposit
      vault.deposit{value: 1 ether}();        // deposit 1 ETH into the vault (so vault records a balance for this contract)
      vault.withdraw(1 ether);                // call withdraw: during vault's external transfer, receive() will run and attempt reentry
      // Note: if the vault uses nonReentrant guard, the second (reentrant) withdraw call will revert.
   }
}
```
The second withdraw hits the require(_status != _ENTERED) check and reverts, stopping the attack.


## What is `_;` in Solidity?

- In Solidity, `_;` is called the **modifier placeholder**.
- When you apply a **modifier** to a function, the body of that function gets inserted **where the `_;` appears** inside the modifier.

---

### Example

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _; // function body goes here
}

function sensitiveAction() external onlyOwner {
    // <-- this code is pasted into _; position
}
```

Key Points
•	_; acts as a substitution marker.
•	A modifier can have multiple _; if you want to run the function body in different places.
•	Without _;, the function body would never run.

⸻

👉 So _; is just the placeholder for the original function’s logic inside a modifier.

## What does `(bool success, ) = msg.sender.call{ value: amount }("");` mean in Solidity

| Part | Meaning |
|---|---------|
| `msg.sender.call{ value: amount }("")` | A low-level call sending `amount` wei (ETH) to `msg.sender`, with no data (empty string `""`). It executes the fallback or receive function of the recipient.  [oai_citation:0‡DEV Community](https://dev.to/ayoashy/the-call-function-in-solidity-d0h?utm_source=chatgpt.com) |
| `(bool success, ) = …` | Unpacks the return of `.call(...)` into two values: a boolean `success`, and the return data (which is thrown away here using `,`). `.call()` always returns these two things.  [oai_citation:1‡DEV Community](https://dev.to/ayoashy/the-call-function-in-solidity-d0h?utm_source=chatgpt.com) |
| `bool success` | Will be `true` if the call didn’t revert, `false` if it failed. You should check `success` to handle failures.  [oai_citation:2‡DEV Community](https://dev.to/ayoashy/the-call-function-in-solidity-d0h?utm_source=chatgpt.com) |

---

## Why this pattern is used & what to watch out

- **Why use `.call(...)` for sending value**:  
  It forwards all available gas (or specified gas) and works even if the recipient is a contract. Safer than older `.transfer()` (which has fixed gas stipend) for some use cases.  [oai_citation:3‡DEV Community](https://dev.to/ayoashy/the-call-function-in-solidity-d0h?utm_source=chatgpt.com)
- **Reentrancy risk**:  
  Because this sends ETH and then lets recipient’s fallback/receive function run, if you haven’t updated contract state before this call, a malicious contract could reenter and exploit.  [oai_citation:4‡Ethereum Stack Exchange](https://ethereum.stackexchange.com/questions/42521/what-does-msg-sender-call-do-in-solidity?utm_source=chatgpt.com)
- **Need to check `success`**: If `success` is false and you ignore it, your contract may continue as if value was sent, causing logic errors.
- **Gas forwarding**: The recipient gets full gas (unless limited), which means fallback logic could be complex and consume a lot of gas, increasing risk.

---

## Example with safety (Checks-Effects-Interactions + ReentrancyGuard)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeVault is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;  // state change first (effects)
        (bool success, ) = payable(msg.sender).call{ value: amount }("");
        require(success, "Transfer failed");
    }
}
```