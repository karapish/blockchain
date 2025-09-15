## What is ERC-1363?

- **ERC-1363** is an extension to ERC-20.
- Allows tokens to trigger **callback functions** on receiver contracts during transfers or approvals.
- Lets you call a contract and transfer tokens **and** notify the contract in a single transaction.
- Useful for payments, DeFi, and dApps needing interactive token transfers.

**Example:**  
Send tokens to a contract and it auto-executes logic (like minting an NFT or making a payment).

https://erc1363.org

## UI Scenario for ERC-1363

### Context
ERC-1363 lets a token transfer (or approval) **automatically trigger logic** on the receiving (or spending) smart contract — all in a single transaction.

---

### Example UI Scenarios

#### 1. **Pay & Mint NFT**
- **User Action:**  
  Clicks "Mint NFT with Token" button in a dApp.
- **Behind the scenes:**  
  `transferAndCall` is called — sends tokens to NFT contract **and** calls its `onTransferReceived`.
- **UI Effect:**  
  User pays and receives NFT **in one transaction** (no need for two separate steps).

#### 2. **Staking dApp**
- **User Action:**  
  Clicks "Stake Tokens" on staking dashboard.
- **Behind the scenes:**  
  dApp uses `transferAndCall` — transfers tokens and notifies the staking contract to lock them.
- **UI Effect:**  
  Tokens are staked **immediately** with one transaction. UI shows staked amount updated.

#### 3. **Pay for Service**
- **User Action:**  
  Clicks "Subscribe" or "Pay Invoice" in a service dApp.
- **Behind the scenes:**  
  dApp sends tokens to service contract via `transferAndCall`, triggering service activation.
- **UI Effect:**  
  Service is unlocked right after token transfer, **no follow-up action needed**.

#### 4. **Token Approval with Callback**
- **User Action:**  
  Approves a DEX to spend tokens and swap instantly.
- **Behind the scenes:**  
  dApp uses `approveAndCall` — approves DEX and triggers its swap logic.
- **UI Effect:**  
  Swap executes automatically; user only signs once.

---

### **How UI/UX is Improved**
- **Fewer steps:** Only one transaction instead of two (transfer then notify).
- **Instant feedback:** User sees result immediately (NFT minted, tokens staked, service active).
- **Gas savings:** Only pay for one transaction.
- **Less confusion:** No risk of forgetting step 2 or sending tokens to a contract that can’t handle them.

---

**Summary:**  
With ERC-1363, dApps can let users "pay and interact" in a single click, making token-powered UX as smooth as using ETH directly.

## Can You Chain ERC-1363 Calls Unlimitedly?

- **No, not unlimited.**
- You can **trigger a callback** (`onTransferReceived` or `onApprovalReceived`) on the receiver/spender contract during a transfer/approval.
- That contract **can** call other contracts in its logic (and those can call others), but…
- **Limitations:**
    - **Gas limits:** There’s a maximum gas per transaction/block. Too many chained calls will hit this.
    - **Stack depth:** EVM has a max call stack depth (1024).
    - **Security risks:** More chaining increases reentrancy risks and possible failures.

**Summary:**  
Chaining is possible, but practically **limited by gas, stack depth, and security**.