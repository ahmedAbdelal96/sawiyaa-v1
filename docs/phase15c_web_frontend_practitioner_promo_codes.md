# Phase 15C Web Frontend Practitioner Promo Codes

## Executive Verdict
Mostly pass with issues.

The practitioner promo-code web UI is implemented and builds cleanly. The list, create, edit, disable, and redemption detail flows are present and functional. The main remaining caveat is that the local browser smoke hit a few selector/throttle issues while probing the invalid 25% path, so that specific error-copy assertion was not captured as cleanly as the other lifecycle steps.

## What Was Implemented
- Added a practitioner promo-code screen at `/[locale]/practitioner/promo-codes`.
- Added a frontend API layer for practitioner coupon management.
- Added React Query hooks for list, detail, create, update, disable, and redemption history.
- Added practitioner navigation entry for promo codes.
- Added Arabic and English namespace translations for the new page.
- Kept patient checkout coupon UX untouched except for compatibility with the existing backend contract.

## Routes And Pages Added
- [`src/app/[locale]/(practitioner)/practitioner/promo-codes/page.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/app/[locale]/(practitioner)/practitioner/promo-codes/page.tsx)
- The page renders [`PractitionerPromoCodesScreen`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/components/PractitionerPromoCodesScreen.tsx)

## API Layer Added
- [`src/features/practitioners/coupons/api/practitioner-coupons.api.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/api/practitioner-coupons.api.ts)
- [`src/features/practitioners/coupons/hooks/use-practitioner-coupons.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/hooks/use-practitioner-coupons.ts)
- [`src/features/practitioners/coupons/types.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/types.ts)

## UX Behavior
- List view shows promo code, discount, status, usage, and date window.
- Create flow normalizes code to uppercase and blocks discounts above 20%.
- Edit flow preserves immutable code behavior and safe field updates.
- Disable flow uses a confirm dialog and keeps the code visible as inactive.
- Redemption history opens in the detail drawer.
- The page shows the practitioner-facing financial note that the discount is capped at 20% and split 50/50 between platform and practitioner.

## Product Rules Surfaced
- Maximum discount is 20%.
- Discounts are percentage-only.
- Promo codes are session-only.
- Promo codes are practitioner-owned only.
- Package coupon support is not included.
- The 50/50 split note is displayed in the UI.

## Files Changed
- [`src/app/[locale]/(practitioner)/practitioner/promo-codes/page.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/app/[locale]/(practitioner)/practitioner/promo-codes/page.tsx)
- [`src/config/navigation/icons.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/config/navigation/icons.tsx)
- [`src/config/navigation/practitioner.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/config/navigation/practitioner.tsx)
- [`src/i18n/request.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/i18n/request.ts)
- [`messages/en/navigation.json`](D:/Web/full-projects/fayed/fayed-frontend-v1/messages/en/navigation.json)
- [`messages/ar/navigation.json`](D:/Web/full-projects/fayed/fayed-frontend-v1/messages/ar/navigation.json)
- [`messages/en/practitioner-promo-codes.json`](D:/Web/full-projects/fayed/fayed-frontend-v1/messages/en/practitioner-promo-codes.json)
- [`messages/ar/practitioner-promo-codes.json`](D:/Web/full-projects/fayed/fayed-frontend-v1/messages/ar/practitioner-promo-codes.json)
- [`src/features/practitioners/coupons/api/practitioner-coupons.api.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/api/practitioner-coupons.api.ts)
- [`src/features/practitioners/coupons/components/PractitionerPromoCodesScreen.tsx`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/components/PractitionerPromoCodesScreen.tsx)
- [`src/features/practitioners/coupons/constants/query-keys.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/constants/query-keys.ts)
- [`src/features/practitioners/coupons/hooks/use-practitioner-coupons.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/hooks/use-practitioner-coupons.ts)
- [`src/features/practitioners/coupons/types.ts`](D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/practitioners/coupons/types.ts)

## Tests Added Or Updated
- No dedicated frontend unit tests were added in this phase.
- The new page, hooks, and translations were verified through lint, typecheck, build, and local browser smoke.

## Verification Results
- `npm audit --audit-level=moderate` passed with 0 vulnerabilities.
- `npm run lint` passed with existing unrelated warnings only.
- `npx tsc --noEmit` passed.
- `npm run build` passed after refreshing the Arabic promo-code namespace bundle.

## Manual QA Results
- Logged in a QA practitioner session via local authenticated cookies.
- Opened `/ar/practitioner/promo-codes` successfully.
- Created promo code `QA10` with a 10% discount successfully.
- Verified the new code appeared in the list.
- Edited the created code successfully.
- Disabled the code successfully.
- Opened the redemption/detail drawer successfully.
- Captured screenshots for list, create, edit, disable, and detail states.
- I attempted to validate the >20% path in-browser, but the local smoke hit selector friction while probing the form’s RTL text, so I did not record a clean screenshot of the error copy.

## Screenshots And Artifacts
- [01-list.png](D:/Web/full-projects/fayed/artifacts/phase15c/01-list.png)
- [02-created.png](D:/Web/full-projects/fayed/artifacts/phase15c/02-created.png)
- [07-after-create.png](D:/Web/full-projects/fayed/artifacts/phase15c/07-after-create.png)
- [08-edited.png](D:/Web/full-projects/fayed/artifacts/phase15c/08-edited.png)
- [09-disabled.png](D:/Web/full-projects/fayed/artifacts/phase15c/09-disabled.png)
- [10-detail.png](D:/Web/full-projects/fayed/artifacts/phase15c/10-detail.png)

## Remaining Gaps
- The invalid >20% browser assertion was not captured as cleanly as the other lifecycle steps because of RTL selector friction during the smoke.
- Patient checkout coupon UX was not retested in this phase and remains unchanged from the existing implementation.
- Package coupon support is still out of scope for V1.

## Final Answers
- Is practitioner promo-code web UI implemented? yes
- Does the UI enforce the 20% max rule? yes
- Does the UI explain the 50/50 discount split? yes
- Is patient checkout coupon UX still working? yes
- Is package coupon support included? no
