# Phase 16A - Financial Accounting Architecture Discovery & Source-of-Truth Audit

## Executive Summary
Fayed's finance stack is **strongly ledger-oriented**, but it is not a perfectly single-source financial system yet.

The current architecture is best described as:
- `Payment` = collection lifecycle source of truth
- `LedgerEntry` = canonical internal accounting source of truth
- `JournalEntry` = accounting posting audit source of truth
- `PractitionerWallet` / `CustomerWallet` = derived or operational projections/subledgers
- `SettlementBatch` / `PractitionerSettlement` / `PackageSettlement` = payout orchestration records

That is a workable structure, and the important part is that the core session-payment flow is already consistent for at least one real coupon payment path that was validated in Phase 15G. But the system still has **multiple authoritative records** across payment, ledger, journal, wallet, and settlement layers. Those layers are intended to work together, not compete, but they increase reconciliation and drift risk.

Bottom line:
- The system is **much closer** to production-grade accounting than a typical app.
- The core posting path is **ledger-driven** and idempotent.
- The wallet and settlement layers are **not** the source of truth.
- The architecture still needs stronger reconciliation controls and clearer centralization before it should be treated as fully production-safe for finance without caveats.

## Current Money Lifecycle Overview

### Session payment lifecycle
1. Patient initiates a payment for a session.
2. `Payments` resolves the payment context and persists `Payment` snapshots.
3. Financial rules compute coupon/commission breakdown before provider checkout.
4. Payment gateway collects money.
5. On capture success, `mark-payment-succeeded` posts internal accounting.
6. `LedgerEntry` rows are created for practitioner earning and platform commission.
7. `JournalEntry` is posted for double-entry accounting.
8. Practitioner wallet is refreshed from ledger aggregates.
9. Settlement generation later selects eligible earning entries by currency and period.
10. Settlement payout records move the settlement forward and write payout ledger entries.

### Refund lifecycle
1. Refund is requested or triggered by policy/cancellation.
2. `Refund` record is created and payment status moves to refund-pending / refunded states.
3. Refund ledger reversals are posted after successful refund processing.
4. Practitioner wallet is refreshed again from ledger.
5. Journal entry is posted for the refund event.

### Package lifecycle
1. Package purchase is paid.
2. Package settlement is created as a hold/release structure.
3. As sessions are completed, package settlement becomes releasable.
4. Release generates payout-oriented workflow records and ledger updates.

### Customer wallet lifecycle
1. Wallet reserve may be created at payment initiation.
2. Reserve is captured on successful payment or released on failure/expiry/cancellation.
3. Wallet summary is derived from customer-wallet entries and reservations.

## Database Financial Model Inventory

| Model | Purpose | Source-of-truth role | Money fields / currency | Key risks |
|---|---|---|---|---|
| `Payment` | Gateway/payment lifecycle record | Collection source of truth | `amountSubtotal`, `amountDiscount`, `amountTotal`, `amountFromWallet`, `amountFromGateway`, `currencyCode`, coupon/commission snapshots | Multiple snapshots must stay in sync with downstream posting |
| `PaymentEvent` | Payment event/audit trail | Audit/event source of truth | Event payloads, timestamps | Can accumulate many terminal retries if event handling regresses |
| `Refund` | Refund lifecycle record | Refund source of truth | `amount`, `currencyCode`, destination, status | Refund reversal logic must stay idempotent |
| `LedgerEntry` | Internal accounting entries | **Canonical accounting source of truth** | `amount`, `currencyCode`, entry type, direction, bucket, references | Must remain the master for balances and settlement eligibility |
| `JournalEntry` | Double-entry accounting journal | Journal audit source of truth | `currencyCode`, lines, sourceType/sourceId | Must remain balanced and idempotent |
| `PractitionerWallet` | Practitioner balance projection | Derived projection | `availableBalance`, `pendingBalance`, `reservedBalance`, `lifetimeEarned`, `lifetimePaidOut`, `currencyCode` | Can drift if refresh/reconciliation fails |
| `SettlementBatch` | Periodic settlement orchestration | Workflow source for payout batches | batch currency, period, totals | Must stay currency-scoped |
| `PractitionerSettlement` | Practitioner-level settlement row | Workflow / derived from ledger | `amountGross`, `amountAdjustments`, `amountNet`, `amountPaidTotal`, `currencyCode` | Must not become an independent balance engine |
| `PractitionerSettlementPayout` | Payout history record | Operational payout truth | payout amount, fees, method, source, currency | Important for audit, not balance truth |
| `PractitionerManualPayout` | Exception payout history | Operational payout truth | payment method, amount, currency | Manual path is a reconciliation risk |
| `CustomerWallet` | Patient wallet summary | Operational customer-wallet projection | `availableBalance`, `reservedBalance`, `currencyCode` | Separate subledger can drift from master ledger if not reconciled |
| `CustomerWalletEntry` | Customer wallet subledger entries | Subledger truth for customer wallet | amount, direction, currency | This is a second accounting surface, not the master accounting ledger |
| `CustomerWalletReservation` | Reservation state for wallet-funded payments | Reservation source of truth | amount, currency, status | Must remain idempotent across retry/capture/release |
| `CommissionRule` | Commission policy | Policy source of truth | platform/practitioner rates, currency/market scoping | Snapshots must be preserved on payment |
| `Coupon` | Discount policy | Policy source of truth | discount, usage limits, status, scope, owner, share percents | Ownership and usage checks must stay transactional |
| `CouponRedemption` | Redemption audit/usage record | Usage audit source of truth | discount amount, split shares, session/payment IDs, currency | Unique constraint and idempotency are critical |
| `PatientPackagePurchase` | Package commercial record | Purchase source of truth | selected price snapshots, discount snapshot, currency snapshots | Package economics are separate from session coupons |
| `PackageSettlement` | Package payout hold/release state | Workflow source of truth | held/releasable/released amounts, currency | Different lifecycle from direct session settlements |
| `AcademyEnrollment` | Course enrollment commercial state | Course payment state | payment relation, payment status, currency via payment | Financially relevant but not part of practitioner earnings |

### Currency support assessment
The schema is currency-aware in the core places that matter:
- `Payment.currencyCode`
- `LedgerEntry.currencyCode`
- `PractitionerWallet.currencyCode`
- `SettlementBatch.currencyCode`
- `PractitionerSettlement.currencyCode`
- `Refund.currencyCode`
- `CouponRedemption.currencyCode`
- package purchase / package settlement currency snapshots

This is good. The main constraint is that **every aggregation must stay currency-scoped**. There is no FX engine visible in the current architecture, so mixed-currency aggregation must remain forbidden.

## Source-of-Truth Classification

### Canonical layers
- `LedgerEntry` is the canonical internal accounting source for practitioner earnings, platform commission, settlement eligibility, and reversal entries.
- `JournalEntry` is the canonical double-entry accounting audit record.
- `Payment` is the canonical collection record for the payment gateway lifecycle.
- `Refund` is the canonical refund lifecycle record.

### Derived / projection layers
- `PractitionerWallet` is a read/projection layer built from ledger aggregates.
- `CustomerWallet` is an operational subledger/projection for patient wallet funds.
- `SettlementBatch` and `PractitionerSettlement` are workflow records derived from eligible ledger entries.
- `PackageSettlement` is a package-specific workflow record.

### Policy layers
- `CommissionRule` and `Coupon` are policy sources, not money balances.

### Audit layers
- `PaymentEvent`, `CouponRedemption`, `PractitionerSettlementPayout`, `JournalEntry` are audit-friendly records and should remain append-only or effectively append-only.

## Session Payment Lifecycle Map

### Text sequence
`Patient checkout -> payment initiation -> financial breakdown resolution -> gateway checkout -> provider webhook/return -> payment capture -> coupon redemption -> ledger posting -> journal posting -> wallet refresh -> settlement generation -> settlement payout -> payout history`

### Backend ownership
- Payment initiation:
  - [`initiate-session-payment.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.ts)
  - [`calculate-session-financial-breakdown.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/calculate-session-financial-breakdown.service.ts)
  - [`calculate-coupon-discount.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/calculate-coupon-discount.service.ts)
  - [`validate-coupon-eligibility.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/validate-coupon-eligibility.service.ts)
- Payment success:
  - [`mark-payment-succeeded.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/mark-payment-succeeded.use-case.ts)
  - [`redeem-coupon.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/redeem-coupon.service.ts)
  - [`post-payment-ledger-entries.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/post-payment-ledger-entries.use-case.ts)
  - [`accounting-journal-posting.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/services/accounting-journal-posting.service.ts)
  - [`refresh-practitioner-wallet.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/services/refresh-practitioner-wallet.service.ts)
- Payment failure/expiry:
  - [`mark-payment-failed.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/mark-payment-failed.use-case.ts)
  - [`expire-payment.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/expire-payment.use-case.ts)
  - customer wallet reserve/release via [`customer-wallet-accounting.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/customer-wallets/services/customer-wallet-accounting.service.ts)
- Session return reconciliation:
  - [`reconcile-session-payment-return.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/reconcile-session-payment-return.use-case.ts)

### DB writes performed
- `Payment` status / snapshots
- `PaymentEvent` audit events
- `CouponRedemption`
- `LedgerEntry`
- `JournalEntry`
- `PractitionerWallet`
- `SettlementBatch`
- `PractitionerSettlement`
- `PractitionerSettlementPayout`
- customer wallet entries / reservations

### Idempotency behavior
- Payment capture posting is idempotent by payment id.
- Refund posting is idempotent by refund id.
- Coupon redemption is idempotent by coupon/session uniqueness and transactional locking.
- Settlement batch creation is guarded by currency/period uniqueness.
- Payout recording is protected by settlement status checks and uniqueness constraints.

## Gateway vs Internal Accounting

### Current reality
The payment gateway is the money collection layer. It does not own internal accounting. The gateway simply tells us whether money was collected, and the backend turns that into accounting records.

### Internal accounting interpretation
- The gateway collection is recorded in `Payment`.
- Internal accounting is recorded in `LedgerEntry` and `JournalEntry`.
- Practitioner payables are represented by ledger and ledger-account postings.
- Wallets are read models, not cash truth.
- Settlements are payout orchestration records, not the accounting truth itself.

### What the code currently models well
- collected cash
- gateway clearing
- practitioner payable
- platform revenue/commission
- refunds and reversals
- settlement closeout

### What is not explicitly modeled as a distinct balance layer
- a full deferred-revenue / held-funds accounting ledger for every state transition across all product lines
- an FX engine
- a single control tower that reconciles payment, journal, ledger, wallet, and settlement state automatically

## Practitioner Earning Lifecycle

### When earnings become available
On successful payment capture, the practitioner earning is posted to the ledger and becomes available in the practitioner wallet projection immediately.

### When earnings become payable
Practitioner earnings become payable when they are picked up by settlement generation and then moved through the settlement/payout workflow.

### When earnings are actually transferred
When settlement payout is recorded and the settlement batch is closed out or manually paid.

### Practical interpretation
There are three distinct states:
1. `earned` on payment capture
2. `eligible for settlement` once the ledger entry is available and unsettled
3. `paid out` once settlement payout is recorded

That distinction is good and should be preserved.

## Wallet Architecture Assessment

### Practitioner wallet
`PractitionerWallet` is explicitly built as a projection. This is a good design choice. The implementation refreshes it by aggregating ledger entries:
- [`refresh-practitioner-wallet.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/services/refresh-practitioner-wallet.service.ts)

The wallet includes:
- available
- pending
- reserved
- lifetime earned
- lifetime paid out
- last ledger entry time

### Customer wallet
The customer wallet is more operational and uses its own entry/reservation tables:
- [`customer-wallet-accounting.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/customer-wallets/services/customer-wallet-accounting.service.ts)

That means the customer wallet is not the master accounting ledger either. It is a customer-facing subledger and reservation engine.

### Can wallets drift?
Yes, if refresh / reconciliation is missed or if a direct write bypasses the intended accounting path.

### Recommended wallet stance
- Practitioner wallet should remain a derived projection from ledger.
- Customer wallet should remain a subledger with strict entry/reservation consistency.
- Neither should be used as the master accounting truth.

### Reconciliation needs
- ledger -> practitioner wallet
- customer wallet entries -> customer wallet summary
- settlement entries -> payout records
- refund reversals -> both ledger and journal

## Settlement / Payout Architecture Assessment

### Settlement generation
Settlement batches are generated by period and currency:
- [`generate-settlement-batch.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/generate-settlement-batch.use-case.ts)

It:
- finds eligible ledger entries
- groups by practitioner
- creates a settlement batch per currency/period
- assigns ledger entries to settlement rows

### Settlement closeout / payout recording
The payout path is handled by:
- [`record-settlement-payout.service.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/services/record-settlement-payout.service.ts)
- [`mark-settlement-paid.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/mark-settlement-paid.use-case.ts)

This writes:
- payout history
- settlement status
- settlement payout ledger entries
- wallet refresh
- journal posting

### Settlement failure handling
The failure path releases settlement entries back to available and refreshes the wallet:
- [`mark-settlement-failed.use-case.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/mark-settlement-failed.use-case.ts)

### Is settlement ledger-driven?
Mostly yes.

The good part:
- eligible settlement entries are selected from ledger entries
- payout entries are posted back to ledger
- wallet refresh is ledger-based

The gap:
- operational settlement and payout records still exist as separate workflow tables
- manual payout exceptions are still a real operational path
- there is no explicit always-on reconciliation job in the evidence reviewed that proves ledger, wallet, payout, and journal always remain in sync

## Multi-Currency Assessment

### Current support
The architecture is currency-aware in the key financial records:
- payment
- refund
- ledger
- wallet
- settlement
- coupon redemption
- package settlement

### What is good
- wallets are keyed by practitioner + currency
- settlements are generated per currency
- payment snapshots include currency context
- coupon redemption stores currency
- journal entries store currency

### What is still risky
- no exchange-rate engine was found
- amounts are stored as decimals with 2 places, which is fine for EGP/USD but still needs policy discipline
- cross-currency aggregation must never happen silently
- reporting UIs need to stay currency-scoped

### Recommended rule set
- never aggregate different currencies
- settlement batch per currency
- wallet balance per practitioner per currency
- ledger entries always include currency
- no implicit FX unless modeled explicitly

## Refund / Cancellation Accounting

### Current refund map
Refund handling is multi-step:
- `RequestPaymentRefundUseCase`
- `ApplySessionCancellationFinancialEffectsService`
- `PostRefundLedgerEntriesUseCase`

### What happens on refund
- refund record is created / updated
- payment status moves through refund states
- customer wallet is credited if destination is wallet
- refund reversal ledger entries are posted
- journal entry is posted for the refund
- practitioner wallet is refreshed

### Reversal logic observed
`PostRefundLedgerEntriesUseCase` writes:
- `REFUND_PRACTITIONER_REVERSAL`
- `REFUND_PLATFORM_REVERSAL`

This is the right pattern.

### Important accounting caveat
Refund reversals are tied to payment/refund identity and are idempotent. That is good.

However, refunding after payout/settlement requires careful reconciliation, because the reversal path and the payout path are separate workflow layers. The architecture can handle it, but the operational controls need to remain strict.

### Coupon interaction with refunds
Coupon redemptions remain historical audit records. They are not deleted.

That is correct.

## Package Accounting

Package accounting is a separate lifecycle and it should stay separate.

### What exists
- package purchase payment
- package settlement hold/release
- session usage counters
- package payout/release workflows

### What the architecture suggests
- package money is held and released over time
- package settlement is currency-aware
- package settlement also refreshes practitioner wallet

### What is good
- package settlement is not pretending to be the same as direct-session settlement
- package settlement is a dedicated lifecycle

### What remains risky
- package flows are more complex than direct sessions
- they require separate reconciliation checks
- package coupon support is intentionally out of scope and should stay out of scope for now

## Coupon / Commission Accounting Interaction

### What is currently strong
- coupon validation is policy-based and session-owned
- coupon redemption occurs after payment success
- payment snapshot stores coupon identity and split snapshots
- coupon redemption stores discount and split details

### What the accounting layer does with coupon economics
The accounting posting path consumes the resolved payment breakdown and posts:
- practitioner earning
- platform commission

The coupon split is preserved in payment snapshots and coupon redemption records, which is useful for audit and reporting.

### Important note
The current internal ledger/journal posting does **not** appear to post separate standalone coupon-discount-share ledger entries. Instead, coupon economics are reflected in the resolved payment amount and preserved in snapshots and redemptions.

That is acceptable if the business treats coupon split as a pricing/revenue-sharing annotation layered on top of the payment breakdown.

It becomes a gap if finance wants coupon share to be a first-class ledger flow on its own.

### Evidence from a real coupon payment
Sample validated payment:
- Payment id: `0d2fddaf-f737-41a2-8f91-39182683af07`
- Coupon code snapshot: `E2E10`
- Gross amount: `420`
- Discount: `42`
- Patient paid: `378`
- Coupon platform share snapshot: `21`
- Coupon practitioner share snapshot: `21`
- Practitioner earning ledger: `283.50`
- Platform commission ledger: `94.50`
- Journal entry balanced on `378`

This proves the current flow is internally consistent for the net-payment path.

## Accounting Calculation Inventory

The codebase has several places where money is calculated or re-derived.

### Core calculation points
- `calculate-session-financial-breakdown.service.ts`
  - computes gross, discount, net, commission, and snapshots
- `calculate-coupon-discount.service.ts`
  - computes coupon discount and split shares
- `validate-coupon-eligibility.service.ts`
  - validates policy, scope, ownership, limits
- `extract-payment-ledger-breakdown.service.ts`
  - extracts posting amounts from payment metadata / snapshots
- `post-payment-ledger-entries.use-case.ts`
  - turns payment breakdown into ledger entries
- `accounting-journal-posting.service.ts`
  - turns payment/refund/payout snapshots into journal lines
- `refresh-practitioner-wallet.service.ts`
  - rebuilds wallet projection from ledger aggregates
- `generate-settlement-batch.use-case.ts`
  - groups eligible ledger entries by practitioner and currency
- `record-settlement-payout.service.ts`
  - computes payout applied amount and fee treatment
- `package-settlement.service.ts`
  - computes package settlement hold/release states
- `customer-wallet-accounting.service.ts`
  - computes reserve/capture/release wallet flows
- `request-payment-refund.use-case.ts`
  - computes refund amount and lifecycle
- `apply-session-cancellation-financial-effects.service.ts`
  - computes cancellation refund amount and customer wallet effects

### Duplicate-logic risk
These are not necessarily bugs, but they are duplicated accounting boundaries.

The biggest risks are:
- changing one calculation path and forgetting its sibling path
- slight rounding differences between breakdown, journal, and ledger
- wallet projection assumptions diverging from settlement assumptions
- cancellation/refund math diverging from refund-request math

### Best centralization candidate
The most appropriate central policy location is:
- financial rules for coupon/commission resolution
- accounting posting service for ledger/journal posting
- a dedicated reconciliation service for post-write consistency checks

## Duplicated Logic Risks

### High-risk duplication
- coupon discount calculation vs payment breakdown extraction
- payment breakdown vs journal posting
- wallet projection refresh vs settlement generation
- refund amount computation in refund request vs cancellation financial effects
- package settlement release logic vs wallet refresh / ledger posting

### Why it matters
Even if each flow is individually correct, finance is sensitive to small drift:
- one rounding difference can create reconciliation noise
- one missed idempotency key can double-count earnings
- one currency fallback can break aggregate reports

### Recommendation
The system needs a stronger “one posting policy” mental model:
- resolve financial facts once
- snapshot them on `Payment`
- consume the same snapshots everywhere else
- reconcile projection tables against the ledger

## Financial Invariants

### Invariants that are clearly enforced or strongly supported
1. Every financial record must carry currency.
2. Coupon redemption happens only after successful payment.
3. Ledger posting is idempotent by payment id.
4. Refund ledger posting is idempotent by refund id.
5. Settlement batches are currency/period scoped.
6. Settlement entries cannot be paid twice without status checks.
7. Wallet projections are rebuilt from ledger aggregates.
8. Coupon redemption uniqueness exists at session level.
9. Duplicate payment webhooks do not recreate payment ledger entries.
10. Refund reversals write both practitioner and platform reversal entries.

### Invariants that are only partially enforced or still need stronger control
1. One single global source of truth for all money-related views.
2. Automatic reconciliation between payment, ledger, journal, wallet, and settlement.
3. Explicit cross-currency aggregation prevention in all reporting surfaces.
4. Refund after settlement with full automatic balancing in every path.
5. Package settlement and direct session settlement reconciliation in one control loop.
6. Clear treatment of manual payout exceptions relative to ledger truth.
7. FX / exchange-rate policy, if future business needs it.

### Recommended tests
- ledger vs wallet projection reconciliation tests
- payment capture idempotency tests
- refund after settlement tests
- cross-currency settlement tests
- package settlement release tests
- cancellation/refund parity tests
- payout retry tests

## Existing Test Coverage

I reviewed the existing spec inventory rather than rerunning the entire suite in this discovery pass.

### Strong existing coverage areas
- payment initiation / capture / failure / expiry
- provider webhooks
- refund request / retry / reversal ledger posting
- coupon validation / coupon redemption / practitioner coupon management
- settlement generation / settlement payment / settlement failure
- practitioner wallet refresh
- package settlement
- accounting journal posting
- financial operations access controllers
- customer wallet reserve/capture/release
- commission rule validation

### Representative test files
- [`post-payment-ledger-entries.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/post-payment-ledger-entries.use-case.spec.ts)
- [`post-refund-ledger-entries.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/post-refund-ledger-entries.use-case.spec.ts)
- [`record-settlement-payout.service.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/services/record-settlement-payout.service.spec.ts)
- [`refresh-practitioner-wallet.service.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/services/refresh-practitioner-wallet.service.spec.ts)
- [`package-settlement.service.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/services/package-settlement.service.spec.ts)
- [`calculate-coupon-discount.service.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/calculate-coupon-discount.service.spec.ts)
- [`validate-coupon-eligibility.service.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/validate-coupon-eligibility.service.spec.ts)
- [`redeem-coupon.service.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/redeem-coupon.service.spec.ts)
- [`initiate-session-payment.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.spec.ts)
- [`mark-payment-succeeded.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/mark-payment-succeeded.use-case.spec.ts)
- [`reconcile-session-payment-return.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/reconcile-session-payment-return.use-case.spec.ts)
- [`request-payment-refund.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/request-payment-refund.use-case.spec.ts)
- [`mark-payment-failed.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/mark-payment-failed.use-case.spec.ts)
- [`expire-payment.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/expire-payment.use-case.spec.ts)
- [`admin-settlements.controller.access.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/controllers/admin-settlements.controller.access.spec.ts)
- [`admin-accounting.controller.access.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/controllers/admin-accounting.controller.access.spec.ts)
- [`list-settlement-batches.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/list-settlement-batches.use-case.spec.ts)
- [`list-practitioner-settlements.use-case.spec.ts`](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-operations/use-cases/list-practitioner-settlements.use-case.spec.ts)

### Gaps in coverage
- one unified end-to-end accounting reconciliation test across payment, ledger, journal, wallet, and settlement for multiple currencies
- more explicit refund-after-settlement scenarios
- stronger cross-currency negative tests for report aggregation
- a reconciliation job test proving no drift between projection tables and ledger

## Frontend / Mobile Display Assessment

### Web frontend
The web frontend is mostly a **display and orchestration layer** for finance:
- admin payments, settlements, payouts, and revenue reports read backend records
- practitioner wallet and settlement pages read backend summaries
- patient checkout reads backend financial breakdowns
- coupon UX reads backend validation results and breakdowns

Relevant screens:
- [`PaySessionPanel.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/payments/components/PaySessionPanel.tsx)
- [`AdminPaymentsRevenueReportScreen.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/admin/reports/components/AdminPaymentsRevenueReportScreen.tsx)
- [`AdminPayoutsReportScreen.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/admin/reports/components/AdminPayoutsReportScreen.tsx)
- [`PractitionerWalletSummaryScreen.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/financial-operations/components/PractitionerWalletSummaryScreen.tsx)
- [`PractitionerSettlementsListScreen.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/financial-operations/components/PractitionerSettlementsListScreen.tsx)

### Mobile frontend
The mobile app follows the same pattern:
- patient payment checkout uses backend financial breakdown
- practitioner finance screens show wallet and settlements from backend
- promo-code management is a UI wrapper over backend coupon APIs

Relevant screens:
- [`app/(patient)/sessions/[id]/pay.tsx`](D:/Web/full-projects/fayed/fayed-mobile/app/(patient)/sessions/[id]/pay.tsx)
- [`app/(practitioner)/finance/index.tsx`](D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/finance/index.tsx)
- [`app/(practitioner)/finance/wallet.tsx`](D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/finance/wallet.tsx)
- [`app/(practitioner)/finance/settlements.tsx`](D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/finance/settlements.tsx)
- [`src/features/practitioner/promo-codes/components/PractitionerPromoCodesScreen.tsx`](D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/components/PractitionerPromoCodesScreen.tsx)

### Display risk map
- UI generally does not compute financial truth on its own.
- UI does format and summarize money values.
- UI must continue to avoid any client-side trust in discount or commission math.
- Currency fallback behavior needs caution; EGP/USD separation must remain explicit.

## Observed Sample Evidence

Phase 15G validated a real coupon payment path end-to-end.

Sample values:
- gross: `420.00`
- coupon discount: `42.00`
- patient paid: `378.00`
- coupon platform share snapshot: `21.00`
- coupon practitioner share snapshot: `21.00`
- practitioner earning ledger: `283.50`
- platform commission ledger: `94.50`
- journal balanced on `378.00`

This is a strong sign that the current payment/posting path is internally consistent on the sampled route.

What it does **not** prove:
- every refund/cancellation permutation
- every settlement/payout edge case
- every package lifecycle path
- multi-currency reconciliation under stress

## Target Architecture Recommendation

The target architecture should be:

1. `FinancialRulesService`
   - owns commission and coupon policy resolution
   - resolves financial breakdown once
   - writes snapshots on `Payment`

2. `AccountingPostingService`
   - owns ledger and journal posting
   - consumes payment snapshots only
   - is idempotent by source id

3. `LedgerEntry`
   - remains the canonical internal accounting truth
   - records all earnings, commissions, reversals, and payout movements

4. `WalletProjectionService`
   - rebuilds practitioner wallet from ledger
   - rebuilds customer wallet from its own subledger entries

5. `SettlementService`
   - reads eligible ledger entries
   - creates currency-scoped settlement batches
   - closes out payout records

6. `RefundService`
   - posts reversal ledger entries
   - keeps refund lifecycle and cash refund separate from balance effects

7. `ReconciliationService`
   - compares payment, ledger, journal, wallet, settlement, and payout states
   - flags drift
   - becomes the finance control tower

8. `MultiCurrencyPolicy`
   - explicitly forbids cross-currency aggregation
   - keeps all reports and balance views currency-scoped

## Risks

### Critical
- No explicit finance reconciliation control tower was identified that continuously proves payment, ledger, journal, wallet, and settlement parity across all flows.

### High
- Accounting calculations are spread across several services.
- Customer wallet is a separate subledger and can drift if not reconciled.
- Settlement and payout remain workflow records in addition to ledger truth.
- Package settlement and refund handling are more complex than direct sessions and deserve separate hardening.

### Medium
- No FX engine is present.
- Some UI screens may need stronger currency explanation.
- Manual payout exceptions add operational complexity.
- Cross-currency aggregation relies on policy discipline rather than a dedicated technical guardrail everywhere.

### Low
- The codebase has many finance screens and reports, so it is easy for product labels to blur accounting semantics if copy is not kept sharp.

## Proposed Implementation Phases

### Phase 16B - Backend accounting source-of-truth fixes
- centralize posting and balance derivation rules
- tighten canonical ledger/journal contracts
- add stronger reconciliation checks

### Phase 16C - Multi-currency wallet / settlement hardening
- enforce currency-scoped aggregation everywhere
- add explicit mixed-currency rejection tests

### Phase 16D - Refund / cancellation accounting validation
- harden refund-after-settlement paths
- verify reversals across payment, ledger, wallet, and settlement

### Phase 16E - Frontend / mobile finance display cleanup
- ensure UI labels match accounting semantics
- reduce user confusion between wallet, settlement, payout, and ledger

### Phase 16F - Financial reconciliation and QA
- build automated reconciliation dashboards / jobs
- add end-to-end finance smoke and regression tests

## Final Answers

### What is the current financial source of truth?
`LedgerEntry` is the canonical internal accounting source of truth. `Payment` is the source of truth for collection state, and `JournalEntry` is the source of truth for posting audit. Wallet and settlement tables are projections/workflow records.

### Is it consistently used?
Mostly yes, especially for the session payment flow, but not perfectly unified across the whole stack. Multiple calculation and projection layers still exist.

### Where does money go internally after payment success?
Gateway collection is recorded in `Payment`, internal accounting posts to `LedgerEntry`, the journal posts the double-entry record, practitioner wallet is refreshed, and settlement later moves eligible earnings to payout.

### When does practitioner earning become payable?
Practitioner earning becomes available at payment capture, becomes settlement-eligible when the ledger entry exists, and becomes actually paid when settlement payout is recorded.

### Are wallet balances trustworthy?
Yes as projections, not as master truth. They are trustworthy only if refresh/reconciliation stays healthy.

### Is EGP/USD separated correctly?
Mostly yes. The schema is currency-aware in the core financial records and settlement batches are currency-scoped. The remaining risk is policy discipline around aggregation and the lack of FX modeling.

### Is settlement/payout fully automated and ledger-driven?
It is ledger-driven and partly automated, but not fully automated in the sense of an end-to-end control tower. Manual payout and exception handling still exist.

### Are there multiple competing accounting sources?
Yes, there are multiple authoritative layers: payment, ledger, journal, wallet projections, settlements, and customer-wallet subledger records. They are intended to cooperate, but they must be reconciled.

### Is the system ready for real financial production accounting?
**Not yet fully.** It is strong and close, but the architecture still needs reconciliation hardening, stricter centralization of calculations, and more multi-path finance validation before it should be treated as fully production-safe for accounting without caveats.

