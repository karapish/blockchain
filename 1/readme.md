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


### 🔹 Ethereum (ETH)
- **State storage:** Merkle Patricia Trie (MPT) → maps addresses → accounts (balance, nonce, storage, code).
- **Persistence:** Entire state is maintained *continuously* and updated with every block.
- **Size:** As of 2025, the Ethereum world state is hundreds of GBs (≈250–350 GB depending on pruning).
- **Lifetime:** Indefinite — state persists as long as accounts/contracts exist.

---

### 🔹 Ethereum Classic (ETC)
- **Same design as Ethereum** (before upgrades like Verkle tries are introduced).
- Uses the Merkle Patricia Trie for global state.
- **Size:** A bit smaller than ETH because of less activity and fewer contracts.
- **Lifetime:** Also indefinite — state grows with chain usage.

---

### 🔹 Bitcoin (BTC)
- **Different model:** UTXO (Unspent Transaction Output) set.
- No account trie — instead, it tracks all unspent outputs in a database (LevelDB/RocksDB).
- **Persistence:** UTXO set is updated every block, like Ethereum’s state.
- **Size:** Much smaller — ~10–15 GB today (since it only tracks spendable outputs, not contracts/storage).
- **Lifetime:** Indefinite, updated as long as Bitcoin runs.

---

✅ **In short:**
- ETH & ETC → use a **Merkle Patricia Trie** to store the full account-based world state, continuously updated, and now hundreds of GB in size.
- BTC → uses a **UTXO set** instead, stored in a database, smaller (~10–15 GB).
- In all cases, this state is kept *forever*, updated at each block, because it’s the reference for validating new transactions.  


### 🔹 Ethereum / Ethereum Classic State Model

- **Accounts:**  
  Two types:
  1. **Externally Owned Accounts (EOAs):** normal wallets (just balance + nonce).
  2. **Contract Accounts:** smart contracts (balance + code + *storage*).

- **Storage:**
  - Each contract account has its own persistent key-value store.
  - This storage is part of the world state, kept in the Merkle Patricia Trie.
  - Keys/values are 32-byte slots.

---

### 🔹 Solidity Example (your array case)
```solidity
uint256[] public myArray;
```
### 🔹 Storage Mapping in Solidity

- **`myArray.length`** → stored at a fixed slot.  
- **Elements (`myArray[0]`, `myArray[1]`, …)** → stored at derived slots (using `keccak256` hashing).  

When your contract runs, the **EVM reads/writes** these slots in the account’s storage.  

---

### 🔹 Key Point
- **Yes:** In Ethereum/ETC, “storage” is the persistent data space inside **contract accounts**.  
- **EOAs (human wallets):** no contract storage, only **balance + nonce**.  
- All of this lives inside the global **state trie**, so every node can validate and reproduce the same results.  

---

✅ **In short:**  
Arrays, mappings, and structs in Solidity → compiled into **storage slots** → stored in the contract account → persisted in the **state trie**.  

### 🔹 Coinbase Accounts

- **User accounts at Coinbase**
  - When you open a Coinbase account, they create a **custodial wallet** for you.
  - On-chain, this corresponds to an **Externally Owned Account (EOA)** controlled by Coinbase’s infrastructure, not directly by you.
  - Coinbase holds the private keys, you just interact via their app/API.

- **Contract accounts**
  - Coinbase doesn’t create contract accounts for you by default.
  - If you deploy a smart contract, *you* (or your app) would create that account on Ethereum, not Coinbase.

---

✅ **In short:**  
Coinbase user wallets are **EOAs**. They’re custodial EOAs, meaning Coinbase holds the keys. Contract accounts are separate and created only when you deploy smart contracts.  

### 🔹 MetaMask Accounts

- **EOAs only**
  - MetaMask generates **Externally Owned Accounts (EOAs)** for users.
  - You control these via your private key or seed phrase.
  - These EOAs can hold ETH/tokens, sign txs, and interact with smart contracts.

- **Contract accounts**
  - MetaMask does **not** create contract accounts automatically.
  - If you deploy a smart contract using MetaMask, *that action* creates a new **contract account** on Ethereum.
  - But the creation comes from your EOA sending a deployment transaction.

---

✅ **In short:**  
MetaMask = wallet for **EOAs**.  
Contract accounts exist only if you **deploy a contract** from your EOA.  

### 🔹 Create an Externally Owned Account (EOA)
- EOAs are just a **keypair** (private key + address).
- They are **not created on-chain** until they send or receive ETH/tokens.
- Typical API calls:
  - **web3.js / ethers.js**
    ```js
    // web3.js
    const account = web3.eth.accounts.create();
    console.log(account.address, account.privateKey);
    ```
    ```js
    // ethers.js
    const wallet = ethers.Wallet.createRandom();
    console.log(wallet.address, wallet.privateKey);
    ```
  - **JSON-RPC**
    - `personal_newAccount` (if node has the personal API enabled)

---

### 🔹 Create a Contract Account
- Contract accounts are created **on-chain** when an EOA sends a special transaction with `data` = compiled bytecode.
- Typical API calls:
  - **JSON-RPC**
    - `eth_sendTransaction` with a `data` field (no `to` address)
    ```json
    {
      "from": "0xYourEOA",
      "data": "0x6080604052...",   // contract bytecode
      "gas": "0x500000"
    }
    ```
  - **web3.js / ethers.js**
    ```js
    const contract = new web3.eth.Contract(abi);
    contract.deploy({ data: bytecode })
      .send({ from: account, gas: 5000000 });
    ```
    ```js
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy();
    ```

---

✅ **In short:**
- **EOA = keypair** → created locally via libraries (`accounts.create`, `Wallet.createRandom`, etc.), no transaction required.
- **Contract account = deployed contract** → created on-chain via `eth_sendTransaction` with `data = bytecode`.  


### 🔹 EOAs and the Ledger
- An **EOA is just a keypair** (address + private key).
- When you generate it locally (MetaMask, ethers.js, Coinbase internal systems), it doesn’t yet exist *on-chain*.
- The Ethereum ledger doesn’t pre-store “all possible addresses.”

---

### 🔹 How it receives assets
- Ethereum’s **world state** (state trie) is a mapping: `address → account data`.
- If an address has **never been used**, it simply isn’t present in the state trie.
- The **moment someone sends ETH/tokens to it**, the EL client:
  - Creates a new entry in the state trie for that address.
  - Initializes it with balance (and nonce = 0).

---

### 🔹 Key Point
- You don’t need to “register” an EOA on-chain before receiving assets.
- The address is deterministically derived from your keypair, so anyone can send to it.
- The ledger will “activate” the account when a transaction or transfer first touches it.

---

✅ **In short:**  
An EOA is “off-chain” until first use. Once ETH or a token is sent to it, the execution client creates an entry for it in the global state, and from then on, it’s part of the ledger.  

### 🔹 How Ethereum Addresses Are Derived

1. **Private key**
  - A random 256-bit number.
  - Must remain secret (controls the account).

2. **Public key**
  - Derived from the private key using Elliptic Curve Cryptography (secp256k1).
  - One-to-one relationship: every private key produces exactly one public key.

3. **Address**
  - Take the public key.
  - Hash it with `keccak256`.
  - Take the **last 20 bytes** → that’s your Ethereum address.
  - Example:
    ```
    address = keccak256(public_key)[12:]
    ```

---

### 🔹 Why it’s deterministic
- Given the same private key → always get the same public key → always get the same address.
- No central registry is needed.
- That’s why wallets like MetaMask or Coinbase can generate addresses offline and know they’ll work.

---

### 🔹 How others can send to it
- Once you know the address, you don’t need the private key to send assets there.
- Anyone can include that address in a transaction’s `to` field.
- When the first transfer happens, Ethereum clients add the address to the global state with its new balance.

---

✅ **In short:**  
An Ethereum address is just a deterministic hash of a keypair. Because it’s predictable and unique, it can receive ETH or tokens *even before it appears on-chain*.  

### 🔹 Block arrives
- The EL client receives a new block (with its transactions) from peers.
- Each transaction has a `from`, `to`, `value`, `gas`, and optional `data`.

---

### 🔹 Processing transactions
- For each tx, the client:
  1. **Checks sender (`from`)**
    - The account *must* already exist in the state trie (otherwise tx is invalid).
  2. **Checks recipient (`to`)**
    - If `to` exists → update its balance / run contract code.
    - If `to` does **not** exist and it’s not empty code → create a new account entry in the state trie.
      - Example: first time you send ETH to a fresh EOA.

---

### 🔹 Updating the global state trie
- If an address didn’t exist in the trie yet:
  - The client inserts a new entry (`balance = value`, `nonce = 0`, `code = empty`, `storage = empty`).
- The state root is recalculated after applying all transactions in the block.
- The block header includes this **new state root**, which every node checks to stay in sync.

---

### 🔹 Key Point
- EL clients don’t “pre-know” all addresses.
- They **dynamically add them** to the state trie the first time a tx touches them.
- That’s how a never-before-used EOA can suddenly hold ETH after its first incoming transfer.

✅ **In short:**  
When a block arrives, the EL client processes txs → if a `to` address isn’t in the trie yet, it **creates it on the fly** and updates the state accordingly.  


### 🔹 Why an EOA address is unique and deterministic
- **1 private key → 1 public key → 1 address**
  - Private key: random 256-bit number.
  - Public key: derived from private key using elliptic curve multiplication (secp256k1).
  - Address: `address = keccak256(public_key)[12:]` → last 20 bytes.

---

### 🔹 Key implications
- **Deterministic:** Same private key always yields the same address.
- **Unique:** The probability of two private keys giving the same address is astronomically small.
- **Trustless:** Anyone can generate an address offline, no central registry needed.
- **Receivable:** Others only need the 20-byte address, not the public or private key, to send ETH/tokens.

---

✅ **In short:**  
An EOA works because cryptography guarantees a *1-to-1 deterministic mapping* from private key → public key → address. That’s why an address can exist “off-chain” and still receive assets the first time it’s referenced in a block.  

### 🔹 Private Key
- A 256-bit secret number — must be kept hidden.
- **Used for:**
  - **Signing transactions** (ECDSA signatures).
  - Proving ownership of the account (you control the funds).
- Never shared; only the signature is broadcast.

---

### 🔹 Public Key
- Derived from the private key (via secp256k1 elliptic curve multiplication).
- **Used for:**
  - **Verifying signatures** → nodes confirm that a tx was signed by the right private key.
  - **Deriving the address** → `keccak256(public_key)[12:]`.
- Doesn’t need to be kept secret; anyone can know it.

---

### 🔹 Address
- Derived from the public key.
- **Used for:**
  - Receiving ETH/tokens.
  - Identifying accounts on-chain.
- Much shorter (20 bytes) so easier to handle than raw public keys.

---

✅ **In short:**
- **Private key = sign.**
- **Public key = verify.**
- **Address = receive.**  


### 🔹 Public Key
- **What it is:**
  - Mathematically derived from the private key (via elliptic curve multiplication).
  - A fixed identifier that corresponds to one private key.

- **Purpose:**
  - Used to **verify** signatures created with the private key.
  - Used to derive your **address** (`keccak256(public_key)[12:]`).

- **Properties:**
  - Can be shared openly.
  - Same every time (doesn’t change).

---

### 🔹 Signature
- **What it is:**
  - A cryptographic proof generated by applying the private key to some message (e.g., a transaction).
  - In Ethereum, this is an **ECDSA signature** (r, s, v values).

- **Purpose:**
  - Proves that the message/transaction came from the holder of the private key.
  - Allows others to check validity using only the public key.

- **Properties:**
  - Different every time, even if the same message is signed (because of randomization in the algorithm).
  - Only valid for the specific message signed.

---

✅ **In short:**
- **Public key** = a *static identifier* derived from the private key, used for verification.
- **Signature** = a *dynamic proof* generated with the private key, used to show authenticity of a specific message.  

### 🔹 Step 1 — You create the transaction
- You fill in:
  - `to` = your friend’s address
  - `value` = 1 ETH
  - `gas` + `maxFeePerGas`
- This unsigned transaction is just a piece of data.

---

### 🔹 Step 2 — MetaMask uses your private key
- MetaMask holds your **private key** (in the browser extension, encrypted with your password).
- It takes the unsigned tx data and runs **ECDSA signing** with your private key.
- Output = transaction + **signature (r, s, v)**.
- The private key **never leaves MetaMask**.

---

### 🔹 Step 3 — Transaction broadcast
- The signed transaction is sent to your connected **Execution Layer (EL) client** (e.g., Infura, Alchemy, or your own Geth).
- The client gossips it across the Ethereum p2p network (devp2p → eth/66 protocol).

---

### 🔹 Step 4 — How the EL verifies
When another EL client receives the tx:
1. **Recover public key** from the signature (possible because ECDSA allows key recovery).
2. Hash public key with `keccak256`, take last 20 bytes → reconstruct the **sender address**.
3. Check:
  - Does the sender exist in the state trie?
  - Does the sender have ≥ 1 ETH + gas fees?
  - Is the nonce correct?
  - Is the signature valid?

If all checks pass → tx is valid and goes to the mempool.

---

### 🔹 Step 5 — Block inclusion
- A validator eventually proposes a block.
- The EL executes your tx:
  - Deducts 1 ETH + gas from **your EOA balance**.
  - Increments your nonce.
  - Adds 1 ETH to your friend’s account (creating it in the trie if it didn’t exist yet).

---

✅ **In short:**
- **Private key**: signs the tx (in MetaMask).
- **Signature**: proves authenticity, lets EL recover your public key/address.
- **Public key**: never sent directly, only reconstructed from the signature.
- **Execution client**: verifies signature + state, then updates balances when block is mined.  

### 🔹 1. Proposer is chosen
- In Proof-of-Stake, the **beacon chain (Consensus Layer)** randomly selects a validator to propose the next block.
- That validator runs *both*:
  - A **Consensus Layer (CL) client** (e.g., Lighthouse, Prysm).
  - An **Execution Layer (EL) client** (e.g., Geth, Nethermind).

---

### 🔹 2. EL prepares the payload
- The validator’s **EL client** takes pending transactions from its **mempool**.
- It executes them in order, applying gas limits and validity checks.
- Result = **execution payload**:
  - List of transactions
  - Resulting state root
  - Receipts, logs, etc.

---

### 🔹 3. Handshake between EL and CL
- The **EL client** passes this execution payload to the validator’s **CL client** through the **Engine API** (`engine_getPayload`, `engine_newPayload`, etc.).
- CL client doesn’t execute txs — it just trusts EL for state.

---

### 🔹 4. Block is proposed
- The validator’s **CL client** wraps the execution payload into a beacon block.
- Broadcasts the block to other validators on the P2P network.

---

### 🔹 5. Other validators verify
- Peers’ **EL clients** re-execute the payload transactions to confirm the state root.
- Their **CL clients** check consensus rules (signatures, attestations).
- If all checks pass → block accepted.

---

✅ **In short:**
- The EL client *inside the validator’s own node* feeds transactions → execution payload → to the CL client.
- The CL client → proposes the block to the rest of the network.
- So the tx doesn’t “travel” to some remote staker — the validator *is* running EL+CL together.  

### 🔹 Normal flow (no MEV-Boost)
- Each validator runs its own **EL client** with a mempool.
- When selected to propose a block, it picks txs from *its own mempool* to build the block.

---

### 🔹 With MEV-Boost
- Validators **outsource block building** to external **block builders**.
- Flow:
  1. Searchers → send bundles of profitable txs to builders.
  2. Builders → construct candidate full blocks (using their own mempool + bundles).
  3. Builders → submit bids via **relays** to validators.
  4. Validator (via MEV-Boost middleware) → chooses the most profitable block proposal.

- The validator’s own EL client doesn’t build the block in this case — it just verifies the block is valid after the builder provides it.

---

### 🔹 Key point
- MEV-Boost **does not send txs directly into a validator’s mempool**.
- Instead, it bypasses the validator’s mempool entirely by letting **builders deliver ready-made blocks**.
- Validators pick between blocks (auctions), not transactions.

---

✅ **In short:**
- **Without MEV-Boost**: Validator’s mempool → block.
- **With MEV-Boost**: Builder’s mempool/bundles → block → validator.  


### 🔹 Execution Payload (simplified structure)

- **parentHash** – Hash of the parent execution block.
- **feeRecipient** – Address that receives transaction fees (validator’s chosen withdrawal address).
- **stateRoot** – Root of the state trie *after* applying all included transactions.
- **receiptsRoot** – Root of the receipts trie (logs/events for each tx).
- **logsBloom** – Bloom filter for quickly searching logs/events.
- **prevRandao** – Randomness for the block (from beacon chain).
- **blockNumber** – Height of the chain.
- **gasLimit / gasUsed** – Gas constraints for the block.
- **timestamp** – Unix time of the block.
- **baseFeePerGas** – Base fee from EIP-1559.
- **extraData** – Arbitrary data (set by proposer/builder).
- **transactions[]** – The full list of signed txs included.
- **withdrawals[]** – Withdrawals from validator balances (post-Shanghai/Capella).

---

### 🔹 Example (simplified JSON)

```json
{
  "parentHash": "0xabc123...",
  "feeRecipient": "0xdef456...",
  "stateRoot": "0x789abc...",
  "receiptsRoot": "0x456def...",
  "logsBloom": "0x00...ff",
  "blockNumber": 1928374,
  "gasLimit": 30000000,
  "gasUsed": 2893472,
  "timestamp": 1694451200,
  "baseFeePerGas": "0x34e62ce00",
  "transactions": [
    "0xf86c820...",
    "0xf87083..."
  ],
  "withdrawals": [
    { "index": 1, "validatorIndex": 12345, "address": "0xaaa...", "amount": 32000000000 }
  ]
}
```

### 🔹 Why miners went to Siberia
- PoW required massive energy, and electricity was the #1 cost.
- Regions with **cheap hydropower** (Siberia, Quebec, Iceland, parts of China) became mining hubs.
- Firms co-located their rigs near power stations to cut costs.

---

### 🔹 What happened after The Merge
- Ethereum (ETH) abandoned PoW completely → GPUs/ASICs for ETH became useless.
- Some miners tried to:
  - Switch to **Ethereum Classic (ETC)** or coins like **Ravencoin, Ergo**.
  - Repurpose GPUs for AI/ML workloads.
  - Sell hardware (big wave of used GPUs hit markets in 2022–23).
- Specialized ETH ASICs mostly became e-waste.

---

### 🔹 Today
- The **ETH PoW mining business is gone**.
- Bitcoin mining still thrives — and cheap electricity hubs are still relevant — but BTC is mined with specialized ASICs, not GPUs.
- Those Siberian operations that were ETH-only either pivoted to BTC/ETC, sold off, or shut down.

---

✅ **In short:**  
The “cheap hydropower farm in Siberia” strategy worked in the PoW era. After Ethereum’s Merge, ETH mining ended, so that business disappeared — only BTC and a few smaller PoW coins keep similar setups alive.  

### 🔹 Example of Profitable Transactions to Builders
- **Arbitrage:**  
  Buy token on Uniswap at 100, sell on Sushiswap at 102 → profit from price difference.
- **Liquidations:**  
  On Aave or Maker, liquidate an undercollateralized loan → get a liquidation bonus.
- **Sandwich attack:**  
  Detect a large buy order in mempool → place your buy just before, and sell just after, profiting from slippage.
- **Bundle:**  
  Searcher can package multiple txs together (buy + sell) to guarantee atomic profit if block includes both.

Builders receive these bundles and create blocks with maximum value for validators.

---

### 🔹 Who is a Searcher?
- **Searcher = profit seeker.**
- They run bots to scan the mempool or private relays for opportunities.
- Use custom simulation engines to test “what if my tx went here?” scenarios.
- Submit **bundles of profitable txs** to builders (via Flashbots or other relays).
- Compete against other searchers → whoever pays the highest tips to validators usually wins.

---

✅ **In short:**
- **Searcher = trader/algorithm/bot** that finds and bundles profitable opportunities.
- **Builder = block constructor** who takes txs (including from searchers) and assembles the most profitable block.
- Together they feed the MEV auction that validators pick from.  

### 🔹 Collateralized Lending (Aave / Maker)
- User deposits collateral (e.g., 10 ETH) and borrows stablecoins (e.g., 10,000 DAI).
- Protocol requires a **collateral ratio** (e.g., 150%).

---

### 🔹 When the loan goes underwater
- If ETH price drops, collateral may no longer meet the ratio.
- Example: 10 ETH @ $2,000 = $20,000 collateral → ratio = 200%.
- If ETH falls to $1,200 → $12,000 collateral, ratio = 120% (below 150%).
- Loan is now **undercollateralized**.

---

### 🔹 Liquidation process
1. Protocol marks the position as liquidatable.
2. **Searcher (liquidator)** sends a liquidation transaction.
  - Repays part/all of the borrower’s debt on their behalf.
3. In return:
  - Liquidator seizes borrower’s collateral at a discount (e.g., 5–10%).
  - That discount = **liquidation bonus**, pure profit for the liquidator.

---

### 🔹 Why it’s profitable
- Liquidators can instantly resell the collateral on DEXs.
- The “bonus” ensures bots/searchers race to liquidate risky positions.

---

✅ **In short:**  
Liquidations = buying collateral at a discount by paying off someone’s bad loan.  
Searchers/bots compete to grab these chances for a guaranteed profit.  

### 🔹 Case: Liquidation on Aave / Maker
- Borrower’s position falls below collateral ratio.
- Liquidator repays the borrower’s debt (partially or fully).
- In return, liquidator gets the borrower’s collateral **+ a small bonus**.

---

### 🔹 Does Aave/Maker lose money?
- **No, normally they don’t.**
  - The debt is repaid (by the liquidator).
  - The seized collateral covers the debt + the liquidation bonus.
  - Protocol remains solvent.

- **When risk appears:**
  - If the market moves **too fast** (e.g., ETH price crashes suddenly), collateral value might fall below debt + bonus.
  - In such cases, protocol’s insurance fund (e.g., Aave Safety Module, Maker’s Surplus Buffer) absorbs the shortfall.

---

### 🔹 Who bears the loss?
- **Normal liquidation:** borrower loses collateral, liquidator profits, protocol safe.
- **Extreme crash:** protocol’s backstop funds or governance tokens (AAVE/MKR) may be used to cover deficit.

---

✅ **In short:**
- In regular conditions → **Aave/Maker do not lose money** in liquidations.
- In extreme volatility → **losses are socialized** via insurance/backstop mechanisms.  


### 🔹 Aave
- All core contracts (LendingPool, Incentives, Governance, etc.) are deployed on Ethereum.
- Source code is published and verified on **Etherscan**.
- Repo: [github.com/aave/protocol-v2](https://github.com/aave/protocol-v2) (and v3).
- Governance decisions (risk parameters, asset listings) are made by **AAVE token holders** through on-chain governance.

---

### 🔹 MakerDAO
- Maker Protocol contracts (Vaults, Collateral, DAI Stablecoin, Liquidations) are also fully on-chain.
- Verified on **Etherscan**.
- Repo: [github.com/makerdao](https://github.com/makerdao).
- Governance (like stability fees, collateral ratios) decided by **MKR token holders** via public governance votes.

---

### 🔹 Why this matters
- Because contracts are public + immutable once deployed, users and searchers/liquidators can trust:
  - How collateralization is calculated.
  - How liquidations happen.
  - How governance parameters are applied.
- Protocol transparency = stronger trust, no hidden rules.

✅ **In short:**  
Yes — Aave and Maker publish their smart contracts openly, and loan governance (risk params, fees, collateral) is enforced by **on-chain code** plus token-holder governance.  

### 🔹 Ethereum (L1)
- Base blockchain network.
- Provides security, consensus, and settlement.
- Hosts smart contracts for apps like Aave, Maker, Uniswap, etc.

---

### 🔹 Aave
- A **lending protocol** deployed as smart contracts on Ethereum (and also on some L2s like Polygon, Arbitrum, Optimism).
- Not its own chain — it lives *on Ethereum or L2s*.

---

### 🔹 MakerDAO
- Protocol behind the **DAI stablecoin**.
- Runs entirely on Ethereum smart contracts.
- Uses governance via MKR token to set parameters.
- Also **not its own chain**.

---

✅ **In short:**
- **Ethereum = L1 blockchain.**
- **Aave & MakerDAO = applications/protocols built on Ethereum L1 (and some L2s).**
- They depend on Ethereum’s security, not their own consensus.  

### 🔹 What is Base?
- A **Layer 2 blockchain** built by Coinbase.
- Uses the **OP Stack** (same tech as Optimism).
- Secures itself by posting data/transactions back to Ethereum (L1).

---

### 🔹 Why it exists
- Cheaper & faster transactions than Ethereum mainnet.
- Fully compatible with the Ethereum Virtual Machine (EVM).
- Tightly integrated with Coinbase products → easy on/off ramps.

---

### 🔹 Key traits
- **Not an L1** → it inherits security from Ethereum.
- **Rollup**: executes transactions off-chain, then batches them to Ethereum.
- **Ecosystem**: DeFi, NFTs, on-chain apps — same as Ethereum, but lower gas.

---

✅ **In short:**  
**Base = Coinbase’s Ethereum Layer 2 (built with Optimism tech).**  
It’s not its own L1 like Ethereum or Solana — it’s an L2 rollup that depends on Ethereum for final security.  

### 🔹 Sequencers (in L2s like Base, Arbitrum, Optimism)
- Role: order transactions and create L2 blocks.
- They **do not** run MEV auctions like Ethereum validators.
- They send compressed transaction data back to Ethereum (L1) for finality.
- Today: centralized (often a single sequencer per rollup, run by the project team).
- Future: roadmap to decentralize sequencing and enable shared MEV auctions.

---

### 🔹 MEV Relays / Validators (Ethereum L1)
- **Validators**: chosen by Ethereum PoS to propose blocks.
- **MEV relays**: deliver block bundles (via MEV-Boost) to validators.
- This happens only on Ethereum L1, not inside Base/Arbitrum/Optimism (yet).

---

### 🔹 Key Difference
- **Sequencer** = transaction orderer in an L2.
- **Validator/Relay** = transaction/bundle orderer in Ethereum L1 MEV auctions.
- Base’s sequencer (run by Coinbase) decides tx order **within Base**, but Base still posts the results to Ethereum, where L1 validators enforce finality.

---

✅ **In short:**  
Coinbase’s Base sequencers are **not MEV relays or validators**. They are L2 ordering nodes. Ethereum L1 validators (with MEV relays) still decide the *final ordering at the base layer*.  
