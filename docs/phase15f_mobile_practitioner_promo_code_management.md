# Phase 15F — Mobile Practitioner Promo Code Management

## Executive Verdict
Mobile practitioner promo-code management is implemented for the mobile app and is aligned with the backend contract. Practitioners can list, create, edit, disable, and inspect redemption history for their own promo codes from mobile.

## What Was Implemented
- Added a practitioner promo-code management screen in the mobile app.
- Added a mobile route for practitioner promo codes under the practitioner area.
- Added API, hooks, types, and coupon helpers for the practitioner coupon endpoints.
- Added localized Arabic and English copy for the promo-code flow.
- Added basic unit coverage for validation and payload normalization.
- Added a practitioner dashboard entry point so the feature is discoverable from the app shell.

## Route / Screen Added
- [promo-codes route](/D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/promo-codes.tsx)
- Practitioner promo-code screen is backed by [PractitionerPromoCodesScreen.tsx](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/components/PractitionerPromoCodesScreen.tsx)
- Practitioner dashboard entry point updated in [index.tsx](/D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/index.tsx)
- Practitioner tab route registration updated in [\_layout.tsx](/D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/_layout.tsx)

## API Layer Added
- [api.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/api.ts)
- [hooks.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/hooks.ts)
- [types.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/types.ts)
- [coupon-utils.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/coupon-utils.ts)

Supported backend endpoints:
- `GET /practitioners/me/coupons`
- `POST /practitioners/me/coupons`
- `GET /practitioners/me/coupons/:id`
- `PATCH /practitioners/me/coupons/:id`
- `POST /practitioners/me/coupons/:id/disable`
- `GET /practitioners/me/coupons/:id/redemptions`

## UX Behavior
- List:
  - Shows code, discount, status, usage count, limits, and date window.
  - Supports pull-to-refresh.
  - Uses an empty state when no promo codes exist.
- Create:
  - Normalizes codes to uppercase.
  - Enforces percentage-only creation.
  - Blocks values above 20% in UI validation.
  - Submits only safe backend payload fields.
- Edit:
  - Supports safe updates for limits, dates, and active state.
  - Keeps code read-only.
  - Avoids sending discount value back when the coupon is locked by redemption history.
- Disable:
  - Uses a confirmation dialog.
  - Leaves the promo code visible as disabled/inactive after the action.
- Redemptions/details:
  - Shows redemption history with safe fields only.
  - Avoids patient contact details and provider payloads.

## Product Rules Surfaced
- Maximum discount: 20%
- Discount type: percentage-only
- Scope: session-only
- Ownership: practitioner-owned only
- Split: 50/50 platform and practitioner
- Package coupon support: not included

## Files Changed
- [app/(practitioner)/promo-codes.tsx](/D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/promo-codes.tsx)
- [app/(practitioner)/_layout.tsx](/D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/_layout.tsx)
- [app/(practitioner)/index.tsx](/D:/Web/full-projects/fayed/fayed-mobile/app/(practitioner)/index.tsx)
- [src/features/practitioner/promo-codes/api.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/api.ts)
- [src/features/practitioner/promo-codes/hooks.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/hooks.ts)
- [src/features/practitioner/promo-codes/types.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/types.ts)
- [src/features/practitioner/promo-codes/coupon-utils.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/coupon-utils.ts)
- [src/features/practitioner/promo-codes/components/PractitionerPromoCodesScreen.tsx](/D:/Web/full-projects/fayed/fayed-mobile/src/features/practitioner/promo-codes/components/PractitionerPromoCodesScreen.tsx)
- [src/i18n/locales/ar.json](/D:/Web/full-projects/fayed/fayed-mobile/src/i18n/locales/ar.json)
- [src/i18n/locales/en.json](/D:/Web/full-projects/fayed/fayed-mobile/src/i18n/locales/en.json)
- [__tests__/practitioner/promo-codes/coupon-utils.test.ts](/D:/Web/full-projects/fayed/fayed-mobile/__tests__/practitioner/promo-codes/coupon-utils.test.ts)

## Tests Added / Updated
- Added unit tests for coupon input normalization, validation, and request payload shaping.
- Coverage includes:
  - uppercase normalization
  - unsafe code rejection
  - 20% cap enforcement
  - payload omission of owner/split fields
  - friendly error mapping

## Verification Results
- `npm audit --audit-level=moderate`
  - Passed
- `npm run lint`
  - Passed with existing repository warnings only
  - 0 errors, 63 warnings
- `npx tsc --noEmit`
  - Passed
- `npm test -- --runInBand`
  - Passed
  - 5 suites passed
  - 56 tests passed
- `npm run build`
  - Not available in `fayed-mobile` package scripts

## Manual Mobile Smoke
- Skipped in this session because no emulator/device was available to run an interactive mobile smoke test.
- No real payments were attempted.
- No production data was used.

## Remaining Gaps
- Device/emulator-based manual smoke still needs to be executed to validate the full on-device user journey.
- Mobile did not add practitioner management for package coupons, by design.

## Final Answers
- Is mobile practitioner promo-code management implemented? yes
- Can practitioner create/list/edit/disable promo codes on mobile? yes
- Does mobile enforce the 20% max UX rule? yes
- Does mobile explain the 50/50 split? yes
- Are redemptions/details available? yes
- Is package coupon support included? no
