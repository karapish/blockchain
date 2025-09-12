# ERC-20 Ownable Token with Mint & Burn

## Overview

This smart contract implements a fungible token with:

- Full ERC-20 standard interface (EIP-20)
- Ownership control (via `Ownable`)
- Minting (only owner can mint new tokens)
- Burning (token holders or approved spenders can burn tokens)

---

## Specification

### Interfaces & Behavior

| Component | Methods / Events | Access Control / Requirements |
|----------|-------------------|-------------------------------|
| **ERC-20** | `totalSupply()`, `balanceOf(address)`, `transfer(address,uint256)`, `approve(address,uint256)`, `transferFrom(address,address,uint256)`, `allowance(address,uint256)` <br> Events: `Transfer`, `Approval` | Standard checks: non‐zero addresses, sufficient balances, allowance logic, etc. |
| **Ownable** | `owner()`, `onlyOwner` modifier, `transferOwnership(address)`, optionally `renounceOwnership()` | Owner set at deployment; only owner can call owner-only functions. |
| **Minting** | `mint(address to, uint256 amount)` | Only owner can mint; cannot mint to zero address; total supply increases. |
| **Burning** | `burn(uint256 amount)`, `burnFrom(address account, uint256 amount)` | Holders (or approved spender) can burn; sufficient balance; total supply decreases. |

---

## Security & Constraints

- Prevent operations involving zero address.
- Ensure safe arithmetic (overflow/underflow) — use Solidity ≥0.8 or libraries.
- Emit appropriate events: for `mint`, a `Transfer(0x0, to, amount)`; for `burn`, `Transfer(account, 0x0, amount)`.
- Ownership functions protected via `onlyOwner`.
- Do not allow minting/burning beyond expected logical constraints (if any).

---

## Out of Scope

Unless added explicitly, the contract **does not include**:

- Role-based access beyond single owner (e.g. separate minters or burners)
- Supply cap / maximum supply
- Pausing or freezing transfers
- Permit / meta-transaction support
- Snapshot / voting / staking or other extensions

---

## Example Implementation Snippet

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // optionally initial minting
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
    }
}
```

## ERC-20 Required Functions & Events

Below are the *mandatory* methods and events a contract must implement to comply with ERC-20. (Optional metadata functions are not listed here.)

---

### ⚙ Required Methods

| Function | Signature | Visibility & Return Types | Purpose / Requirements |
|---|---|---|--------------------------|
| `totalSupply()` | `function totalSupply() public view returns (uint256)` | view, returns total number of tokens in existence.  [oai_citation:0‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |
| `balanceOf(address _owner)` | `function balanceOf(address _owner) public view returns (uint256 balance)` | view, returns the balance of `_owner`.  [oai_citation:1‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |
| `transfer(address _to, uint256 _value)` | `function transfer(address _to, uint256 _value) public returns (bool success)` | non-view; transfers `_value` tokens from caller to `_to`. Must emit `Transfer`. Should fail (revert) on insufficient balance. Zero-value transfers allowed.  [oai_citation:2‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |
| `approve(address _spender, uint256 _value)` | `function approve(address _spender, uint256 _value) public returns (bool success)` | non-view; caller sets allowance for `_spender` to spend up to `_value` from caller’s account. Should emit `Approval`. May overwrite existing allowance.  [oai_citation:3‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |
| `allowance(address _owner, address _spender)` | `function allowance(address _owner, address _spender) public view returns (uint256 remaining)` | view; returns remaining amount `_spender` is allowed to withdraw from `_owner`.  [oai_citation:4‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |
| `transferFrom(address _from, address _to, uint256 _value)` | `function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)` | non-view; moves `_value` tokens from `_from` to `_to`, where the caller has sufficient allowance. Must reduce allowance accordingly. Must emit `Transfer`. Zero value transfers allowed.  [oai_citation:5‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |

---

### 🗳 Required Events

| Event | Signature | When to Emit |
|---|-------------------------------|---------------------------|
| `Transfer(address indexed _from, address indexed _to, uint256 _value)` | `event Transfer(address indexed _from, address indexed _to, uint256 _value)` | Emit on any token transfer. Also emit when tokens are *minted* (i.e. from address `0x0` → recipient) or *burned* (recipient is `0x0`). Zero value transfers still emit.  [oai_citation:6‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |
| `Approval(address indexed _owner, address indexed _spender, uint256 _value)` | `event Approval(address indexed _owner, address indexed _spender, uint256 _value)` | Emit whenever `approve(...)` is called successfully.  [oai_citation:7‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com) |

---

### 📌 Notes & Requirements

- All token transfers (including `transfer(...)` and `transferFrom(...)`) must emit the `Transfer` event.  [oai_citation:8‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com)
- Transfers of **0** value are allowed and must still emit the `Transfer` event.  [oai_citation:9‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com)
- `approve(...)` must emit `Approval` event.  [oai_citation:10‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com)
- `transferFrom` must enforce that the caller has been approved; allowance must be reduced.  [oai_citation:11‡Ethereum Improvement Proposals](https://eips.ethereum.org/EIPS/eip-20?utm_source=chatgpt.com)

---

## Who Pays Gas When You Invoke a Non-View Function via MetaMask

1. You send a transaction (non-view function call) through MetaMask.
2. **You** (the sender) pay for the gas.
3. The payment comes from your wallet address (the account you used in MetaMask).
4. MetaMask will show you an estimate for the gas cost before you confirm.
5. If your wallet doesn’t have enough ETH to cover the gas, the transaction will fail or won’t be sent.

---

## 🔍 Additional Details

- Gas cost = `gasUsed × gasPrice` (or with EIP-1559: base fee + priority tip).
- Even if the transaction fails (e.g. reverts), you still pay gas for the work done up until the failure.
- The recipient of a transaction doesn’t pay the gas. The gas always comes from the sender (unless some contract logic reimburses them later, but that’s extra).  


Here’s a walkthrough (in Markdown) of the Ethereum send() / transaction signing & lifecycle process, covering who signs what, what RPC does, validation, rejection, etc.

⸻


# Ethereum Transaction Send / Signing Lifecycle

Below is a step-by-step of what happens when you invoke a non-view function (via `send()`), from signing to inclusion in a block.

---

## 1. What parties sign

- **Externally Owned Account (EOA)**: the user who owns the private key of the sending address signs the transaction.
- **No other party signs** by default. Only the private key of the sender is used to generate a digital signature over the transaction contents (nonce, gas limit, gas price / tip, to, value, data, chain ID).  [oai_citation:0‡Medium](https://medium.com/mycrypto/the-magic-of-digital-signatures-on-ethereum-98fe184dc9c7?utm_source=chatgpt.com)
- If using a wallet such as MetaMask, the wallet UI will ask you to confirm, then uses your private key (or hardware wallet) to sign.

---

## 2. Will RPC be invoked?

- After signing **locally**, the signed transaction is sent (broadcast) to the Ethereum network via an RPC endpoint (e.g. via `eth_sendRawTransaction`) or via a provider (like Infura, Alchemy, or your own node).  [oai_citation:1‡Alchemy](https://www.alchemy.com/docs/how-ethereum-transactions-work?utm_source=chatgpt.com)
- The local client (wallet / Web3 library) constructs the transaction object, signs it, serializes it (often RLP encoding), then invokes an RPC call to submit the signed transaction.  [oai_citation:2‡Medium](https://medium.com/mycrypto/the-magic-of-digital-signatures-on-ethereum-98fe184dc9c7?utm_source=chatgpt.com)

---

## 3. What party is accountable for validation and rejection

- **Sender / wallet**: ensures correct parameters (e.g. nonce, gas limit, to address, data) before signing. If something is invalid, the client/wallet may reject locally (e.g. bad address, insufficient funds).
- **RPC node / Ethereum node/network**: once submitted, the node that receives the transaction validates it. Validation includes checks like:
  - Is signature valid?
  - Is the nonce correct (not replaying or too low)?
  - Does the sender have enough ETH for gas + value?
  - Is gas price acceptable?
  - Is chainId correct?
- If any validation fails, the transaction is rejected (not included in the mempool). The node may reply with an error.

---

## 4. Lifecycle of the transaction (if it passes initial validation)

1. **Mempool / Transaction Pool**
  - After passing basic checks, the transaction sits in the node’s transaction pool (mempool) waiting to be picked up by a miner (or validator, depending on consensus).

2. **Mining / Including in Block**
  - A miner/validator picks the transaction (often based on gas price / tip) and includes it in a new block.

3. **Block Propagation**
  - The block is propagated to other nodes.

4. **State Execution**
  - When the block is executed, the transaction executes the specified function on contract (non-view), updating state. Gas is consumed.

5. **Receipt**
  - A transaction receipt is generated, containing status (success/failure), gas used, logs/events, etc.

6. **Confirmation**
  - Once the block is part of the canonical chain and many more blocks are built on top, the transaction is considered confirmed.

---

## ✅ Summary

- The **sender** signs with their private key.
- RPC is invoked to submit the signed transaction.
- Nodes validate and can reject if invalid.
- If valid, the tx enters the mempool, then eventually included in a block, executed, and you get a receipt.

---

✅ **How to determine the correct nonce**

You generally fetch the nonce by querying the network for the account’s transaction count. Key options:

- **Using RPC / provider**:  
  Call `eth_getTransactionCount(address, "pending")` — this returns confirmed + pending transactions (so you can safely use the next nonce).

- **Alternative**:  
  Call `eth_getTransactionCount(address, "latest")` (only confirmed ones), but this may cause collisions if you have pending txs.

---

⚠️ **What to watch out for**

- **Pending transactions**:  
  If you already submitted txs that aren’t mined, their nonces are reserved. Using the same nonce will cause conflicts or rejection.

- **Skipping nonces**:  
  If you pick a nonce higher than current + 1 (leaving gaps), that tx stays pending until all prior nonces are mined. Later txs are blocked until gaps are filled.

- **Concurrency**:  
  If multiple processes/wallets send txs from the same address, they may race for nonces. Use shared state or locking to avoid clashes.

---

🛠 **Best practices**

- Always query `"pending"` nonce from your provider before creating a tx.
- If you have a queue of txs, track nonces locally so you know what’s reserved even if not confirmed.
- If a tx is stuck or pending too long, replace it by submitting a new tx with the same nonce but higher gas (**replace-by-fee**).
- Use libraries / SDKs / frameworks that help with nonce management (e.g. **ethers.js**, **web3.js**, **Nethereum**, or backend systems) to avoid manual handling.  

### SDKs
- ethers.js
- web3.js
- Nethereum

When you send a transaction to a node (RPC / full node), it goes through several validation steps **before** being accepted into the node’s mempool. These checks help ensure that bad/fraudulent transactions are filtered out.

Here are key checks / steps:

| Step                  | What is Checked                                                                                   | Why It Protects                                                  |
|-----------------------|--------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| **Signature correctness** | The transaction must have a valid digital signature matching the claimed sender address.          | Prevents spoofing / forging of transactions.                     |
| **Nonce correctness**     | The nonce must be ≥ the account’s current nonce; usually from `eth_getTransactionCount(..., "pending")`. | Avoids replay or out-of-order or duplicate tx issues.            |
| **Balance check**         | Sender must have enough ETH to cover `value + gas limit × gas price` (or max fees).                | Prevents transactions that would overspend.                      |
| **Gas limit & fees**      | Gas limit must be valid; fees must meet minimal rules, etc. If gas price is too low, some nodes may decline or drop. | Prevents spam / DoS with extremely underpriced txs.               |
| **Basic format checks**   | RLP-serialization correctness; fields present; chain ID matching; etc.                           | Ensures malformed txs are rejected early.                        |
| **Consensus rules**       | The tx must not violate protocol or client-specific rules (e.g. EIP rules, gas rules, chain rules). | Prevents invalid state transitions.                              |

---

✅ **Transaction Flow & Types**

- Only valid transactions enter your node’s mempool and get broadcast.
- Other nodes revalidate them during propagation.

---

🔹 **Types of Ethereum transactions**
- **Contract deployment**
- **Human-to-human (EOA → EOA)**
- **Contract-to-contract (internal)**
- **Hybrid (e.g., DeFi use)**

---

🔹 **Transaction states**
- **Pooled / Mined / Dropped / Replaced**
- **Canceled** – replacement that cancels the original
- **Confirmed** – mined & included on-chain
- **EOA** – between Externally Owned Accounts
- **Failed** – attempted but didn’t succeed
- **Internal** – smart contract ↔ smart contract
- **Private** – sent directly to a miner (skip mempool)
- **Stuck** – pending, can’t be mined
- **Type 0** – legacy (pre-EIP-1559)
- **Type 2** – EIP-1559 format  

### 🔌 Ethereum Wire Protocol: Full Node Tasks

All full nodes on Ethereum have three basic tasks with the **Wire protocol**:

1. **Synchronization** – Download and verify headers, blocks, and state to stay in sync.
2. **Block Propagation** – Share new blocks with peers for fast global consensus.
3. **Pending Transaction Propagation** – Gossip unconfirmed transactions from mempool to peers.  

Ethereum transactions are propagated across a decentralized Peer-to-Peer (P2P) network using protocols like RLPx and the Wire Protocol, ensuring block producers and validators can find pending transactions in the mempool. Nodes discover each other using bootnodes and establish secure connections using the RPLx protocol. They synchronize state, blocks, and pooled transactions using the Wire protocol

Nodes propagate transactions by signaling new transactions via the NewPooledTransactionHashes message, or peers can query for these transactions using the GetPooledTransactions message. Since The Merge, the consensus layer client receives, pre-validates, and passes blocks to the execution layer client, which executes transactions, validates the block’s state, and sends the validated block back to the consensus layer client for broadcasting. 


### Our actors in Ethereum’s transaction flow

---

⚡ **Front-running bots**
- Monitor the public mempool for profitable opportunities.
- When they see a big trade, they send their own tx with higher gas so it executes first.
- Example: You buy a token → bot buys before you → raises price → sells after (sandwich attack).

---

📊 **MEV searchers**
- MEV = *Maximal Extractable Value*.
- More advanced than simple bots: scan mempool or use private relays (e.g., Flashbots).
- Bundle profitable txs (arbitrage, liquidations, sandwiching) → submit to validators.
- Compete in an “MEV auction” by paying higher fees.

---

🧑‍⚖️ **Validators**
- Block proposers in Ethereum Proof-of-Stake.
- Decide which mempool txs (public/private) to include in blocks.
- Profit motive: maximize rewards via priority fees + MEV bundles.
- Can cooperate with searchers via MEV relays (e.g., Flashbots).

---

🔍 **Explorers**
- Tools like Etherscan to observe mempool and chain state.
- Show pending txs, gas prices, activity.
- Don’t seek profit directly but provide transparency that bots/searchers also use.

---

✅ **In short:**
- Front-running bots = simple opportunists.
- MEV searchers = advanced profit optimizers.
- Validators = decide final tx ordering/inclusion.
- Explorers = observers giving visibility.  

### Ethereum Transaction Types & EIP-1559
- Type 0 (Legacy): Transaction format from before EIP-1559. Uses a single `gasPrice` field. Still valid and accepted.
- Type 2 (EIP-1559): Introduced in the London hard fork. Uses `maxFeePerGas` + `maxPriorityFeePerGas` + base fee mechanics. Default/preferred now.
- Backwards compatibility: Legacy transactions continue to work even after EIP-1559. 

### 🔹 Full Node
- Stores full blockchain data (headers, blocks, state).
- Verifies all transactions and blocks against consensus rules.
- Relays valid txs/blocks across the p2p network.
- Does **not** create new blocks.

### 🔹 Miner (Proof-of-Work era, pre-Merge)
- A full node **plus** block production role.
- Used computational power (hashing) to solve puzzles.
- If successful, produced a block → earned block reward + fees.

### 🔹 Validator (Proof-of-Stake, post-Merge)
- A full node **plus** staking-based block proposer role.
- Selected randomly (weighted by stake) to propose/attest blocks.
- Earns rewards from priority fees, MEV, and issuance.

✅ In short:
- **Full node** = verifies & relays.
- **Miner (old)** / **Validator (current)** = full node + *block producer* role.  


### 🔹 How MEV Searchers Operate

1. **Transaction Monitoring**
  - Run their own Ethereum nodes or use private relay feeds.
  - Continuously scan pending txs in the public mempool.
  - Identify profitable patterns: arbitrage, liquidations, sandwich opportunities.

2. **Simulation**
  - Use custom bots to simulate “what if I insert my tx here?”
  - Run many simulations to estimate profit vs. cost (gas, risk).

3. **Bundling & Submission**
  - Craft bundles of transactions (their tx + victim tx + closing tx).
  - Submit via:
    - Public mempool (fast, higher gas to outbid others).
    - Private relays (e.g. **Flashbots**) → avoid leaking strategy to bots.

4. **Competition**
  - Multiple searchers compete in a “MEV auction.”
  - Offer higher **priority fees** or direct payments to validators.
  - Validator includes the most profitable bundle.

5. **Execution**
  - If chosen, their transactions execute in the exact order they planned.
  - Profit goes to the searcher; validator earns the tip.

---

### 🔹 Community & Communication
- **Searchers are organized** and often work semi-professionally.
- Public discussion happens in research forums (e.g., [Flashbots forum](https://collective.flashbots.net/)).
- Academic papers, GitHub repos, and blogs explain MEV strategies in theory.
- Anything like “special Discord channels” does exist, but they are **private, competitive, and not open to the public** — most professional MEV actors guard strategies closely.

✅ In short:  
MEV searchers are like **quant traders for Ethereum** → scanning txs, simulating outcomes, and competing to pay validators for profitable order flow.  


### 🔹 Private Relays in Ethereum

- **What they are**
  - Network services that let MEV searchers send transaction bundles **directly to validators**, skipping the public mempool.
  - Part of the *MEV-Boost* / PBS (Proposer-Builder Separation) ecosystem.

- **Why they exist**
  - Prevents strategies (arbitrage, liquidations, sandwiches) from being copied by other bots.
  - Reduces risk of front-running in the public mempool.
  - Lets validators earn more by receiving optimized bundles.

- **How they work**
  1. Searcher → submits bundle to **builder** (via private relay).
  2. Builder → constructs a block with most profitable tx ordering.
  3. Relay → forwards block proposal to validator.
  4. Validator → signs/attests block → includes on chain.

- **Examples**
  - Flashbots Relay (most known).
  - bloXroute, Eden, Manifold, others.

✅ In short:  
Private relays = **“private pipelines”** for transactions, used to protect MEV strategies and let validators choose the most profitable block proposals.  


### 🔍 References on MEV Auctions

- [Flashbots Auction (overview)](https://docs.flashbots.net/flashbots-auction/overview?utm_source=chatgpt.com) – Intro to Flashbots’ private relay auction system.
- [MEV Auction: Auctioning transaction ordering rights (MEVA)](https://ethresear.ch/t/mev-auction-auctioning-transaction-ordering-rights-as-a-solution-to-miner-extractable-value/6788?utm_source=chatgpt.com) – Ethresear.ch proposal for auctioning ordering rights.
- [Strategic Bidding Wars in MEV-Boost Auctions](https://arxiv.org/html/2312.14510v2?utm_source=chatgpt.com) – Game-theoretic analysis of builder/searcher competition.
- [MEV-SGX: A sealed bid MEV auction design](https://ethresear.ch/t/mev-sgx-a-sealed-bid-mev-auction-design/9677?utm_source=chatgpt.com) – Design using SGX for sealed bids.
- [A Note on Bundle Profit Maximization](https://angeris.github.io/papers/flashbots-mev.pdf?utm_source=chatgpt.com) – Formal description of bundles and bids.
- [MEV-Boost Auction dataset (Flashbots)](https://zenodo.org/records/15789978?utm_source=chatgpt.com) – Dataset of real block bids/auctions.
- [SoK: MEV Countermeasures: Theory and Practice](https://arxiv.org/abs/2212.05111?utm_source=chatgpt.com) – Survey of MEV auctions and mitigations.  


### 🔹 Base Staking Yield (Inflation-Only)

- **Where it comes from**
  - Ethereum issues new ETH as rewards to validators for duties:
    - Attestations (voting on correct blocks)
    - Sync committee participation
    - Proposing blocks

- **Rate depends on validator count**
  - The more validators there are, the more the total reward pool is split.
  - Each validator gets a smaller slice when participation grows.

- **Typical range**
  - With current validator set (~1M+ active validators), base inflation rewards = ~3–4% APR.
  - This excludes **execution-layer rewards** (priority fees + MEV).

- **Key point**
  - Inflation yield is the *guaranteed, protocol-level* reward.
  - Execution rewards (fees, MEV) sit **on top** and push APR higher (≈5–6% with MEV-Boost).  


### 🔹 Why Ethereum Blockspace Feels Scarce

1. **Bidding wars**
  - Open mempool = everyone competes on gas price.
  - Creates volatility, higher fees, and disadvantages for regular users.

2. **All-pay auction problem**
  - Even failed bids consume blockspace (reverted txs still included).
  - Bidders underprice to reduce risk, lowering validator revenue.
  - Artificial scarcity emerges.

3. **Limited bidding language**
  - `gasPrice` (Type 0) or simple fee bidding doesn’t allow fine ordering preferences.
  - Users resort to spamming or brute-force strategies.
  - Wastes blockspace and adds network load.

✅ In short: Blockspace is scarce not just because of technical limits, but also due to **inefficient auction design** in the public mempool.  

### 🔹 Execution vs. Consensus Clients
- **Execution client (e.g., Geth, Nethermind)**
  - Runs the EVM, processes transactions, updates balances and state.

- **Consensus client (beacon node, e.g., Prysm, Lighthouse)**
  - Runs Proof-of-Stake consensus.
  - Relies on the execution client for transaction validity and state.

---

### 🔹 When a block has a failed transaction
- The **execution payload** in the block contains all transactions.
- Execution client applies them sequentially:
  - **Reverted tx** → sender loses gas, no other state changes.
  - **Successful tx** → balances and contracts updated.

---

### 🔹 How the beacon node learns
1. Beacon node receives the new block from the proposer.
2. Forwards the **execution payload** to its paired execution client.
3. Execution client updates balances and state.
4. Beacon node checks that the resulting state matches the block’s root.

---

✅ **In short:**
- The **execution client** updates wallet balances.
- The **beacon node** only coordinates consensus and validates that the execution client’s result is correct.  


### 🔹 Ethereum’s Account Model
- Ethereum uses an **account-based model** (not UTXO like Bitcoin).
- Each account has:
  - **Address**
  - **Nonce**
  - **Balance**
  - **Storage root** (for contracts)
  - **Code hash** (for contracts)

---

### 🔹 World State
- The EL client maintains a global **world state** = mapping of all accounts → their balances and data.
- This state is stored in a **Merkle Patricia Trie (state trie)**.
- Root hash of the trie is included in every block header.

---

### 🔹 Syncing
- When you run an EL client:
  - It downloads blocks from peers.
  - Applies all transactions in order.
  - Updates the state trie after each block.
- Over time, the client reconstructs the **entire Ethereum state**.

---

### 🔹 Wallet visibility
- The client doesn’t need to “track” wallets individually.
- It just stores the entire state database (key-value store).
- If you query `eth_getBalance(address)`, the client looks up that address in its state trie.

---

✅ **In short:**  
An EL client “knows all wallets” because it maintains the **entire Ethereum state trie**, updated with every block. Every balance, nonce, and contract is part of this global state, not something the client has to “discover” one by one.  
