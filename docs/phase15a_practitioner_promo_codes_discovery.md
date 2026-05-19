# Phase 15A, Practitioner Promo Codes Discovery & Design

## Executive Summary
The codebase already has a baseline coupon engine for session payments. It supports:
- global uniqueness of coupon codes
- two active scopes, `PLATFORM_WIDE` and `PRACTITIONER_SESSIONS`
- practitioner ownership via `ownerPractitionerId`
- validation before checkout
- coupon snapshots on `Payment`
- redemption recording after successful payment
- idempotent redemption by `couponId + sessionId`

What is not yet present is the product surface the business now needs:
- practitioner coupon management UI
- practitioner coupon CRUD/listing/redemption visibility endpoints
- admin approval/review workflow endpoints for coupons
- richer user-facing coupon error states in web/mobile
- package coupon support
- stronger transaction/race protections around usage limits

Verdict: the database and backend are partially ready for a session-only V1, but the full practitioner promo-code product is not implemented yet.

## Current DB Support

### What already exists
- `Coupon` model in [prisma/schema.prisma](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/schema.prisma)
  - `code` is globally unique
  - `slug` is globally unique
  - `ownerPractitionerId` exists and relates to `PractitionerProfile`
  - `couponScope` exists
  - `status`, `discountType`, `discountValue`, `maxDiscountAmount` exist
  - `usageLimitTotal`, `usageLimitPerPatient`, `currentUsageCount` exist
  - `requiresApproval`, `approvedAt`, `startsAt`, `endsAt`, `isActive` exist
- `CouponRedemption` model exists in [prisma/schema.prisma](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/schema.prisma)
  - links coupon, session, payment, patient, and practitioner
  - stores `grossAmount`, `discountAmount`, and discount share splits
  - has `@@unique([couponId, sessionId])`
- `Payment` model stores coupon snapshots in [prisma/schema.prisma](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/schema.prisma)
  - `couponId`
  - `couponCodeSnapshot`
  - `couponDiscountSnapshot`
  - `couponPlatformShareSnapshot`
  - `couponPractitionerShareSnapshot`
- `LedgerEntry` does not appear to have coupon-specific fields. It is linked to `payment` generically, so coupon impact is carried through `Payment` snapshots and downstream money posting logic rather than dedicated ledger coupon columns.

### Schema gaps
- No conditional constraint enforces that `ownerPractitionerId` must be present when `couponScope = PRACTITIONER_SESSIONS`
- No direct schema constraint prevents a practitioner coupon from being created without an owner, which would later fail validation at runtime
- No per-coupon minimum amount field exists
- No package coupon support exists on package purchase models
- No partial unique constraints or row-lock friendly structures are present for usage-limit race safety beyond the session-level unique redemption

### Migration need
- For a baseline session-only V1, the current schema is sufficient, so a new migration is not strictly required
- For a hardened V1, a migration is recommended if we want stronger DB-level guarantees such as:
  - mandatory owner for practitioner scopes
  - additional indexes for owner-driven coupon listing/redemption views
  - any future package-coupon support

## Current Backend Support

### Existing coupon-related paths

#### `POST /admin/coupons`
- File: [AdminCouponsController](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/controllers/admin-coupons.controller.ts)
- What it does: creates a coupon record
- Current access: admin-only via `JwtAccessAuthGuard + AdminGuard`
- Status: used
- Practitioner-owned support: partial only, because it accepts `ownerPractitionerId` in the DTO/use-case, but there is no practitioner-facing create flow

#### `POST /patients/me/sessions/:id/coupons/validate`
- File: [PatientSessionFinancialRulesController](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/controllers/patient-session-financial-rules.controller.ts)
- What it does: validates whether a coupon applies to a patient-owned session
- Status: used
- Practitioner-owned support: yes, through `CouponScope.PRACTITIONER_SESSIONS` and `ownerPractitionerId` comparison against the session practitioner

#### `POST /patients/me/sessions/:id/financial-breakdown`
- File: [PatientSessionFinancialRulesController](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/controllers/patient-session-financial-rules.controller.ts)
- What it does: calculates gross, discount, and net payable amounts
- Status: used
- Practitioner-owned support: yes

#### `InitiateSessionPaymentUseCase`
- File: [initiate-session-payment.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.ts)
- What it does: accepts `couponCode`, resolves pricing, persists `couponId` and coupon snapshots on `Payment`
- Status: used
- Practitioner-owned support: yes, indirectly through financial breakdown validation

#### `MarkPaymentSucceededUseCase`
- File: [mark-payment-succeeded.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/payments/use-cases/mark-payment-succeeded.use-case.ts)
- What it does: after successful capture, calls `RedeemCouponUseCase` to record redemption and increment coupon usage
- Status: used
- Practitioner-owned support: yes

#### `RedeemCouponService`
- File: [redeem-coupon.service.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/redeem-coupon.service.ts)
- What it does: creates a redemption row and increments `currentUsageCount`
- Status: used
- Practitioner-owned support: yes
- Risk: concurrency safety is not fully hardened, because the usage-limit check is not obviously re-validated inside the redemption transaction

#### `ValidateCouponEligibilityService`
- File: [validate-coupon-eligibility.service.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/services/validate-coupon-eligibility.service.ts)
- What it does: validates active state, approval, date window, total and per-patient usage, supported scope, and practitioner ownership for `PRACTITIONER_SESSIONS`
- Status: used
- Practitioner-owned support: yes
- Risk: `PRACTITIONER_SESSIONS` with missing owner is not prevented at creation time

### Backend coverage gaps
- No practitioner coupon controller exists
- No practitioner coupon list/detail/update/disable controller exists
- No redemption history endpoint exists for coupon owners
- No admin coupon review/update/disable/list endpoint exists, only create
- No admin approval workflow endpoint exists even though `requiresApproval` and `approvedAt` are modeled
- No package coupon integration exists
- No explicit coupon audit events were found in the discovery set

### Backend support verdict
- Current backend support is partial and session-payment focused
- It already supports the core validation + redemption mechanics needed for practitioner-owned session coupons
- It does not yet expose the product surface needed for practitioner self-service promo code management

## Current Web Frontend Support

### What exists today
- Patient session payment UI already accepts a coupon code in [PaySessionPanel.tsx](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/payments/components/PaySessionPanel.tsx)
- The panel:
  - has a coupon input
  - applies/removes a coupon locally
  - refreshes the financial breakdown with `couponCode`
  - sends `couponCode` into `initiateSessionPayment`
  - shows discount and applied coupon in the price summary
- Financial breakdown fetching is wired through [use-session-financial.ts](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/sessions/hooks/use-session-financial.ts)
- Payment initiation types already include `couponCode` in the frontend payment types
- Translation strings already exist in:
  - [messages/en/payments.json](/D:/Web/full-projects/fayed/fayed-frontend-v1/messages/en/payments.json)
  - [messages/ar/payments.json](/D:/Web/full-projects/fayed/fayed-frontend-v1/messages/ar/payments.json)

### What is missing
- No practitioner promo-code management page
- No practitioner coupon creation modal/form
- No practitioner coupon list
- No practitioner coupon usage history or redemption analytics
- No admin coupon management UI
- No detailed coupon error UX for:
  - expired
  - disabled
  - approval pending
  - not applicable to this practitioner
  - usage limit reached
  - per-patient limit reached
- No package coupon UX

### Web support verdict
- The patient checkout side is already partially coupon-aware
- The practitioner side is not implemented

## Current Mobile Support

### What exists today
- Mobile patient session checkout already supports coupon entry in [app/(patient)/sessions/[id]/pay.tsx](/D:/Web/full-projects/fayed/fayed-mobile/app/(patient)/sessions/[id]/pay.tsx)
- It has:
  - a coupon input field
  - apply/remove behavior
  - a breakdown query that accepts `couponCode`
  - initiate-payment payload that sends `couponCode`
  - discount display in the checkout summary
- Mobile payment API/types also include `couponCode`:
  - [src/features/patient/payments/api.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/patient/payments/api.ts)
  - [src/features/patient/payments/hooks.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/patient/payments/hooks.ts)
  - [src/features/patient/payments/types.ts](/D:/Web/full-projects/fayed/fayed-mobile/src/features/patient/payments/types.ts)

### What is missing
- No practitioner promo-code management in mobile
- No advanced coupon error UX beyond generic invalid-state handling
- No package coupon support

### Mobile support verdict
- Mobile already supports patient coupon checkout on sessions
- Mobile does not yet support practitioner coupon management

## Security / Abuse Risks

1. Patient tries a coupon from another practitioner
- Current state: backend prevents this for `PRACTITIONER_SESSIONS`
- Residual risk: none if validation stays server-side

2. Patient uses expired or disabled code
- Current state: backend blocks it
- Residual risk: UI only surfaces generic errors today

3. Patient races multiple requests to exceed usage limits
- Current state: partial protection exists, but there is a concurrency window because the eligibility check and the redemption increment are not obviously locked as one atomic decision
- Recommended mitigation: transaction with row lock or serializable isolation around validation and redemption

4. Patient reuses the same coupon on the same session/payment
- Current state: `@@unique([couponId, sessionId])` and `findByCouponAndSession` make same-session redemption idempotent

5. Patient manipulates discount amount client-side
- Current state: backend recalculates and persists price snapshots server-side, so frontend cannot be source of truth

6. Practitioner creates abusive 100 percent discounts
- Current state: no explicit max-discount/business cap is enforced beyond optional `maxDiscountAmount`
- Recommended mitigation: add product rules or admin approval

7. Practitioner uses coupon to bypass platform commission rules
- Current state: coupon shares are explicit, but product policy is not fully defined
- Recommended mitigation: keep backend commission math authoritative and define allowed share splits centrally

8. Coupon applied to failed payment but still counted
- Current state: redemption occurs in `MarkPaymentSucceededUseCase`, so failed payments should not consume usage

9. Coupon applied to packages if not supported
- Current state: packages do not appear coupon-aware
- Recommendation: explicitly document that V1 coupons are session-only unless package support is added later

10. Coupon code enumeration or brute force
- Current state: code is globally unique and validation errors are generic enough, but coupon endpoints may still be brute-forced
- Recommended mitigation: rate limit validate/apply endpoints and keep error messages non-enumerative

## Product Decisions Needed

1. Should practitioner-created coupons be active immediately or require admin approval?
2. Who absorbs the discount, practitioner, platform, or a split?
3. What is the maximum allowed discount?
4. Are percentage and fixed-amount discounts both allowed?
5. Should coupons apply to sessions only, or also packages?
6. Can a patient reuse the same coupon multiple times?
7. Should first-session-only coupons exist?
8. Should admins have platform-wide coupon tooling separate from practitioner coupons?
9. Should codes be globally unique, or unique per practitioner?
10. Should practitioners see redemption history and per-patient usage details?
11. What happens if payment fails after coupon validation but before capture?
12. Preferred Arabic term, `كود خصم`, `بروموكود`, or `رمز ترويجي`?

## Recommended V1 Behavior

Recommended baseline for phase 15:
- practitioner-owned coupons are session-only
- each coupon belongs to one practitioner
- code is globally unique
- percentage and fixed amount are allowed
- `PLATFORM_WIDE` remains admin/platform-owned
- `PRACTITIONER_SESSIONS` requires `ownerPractitionerId`
- coupon validation happens only in backend
- coupon redemption is created only after successful payment capture
- failed or canceled payments do not consume coupon usage
- one coupon redemption per session/payment
- package coupons are out of scope until explicitly designed

## Proposed Backend API Contract

### Practitioner coupon management, proposed
- `GET /practitioners/me/coupons`
- `POST /practitioners/me/coupons`
- `PATCH /practitioners/me/coupons/:id`
- `POST /practitioners/me/coupons/:id/disable`
- `GET /practitioners/me/coupons/:id/redemptions`

### Patient coupon validation, current pattern
- `POST /patients/me/sessions/:id/coupons/validate`
- `POST /patients/me/sessions/:id/financial-breakdown`
- `POST /patients/me/sessions/:id/payments`

### Admin review, if product decides to require approval
- `GET /admin/coupons`
- `PATCH /admin/coupons/:id/approve`
- `PATCH /admin/coupons/:id/reject`
- `PATCH /admin/coupons/:id/disable`

### Payload fields to support
- `code`
- `slug`
- `couponScope`
- `discountType`
- `discountValue`
- `maxDiscountAmount`
- `usageLimitTotal`
- `usageLimitPerPatient`
- `startsAt`
- `endsAt`
- `isActive`
- `requiresApproval`
- `ownerPractitionerId`

## Proposed Frontend UX

### Practitioner UX
- Add a `Promo Codes` page under the practitioner dashboard
- Show:
  - code
  - status
  - scope
  - discount type/value
  - usage count
  - date window
  - active state
- Add create/edit modal or dedicated page
- Include a warning about earnings impact if discount shares affect practitioner payout

### Patient checkout UX
- Keep coupon input in session payment checkout
- Add explicit error states for:
  - invalid code
  - expired code
  - not applicable to this practitioner
  - approval pending
  - usage limit reached
  - already used
- Show:
  - original price
  - discount
  - final payable
  - applied code
  - remove code action

### Arabic wording
- Prefer `كود خصم` for practical user comprehension
- `رمز ترويجي` is acceptable if the product wants a more generic marketing tone

## Proposed Mobile UX

- Keep the existing patient coupon field in checkout
- Mirror the web breakdown behavior
- Surface explicit coupon-specific error messages
- Add a practitioner promo-code management screen only if mobile product scope requires it

## QA Test Plan

1. Backend coupon creation by admin
2. Practitioner coupon creation and ownership enforcement
3. Validation on own-practitioner session
4. Rejection on another practitioner’s session
5. Usage-limit race test
6. Idempotent redemption on payment success
7. No redemption on failed payment
8. Web patient checkout coupon preview
9. Mobile patient checkout coupon preview
10. Coupon error-state localization in Arabic and English
11. Ledger/settlement math sanity check after redemption
12. Rate-limited coupon validation abuse check

## Implementation Phases

### Phase 15B, Backend Practitioner Promo Codes
- add practitioner coupon endpoints
- enforce owner/practitioner rules
- add redemption history
- harden validation and transaction safety
- add tests and audit events

### Phase 15C, Web Frontend Promo Codes
- practitioner coupon list/create/edit UI
- patient coupon UX improvements
- translations and error states

### Phase 15D, Mobile Promo Code Checkout
- coupon UX parity with web
- error handling and breakdown preview

### Phase 15E, QA / Payment / Settlement Validation
- verify coupon math
- verify redemption and idempotency
- verify no abuse or cross-practitioner leakage

## Conclusion
The current codebase already has the backend and checkout plumbing needed for session-level couponing, including practitioner ownership checks on validation and redemption on successful payment. However, the practitioner-facing product surface is missing, and package coupon support is not present.

### Final answers
- Is promo code DB support already present? Yes, for session-level practitioner-owned coupons
- Is backend support already present? Partially, yes for validation and redemption, no for practitioner management UI/API surface
- Is web support already present? Partially, yes for patient checkout, no for practitioner management
- Is mobile support already present? Partially, yes for patient checkout, no for practitioner management
- What should we build next? Backend practitioner coupon endpoints first, then web UI, then mobile parity, then QA and settlement validation
