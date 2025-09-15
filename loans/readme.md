## `ERC20FlashMint` (OpenZeppelin Contracts v5.x)

### What it is
- An extension for ERC‑20 tokens providing **flash loan** capability via temporary minting and burning.  [oai_citation:0‡OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/5.x/api/token/ERC20?utm_source=chatgpt.com)
- Implements the ERC‑3156 flash loan standard.  [oai_citation:1‡OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/5.x/api/token/ERC20?utm_source=chatgpt.com)

---

### Key Functions

| Function | Purpose |
|---|---|
| `maxFlashLoan(token)` | Returns the maximum amount of `token` that can be flash‑loaned.  [oai_citation:2‡OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/5.x/api/token/ERC20?utm_source=chatgpt.com) |
| `flashFee(token, value)` | Computes the fee to borrow `value` tokens (can be zero if not overridden).  [oai_citation:3‡OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/5.x/api/token/ERC20?utm_source=chatgpt.com) |
| `flashLoan(receiver, token, value, data)` | Performs the flash loan: mints `value` tokens to `receiver`, calls the receiver’s callback, then ensures return of `value + fee` inside the same transaction. Reverts otherwise.  [oai_citation:4‡OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/5.x/api/token/ERC20?utm_source=chatgpt.com) |

---

### How It Works (Flow)

1. Caller requests a flash loan via `flashLoan(...)`.
2. Contract mints the requested amount to the `receiver`.
3. Receiver executes its flash‑loan callback (implements `IERC3156FlashBorrower`) using the tokens.
4. End of transaction: Receiver must return `value + fee`. If not, transaction reverts.
5. Token contract burns the borrowed amount (net supply unchanged, aside from fees paid).

---

### Use Cases

- Arbitrage, trade opportunities within a single transaction.
- Temporary liquidity needs (bridging, rebalancing).
- DeFi primitives needing short‑term token borrow without long‑term collateral.

---

### Risks & Caveats

- All actions must happen in one transaction → risk of running out of gas.
- Receiver contract must correctly implement required interface/callback.
- Potential for abuse / unexpected state changes via callbacks.
- If token has supply caps or other constraints, `maxFlashLoan` must consider them if overridden.

---

### Example Snippet

```solidity
interface IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

contract MyFlashUser is IERC3156FlashBorrower {
    function doStuffWithFlashLoan(address flashToken, uint256 amount) external {
        ERC20FlashMint(flashToken).flashLoan(
            address(this),
            flashToken,
            amount,
            ""
        );
        // in onFlashLoan: use the tokens, then return amount + fee
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        // business logic using `amount`
        // then approve and return tokens + fee
        IERC20(token).approve(address(this), amount + fee);
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}