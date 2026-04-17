# Financial Rules API

## Purpose
Financial Rules Module resolves commission rules and coupon effects before ledger posting exists.
It is the business-rules layer between Sessions/Payments and the future Wallet/Ledger/Settlement stack.

## In Scope
- Commission rule creation and listing
- Coupon creation
- Coupon validation against a patient-owned session
- Deterministic session financial breakdown calculation
- Coupon redemption only after successful payment

## Out of Scope
- Wallet balances
- Ledger posting
- Settlement batches
- Commission payout accounting
- Coupon campaign management
- Admin finance dashboards

## Endpoints
- `POST /api/v1/admin/commission-rules`
- `GET /api/v1/admin/commission-rules`
- `POST /api/v1/admin/coupons`
- `POST /api/v1/patients/me/sessions/:id/coupons/validate`
- `POST /api/v1/patients/me/sessions/:id/financial-breakdown`

## Notes
- Commission rule resolution is centralized and deterministic.
- No fallback commission rule is invented when no match exists.
- Coupon scopes supported in V1:
  - `PLATFORM_WIDE`
  - `PRACTITIONER_SESSIONS`
- `SPECIALTY` and `CAMPAIGN` coupon scopes stay deferred because the current coupon schema does not yet carry the targeting metadata needed for honest enforcement.
- Coupon redemption is not consumed during preview or payment initiation; it is consumed only after payment success.

## Breakdown Contract
- `grossAmount`
- `discountAmount`
- `netPaidAmount`
- `platformCommissionAmount`
- `practitionerShareAmount`
- `coupon.platformDiscountShareAmount`
- `coupon.practitionerDiscountShareAmount`
- `currency`

## Integration Boundaries
- Payments should consume the resolved breakdown and persist financial snapshots.
- Ledger will later consume the same breakdown output for posting.
- Settlement and wallet modules remain separate and unimplemented here.
