# Phase 2 Audit Report — Payments / Wallet / Refunds / Settlements / Ledger

**Phase:** 2
**Scope:** Payments, Wallet, Refunds, Financial Rules, Settlements, Practitioner Payouts, Admin Finance Operations
**Started:** 2026-06-16
**Status:** Complete
**Auditor:** Claude Code (AI-assisted audit)

---

## Executive Summary

Phase 2 audited the financial side of the Fayed platform across backend, web, and mobile. The financial infrastructure is well-structured: payment amounts are backend-computed, duplicate payments are blocked, wallet transactions use Prisma Decimal with string-serialized amounts, settlements are derived from ledger entries, and dangerous admin actions have varying levels of protection.

Four findings were registered: one P1 and three P2. The P1 finding — frontend-computed refund amount with no maximum cap in the admin refund panel — is the most significant risk, as it allows an admin to submit a refund amount exceeding the actual payment without frontend guardrails. The P2 findings are currency hardcoding, missing confirmation dialogs for financial mutations, and missing i18n keys.

---

## Modules Audited

| Module | Location | Risk Tier |
|--------|----------|-----------|
| Payments | `fayed-backend-v1/src/modules/payments/` | P0 |
| Payment Gateway Control | `fayed-backend-v1/src/modules/payment-gateway-control/` | P0 |
| Customer Wallets | `fayed-backend-v1/src/modules/customer-wallets/` | P0 |
| Refund Policies | `fayed-backend-v1/src/modules/refund-policies/` | P0 |
| Financial Rules | `fayed-backend-v1/src/modules/financial-rules/` | P1 |
| Financial Operations | `fayed-backend-v1/src/modules/financial-operations/` | P0 |
| Package Plans | `fayed-backend-v1/src/modules/package-plans/` | P1 |
| Practitioners | `fayed-backend-v1/src/modules/practitioners/` | P1 |
| Patient Web Payments | `fayed-frontend-v1/src/features/payments/` | P1 |
| Patient Web Wallet | `fayed-frontend-v1/src/features/payments/` | P1 |
| Practitioner Finance | `fayed-frontend-v1/src/features/financial-operations/` | P1 |
| Admin Payments | `fayed-frontend-v1/src/features/admin/payments/` | P0 |
| Admin Settlements | `fayed-frontend-v1/src/features/admin/settlements/` | P0 |
| Admin Practitioner Payouts | `fayed-frontend-v1/src/features/admin/practitioner-payouts/` | P0 |
| Admin Finance Operations | `fayed-frontend-v1/src/features/admin/finance-operations/` | P1 |
| Admin Accounting | `fayed-frontend-v1/src/features/admin/accounting/` | P1 |
| Admin Accounting Reconciliation | `fayed-frontend-v1/src/features/admin/accounting-reconciliation/` | P1 |
| Admin Refund Policies | `fayed-frontend-v1/src/features/admin/refund-policies/` | P1 |
| Admin Package Settlements | `fayed-frontend-v1/src/features/admin/package-settlements/` | P1 |
| Mobile Payments | `fayed-mobile/app/(patient)/payments/` | P1 |
| Mobile Wallet | `fayed-mobile/src/features/patient/payments/` | P1 |

---

## Backend Payment Contract Summary

### Payment Initiation

The `InitiateSessionPaymentUseCase` is the single entry point for session payments. Key properties:

- **No amount from frontend.** `InitiateSessionPaymentDto` accepts `acceptedRefundPolicyId`, `couponCode`, `useWalletBalance`, `returnUrl` — but no amount or currency. These are resolved server-side.
- **Amount computed by backend.** `ResolveSessionPaymentPricingService` delegates to `CalculateSessionFinancialBreakdownService` (financial-rules module), which applies commission rules, coupon discounts, VAT, and gateway fees.
- **Duplicate payment guard.** Two checks: `findSuccessfulBySessionId` (blocks if `CAPTURED` payment exists) and `findLatestActiveBySessionId` (reuses existing active payment). Both within a database transaction.
- **`PaymentPurpose.SESSION_INSTANT_BOOKING`** exists in the enum (prisma schema line 320) and is applied when `session.flowType === 'INSTANT'`.

### Payment Status

10-status enum: `CREATED`, `PENDING`, `REQUIRES_ACTION`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`.

Explicit transition allowlist in `ValidatePaymentStatusTransitionService` — invalid transitions throw `ConflictException`.

### Webhook Idempotency

Both `HandlePaymobWebhookUseCase` and `HandleStripeWebhookUseCase` check `findEventByProviderEventRef` before processing. Provider event references are recorded after each handling, so replayed webhooks are safely deduplicated.

### Provider Abstraction

`PaymentProviderAdapter` interface with two implementations: `PaymobPaymentProviderAdapter` and `StripePaymentProviderAdapter`. Selected at runtime via `PaymentProviderResolverService`. Currency routing: EGP → Paymob, USD → Stripe. No hard sandbox/live blocker — test/live mode is recorded as metadata for audit purposes.

### Currency Handling

Supported: `EGP` and `USD` only (from `payment-region.resolver.ts:21`). Currency is resolved per-session from practitioner/patient country and stored on the payment record. Never assumed.

---

## Wallet / Refund / Financial Rules Summary

### Wallet

Four-balance model: `availableBalance`, `reservedBalance`, `lifetimeCredited`, `lifetimeDebited`. `reservedBalance` holds funds for in-progress payments pre-capture. `CustomerWalletEntryType` enum covers all transaction categories. Idempotent refund credit via `findRefundCreditEntry` guard. Decimal precision: `@db.Decimal(18, 2)` throughout; amounts serialized as strings in DTOs.

**Minor risk:** `Math.round(Number(amount) * 100)` in `request-payment-refund.use-case.ts:548` for minor-unit conversion — floating-point risk before rounding.

### Refunds

Eligibility gate: only `CAPTURED`, `PARTIALLY_REFUNDED`, `REFUND_PENDING` payments are refundable. Refund amount is backend-computed: `paymentTotal - alreadyRefunded`. Both partial and full refunds supported. Cancellation refunds are policy-driven: `EvaluateSessionCancellationPolicyService` applies the matching time-based rule's refund percent.

**NO automatic refund on NO_SHOW.** `CreateAdminSessionManualDecisionUseCase` requires `confirmNoAutomaticRefund: true`. No financial action is triggered by any manual decision type.

### Financial Rules

Three rule types: Commission Rules (platform/practitioner revenue split), Coupon Rules (discounts), Cancellation Policy Rules (refund percentages). Commission rates stored as `@db.Decimal(5, 2)` — only 2 decimal places, which may cause rounding for rates requiring more precision.

---

## Settlements / Ledger / Practitioner Finance Summary

### Ledger

`LedgerEntry` table is the canonical financial record. `PractitionerWallet` is a projection rebuilt from ledger aggregates on every update — it can never drift out of sync. Entry types: `PRACTITIONER_EARNING`, `PLATFORM_COMMISSION`, `SETTLEMENT_PAYOUT`, `REFUND_PRACTITIONER_REVERSAL`, `REFUND_PLATFORM_REVERSAL`.

**NO_SHOW does not reverse earnings.** If a completed session is later marked NO_SHOW, the `PRACTITIONER_EARNING` ledger entry remains. No automated reversal exists.

### Settlements

Settlement batches are admin-triggered (`POST /admin/settlements/generate`), not auto-generated. Batches are currency-specific. Settlement amounts are a pure sum of underlying ledger entries — no independent calculation. Dangerous actions (`mark-paid`, `mark-failed`, `generate`) use `RequireStepUp` (MFA). **Manual payout recording (`POST /admin/practitioner-payouts`) has NO step-up requirement.**

### Package Settlements

Separate model from session settlements. Lifecycle: `HELD → READY_TO_RELEASE → RELEASED` (or `NEEDS_REVIEW`). Practitioner share is reduced by 50% of the package discount. Release requires MFA.

---

## Patient Web Findings

Payment history, wallet, payment return, session detail payment section, and checkout were all audited. Key findings:

- Payment statuses fully translated via i18n (`history.status.CAPTURED`, etc.)
- Wallet available and reserved balances shown separately with explicit currency
- Payment return panel polls session endpoint until confirmed — correct pattern
- `formatPatientMoney` / `formatFinanceMoney` use `Intl.NumberFormat` with explicit currency — safe
- Amounts come from backend throughout — no frontend computation

**Minor gaps (P3):** No support CTA on failed/pending payment rows. Wallet entries carry `paymentId`/`refundId` but no explicit cross-link to payment history. `sessionPaymentCurrency` null causes plain amount fallback without currency symbol.

---

## Practitioner Web Findings

Practitioner wallet, ledger, and settlements screens audited. All amounts from backend, all labels translated, all currencies explicit per row. No payout actions exposed in the UI. No raw enum display. `practitioner-finance` i18n namespace covers all financial labels in both EN and AR.

**Minor gaps (P3):** Two Arabic i18n keys contain raw mojibake (`??????? ???????`) placeholder text (`summary.details.timezoneLabel`, `summary.timezoneLabel`). Ledger has no running balance column (by design, out of scope).

---

## Admin Finance Findings

The most significant findings. Dangerous financial mutations are inconsistently protected:

**Critical (P1):** `AdminPaymentOpsScreen` — refund amount is a free-text input with no frontend maximum cap. Admin can type any positive number. Backend validates, but the frontend provides no guardrail. Also no confirmation dialog and no MFA/step-up before the refund mutation.

**Critical (P1):** `AdminSettlementDetailScreen` — "Mark Paid" and "Mark Failed" mutations proceed directly on submit with no confirmation dialog and no MFA.

**High (P2):** `AdminSettlementGenerateDrawer` — hardcoded `EGP || USD` currency validation. Would break if a third currency were added.

**High (P2):** `AdminPractitionerPayoutDrawer` — manual payout recording has no MFA/step-up, unlike the batch mark-paid flow.

**Best Practice:** `FinancialReconciliationScreen` correctly uses `stepUp.requestStepUp()` wrapper for reconciliation runs. `AdminPackageSettlementReleaseModal` has a proper `ConfirmModal`. `AdminPractitionerPayoutDrawer` validates entered amount against backend-fetched balance (`amountTooHigh` check).

**P2:** `AdminPaymentOpsScreen` filter dropdown shows raw payment status enum strings (`REFUND_PENDING`, `PARTIALLY_REFUNDED`) — these are used as i18n keys so they resolve correctly, but the filter options themselves use raw enum values in the code.

**P2:** `AdminRefundPolicyDetailScreen` — direct mutation without MFA for financial rules that control refund behavior.

---

## Mobile Findings

Mobile has a full wallet and payment feature. Payment confirmation uses a 3-stage flow: reconcile mutation → session polling (45s, 3s interval) → auto-navigation on confirmed status. Amounts formatted via `formatMoney()` with explicit currency. All payment statuses translated via i18n.

**P2:** `cancel-preview.tsx` — raw backend values displayed without currency formatting (e.g., `preview.paymentAmountTotal` shown as raw string, not `"1,500 EGP"`).

**P2:** `pendingStill` i18n key referenced in `payment-return.tsx` but missing from `en.json` — would fall back to raw key as displayed text.

**P2:** `addFundsLabel` shown in wallet UI but action is non-functional. Confusing UX.

**P2:** `walletOnlyNote` in `en.json` has a garbled em-dash character (`â€"` instead of `–`).

**P2:** `PackagePurchasePayScreen` does not support wallet — no split payment, no wallet toggle. Users must pay full package amount via gateway only. No i18n note explaining this limitation.

---

## Runtime Checks

**Skipped.** Running the backend, web, and mobile servers simultaneously was not feasible in this audit session. Financial mutation actions (payment, refund, payout) were explicitly forbidden. Without running servers, runtime verification of payment status rendering, wallet balance display, and session unlock timing could not be performed.

This is documented as a limitation in `phase-2-evidence-index.md`.

---

## Open Questions

See `phase-2-open-questions.md` for full list. Key questions carried forward from Phase 1:

- **Q-013:** Admin manual decision flow end-to-end — what are the financial side effects when a session is marked NO_SHOW after payment capture? (Partially answered: no automatic refund/payout, but earnings reversal is also absent — this may be intentional or a gap.)
- **Q-005:** `care-experience-intelligence` module scope — not audited in Phase 2. May touch financial surfaces.
- **Q-011:** i18n completeness for all `presentationStatus` values — Phase 9 sweep should also verify payment status i18n coverage.

New from Phase 2:

- **Q-016:** `Math.round(Number(amount) * 100)` minor-unit conversion in refund use case — floating-point risk before rounding. Should use `Prisma.Decimal` throughout.
- **Q-017:** Commission rate stored as `@Decimal(5, 2)` — only 2 decimal places for percentage. Can rates like `12.345%` be stored precisely?
- **Q-018:** NO_SHOW after payment capture does not reverse earnings — is this intentional? If a patient is incorrectly marked NO_SHOW, should the practitioner's earnings be clawed back?
- **Q-019:** `POST /admin/practitioner-payouts` has no step-up requirement — intentional or security gap?
- **Q-020:** Mobile `cancel-preview.tsx` shows raw money values — is this a confirmed issue or is currency shown elsewhere in that screen?

---

## Findings Summary

| ID | Title | Severity |
|----|-------|----------|
| AUDIT-003 | Admin refund panel — free-text amount with no maximum cap | P1 |
| AUDIT-004 | Settlement mark-paid/mark-failed — no confirmation dialog | P1 |
| AUDIT-005 | Hardcoded EGP/USD currency validation in admin settlement generate | P2 |
| AUDIT-006 | Admin manual payout recording — no MFA/step-up | P2 |
| AUDIT-007 | Mobile cancel preview — raw backend values without currency formatting | P2 |
| AUDIT-008 | `pendingStill` i18n key missing from mobile locale file | P2 |

---

## Final Audit Verdict

The Fayed financial infrastructure is structurally sound. Payment amounts are backend-computed, duplicate payments are blocked, webhook idempotency is implemented, wallet uses safe decimal types, and settlements are ledger-derived. The practitioner finance surfaces and patient payment/wallet surfaces are correctly implemented.

The admin finance surfaces have the most significant gaps: refund amount lacks a frontend maximum cap (AUDIT-003), and settlement mutations lack confirmation dialogs (AUDIT-004). These are process-control gaps rather than financial-calculation bugs — the backend presumably validates refund amounts and settlement state — but they represent insufficient guardrails for privileged admin actions.

Mobile financial handling is largely correct, with two specific i18n gaps and one formatting gap.

**Recommended next phase:** Phase 3 — Availability / Scheduled Booking / Instant Booking / Presence. Session booking and availability are the primary value-creation flows and are adjacent to payments. The instant booking request/accept cycle and presence module should be verified before Phase 4 (Auth).