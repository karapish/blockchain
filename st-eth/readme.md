# ⚖️ ETH vs ERC-20

## ⚙️ Why ETH ≠ ERC-20
- **ETH = native currency** of the Ethereum protocol.
    - Hard-coded into the protocol.
    - Used to pay gas fees.
    - Exists at the base layer (not defined by a contract).

- **ERC-20 = smart contract standard** for fungible tokens.
    - Defines functions like `transfer`, `approve`, `balanceOf`.
    - Tokens exist *within* smart contracts that track balances.

👉 ETH launched in 2014, ERC-20 standard was introduced later (2015).

---

## 🪙 The Problem
- DeFi apps (DEXes, lending protocols) expect ERC-20 compatibility.
- ETH does not implement `transferFrom` or `approve`, because it isn’t an ERC-20 contract.

---

## 🔄 The Solution: wETH
- **Wrapped ETH (wETH):** A smart contract that locks ETH and issues an ERC-20 token.
- 1 ETH deposited = 1 wETH minted.
- 1 wETH burned = 1 ETH withdrawn.
- wETH behaves exactly like any ERC-20 token, making ETH interoperable with all DeFi protocols.

---

## ✅ Summary
- **ETH:** Native coin, not ERC-20, pays gas
