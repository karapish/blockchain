# When is a Loan on Aave Under-Collateralized?

## 🏦 Aave Lending Basics
- Users **deposit assets** (e.g., ETH, USDC) → earn interest.
- They can **borrow** against their collateral.
- Each asset has:
    - **Loan-to-Value (LTV)** ratio (e.g., max borrow = 75% of collateral value).
    - **Liquidation Threshold** (slightly above LTV, e.g., 80%).

---

## ⚠️ Condition for Under-Collateralization
A borrower’s **Health Factor (HF)** determines loan safety:

**HF = (Collateral Value × Liquidation Threshold) ÷ Borrowed Value**

- HF > 1 → loan is safe.
- HF = 1 → borderline risky.
- HF < 1 → loan is under-collateralized → eligible for liquidation.

---

## 🔨 Example
- Alice deposits **10 ETH** worth $20,000.
- Liquidation Threshold = **80%**.
- She borrows **$15,000 USDC**.

At this point:  
**HF = (20,000 × 0.8) ÷ 15,000 = 1.066 → Safe**

But if ETH price drops to $1,600 (10 ETH = $16,000):  
**HF = (16,000 × 0.8) ÷ 15,000 = 0.853 → Unsafe**

Now h
