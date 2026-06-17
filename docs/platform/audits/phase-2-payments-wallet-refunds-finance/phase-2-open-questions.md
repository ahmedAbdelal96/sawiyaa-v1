# Phase 2 Open Questions — Payments / Wallet / Refunds / Settlements / Ledger

**Phase:** 2
**Created:** 2026-06-16

Open questions discovered during Phase 2 that warrant investigation in later phases or before fixes are applied.

---

## Questions from Phase 1 (Carried Forward)

These were identified in Phase 1 and remained unanswered at Phase 2 close:

### Q-005: `care-experience-intelligence` module scope
**Asked in:** Phase 0
**Question:** The backend has a `modules/care-experience-intelligence` module not mentioned in the docs. Is this active product logic or experimental/placeholder? Does it touch any user-facing surfaces including financial ones?
**Why it matters:** If active, it may affect session pricing, practitioner earnings, or patient billing.
**Phase:** Phase 3 or Phase 6
**Status:** Not resolved

### Q-011: i18n completeness for payment status values
**Asked in:** Phase 1
**Question:** Phase 2 verified that payment statuses are fully translated in `payments.json` and `patientPaymentsFlow` mobile namespace. However, the audit did not verify that all 11 `PaymentStatus` values are covered in every i18n namespace that uses them. Are there any gaps?
**Why it matters:** Missing i18n keys for payment statuses would show raw enum strings in user-facing text.
**Phase:** Phase 9
**Status:** Not fully verified — only spot-checked

### Q-013: Admin manual decision financial side effects
**Asked in:** Phase 1
**Question:** When an admin marks a session as NO_SHOW after payment capture, the `PRACTITIONER_EARNING` ledger entry is NOT reversed. Is this intentional? If a patient is incorrectly marked NO_SHOW, should the practitioner's earnings be clawed back?
**Why it matters:** If NO_SHOW after payment capture does not reverse earnings, a wrongly-declared no-show results in the practitioner keeping money for a session they didn't conduct. This is a fairness issue.
**Phase:** Phase 3
**Status:** Not resolved — "no automatic refund/payout" confirmed, but earnings reversal absence is a separate gap

---

## New Questions from Phase 2

### Q-016: Minor-unit conversion floating-point risk
**Found during:** Phase 2
**Question:** `request-payment-refund.use-case.ts:548` uses `Math.round(Number(amount) * 100)` for minor-unit conversion before sending to the payment provider. `Number(amount)` on a decimal string (e.g., `"12.34"`) introduces a floating-point representation before multiplication. Should this use `new Prisma.Decimal(amount).mul(100).round().toNumber()` instead?
**Why it matters:** For amounts like `"10.33"`, `Number("10.33") * 100 = 1032.9999999999999` — `Math.round` of this is `1033`, which is correct. However, the pattern is fragile and could produce wrong results for other values.
**Phase:** Phase 3
**Status:** Not resolved — needs verification with edge-case values

### Q-017: Commission rate precision — 2 decimal places only
**Found during:** Phase 2
**Question:** Commission rates are stored as `@db.Decimal(5, 2)` — only 2 decimal places. A rate like `12.345%` can only be stored as `12.34%` or `12.35%` (with rounding). The `ResolveCommissionRuleService` validates that `platformRatePercent + practitionerRatePercent === 100`. Could this rounding cause the sum to deviate from 100% when rates require 3+ decimal places?
**Why it matters:** If platform and practitioner rates each round to 2 decimal places, their sum might be `99.99%` or `100.01%`, causing the validation to fail for otherwise valid rate configurations.
**Phase:** Phase 3
**Status:** Not resolved — requires testing with 3-decimal precision rates

### Q-018: NO_SHOW after payment capture — earnings reversal gap
**Found during:** Phase 2
**Question:** When a session is marked NO_SHOW after payment capture, the `PRACTITIONER_EARNING` ledger entry is NOT reversed. This means the practitioner keeps earnings for a session they didn't conduct. Is this intentional (per policy: no-show is the practitioner's "fault" so they keep the money)? Or is this an unintended gap where a refund should be triggered?
**Why it matters:** This is a financial fairness question. If NO_SHOW is the patient's fault, the practitioner keeping the money is correct. If NO_SHOW is ambiguous (e.g., technical failure, practitioner no-show), the money should potentially be refunded to the patient.
**Phase:** Phase 3
**Status:** Not resolved — policy question, not a code bug

### Q-019: Manual payout step-up requirement absent
**Found during:** Phase 2
**Question:** `POST /admin/practitioner-payouts` (record manual payout) has no `@RequireStepUp` guard in the backend, while `POST /admin/settlements/:id/mark-paid` requires step-up. Is this intentional (manual payout is low-frequency and always reviewed by a senior admin, so step-up is redundant)? Or is this a security gap?
**Why it matters:** If an admin credential is compromised, the lack of step-up on manual payout allows an attacker to transfer money to any practitioner without MFA. This is a P1 security risk.
**Phase:** Phase 4 (Auth/Security)
**Status:** Not resolved — requires security team decision

### Q-020: Mobile cancel preview currency
**Found during:** Phase 2
**Question:** The `cancel-preview.tsx` screen displays raw backend values without `formatMoney()`. Does the cancel preview API response include a `currencyCode` alongside the monetary values? If not, where should the currency code come from — the session's payment currency?
**Why it matters:** To fix AUDIT-007 properly, the currency must be available to the cancel preview screen. If it's not in the API response, the backend needs to be updated first.
**Phase:** Phase 7 (Mobile)
**Status:** Not resolved — needs backend API verification

### Q-021: `addFundsLabel` in mobile wallet — non-functional action
**Found during:** Phase 2
**Question:** The mobile wallet shows an "Add Funds" label with `addFundsUnavailable: "Manual top-up is not available from the app yet"`. The label renders but has no associated button or navigation. Is this intended to be a placeholder for future functionality, or should the label be conditionally hidden until the feature is built?
**Why it matters:** A non-functional CTA that shows as a label is confusing UX. If manual top-up is not on the roadmap, the label should be removed.
**Phase:** Phase 7 (Mobile)
**Status:** Not resolved — product decision

### Q-022: Package purchase — no wallet support
**Found during:** Phase 2
**Question:** `PackagePurchasePayScreen` does not support wallet as a payment method. Patients must pay the full package amount via gateway only. Is this a deliberate limitation (packages are higher-value and should always go through gateway for dispute protection)? Or is this a missing feature?
**Why it matters:** If wallet can be used for session payments, it should logically also be available for package purchases unless there's a specific policy reason to exclude it.
**Phase:** Phase 3 or Phase 6
**Status:** Not resolved — product/policy question

### Q-023: Stripe Elements native SDK not yet enabled
**Found during:** Phase 2
**Question:** The mobile `pay.tsx` has a `stripeNotice: "Direct card payment will be enabled in a future release."` and the Stripe `clientSecret` field is recognized but triggers an error if encountered. Is Stripe native SDK integration on the roadmap? When?
**Why it matters:** If Stripe is not yet integrated, patients on mobile using USD will have no payment option (since Paymob is EGP-only).
**Phase:** Phase 3
**Status:** Not resolved — roadmap question

### Q-024: Academy enrollment payment return separate screen
**Found during:** Phase 2
**Question:** Academy enrollment payments have a separate `AcademyEnrollmentPaymentReturnScreen` but share the same `normalizePaymentRedirectStatus` and `extractHostedCheckoutReturnParams` utilities from `return-utils.ts`. Is this separation intentional (academy is a separate domain from sessions)? Or should academy and session payment returns share a common screen/component?
**Why it matters:** Duplicated payment return logic creates maintenance burden. If the academy domain has different requirements, the separation is correct.
**Phase:** Phase 6
**Status:** Not resolved — architecture question

### Q-025: Encoding issue in `walletOnlyNote` Arabic locale
**Found during:** Phase 2
**Question:** `en.json` line 1219 has `walletOnlyNote` with a garbled em-dash (`â€"`). This appears to be a UTF-8 encoding issue where an em-dash was corrupted during file authoring. Is the same garbled text present in `ar.json`?
**Why it matters:** If the em-dash is also corrupted in Arabic locale, the `walletOnlyNote` text would display as mojibake for Arabic users.
**Phase:** Phase 9 (i18n sweep)
**Status:** Not resolved — needs locale file comparison

### Q-026: `coupon` state not cleared after successful payment
**Found during:** Phase 2
**Question:** The `appliedCoupon` state in `pay.tsx` is set during checkout but not cleared after `handleInitiatePayment` navigates to `payment-return`. If the user navigates back to pay and initiates a new payment, the old coupon may still be applied to the new payment request.
**Why it matters:** A patient who applies a coupon for session A, completes payment, then tries to pay for session B without a coupon could inadvertently reuse the session A coupon on session B (if the backend doesn't validate coupon-session alignment).
**Phase:** Phase 3
**Status:** Not resolved — requires testing the backend coupon validation on subsequent payments

---

## Resolved Questions

These questions were raised during Phase 2 and resolved before phase close:

### RQ-004: Payment return screen refetch before unlock
**Question:** Does the payment return screen refetch backend state before unlocking session access?
**Answer:** Yes. `PaymentReturnPanel.tsx` uses `refetchInterval` polling with `staleTime: 0` until the session status moves to a confirmed state. The mobile `payment-return.tsx` uses a 3-stage flow (reconcile mutation → 45s session polling → auto-navigation). Both correctly refetch before unlocking.
**Resolved by:** Code inspection of `PaymentReturnPanel.tsx` lines 75–87 and `payment-return.tsx` lines 76–146

### RQ-005: Manual session decision — automatic financial side effects
**Question:** Does marking a session NO_SHOW or UNDER_REVIEW automatically trigger a refund or payout reversal?
**Answer:** No. `CreateAdminSessionManualDecisionUseCase` explicitly requires `confirmNoAutomaticRefund: true` and `confirmNoAutomaticPayout: true`. No financial actions are triggered by any manual decision type. However, NO_SHOW after payment capture does NOT reverse earnings — the `PRACTITIONER_EARNING` ledger entry remains.
**Resolved by:** Code inspection of `create-admin-session-manual-decision.use-case.ts` lines 300–324 and `PostPaymentLedgerEntriesUseCase`

### RQ-006: Currency hardcoding — EGP/USD only
**Question:** Is the EGP/USD-only currency constraint hardcoded in multiple places?
**Answer:** Yes. `payment-region.resolver.ts:21` has `SUPPORTED_CURRENCY_CODES = Set(['EGP', 'USD'])`. The admin frontend has hardcoded `"EGP" | "USD"` checks in `AdminSettlementGenerateDrawer.tsx:40`, `AdminPractitionerPayoutDrawer.tsx:14,46`, and `AdminPractitionerSettlementDrawer.tsx:38`. The constraint is consistent but duplicated.
**Resolved by:** Code inspection across all four locations

### RQ-007: Admin refund amount — frontend or backend computed?
**Question:** Is the refund amount computed by the frontend or validated/determined by the backend?
**Answer:** The backend computes the maximum eligible refund amount (`ValidateRefundEligibilityService.resolveRefundAmount`). The frontend sends an optional `amount` parameter. The backend enforces that the amount cannot exceed the remaining eligible balance. The frontend does not display the maximum to the admin.
**Resolved by:** Code inspection of `validate-refund-eligibility.service.ts` and `AdminPaymentOpsScreen.tsx`