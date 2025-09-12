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

## 🔹 Our Token
- We implemented **all required functions** (`totalSupply`, `balanceOf`, `transfer`, `approve`, `allowance`, `transferFrom`).
- We also emit the required **events** (`Transfer`, `Approval`).
- That’s why our token is **ERC-20 compliant**.

---

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