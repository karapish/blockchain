## What is ERC-1363?

- **ERC-1363** is an extension to ERC-20.
- Allows tokens to trigger **callback functions** on receiver contracts during transfers or approvals.
- Lets you call a contract and transfer tokens **and** notify the contract in a single transaction.
- Useful for payments, DeFi, and dApps needing interactive token transfers.

**Example:**
Send tokens to a contract and it auto-executes logic (like minting an NFT or making a payment).