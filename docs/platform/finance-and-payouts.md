# Finance and Payouts

This document records the current finance rules for money, wallet, payouts, and accounting.

## Currency rules

- Supported currencies are `EGP` and `USD` only.
- Egypt patients pay in `EGP`.
- International patients pay in `USD`.
- Patient country is determined by the backend at registration and stored on the patient profile.
- Patients do not edit their own country.
- Admin can correct the patient country when needed.
- Frontend must not convert `EGP` to `USD` or combine both into one total.
- EGP and USD balances remain separate.

## Wallet and ledger

- Wallet and ledger are backend-owned accounting views.
- The UI must not invent totals from visible rows.
- Finance pages should show backend-driven totals, not current page summaries.
- Pagination affects table rows only.

## Payout policy

- The active payout workflow is individual practitioner payout.
- The main route is `/admin/practitioner-payouts`.
- Payout history lives at `/admin/practitioner-payouts/history`.
- Each payout belongs to one practitioner.
- There is no grouped practitioner payout workflow in the current product model.
- Admin records manual external payouts.
- Real money movement happens outside the platform, while the platform keeps the internal accounting trail.
- Partial payouts are allowed only if the business rules support them.

## Payments and providers

- Paymob is intended for Egypt and local payment methods.
- Stripe may be used for international support if the rollout and geography allow it.
- Payment providers must stay swappable behind internal abstractions.
- The backend should not become vendor-locked to one payment SDK.

## Finance operations

- Practitioner payout pages are active.
- Accounting reconciliation is diagnostic and read-only from a money-movement perspective.
- `/admin/settlements` is not part of the active user flow.
- Grouped settlement batches are not a product requirement for the current Sawiyaa model.

## UI rules

- Finance copy should be compact and data-driven.
- Technical IDs should stay out of normal cards and tables unless the user opens details.
- Totals shown on the page must come from the backend.
- No fake totals and no frontend-only aggregation from visible rows.

## Related docs

- [Payments, wallet, and finance](payments-wallet-and-finance.md)
- [Accounting reconciliation](accounting-reconciliation.md)
- [Production rollout](production-rollout.md)
- [Removed and deprecated flows](removed-and-deprecated-flows.md)
