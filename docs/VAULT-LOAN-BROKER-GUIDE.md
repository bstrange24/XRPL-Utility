# Vault, Loan Broker and Loan: Step-by-Step Guide

This guide explains how to use the **Vault**, **Broker** (Loan Broker) and **Loan** pages together. They map to the XRPL lending protocol (Single Asset Vault and Lending Protocol).

## 1. How the pieces fit together

```
Vault  ──►  Loan Broker  ──►  Loan
(pool of    (manages one      (individual
 assets)     Vault; holds      borrow agreement
             first-loss        between broker
             capital)          and borrower)
```

| Object | Page | Owned by | Purpose |
|--------|------|----------|---------|
| Vault | Vault | Vault owner | Holds the asset (XRP, IOU or MPT) that depositors supply and borrowers draw from. |
| Loan Broker | Broker | Broker (can be the vault owner) | Links to exactly one Vault. Sets fee and cover-rate rules. Holds first-loss capital. |
| Loan | Loan | Created by the broker, co-signed by the borrower | A specific loan against a Loan Broker. |

Dependencies, in order: **Vault → Loan Broker → (first-loss capital) → Loan → Payments**. Each step needs the IDs produced by the one before it.

## 2. Roles and wallets

| Role | Needs | Typical actions |
|------|-------|-----------------|
| Vault owner | Funded wallet | Create/modify/delete Vault, clawback (asset issuer only) |
| Depositor | Wallet holding the asset | Deposit/withdraw in Vault |
| Loan broker | Funded wallet | Create Broker, deposit/withdraw first-loss capital, create loans, default/impair/unimpair |
| Borrower | Funded wallet | Co-sign the loan, make payments |

Use a **separate wallet** for the borrower. A loan cannot be created without the borrower's signature (see Step 5).

## 3. Before you start

1. Select a network (Devnet/Testnet) in the header. The lending amendments must be enabled on that network.
2. Add and select a **funded wallet**. Each page warns when no wallet is selected, and no transaction can be built.
3. If the Vault asset is an **IOU**, the broker, depositors and borrower all need a **trustline** to the issuer (Trustlines page) and a balance.
4. If the Vault asset is an **MPT**, create the MPT first (MPT page) and authorize holders if the MPT requires it.
5. Decide whether to **Simulate** (dry run, nothing submitted) or **Submit**. Simulate first. The toggle is in the Transaction Options panel on every tab.

## 4. Step-by-step

### Step 1: Create a Vault (Vault page → Create)

1. Choose the asset: **XRP**, an **IOU** (currency code + issuer) or an **MPT** (select an existing MPT).
2. Enter **Maximum Asset Amount** (required). `0` means no cap.
3. Optional: Asset Scale, Vault Meta Data (stored as hex), Domain ID for a permissioned vault.
4. Optional flags: **VaultPrivate** and **VaultShareNonTransferable**.
5. **Vault Type**: choose **Closed-ended (for lending)** if this vault will back a Loan Broker. With the LendingProtocolV1_1 amendment (active on Devnet), a new Loan Broker can only attach to a closed-ended vault; on an open-ended vault Broker Create fails with `tecNO_PERMISSION`. Closed-ended vaults need a **Subscription Date** (deposits accepted until then) and a **Redemption Date** (at least 3 minutes later, when depositors may redeem). Both must be in the future and cannot be changed afterwards. **Deposit before the Subscription Date passes.**
6. Submit.
7. **Record the Vault ID** (64-character hex). The Broker page needs it.

> IDs can be found later in the page dropdowns (objects owned by the selected wallet), the right-hand summary panel, and the transaction result.

Use **Modify** to change metadata, maximum assets or Domain ID (at least one field must change; the maximum cannot be lower than the current total unless set to 0).

### Step 2: Deposit assets into the Vault (Vault page → Deposit)

1. Select the Vault.
2. Enter the amount. It cannot exceed your available balance or the vault's remaining space.
3. Submit. The depositor receives vault shares.

Without deposited assets there is nothing to lend, so do this before creating loans.

### Step 3: Create a Loan Broker (Broker page → Create)

1. Enter the closed-ended **Vault ID** from Step 1 (required, 64-character hex).
2. Optional settings:
   - **Management Fee Rate**: 0–10000.
   - **Debt Maximum**: non-negative; `0` means no limit.
   - **Cover Rate Minimum** and **Cover Rate Liquidation**: either both `0`, or both non-zero.
   - **Data**: up to 256 bytes.
3. Submit.
4. **Record the Loan Broker ID** (64-character hex). The Loan page needs it.

Use **Modify Broker** later to change fee, debt maximum, cover rates or data (at least one field must change). The Vault cannot be changed.

### Step 4: Fund first-loss capital (Broker page → Deposit)

1. Select the Loan Broker.
2. Enter the amount to deposit and submit.

If you set a non-zero Cover Rate Minimum, the broker needs enough first-loss capital for its debt, otherwise loan creation can fail.

| Tab | What it does | Constraints |
|-----|--------------|-------------|
| Withdraw | Takes cover back out, optionally to a destination address and tag | Amount ≤ available cover; destination tag 0–4294967295 |
| Clawback | Issuer claws back cover | Issuer only; amount ≤ the minimum required cover |

### Step 5: Create a Loan (Loan page → Create)

1. Enter the **Loan Broker ID** from Step 3 (required).
2. Enter **Principal Requested** (required).
3. Optional: counterparty (borrower), other loan terms, Data (up to 512 bytes).
4. **Counterparty signature.** A loan needs both broker and borrower to sign. Provide the **Counterparty seed** (test wallets only) when the borrower is a wallet you control. The page warns: *they must sign this transaction*.
5. Submit.
6. **Record the Loan ID.** Pay, Delete and the Broker status tabs use it.

> Never enter a real wallet seed on a shared or production network.

### Step 6: Pay the Loan (Loan page → Pay Loan)

1. Select the loan. The page reads the Loan Broker and Vault to determine the asset type.
2. Enter the amount (greater than 0, not more than the remaining balance). MPT amounts must be whole numbers.
3. Select a payment type: regular, **Overpayment**, **Full payment** (early full repayment) or **Late payment**.
4. Submit with the **borrower** wallet selected.

### Step 7: Manage loan status (Broker page, broker wallet)

| Tab | Result | Allowed when |
|-----|--------|--------------|
| Impair Loan | Marks the loan as impaired | Loan is active (not already impaired, defaulted or closed) |
| Unimpair Loan | Removes the impaired flag | Loan is currently impaired |
| Default Loan | Marks the loan as defaulted | Loan is not already defaulted or closed |

Default and Impair require ticking a confirmation checkbox.

> **Modify Loan** is intentionally unavailable. XRPL has no transaction that edits an existing loan's terms or metadata.

### Step 8: Wind down (reverse order)

1. **Loan page → Delete**: close each finished loan (confirm the permanent-action checkbox).
2. **Broker page → Withdraw**: remove first-loss capital.
3. **Broker page → Delete**: delete the Loan Broker.
4. **Vault page → Deposit tab (Withdraw action)**: depositors withdraw assets.
5. **Vault page → Delete**: delete the Vault.

Deletion fails while dependent objects remain.

## 5. Quick reference

| I want to… | Page → Tab | Needs |
|-----------|-----------|-------|
| Create a pool | Vault → Create | Asset |
| Add liquidity | Vault → Deposit | Vault |
| Remove liquidity | Vault → Deposit (Withdraw action) | Vault |
| Create a broker | Broker → Create | Vault ID |
| Add first-loss capital | Broker → Deposit | Broker |
| Create a loan | Loan → Create | Broker ID, principal, borrower signature |
| Repay | Loan → Pay Loan | Loan |
| Flag a risky loan | Broker → Impair Loan | Loan |
| Write off a loan | Broker → Default Loan | Loan |
| Close a loan | Loan → Delete | Loan |

## 6. Common problems

| Symptom | Likely cause / fix |
|---------|--------------------|
| "No wallets have been selected" | Add/select a wallet before using any tab. |
| A Vault/Broker/Loan dropdown is empty | The selected wallet owns none, or data hasn't loaded. Switch wallet or enter the ID manually where offered. |
| Vault ID / Broker ID invalid | Must be exactly 64 hex characters. |
| Cover rates rejected | Minimum and Liquidation must both be zero or both non-zero. |
| Loan creation fails on signature | The borrower must sign. Provide the counterparty seed (test wallets). |
| Loan creation fails on cover | Insufficient first-loss capital. Deposit more (Step 4). |
| Deposit rejected | Amount exceeds balance or vault limit; missing trustline (IOU) or MPT authorization. |
| Delete rejected | Dependent objects remain. Follow the Step 8 order. |
| Nothing appears on the ledger | Simulate mode is on. Switch to Submit in Transaction Options. |
| Broker Create returns `tecNO_PERMISSION` | The vault must be closed-ended (LendingProtocolV1_1). Create the vault with the closed-ended option. |
| Loan Create returns `tecNO_PERMISSION` | Loans can only be originated in the vault's Investment phase, and the final payment (now + payments × interval) must be at least 60 s before the vault Redemption Date. |
| Loan Create returns `temBAD_SIGNER` | Counterparty address and counterparty seed are both required (the borrower co-signs). |
| Loan not visible on the lender's Loan page | The Loan object lives under the borrower. Switch to the borrower wallet. |
| Loan Pay needs a payment type | It doesn't. Leave the flag empty for a regular on-time payment. If the installment is overdue (`tecEXPIRED`), use the Late Payment flag. |
| Broker owner can't see loans | Impair, Unimpair and Default list loans from the broker's pseudo-account, so the owner sees the borrower's loans on the Broker page. |
| Loan Delete | The borrower deletes the loan after it is fully repaid or defaulted. |
| Broker Delete | Withdraw all cover and close all loans first, then tick both confirmations. |
| Cover Clawback on XRP | Not possible (blocked in the UI). Only issued tokens/MPTs where you are the issuer. |
| Amounts | Vault amounts, DebtMaximum and PrincipalRequested are in drops for XRP; cover deposit/withdraw take XRP. DebtMaximum 0 means no limit on create only. |

The Vault, Loan Broker and Loan pages also show a collapsible workflow stepper with a per-tab tip.

## 7. Suggested end-to-end test run (Devnet)

1. Wallets: A (vault owner and broker), B (borrower). Fund both.
2. Vault → Create (XRP, max 1000). Note the Vault ID.
3. Vault → Deposit 500.
4. Broker → Create (Vault ID). Note the Broker ID.
5. Broker → Deposit first-loss capital.
6. Loan → Create (Broker ID, principal 100, counterparty B). Note the Loan ID.
7. Loan → Pay Loan (as B).
8. Broker → Impair, then Unimpair.
9. Loan → Delete, Broker → Delete, Vault → Delete (Step 8 order).

> Field limits mirror the app's validation. Protocol-level behavior is defined by the XRPL amendments and may vary by network.
