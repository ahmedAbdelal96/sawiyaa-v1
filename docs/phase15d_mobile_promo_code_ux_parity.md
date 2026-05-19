# Phase 15D - Mobile Promo Code UX Parity

## Executive Verdict
Mostly pass with issues.

The mobile patient session checkout promo-code UX is now clearer, safer, and more aligned with the backend and web behavior. The invalid/expired/etc. coupon state is mapped to friendly messages, the discount input is normalized to uppercase, stale applied-state is cleared when the user edits the code, and payment initiation only sends `couponCode` when a coupon is actually applied.

The remaining issue is coverage: I could not run a true device/emulator manual smoke in this workspace session, so the manual mobile checkout verification was skipped.

## What Was Implemented
- Added mobile coupon input normalization to trim and uppercase promo codes before apply and before payment submission.
- Added explicit coupon error classification so backend coupon failures show friendly translated messages.
- Added loading feedback for Apply.
- Disabled payment while coupon breakdown validation/refetch is in flight.
- Cleared stale applied coupon state when the user edits the input.
- Preserved the existing hosted checkout and payment return flow.
- Kept coupon math on the backend only.

## Files Changed
- `app/(patient)/sessions/[id]/pay.tsx`
- `src/components/ui/Button.tsx`
- `src/features/patient/payments/coupon-utils.ts`
- `src/i18n/locales/en.json`
- `src/i18n/locales/ar.json`
- `__tests__/patient/payments/coupon-utils.test.ts`

## Mobile UX Behavior
### Apply
- The promo code field is normalized to uppercase.
- The Apply action shows loading while the coupon breakdown is being validated/refetched.
- Empty promo codes do not submit.

### Remove
- Removing a coupon clears the draft value, the applied code, and any coupon error state.

### Discount Preview
- The checkout screen continues to show the backend-calculated session fee, discount, wallet deduction, and final total.
- No client-side discount math is trusted.

### Final Amount
- The final payable amount remains backend-driven.
- Payment submission uses the backend breakdown and only the currently applied coupon code.

### Stale State Handling
- If the user edits the coupon input after applying a code, the applied coupon is cleared so the user must apply again.
- This prevents stale coupon state from leaking into payment initiation.

## Coupon Error Mapping
Implemented friendly mapping for:
- invalid
- expired
- inactive/disabled
- pending approval
- not applicable to this session
- total usage limit reached
- per-patient usage limit reached
- already used
- generic fallback

Arabic and English strings were added for all of the above.

## Payment Flow Compatibility Notes
- `couponCode` is sent to payment initiation only when a coupon is currently applied and still matches the current input.
- Removing the coupon omits `couponCode`.
- Editing the input after applying clears the applied state, so stale codes are not submitted.
- Hosted checkout and payment return behavior were left unchanged.

## Tests Added / Updated
- Added pure utility tests for promo-code normalization and error classification:
  - `__tests__/patient/payments/coupon-utils.test.ts`

## Verification Results
Passed:
- `npm audit --audit-level=moderate`
- `npx tsc --noEmit`
- `npm test -- --runInBand`
- `npm run lint`

Lint result:
- Passed with existing repository warnings only.

Build note:
- `package.json` does not define a `build` script in the mobile app, so there was no mobile build command to run in this phase.

## Manual Smoke
Skipped.

Reason:
- No mobile emulator/device was attached in this workspace session, so I could not perform a true interactive checkout smoke on the mobile runtime.

## Remaining Gaps
- No live device/emulator manual verification yet.
- No package coupon support was added, by design.
- Practitioner promo-code management is still web-only, by design.

## Future Mobile Note
If we add practitioner promo-code management later, the most natural future location is:
- Practitioner dashboard > Promo Codes
- list / create / edit / disable
- redemption history

## Final Answers
- Is mobile patient promo-code checkout UX improved? `yes`
- Does mobile send `couponCode` correctly only when applied? `yes`
- Does mobile avoid stale coupon state? `yes`
- Is practitioner promo-code management implemented in mobile? `no`
- Is package coupon support included? `no`
