# Phase 2 Findings Register — Payments / Wallet / Refunds / Settlements / Ledger

**Phase:** 2
**Created:** 2026-06-16
**Total findings:** 6 | Open: 6 | Closed: 0

---

## Finding AUDIT-003

**Finding ID:** AUDIT-003
**Title:** Admin refund panel — free-text amount with no maximum cap
**Severity:** P1
**Module:** Payments / Admin Finance
**Affected users:** Admin users issuing refunds via `/admin/payments`
**Affected surfaces:** `/admin/payments` — `AdminPaymentOpsScreen.tsx` `RefundRequestPanel`

**Evidence:**
`fayed-frontend-v1/src/features/admin/payments/components/AdminPaymentOpsScreen.tsx` lines 349–454:

```tsx
// Lines 349–371: free-text number input, no max cap
const normalizedAmount = normalizeAmount(amount);
const parsedAmount = Number.parseFloat(normalizedAmount ?? "");
const amountNumber = Number.isNaN(parsedAmount) ? undefined : parsedAmount;

// Lines 454: mutation submitted directly
refundMutation.mutateAsync({ amount: amountNumber })
```

The `RefundRequestPanel` uses a `type="number"` input where the admin types the refund amount manually. There is **no maximum cap enforced** on the frontend. The admin can type any positive number. If `amountNumber` is `undefined` (blank input), the backend performs a full refund — but if the admin types a number exceeding the payment total, the frontend does not prevent submission.

**Root cause hypothesis:** The original implementation relied entirely on the backend to validate the refund amount against the remaining refundable balance. The frontend was intentionally kept minimal, but the absence of a client-side maximum check means a misconfigured or malicious admin could submit an oversized refund request that the backend would reject — but only after a round trip.

**Risk:** An admin typing a refund amount larger than the remaining refundable balance would receive a backend validation error, causing a failed mutation and a poor UX. More critically, the absence of a visible maximum in the UI makes it unclear to the admin what the valid range is before they submit. This is a data-entry guardrail gap rather than a financial loss risk (the backend validates), but it creates unnecessary error cycles and potential for admin confusion.

**Smallest safe next step:** Add a `max` attribute to the amount input driven by the remaining refundable amount from the backend (`remainingRefunds` from the payment detail response), and display the maximum as helper text above the input field.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-004

**Finding ID:** AUDIT-004
**Title:** Settlement mark-paid and mark-failed — no confirmation dialog
**Severity:** P1
**Module:** Settlements / Admin Finance
**Affected users:** Admin users managing settlement batches
**Affected surfaces:** `/admin/settlements` — `AdminSettlementDetailScreen.tsx`

**Evidence:**
`fayed-frontend-v1/src/features/admin/settlements/components/AdminSettlementDetailScreen.tsx`:

```tsx
// Line 214–219: mark-paid proceeds directly on submit
const handleMarkPaid = async () => {
  await markPaidMutation.mutateAsync(settlementsToMark);
};

// Line 243: mark-failed proceeds directly on submit
const handleMarkFailed = async () => {
  await markFailedMutation.mutateAsync(settlementsToMark);
};
```

Both mutations are called directly on form submit. There is no `ConfirmModal`, no step-up dialog, and no MFA requirement in the frontend for these operations.

Compare with `AdminPackageSettlementReleaseModal.tsx` (best practice) which uses `ConfirmModal` with `onConfirm` prop. Also compare with `FinancialReconciliationScreen.tsx` which wraps dangerous operations in `stepUp.requestStepUp()`.

**Root cause hypothesis:** The settlement detail screen was built incrementally and the confirmation step was omitted. The `RequireStepUp` decorator on the backend endpoint (`mark-paid`, `mark-failed`) provides server-side protection, but the frontend does not trigger this step-up flow — it simply calls the mutation directly.

**Risk:** An admin could accidentally click "Mark Paid" or "Mark Failed" on the wrong settlement batch (e.g., a different month or currency), causing incorrect financial state. While the backend `RequireStepUp` provides some protection, the frontend mutation call itself is not gated. If the admin session is still valid and the backend step-up is not properly enforced at the API level, an accidental click could succeed. Additionally, the absence of a confirmation step increases the risk in cases where the admin's credentials are compromised.

**Smallest safe next step:** Wrap the submit buttons in a `ConfirmModal` that shows the settlement batch details (ID, amount, currency, period) and requires the admin to explicitly confirm before the mutation fires.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-005

**Finding ID:** AUDIT-005
**Title:** Hardcoded EGP/USD currency validation in admin settlement generate
**Severity:** P2
**Module:** Settlements / Admin Finance
**Affected users:** Admin users generating settlement batches
**Affected surfaces:** `/admin/settlements` — `AdminSettlementGenerateDrawer.tsx`

**Evidence:**
`fayed-frontend-v1/src/features/admin/settlements/components/AdminSettlementGenerateDrawer.tsx` line 40:

```typescript
const isFormValid = ... && (normalizedCurrency === "EGP" || normalizedCurrency === "USD");
```

Only two currencies are accepted in the form validation. This hardcoding appears in:
- `AdminSettlementGenerateDrawer.tsx:40` — form validation
- `AdminPractitionerPayoutDrawer.tsx:14` — `type CurrencyCode = "EGP" | "USD"`
- `AdminPractitionerPayoutDrawer.tsx:46` — `defaultCurrency = "EGP"`
- `AdminPractitionerSettlementDrawer.tsx:38` — same type definition

**Root cause hypothesis:** The platform only supports EGP and USD at present, and the developer hardcoded these for validation and type safety. The backend's `SUPPORTED_CURRENCY_CODES` in `payment-region.resolver.ts` is also a `Set(['EGP', 'USD'])` — so the constraint is consistent, but encoded in multiple places rather than a single shared constant.

**Risk:** If the platform adds a third currency (e.g., SAR, EUR) in the future, these hardcoded checks and type definitions would need to be updated in all four locations. Missing any one location would create inconsistency. For now, this is P2 because the constraint is currently correct.

**Smallest safe next step:** Extract `CurrencyCode` to a shared type definition and replace all inline `"EGP" | "USD"` checks with a reference to a single shared constant, e.g., `SUPPORTED_CURRENCY_CODES.has(currency)`.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-006

**Finding ID:** AUDIT-006
**Title:** Admin manual payout recording — no MFA/step-up required
**Severity:** P2
**Module:** Settlements / Practitioner Payouts / Admin Finance
**Affected users:** Admin users recording manual practitioner payouts
**Affected surfaces:** `/admin/practitioners/:id/payouts` — `AdminPractitionerPayoutDrawer.tsx`

**Evidence:**
`fayed-frontend-v1/src/features/admin/practitioner-payouts/components/AdminPractitionerPayoutDrawer.tsx` line 153:

```tsx
recordMutation.mutateAsync(...)  // No step-up wrapper
```

`POST /admin/practitioner-payouts` (record manual payout) has no `@RequireStepUp` guard in the backend and only requires `AppRole.ADMIN`. Compare with:
- `POST /admin/settlements/generate` — has `RequireStepUp('finance.settlement.generate')`
- `POST /admin/settlements/:id/mark-paid` — has `RequireStepUp('finance.settlement.mark-paid')`
- `POST /admin/package-settlements/:id/release` — has `RequireStepUp('finance.package-settlement.release')`
- `FinancialReconciliationScreen` — wraps mutations in `stepUp.requestStepUp()`

The manual payout recording is a high-value financial action (moves real money to a practitioner) but has a lower protection bar than other financial mutations.

**Root cause hypothesis:** The manual payout endpoint was added later with simpler protection requirements. The developer may have considered the `ADMIN` role requirement sufficient, not anticipating that batch settlement operations (which are also admin-only) received MFA/step-up as an additional guard.

**Risk:** If an admin's credentials are compromised, an attacker with admin access could record fraudulent payout transactions against any practitioner without needing MFA. The batch `mark-paid` operation requires step-up, but the individual payout recording does not — creating an inconsistent security posture for two related operations.

**Smallest safe next step:** Add `@RequireStepUp('finance.payout.record')` to the `record-practitioner-payout` endpoint in the backend controller, and add `stepUp.requestStepUp()` wrapper in the `AdminPractitionerPayoutDrawer` frontend.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-007

**Finding ID:** AUDIT-007
**Title:** Mobile cancel preview — raw backend values without currency formatting
**Severity:** P2
**Module:** Payments / Mobile
**Affected users:** Patients cancelling sessions on mobile
**Affected surfaces:** `fayed-mobile/app/(patient)/sessions/[id]/cancel-preview.tsx`

**Evidence:**
`fayed-mobile/app/(patient)/sessions/[id]/cancel-preview.tsx` lines 36–59:

```tsx
const moneyValues = [
  { label: t("patientSessionsFlow.cancelPreview.totalPaid"),   value: preview.paymentAmountTotal },
  { label: t("patientSessionsFlow.cancelPreview.refundAmount"), value: preview.refundAmount },
  { label: t("patientSessionsFlow.cancelPreview.walletCredit"), value: preview.walletCreditAmount },
  { label: t("patientSessionsFlow.cancelPreview.gatewayRefund"),value: preview.gatewayRefundAmount },
];
// ...
<Text weight="600">{item.value}</Text>   // ← raw string from backend, no formatting
```

Backend values (e.g., `"1500.00"`, `"300.00"`) are displayed as raw strings. No `formatMoney()` call, no thousand-separator formatting, no currency suffix. Compare with the checkout screen (`pay.tsx`) which always uses `formatMoney(amount, currency)` and outputs `"1,500 EGP"`.

**Root cause hypothesis:** The cancel preview screen was built separately from the checkout flow and did not reuse the `formatMoney()` utility. The backend returns the values without currency metadata in the preview response, so the frontend did not have a currency code to pass to the formatter.

**Risk:** Patients see unstructured decimal strings (e.g., `1500.00` instead of `1,500 EGP`) in a financial preview screen. This is a UX degradation — the values are readable but not professionally formatted. It may also hide currency ambiguity if the currency code is not sent alongside the value.

**Smallest safe next step:** Add `formatMoney(preview.paymentAmountTotal, currencyCode)` formatting to each value display, and ensure the cancel preview API response includes a currency code alongside the monetary values.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-008

**Finding ID:** AUDIT-008
**Title:** Mobile `pendingStill` i18n key missing from locale file
**Severity:** P2
**Module:** Payments / Mobile / i18n
**Affected users:** Patients returning from payment on mobile
**Affected surfaces:** `fayed-mobile/app/(patient)/sessions/[id]/payment-return.tsx`

**Evidence:**
`fayed-mobile/app/(patient)/sessions/[id]/payment-return.tsx` line 292:

```tsx
title: t("patientPaymentsFlow.return.pendingStill.heading"),
```

Grep for `"pendingStill"` in `fayed-mobile/src/i18n/locales/en.json` returns no results. This key is referenced in code but absent from the locale file. When rendered, the fallback behavior would display the key itself as text: `"patientPaymentsFlow.return.pendingStill.heading"`.

**Root cause hypothesis:** The `pendingStill` state was added to the payment return screen but the corresponding i18n key was never added to the locale file. This is a classic copy-paste gap where the component was updated but the translation file was not.

**Risk:** Patients who reach the `pendingStill` state (payment still processing after return from provider) would see a raw i18n key as the heading instead of a human-readable message like "Payment still processing". This is a P2 UX degradation — not blocking, but confusing for the patient.

**Smallest safe next step:** Add the missing translation key to `fayed-mobile/src/i18n/locales/en.json`:

```json
"return": {
  "pendingStill": {
    "heading": "Payment still processing",
    "note": "Your payment is being confirmed. This may take a moment."
  }
}
```

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Open Findings

| ID | Title | Severity | Module |
|----|-------|----------|--------|
| AUDIT-003 | Admin refund panel — free-text amount with no maximum cap | P1 | Payments / Admin Finance |
| AUDIT-004 | Settlement mark-paid/mark-failed — no confirmation dialog | P1 | Settlements / Admin Finance |
| AUDIT-005 | Hardcoded EGP/USD currency validation in admin settlement generate | P2 | Settlements / Admin Finance |
| AUDIT-006 | Admin manual payout recording — no MFA/step-up required | P2 | Settlements / Practitioner Payouts |
| AUDIT-007 | Mobile cancel preview — raw backend values without currency formatting | P2 | Payments / Mobile |
| AUDIT-008 | Mobile `pendingStill` i18n key missing from locale file | P2 | Payments / Mobile / i18n |

---

## Closed Findings

_No findings closed in Phase 2._

---

## Findings by Phase

| Phase | Open | Closed | Total |
|-------|------|--------|-------|
| Phase 0 | 0 | 0 | 0 |
| Phase 1 | 2 | 0 | 2 |
| Phase 2 | 6 | 0 | 6 |
| Phase 3 | 0 | 0 | 0 |
| Phase 4 | 0 | 0 | 0 |
| Phase 5 | 0 | 0 | 0 |
| Phase 6 | 0 | 0 | 0 |
| Phase 7 | 0 | 0 | 0 |
| Phase 8 | 0 | 0 | 0 |
| Phase 9 | 0 | 0 | 0 |
| **Total** | **8** | **0** | **8** |