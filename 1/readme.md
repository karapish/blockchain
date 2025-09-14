# ERC20 + Ownable (Mint/Burn) Specification

# 🔹 Goal of This Contract
The goal is to create a **basic cryptocurrency token** (like a mini version of USDC or DAI) where:
- The token follows the **ERC20 standard** (so wallets & exchanges know how to handle it).
- One special account (the **owner**) has the power to:
  - **Mint** new tokens (create them out of thin air).
  - **Burn** tokens (destroy them).

This is useful for:
- Testing how tokens work.
- Learning about smart contracts.
- Creating tokens for apps, games, or even real projects.

---

# 🔹 What kind of accounts are used?

1. **Externally Owned Account (EOA)**
  - Normal wallet like **MetaMask** or Coinbase Wallet.
  - Controlled by a private key.
  - Can send transactions to the blockchain.
  - Example: when you deploy this token, your EOA becomes the **owner**.

2. **Contract Account**
  - Lives on Ethereum (or an L2 like Base, Arbitrum, Optimism).
  - Contains **code** and **storage**.
  - Cannot act by itself — it only runs when an EOA (or another contract) calls it.
  - Example: our **ERC20 contract** is a contract account.

---

### 🔹 Is this token stable?
- **No — by default it is not stable.**
- The ERC20 contract we built is just a **generic token**:
  - It can be minted and burned by the owner.
  - Its value is **not pegged** to USD or any asset.
  - Its price/value depends only on what people are willing to trade it for.

---

### 🔹 What makes a token "stable"?
A **stablecoin** (like USDC, USDT, DAI) keeps its price close to $1 by:
1. **Backed reserves:** Each token is backed by dollars or assets held by a company (e.g., Circle for USDC).
2. **Overcollateralization:** Like DAI, users lock ETH/other crypto worth more than $1 to mint 1 DAI.
3. **Algorithms:** Some try to balance supply/demand automatically (these are riskier).

---

### 🔹 Our Token
- It’s just an **ERC20 with mint/burn powers**.
- Nothing enforces stability → if you mint 1,000 tokens, they might be worth $0 or $10 each depending on markets.

---

✅ **In short:**  
The contract we wrote is **not a stablecoin**. It’s just a standard ERC20 token.  
To make it *stable*, you’d need a mechanism (reserves, collateral, or algorithm) to peg its value to something like USD.


# 🔹 What makes a token ERC-20 compliant?

ERC-20 is an **Ethereum standard** that says:  
“If you want your token to work with wallets, exchanges, and dApps, your smart contract must include these specific functions and events.”

---

## ✅ Required Functions
1. `totalSupply()` → how many tokens exist in total.
2. `balanceOf(address)` → how many tokens does this address hold.
3. `transfer(address to, uint256 value)` → send tokens to someone.
4. `approve(address spender, uint256 value)` → let someone else spend your tokens.
5. `allowance(address owner, address spender)` → check how many tokens they are allowed to spend.
6. `transferFrom(address from, address to, uint256 value)` → move tokens on behalf of someone else (using their allowance).

---

## ✅ Required Events
1. `Transfer(address from, address to, uint256 value)`
  - Must be emitted when tokens are sent (including mint & burn).
2. `Approval(address owner, address spender, uint256 value)`
  - Must be emitted when an allowance is set/changed.

---

## 🔹 Why this matters
- Wallets like MetaMask, explorers like Etherscan, and DeFi apps look for these exact functions.
- If they exist and behave correctly → your token is **ERC-20 compliant**.
- If not → your token might not show up or won’t work properly.

---

# 🔹 Scenarios for ERC-20 Functions

### 1. `totalSupply()`
- Scenario: An exchange or explorer (like Etherscan) wants to show **how many tokens exist in total**.
- Example: "This token has 1,000,000 total supply."

---

### 2. `balanceOf(address)`
- Scenario: A wallet (MetaMask) needs to display your balance.
- Example: You open your wallet → it calls `balanceOf(0xYourAddress)`.

---

### 3. `transfer(address to, uint256 value)`
- Scenario: You want to **send tokens** to a friend.
- Example: Alice calls `transfer(Bob, 100)` → Bob gets 100 tokens.

---

### 4. `approve(address spender, uint256 value)`
- Scenario: You want to allow a dApp or smart contract to use your tokens.
- Example: Before swapping on Uniswap, you must `approve(Uniswap, 100)` so it can pull your tokens.

---

### 5. `allowance(address owner, address spender)`
- Scenario: A dApp checks **how many tokens it is allowed to spend on your behalf**.
- Example: Uniswap checks `allowance(Alice, Uniswap)` to see if Alice approved enough.

---

### 6. `transferFrom(address from, address to, uint256 value)`
- Scenario: A smart contract executes the actual transfer **using the approved allowance**.
- Example: After Alice approved Uniswap, Uniswap calls `transferFrom(Alice, Pool, 100)` to move tokens.

---

# 🔹 Required Events

### `Transfer`
- Scenario: Whenever tokens move (mint, burn, send).
- Example: Etherscan shows "Alice → Bob: 100 tokens" by listening to this event.

### `Approval`
- Scenario: Whenever an approval is set or changed.
- Example: Wallet shows "Alice approved Uniswap to spend 100 tokens."

---

✅ **In short:**
- **Wallets** use `balanceOf`, `totalSupply`.
- **Users** use `transfer`.
- **dApps/DEXs** use `approve`, `allowance`, `transferFrom`.
- **Block explorers** use `Transfer` and `Approval` events to show activity.


✅ **In short:**  
A token is ERC-20 compliant if it **follows the standard interface** of functions + events.  
This makes it plug-and-play with wallets, exchanges, and dApps in the Ethereum ecosystem.

# 🔹 How it works step by step

1. **Deployment**
  - You (an EOA) deploy the smart contract.
  - The contract becomes a **contract account** on-chain.
  - Your EOA is set as the **owner**.

2. **Minting**
  - Only the **owner** can create new tokens.
  - Example: owner calls `mint(alice, 1000)` → Alice’s balance increases by 1000.

3. **Transferring**
  - Any token holder (EOA or contract) can send tokens to another account.
  - Example: Alice calls `transfer(bob, 100)` → Bob gets 100 tokens.

4. **Burning**
  - Token holder can destroy their own tokens (`burn`).
  - Owner can destroy tokens from anyone’s balance (`burnFrom`).

---

# 🔹 Key Point
- **You (an EOA)** = owner, the one with special mint/burn powers.
- **The smart contract** = contract account, the “rules engine” that manages balances.
- **Other EOAs** = regular users, they can hold, transfer, approve, and burn their own tokens.

---

✅ **In short:**
- EOAs = wallets, controlled by humans.
- Contract accounts = smart contracts with code.
- This project = an ERC20 contract account controlled by an EOA (the owner) that can mint & burn tokens.


## 🔹 In-Scope
- Implementation of a minimal ERC20 token with:
    - **Ownable** access control (single `owner` account).
    - **Minting**: owner can mint tokens to any address.
    - **Burning**:
        - Owner can burn from any account (`burnFrom`).
        - Holders can burn their own tokens (`burn`).
- Events for transparency (`Transfer`, `Approval`, `OwnershipTransferred`).

## 🔹 Out-of-Scope
- No advanced ERC20 extensions (EIP-2612 permit, snapshots, etc.).
- No role-based access control (RBAC) beyond single owner.
- No pausing/emergency stop logic.
- No cross-chain bridges or upgradeability.
- No fee-on-transfer or taxation logic.

## 🔹 Deliverable
- A single Solidity contract: **Ownable + ERC20 Mint/Burn**.
- Fully compilable with Solidity `^0.8.20`.
- Minimal dependencies (no external libraries).

## 🔹 Acceptance Criteria
1. Contract compiles successfully.
2. Owner is correctly set to `msg.sender` at deployment.
3. Owner can `mint` and `burnFrom`.
4. Non-owners cannot `mint` or `burnFrom`.
5. Token holder can `burn` their own tokens.
6. Transfers, approvals, and allowances function per ERC20 standard.
7. Events (`Transfer`, `Approval`, `OwnershipTransferred`) emit correctly.
8. Total supply always consistent with balances.

## 🔹 Test Plan
- **Network targets**:
    - **Testnets**: Sepolia, Holesky, Base Sepolia, Arbitrum Sepolia, Optimism Sepolia.
    - **Mainnet**: Ethereum or supported L2s once validated.

- **Tools**:
    - [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/).
    - [Ethers.js](https://docs.ethers.org/) or [web3.js](https://web3js.org/).
    - [Chai](https://www.chaijs.com/) + Mocha for assertions (if using JS tests).
    - [Remix IDE](https://remix.ethereum.org/) for quick prototyping.

- **Tests**:
    - Deploy and verify owner = deployer.
    - Owner mints tokens to an account.
    - Account successfully transfers tokens.
    - Account approves + transferFrom works.
    - Account burns its tokens.
    - Owner burns tokens from another account.
    - Attempting to mint/burnFrom as non-owner reverts.

---

🔹 Non-Payable Constructor

A non-payable constructor does not accept ETH during deployment.
If someone tries to send ETH while deploying, the transaction will revert.

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PayableExample {
uint256 public amount;

    constructor() payable {
        // Contract can receive ETH here
        amount = msg.value; // stores how much ETH was sent at deploy
    }
}
```


🔹 Payable Constructor

A payable constructor allows the contract to receive ETH at deployment.
The received ETH will be stored in the contract’s balance.

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PayableExample {
    uint256 public amount;

    constructor() payable {
        // Contract can receive ETH here
        amount = msg.value; // stores how much ETH was sent at deploy
    }
}
```

🔹 Forward ETH on Deploy
You can even deploy a contract and instantly forward the ETH it receives to another wallet or contract.

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ForwardOnDeploy {
    address payable public recipient;

    constructor(address payable _recipient) payable {
        recipient = _recipient;

        // Forward any ETH sent on deployment to recipient
        if (msg.value > 0) {
            recipient.transfer(msg.value);
        }
    }
}
```

🔹 Example with Two Modifiers

Modifiers act like wrappers around function execution.
Here, we use onlyOwner and notLocked modifiers.

```aiignore
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiModifier {
    address public owner;
    bool public locked;

    constructor() {
        owner = msg.sender;
    }

    // Modifier 1: only owner can call
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _; // continue execution
    }

    // Modifier 2: function not locked
    modifier notLocked() {
        require(!locked, "Function locked");
        _; // continue execution
    }

    // Function with 2 modifiers
    function doSomething() external onlyOwner notLocked {
        // This runs only if both checks passed
        locked = true;
    }
}
```
Execution Flow:
1.	onlyOwner check runs → must be owner.
2.	notLocked check runs → must not be locked.
3.	Function body executes → locked = true.

👉 Order matters: onlyOwner notLocked is not the same as notLocked onlyOwner.

Solidity Data Locations: storage, memory, calldata
| Keyword     | Lifetime                  | Typical use                                   |
|-------------|---------------------------|-----------------------------------------------|
| `storage`   | Permanent (on-chain state)| State variables, mappings, arrays in state    |
| `memory`    | Temporary (per call)      | Local variables, return values                |
| `calldata`  | Temporary (read-only)     | External function parameters (cheapest)       |
| (no keyword)| Context-dependent         | Defaults: state vars → `storage`, locals → `memory` |
|             |                           |                                               |

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Example {
    string public stored = "Hello"; // STORAGE (permanent)

    // Uses calldata (read-only, cheap)
    function updateMessage(string calldata newMessage) external {
        stored = newMessage; // copies calldata → storage
    }

    // Uses memory (temporary copy)
    function readMessage() external view returns (string memory) {
        return stored; // copies storage → memory
    }
}
```
Yes ✅
Block explorers like **Etherscan** can read contract storage state because:

- All contract storage lives in Ethereum’s **global state trie**.
- Anyone can query it via **JSON-RPC** (`eth_getStorageAt`) if they know the slot.
- For **verified contracts**, explorers also know variable layouts (from Solidity metadata), so they show human-readable values (e.g., balances, owner address).
- For **unverified contracts**, explorers only show raw storage slots in hex.

👉 So yes, explorers can see storage, but **readability depends on whether the contract source is verified**.


### ✅ What "Verified Contract" Means on Etherscan

When a contract is **verified** on Etherscan:

1. **Source Code + Compiler Settings Uploaded**
  - Developer provides Solidity source + compiler version + optimization settings.
  - Etherscan recompiles it and ensures the bytecode matches the one deployed on-chain.

2. **ABI & Storage Layout Derived**
  - From the verified source, Etherscan extracts the ABI.
  - It also maps variables to their storage slots, making state human-readable.

---

### 🔍 What You See

- **Verified Contract**
  - Readable source code.
  - Named functions & events.
  - Storage values decoded into variables (e.g., `balances[address] = 100`).
  - Interactive UI to call functions.

- **Unverified Contract**
  - Only raw bytecode & opcodes.
  - Storage shown as raw hex (`0xdeadbeef...`).
  - Function calls appear as `Unknown Function` with calldata hex.

---

👉 Uploading *only* the ABI is **not enough**.  
Full **source code + metadata** = verification.  

### 🔑 Who Initiates Contract Verification?

- The **contract deployer or project team** usually initiates verification.

---

### ⚙️ How It Works
1. Developer deploys the smart contract.
2. Developer uploads the **source code + compiler settings** to Etherscan (or another explorer).
3. Etherscan **recompiles the code** with those settings.
4. If the recompiled bytecode matches the deployed bytecode → ✅ **Verified**.

---

### 📌 Notes
- **Anyone** could attempt verification, but they must have the **exact source code and compiler settings**.
- In practice, it’s almost always the **project team**, since they control the codebase.

---

👉 Without verification, users only see:
- Raw bytecode
- Hex storage
- Unknown functions/events

With verification, users get:
- Readable functions & events
- Decoded storage
- Safer interaction (UI provided by Etherscan)  


### 🔑 Using `onlyOwner` with Different Visibilities

The `onlyOwner` modifier works with any function visibility.  
You choose the visibility (`public`, `private`, `internal`, `external`) depending on **who can call** the function.

---

#### 1. `external`
Callable only from **outside the contract** (EOA or another contract).
```
function transferOwnership(address newOwner) external onlyOwner {
    owner = newOwner;
}
```

#### 2. public
Callable from outside and inside the same contract.
```
function transferOwnership(address newOwner) public onlyOwner {
    owner = newOwner;
}
```

#### 3. internal
Callable only from inside the same contract or derived contracts.
```
function transferOwnership(address newOwner) internal onlyOwner {
    owner = newOwner;
}
```

### 4. private
Callable only from inside the same contract (not derived contracts).
```
function transferOwnership(address newOwner) private onlyOwner {
    owner = newOwner;
}
```

✅ Summary
- function → for normal methods.
- constructor → one-time setup on deployment.
- fallback → catches unknown calls or data.
- receive → handles plain ETH transfers.

# ✅ How Wallets Call Smart Contract Functions

Yes, that’s the flow:

---

## 1. Pick the Function
- Example: `transfer(address to, uint256 amount)`
- This is usually an **external** function (contracts are called from outside).

---

## 2. ABI Encode Calldata
- Function signature → hashed → first 4 bytes = **function selector**.
- Parameters → ABI-encoded (e.g., address padded to 32 bytes, amount padded).
- Together, this forms the transaction’s **data field**.

---

## 3. Sign the Transaction
- Your wallet builds the tx:
  - nonce
  - gas
  - `to` (contract address)
  - `value` (ETH, if any)
  - `data` (ABI-encoded function call)
- Signs with your **private key**, producing a valid signature.

---

## 4. Broadcast
- The signed transaction is sent to the Ethereum **mempool**.

---

## 5. Execution (EL Client)
- Validators (post-Merge) or miners (pre-Merge) **decode calldata**.
- They see: *“call function X on contract Y with params Z.”*
- They **re-run the function** with your calldata → state changes are applied.

---

## 🔑 Key Point
- **public** functions → can be called internally (by the contract itself) or externally (by EOAs/contracts).
- **external** functions → optimized for calls from outside.
- Both rely on **calldata** → ABI-encoded params sent with the tx.

# 🔑 How Wallets Know Function Signatures (ABI Decoding)

Wallets (MetaMask, Coinbase Wallet, etc.) rely on **ABIs** to understand what functions exist in a contract.  
Here’s the algorithm they follow:

---

## 1. Standard ABIs
- For **well-known standards** (ERC-20, ERC-721, etc.), wallets already have the ABI built-in.
- Example: `transfer(address,uint256)` is part of ERC-20, so wallets can always show **“Send Token”**.

---

## 2. Verified Contracts
- If a contract is **verified on Etherscan**, its ABI and source are public.
- Wallets (or dapps) can fetch the ABI from **Etherscan APIs**.

---

## 3. Custom Contracts / Dapps
- When you use a **DeFi dapp** or custom app, the frontend encodes the call using the ABI (via `ethers.js` or `web3.js`).
- The wallet just asks you to **sign** the transaction.
- Example: frontend encodes `stake(1000)` into calldata → wallet shows **“Stake 1000 tokens”**.

---

## 4. Unknown Contracts
- If no ABI is available, the wallet only sees **raw calldata** (`0xa9059cbb...`).
- In this case, it shows **“Contract Interaction”** instead of the function name.

---

## ⚡ Example: ERC-20 Transfer
- Function: `transfer(address,uint256)`
- Function selector: `0xa9059cbb` (first 4 bytes of `keccak256("transfer(address,uint256)")`)
- Wallet with ABI → shows **“Transfer 100 tokens to 0xabc…”**.
- Wallet without ABI → shows **“Contract Interaction”**.

---

## ✅ Summary
Wallets decode calldata using:
1. **Hardcoded ABIs** for popular standards.
2. **Fetched ABIs** from explorers (Etherscan).
3. **ABIs provided by dapps**.
4. Otherwise, fallback → raw calldata only.  


# Sending ETH from One EOA to Another (No Smart Contract)

When you send ETH directly (EOA → EOA):

1. **Transaction Construction**
  - `to` = recipient EOA address.
  - `value` = amount of ETH to transfer.
  - `data` = empty (no calldata, since no contract).
  - `nonce`, `gas`, and `gasPrice`/`maxFee` set by wallet.

2. **Signing**
  - Wallet signs the tx with your **private key**.
  - Produces a valid cryptographic signature.

3. **Broadcast**
  - Signed tx sent to the **mempool**.

4. **Execution**
  - Validator/miner includes it in a block.
  - Ethereum simply subtracts ETH from `msg.sender` balance, adds to `to` balance.

---

## 🔑 Key Difference
- **No calldata / ABI / function selector** → it’s just ETH value transfer.
- **Gas cost is minimal** (basic 21,000 gas).
- State change = only balances updated in Ethereum’s state trie.  