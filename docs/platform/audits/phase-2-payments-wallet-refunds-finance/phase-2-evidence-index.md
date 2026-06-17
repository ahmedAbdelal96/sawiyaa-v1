# Phase 2 Evidence Index — Payments / Wallet / Refunds / Settlements / Ledger

**Phase:** 2
**Created:** 2026-06-16

This index maps every finding to its evidence sources and lists all files inspected during the audit.

---

## Files Inspected (with specific line references)

### Backend — Payments

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/payments/dto/initiate-session-payment.dto.ts` | Full file | No amount/currency from frontend; `acceptedRefundPolicyId` required |
| `fayed-backend-v1/src/modules/payments/dto/reconcile-session-payment-return.dto.ts` | Full file | Return URL reconciliation DTO |
| `fayed-backend-v1/src/modules/payments/types/payments.types.ts` | Full file | `PaymentViewModel`, `RefundViewModel`, `AdminPaymentOpsViewModel` |
| `fayed-backend-v1/src/modules/payments/providers/payment-provider-adapter.interface.ts` | Full file | `PaymentProviderAdapter` contract |
| `fayed-backend-v1/src/modules/payments/providers/paymob-payment-provider.adapter.ts` | Full file | Full Paymob implementation |
| `fayed-backend-v1/src/modules/payments/providers/stripe-payment-provider.adapter.ts` | Full file | Full Stripe implementation |
| `fayed-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.ts` | Full file | Duplicate payment guard (lines 107, 117), `financialBreakdown` stored in `metadataJson` |
| `fayed-backend-v1/src/modules/payments/use-cases/reconcile-session-payment-return.use-case.ts` | Full file | Return URL handling, refetch on return |
| `fayed-backend-v1/src/modules/payments/use-cases/handle-paymob-webhook.use-case.ts` | Full file | Idempotency via `findEventByProviderEventRef` (lines 44–54) |
| `fayed-backend-v1/src/modules/payments/use-cases/handle-stripe-webhook.use-case.ts` | Full file | Idempotency via `findEventByProviderEventRef` (lines 44–54) |
| `fayed-backend-v1/src/modules/payments/use-cases/mark-payment-succeeded.use-case.ts` | Full file | Session unlock, ledger posting, corporate sponsorship |
| `fayed-backend-v1/src/modules/payments/use-cases/request-payment-refund.use-case.ts` | Full file | Refund flow, wallet credit, **line 548: `Math.round(Number(amount) * 100)`** |
| `fayed-backend-v1/src/modules/payments/services/validate-payment-status-transition.service.ts` | Full file | Explicit transition allowlist matrix |
| `fayed-backend-v1/src/modules/payments/services/orchestrate-session-payment-status.service.ts` | Full file | Session confirmation from payment |
| `fayed-backend-v1/src/modules/payment-gateway-control/services/payment-gateway-control.runtime.ts` | Lines 441–488 | `assertCheckoutConfigured` for Paymob/Stripe |
| `fayed-backend-v1/src/modules/payment-gateway-control/services/payment-gateway-control.service.ts` | Full file | Admin CRUD, step-up auth, rollback |
| `fayed-backend-v1/src/common/payments/payment-region.resolver.ts` | Full file | EGP/USD routing, `SUPPORTED_CURRENCY_CODES = Set(['EGP', 'USD'])` |
| `fayed-backend-v1/prisma/schema.prisma` | Lines 317–344 | `PaymentPurpose` (6 values), `PaymentStatus` (11 values) |

### Backend — Wallet / Refunds / Financial Rules

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/customer-wallets/services/customer-wallet-accounting.service.ts` | Full file | `reserveBalance`, `captureReservedBalance`, `releaseReservedBalance`, `creditAvailableBalance`; `toFixed(2)` throughout |
| `fayed-backend-v1/src/modules/customer-wallets/services/validate-refund-eligibility.service.ts` | Full file | `assertPaymentRefundable` (only `CAPTURED`/`PARTIALLY_REFUNDED`/`REFUND_PENDING`), `resolveRefundAmount` |
| `fayed-backend-v1/src/modules/refund-policies/services/refund-policy.service.ts` | Full file | Policy CRUD, `ensureAcceptedRefundPolicyForPayment` (SHA-256 snapshot) |
| `fayed-backend-v1/src/modules/financial-rules/services/calculate-session-financial-breakdown.service.ts` | Full file | Currency resolution at line 34; all amounts as strings |
| `fayed-backend-v1/src/modules/financial-rules/services/resolve-commission-rule.service.ts` | Full file | Priority + specificity sort (lines 45–62); rate validation (lines 73–76) |
| `fayed-backend-v1/src/modules/financial-rules/services/validate-coupon-eligibility.service.ts` | Full file | Coupon validation with usage limits |
| `fayed-backend-v1/src/modules/financial-rules/services/calculate-coupon-discount.service.ts` | Full file | Discount capped at `maxDiscountAmount` AND `grossAmount` |
| `fayed-backend-v1/src/modules/financial-rules/services/money-math.service.ts` | Full file | `roundMoney()` calls `.toDecimalPlaces(2)` |
| `fayed-backend-v1/prisma/schema.prisma` | Lines 2513–2570 | `CustomerWallet` (4 balance fields), `CustomerWalletEntryType`, `CustomerWalletEntry`, `CustomerWalletReservation` |

### Backend — Financial Operations / Settlements

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/financial-operations/use-cases/generate-settlement-batch.use-case.ts` | Full file | Admin-triggered batch; ledger-derived amounts; `balanceBucket` move |
| `fayed-backend-v1/src/modules/financial-operations/use-cases/mark-settlement-paid.use-case.ts` | Full file | Batch payout, transfer fee treatment |
| `fayed-backend-v1/src/modules/financial-operations/services/practitioner-manual-payout.service.ts` | Full file | Manual payout with balance validation |
| `fayed-backend-v1/src/modules/financial-operations/services/refresh-practitioner-wallet.service.ts` | Full file | Wallet rebuilt from ledger aggregates (never drifts) |
| `fayed-backend-v1/src/modules/financial-operations/services/post-payment-ledger-entries.use-case.ts` | Full file | `PRACTITIONER_EARNING` and `PLATFORM_COMMISSION` posting |
| `fayed-backend-v1/src/modules/financial-operations/services/extract-payment-ledger-breakdown.service.ts` | Full file | Reads from `metadataJson.financialBreakdown` |
| `fayed-backend-v1/src/modules/financial-operations/services/package-settlement.service.ts` | Full file | Package settlement lifecycle: HELD → READY_TO_RELEASE → RELEASED |
| `fayed-backend-v1/src/modules/financial-operations/services/calculate-package-session-allocation.service.ts` | Full file | Split-by-position algorithm with rounding adjustment |
| `fayed-backend-v1/src/modules/financial-operations/controllers/admin-settlements.controller.ts` | Full file | All endpoints with guards — `RequireStepUp` on dangerous ops |
| `fayed-backend-v1/src/modules/financial-operations/controllers/admin-practitioner-manual-payouts.controller.ts` | Full file | **No `@RequireStepUp`** on `record-practitioner-payout` (line 143–164) |
| `fayed-backend-v1/src/modules/financial-operations/controllers/admin-package-settlements.controller.ts` | Full file | `release` endpoint requires `ADMIN` + `RequireStepUp` |
| `fayed-backend-v1/src/modules/sessions/use-cases/create-admin-session-manual-decision.use-case.ts` | Full file | Lines 300–324: NO_SHOW → no financial action; requires 3 confirmations |

### Frontend — Patient Payments / Wallet

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/payments/components/PatientPaymentsHistoryPanel.tsx` | Full file | Status via `resolvePaymentStatusKey` i18n; amounts via `formatPatientMoney`; totals aggregation |
| `fayed-frontend-v1/src/features/payments/components/PatientWalletScreen.tsx` | Full file | Available + reserved balance; `WalletActivityRow` with i18n entry types |
| `fayed-frontend-v1/src/features/payments/components/WalletActivityCard.tsx` | Full file | Compact card variant; no raw enum display |
| `fayed-frontend-v1/src/features/payments/components/PaymentReturnPanel.tsx` | Full file | **Polling with `refetchInterval`** (lines 75–87); `CONFIRMED_STATUSES` check |
| `fayed-frontend-v1/src/features/payments/components/PaySessionPanel.tsx` | Full file | Amounts from `useSessionFinancialBreakdown`; currency via `resolvePatientCurrencyCode` |
| `fayed-frontend-v1/src/features/sessions/components/PatientSessionDetailPanel.tsx` | Lines 229–291 | `sessionState.*` labels translated; amounts from backend |
| `fayed-frontend-v1/messages/en/payments.json` | Lines 273–496 | Full payment status translations, provider labels, wallet entry types, session payment states |

### Frontend — Practitioner Finance

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/financial-operations/components/PractitionerWalletSummaryScreen.tsx` | Full file | 5 balance types; `formatMoney` per row; currency chip |
| `fayed-frontend-v1/src/features/financial-operations/components/PractitionerLedgerListScreen.tsx` | Full file | 10 entry types; i18n per type; no running balance |
| `fayed-frontend-v1/src/features/financial-operations/components/PractitionerSettlementsListScreen.tsx` | Full file | Settlement status translations; per-row currency |
| `fayed-frontend-v1/messages/en/practitioner-finance.json` | Full file | Full EN coverage; mojibake in AR (lines 38–40) |

### Frontend — Admin Finance

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/admin/payments/components/AdminPaymentsLookupScreen.tsx` | Full file | Raw enum strings in filter dropdown (lines 50–63) |
| `fayed-frontend-v1/src/features/admin/payments/components/AdminPaymentOpsScreen.tsx` | Full file | **AUDIT-003** lines 349–454: free-text refund amount, no max cap, no MFA |
| `fayed-frontend-v1/src/features/admin/settlements/components/AdminSettlementGenerateDrawer.tsx` | Full file | **AUDIT-005** line 40: hardcoded `EGP \|\| USD` |
| `fayed-frontend-v1/src/features/admin/settlements/components/AdminSettlementDetailScreen.tsx` | Full file | **AUDIT-004** lines 214–243: no confirm dialog for mark-paid/mark-failed |
| `fayed-frontend-v1/src/features/admin/practitioner-payouts/components/AdminPractitionerPayoutDrawer.tsx` | Full file | **AUDIT-006** line 153: no step-up; best practice `amountTooHigh` check (lines 65–91) |
| `fayed-frontend-v1/src/features/admin/practitioner-payouts/components/AdminPractitionerPayoutsListScreen.tsx` | Lines 434–456 | Currency toggle from `availableCurrencies` |
| `fayed-frontend-v1/src/features/admin/finance-operations/components/AdminFinanceOperationsListScreen.tsx` | Full file | Raw refund status enums in filter dropdown |
| `fayed-frontend-v1/src/features/admin/accounting/components/AdminLedgerExplorerScreen.tsx` | Full file | Column header no currency indicator; free-text currency filter |
| `fayed-frontend-v1/src/features/admin/accounting/components/AdminAccountingReconciliationScreen.tsx` | Full file | No confirmation for review status update |
| `fayed-frontend-v1/src/features/admin/accounting-reconciliation/components/FinancialReconciliationScreen.tsx` | Full file | Best practice: `stepUp.requestStepUp()` wrapper (lines 450–472) |
| `fayed-frontend-v1/src/features/admin/refund-policies/components/AdminRefundPolicyDetailScreen.tsx` | Full file | Direct mutation without MFA |
| `fayed-frontend-v1/src/features/admin/package-settlements/components/AdminPackageSettlementReleaseModal.tsx` | Full file | Best practice: `ConfirmModal` with backend amount (lines 42–84) |

### Mobile — Patient Payments / Wallet

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-mobile/app/(patient)/sessions/[id]/payment-return.tsx` | Full file | 3-stage flow; 45s polling; auto-navigation on confirmed status |
| `fayed-mobile/app/(patient)/sessions/[id]/cancel-preview.tsx` | Full file | **AUDIT-007** lines 36–59: raw backend values without `formatMoney()` |
| `fayed-mobile/app/(patient)/payments/transactions.tsx` | Full file | Wallet balance hero; `formatMoney()` on all amounts |
| `fayed-mobile/app/(patient)/package-purchases/index.tsx` | Selected sections | Package purchase status translations |
| `fayed-mobile/src/features/patient/payments/hooks.ts` | Full file | `usePatientWalletSummary`, `usePatientWalletEntries` |
| `fayed-mobile/src/features/patient/payments/pay.tsx` | Full file | `WebBrowser.openAuthSessionAsync`; `formatMoney()` (lines 62–69); split payment |
| `fayed-mobile/src/features/patient/payments/return-utils.ts` | Full file | `normalizePaymentRedirectStatus`, `extractHostedCheckoutReturnParams` |
| `fayed-mobile/src/features/patient/package-plans/components/PackagePurchasePayScreen.tsx` | Selected sections | No wallet support; gateway-only |
| `fayed-mobile/src/i18n/locales/en.json` | Lines 778–1219 | Payment statuses, wallet labels, entry types; **AUDIT-008**: `pendingStill` missing |

---

## Finding Evidence

### AUDIT-003

**File:** `fayed-frontend-v1/src/features/admin/payments/components/AdminPaymentOpsScreen.tsx`
**Lines:** 349–454
**Snippet:**
```tsx
const normalizedAmount = normalizeAmount(amount);
const parsedAmount = Number.parseFloat(normalizedAmount ?? "");
const amountNumber = Number.isNaN(parsedAmount) ? undefined : parsedAmount;
// ...
refundMutation.mutateAsync({ amount: amountNumber })
```
**Description:** Free-text number input with no maximum cap. No `max` attribute driven by remaining refundable balance.

### AUDIT-004

**File:** `fayed-frontend-v1/src/features/admin/settlements/components/AdminSettlementDetailScreen.tsx`
**Lines:** 214–243
**Snippet:**
```tsx
const handleMarkPaid = async () => {
  await markPaidMutation.mutateAsync(settlementsToMark);
};
const handleMarkFailed = async () => {
  await markFailedMutation.mutateAsync(settlementsToMark);
};
```
**Description:** Both mutations proceed directly on form submit without a `ConfirmModal` or MFA step-up.

### AUDIT-005

**File:** `fayed-frontend-v1/src/features/admin/settlements/components/AdminSettlementGenerateDrawer.tsx`
**Lines:** 40
**Snippet:**
```typescript
const isFormValid = ... && (normalizedCurrency === "EGP" || normalizedCurrency === "USD");
```
**Description:** Hardcoded currency validation. Same pattern in three other files.

### AUDIT-006

**File:** `fayed-frontend-v1/src/features/admin/practitioner-payouts/components/AdminPractitionerPayoutDrawer.tsx`
**Lines:** 153
**Snippet:**
```tsx
recordMutation.mutateAsync(...)  // No step-up wrapper
```
**Description:** Manual payout recording has no `stepUp.requestStepUp()` wrapper, unlike `FinancialReconciliationScreen` and `AdminPackageSettlementReleaseModal`.

### AUDIT-007

**File:** `fayed-mobile/app/(patient)/sessions/[id]/cancel-preview.tsx`
**Lines:** 36–59
**Snippet:**
```tsx
const moneyValues = [
  { label: t("patientSessionsFlow.cancelPreview.totalPaid"), value: preview.paymentAmountTotal },
  // ...
];
<Text weight="600">{item.value}</Text>   // ← raw string
```
**Description:** Cancel preview renders raw backend decimal strings without thousand-separator formatting or currency suffix.

### AUDIT-008

**File:** `fayed-mobile/app/(patient)/sessions/[id]/payment-return.tsx`
**Lines:** 292
**Snippet:**
```tsx
title: t("patientPaymentsFlow.return.pendingStill.heading"),
```
**Description:** Key `pendingStill` not found in `fayed-mobile/src/i18n/locales/en.json`.

---

## Runtime Checks Performed

**Status:** Skipped

Runtime checks were not performed because:
1. Starting backend (port 7000), web (port 3000), and mobile (port 8081) simultaneously was not feasible in this audit session.
2. Financial mutation actions (payment initiation, refund, payout, settlement generation) were explicitly forbidden.
3. Without running servers, read-only verification of payment status rendering, wallet balance display, and session unlock timing could not be performed.

This is a known limitation of this audit phase. Runtime verification should be performed when the Phase 2 findings are addressed.

---

## Limitations

- **Runtime checks skipped** — no live API responses inspected; backend contract verified only through source code
- **Mobile runtime skipped** — mobile app not started; payment return flow verified through code inspection only
- **Admin mutation flows not triggered** — refund, settlement, and payout mutations inspected only through code
- **Database not inspected** — Prisma schema reviewed but actual data not queried
- **Webhook integration not tested** — Paymob/Stripe webhook handlers verified through code only
- **No end-to-end payment flow** — payment initiation through capture not traced in a live session