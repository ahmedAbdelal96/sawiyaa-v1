# Phase 15B - Backend Practitioner Promo Codes

## Executive Summary
Backend practitioner promo-code management has been implemented for session-only coupons owned by a practitioner. The backend now supports practitioner coupon create/list/detail/update/disable and redemption-history flows, enforces a 20% maximum discount, applies a deterministic 50/50 platform/practitioner discount split, and keeps the existing patient checkout coupon flow compatible.

The implementation stays backend-only, does not add package coupon support, and preserves payment/security behavior. Existing payment snapshots and coupon redemptions continue to be the source of truth for discount accounting.

## Verdict
**Backend practitioner promo-code management implemented: yes**

## What Was Implemented
- Practitioner-authenticated coupon endpoints under `/practitioners/me/coupons`.
- Practitioner-owned session-only coupon creation.
- Practitioner coupon detail, update, disable, and redemption-history use-cases.
- Code normalization and unsafe-character validation for practitioner promo codes.
- Percentage-only practitioner promo codes with a hard 20% cap.
- Deterministic 50/50 discount split between platform and practitioner.
- Transaction-safe redemption flow with coupon row locking and idempotent redemption checks.
- Security audit events for practitioner coupon create/update/disable and redemption.
- Coupon slug uniqueness protection for practitioner coupon creation.

## API Endpoints Added
- `GET /practitioners/me/coupons`
- `POST /practitioners/me/coupons`
- `GET /practitioners/me/coupons/:id`
- `PATCH /practitioners/me/coupons/:id`
- `POST /practitioners/me/coupons/:id/disable`
- `GET /practitioners/me/coupons/:id/redemptions`

## Product Rules Enforced
- Max discount: **20%**
- Discount type: **percentage only**
- Scope: **session-only**
- Ownership: **current authenticated practitioner only**
- Package coupon support: **not included**
- Discount split: **50/50 platform/practitioner**
- Discount math: **backend-only**
- Code safety: **trim, uppercase, letters/numbers/dash/underscore only**
- Owner fields: **not client-controlled**

## Files Changed
### New backend files
- `src/modules/financial-rules/controllers/practitioner-coupons.controller.ts`
- `src/modules/financial-rules/controllers/practitioner-coupons.controller.access.spec.ts`
- `src/modules/financial-rules/dto/practitioner-coupon.dto.ts`
- `src/modules/financial-rules/dto/practitioner-coupon-response.dto.ts`
- `src/modules/financial-rules/use-cases/create-my-practitioner-coupon.use-case.ts`
- `src/modules/financial-rules/use-cases/create-my-practitioner-coupon.use-case.spec.ts`
- `src/modules/financial-rules/use-cases/update-my-practitioner-coupon.use-case.ts`
- `src/modules/financial-rules/use-cases/update-my-practitioner-coupon.use-case.spec.ts`
- `src/modules/financial-rules/use-cases/disable-my-practitioner-coupon.use-case.ts`
- `src/modules/financial-rules/use-cases/disable-my-practitioner-coupon.use-case.spec.ts`
- `src/modules/financial-rules/use-cases/get-my-practitioner-coupon.use-case.ts`
- `src/modules/financial-rules/use-cases/list-my-practitioner-coupons.use-case.ts`
- `src/modules/financial-rules/use-cases/list-my-practitioner-coupons.use-case.spec.ts`
- `src/modules/financial-rules/use-cases/list-my-practitioner-coupon-redemptions.use-case.ts`
- `src/modules/financial-rules/use-cases/list-my-practitioner-coupon-redemptions.use-case.spec.ts`
- `src/modules/financial-rules/services/redeem-coupon.service.spec.ts`
- `src/modules/financial-rules/services/validate-coupon-eligibility.service.spec.ts`

### Modified backend files
- `src/common/i18n/catalogs/en/financial-rules.catalog.ts`
- `src/common/i18n/catalogs/ar/financial-rules.catalog.ts`
- `src/modules/financial-rules/financial-rules.module.ts`
- `src/modules/financial-rules/repositories/coupon.repository.ts`
- `src/modules/financial-rules/repositories/coupon-redemption.repository.ts`
- `src/modules/financial-rules/services/calculate-coupon-discount.service.ts`
- `src/modules/financial-rules/services/calculate-coupon-discount.service.spec.ts`
- `src/modules/financial-rules/services/redeem-coupon.service.ts`
- `src/modules/financial-rules/services/validate-coupon-eligibility.service.ts`
- `src/modules/financial-rules/use-cases/create-coupon.use-case.ts`
- `src/modules/payments/use-cases/mark-payment-succeeded.use-case.ts`
- `src/modules/payments/use-cases/mark-payment-succeeded.use-case.spec.ts`

## Tests Added/Updated
- Practitioner coupon controller access test.
- Practitioner coupon create/list/detail/update/disable/redemption tests.
- Practitioner coupon validation and redemption tests.
- Coupon discount split tests.
- Payment success flow test updated to pass coupon code into redemption audit metadata.
- Test isolation fix in redemption spec to avoid leftover `mockResolvedValueOnce` leakage.

## Verification Results
- `npm audit --audit-level=moderate`
  - Passed: `found 0 vulnerabilities`
- `npm run build`
  - Passed
- `npx prisma validate`
  - Passed: schema valid
- `npx prisma migrate status`
  - Passed: database schema is up to date
- Targeted Jest suites
  - Passed: `11` suites
  - Passed tests: `27`
  - Failed tests: `0`

## Audit Events Added
- `finance.coupons.practitioner.create.success`
- `finance.coupons.practitioner.update.success`
- `finance.coupons.practitioner.disable.success`
- `finance.coupons.redeemed.success`

All audit metadata is sanitized and avoids secrets, tokens, or raw provider payloads.

## Remaining Gaps
- No frontend practitioner promo-code management UI was added in this phase.
- No mobile promo-code UI was added in this phase.
- Package coupon support remains out of scope for V1.
- Concurrent slug creation still relies on unique-constraint protection plus deterministic fallback slug selection, which is acceptable for V1.

## Final Answers
- Is backend practitioner promo-code management implemented? **yes**
- Is patient checkout coupon flow still compatible? **yes**
- Is package coupon support included? **no**

