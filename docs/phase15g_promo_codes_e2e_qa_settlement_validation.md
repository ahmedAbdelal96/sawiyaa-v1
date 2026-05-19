# Phase 15G — Promo Codes End-to-End QA & Settlement Validation

## Executive Summary
Phase 15G is a **mostly pass** with one important caveat resolved during validation: a backend UUID lock issue in coupon redemption was encountered and fixed, after which coupon redemption, idempotency, audit logging, and accounting snapshots all behaved correctly.

End-to-end findings:
- Practitioner promo codes work across backend, web, and mobile.
- Session-only, practitioner-owned, percentage-only, max-20% rules are enforced.
- Coupon redemption is idempotent after the backend fix.
- Payment snapshots, redemption rows, ledger entries, and journal entries are consistent.
- Audit events are visible for create, update, disable, and redeemed actions.
- Mobile device smoke was not performed because no emulator/device was available in this session.

## Final Verdict
**Mostly pass with issues**

## Scope Tested
- Backend API
- Web practitioner promo codes
- Web patient checkout coupon flow
- Mobile patient checkout coupon flow
- Mobile practitioner promo-code management
- Payment initiation and redemption
- Audit logging
- Settlement / payout accounting math
- Security / abuse guardrails

## Test Data Used

### Personas
- Practitioner A: `dr.ahmed@hesba.local`
- Practitioner B: `dr.mohamed@hesba.local`
- Patient A: `ahmed.patient@hesba.local`
- Patient B: `mohamed.patient@hesba.local`
- Admin: `admin@hesba.local`

### Coupon IDs / Codes
- `E2E10` -> `def71b3a-6c42-40b1-b25f-2d2cb153f3b7`
- `E2E20` -> `ceb33e85-34b6-432b-be0b-b8f3b70bbd60`
- `E2ELIMIT` -> `8a330ca2-a548-4c97-b51b-7ab80af6675d`
- `E2EDISABLED` -> `219eeecb-3443-4c53-be6c-f22e7fca3dea`

### Sessions / Payments / Redemption
- Session used for successful coupon payment: `ddcff42a-bfa9-461c-8584-cd3997aba28a`
- Second session used for usage-limit rejection: `82c09a67-80d6-4992-9b51-20565a14f2c4`
- Successful payment: `d4989520-b9e0-4729-82ce-43a002058a02`
- Redemption: `2b3b39a4-1028-4ddb-a393-ce2ad54a3731`

## Passed Tests
- Practitioner can list own promo codes.
- Practitioner can create own promo codes at `10%`, `15%`, and `20%`.
- Practitioner cannot create `21%` coupons.
- Practitioner cannot create fixed-amount coupons.
- Practitioner cannot create platform-wide coupons.
- Practitioner cannot set owner manually.
- Practitioner can update safe fields on own coupons.
- Practitioner can disable own coupons.
- Practitioner can view redemption history.
- Invalid code validation returns a safe backend error.
- Cross-practitioner coupon application is rejected.
- Disabled coupon application is rejected.
- Usage-limit exhaustion is enforced.
- Payment initiation stores coupon snapshots correctly.
- Redemption is created only after payment success.
- Redemption idempotency holds on repeated success handling.
- Audit events appear for create, update, disable, and redemption.
- Web practitioner promo-code page renders and lists coupons.
- Web patient checkout shows coupon-applied pricing with the discounted amount.
- Mobile tests passed for coupon utils / promo-code management / auth hardening.

## Failed Tests
No active failures remain after the backend fix.

## Severity
- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## Backend Fix Applied During Validation

### Root Cause
The redemption transaction hit a Prisma/Postgres UUID mismatch when locking the coupon row:
- `operator does not exist: uuid = text`

### Fix
Adjusted the raw lock query in:
- [coupon.repository.ts](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/repositories/coupon.repository.ts)

From:
```sql
SELECT id FROM "Coupon" WHERE id = ${couponId} FOR UPDATE
```

To:
```sql
SELECT id FROM "Coupon" WHERE id = CAST(${couponId} AS uuid) FOR UPDATE
```

### Result
After the fix:
- payment success handling completed
- coupon redemption was created
- usage count incremented exactly once
- repeated success handling stayed idempotent

## Numeric Coupon Accounting Table

Observed on payment `d4989520-b9e0-4729-82ce-43a002058a02` for session `ddcff42a-bfa9-461c-8584-cd3997aba28a` using `E2E10`:

| Metric | Expected | Observed | Pass |
|---|---:|---:|---|
| Gross | 420.00 | 420.00 | Yes |
| Discount % | 10% | 10% | Yes |
| Discount amount | 42.00 | 42.00 | Yes |
| Platform discount share | 21.00 | 21.00 | Yes |
| Practitioner discount share | 21.00 | 21.00 | Yes |
| Patient paid | 378.00 | 378.00 | Yes |
| Practitioner ledger credit | 283.50 | 283.50 | Yes |
| Platform commission ledger credit | 94.50 | 94.50 | Yes |

## Audit Validation Results
Audit events were visible in `SecurityAuditLog` for:
- `finance.coupons.practitioner.create.success`
- `finance.coupons.practitioner.update.success`
- `finance.coupons.practitioner.disable.success`
- `finance.coupons.redeemed.success`

No secrets, tokens, or provider payloads were observed in audit metadata.

## Web QA Results

### Practitioner Web
- Route: `/ar/practitioner/promo-codes`
- Status: pass
- Observed:
  - coupon list rendered
  - `E2E10`, `E2E20`, `E2ELIMIT`, `E2EDISABLED`, `QA15`, `QA10` displayed
  - create/edit/disable/details/actions are present
  - 20% max rule is already enforced by the web UI from Phase 15C follow-up

Screenshot:
- [practitioner-promo-codes.png](D:/Web/full-projects/fayed/artifacts/phase15g/practitioner-promo-codes.png)

### Patient Web Checkout
- Route: `/ar/patient/sessions/82c09a67-80d6-4992-9b51-20565a14f2c4/pay`
- Status: pass
- Observed:
  - coupon input present
  - applying `E2E10` updated the visible amount from `420` to `378`
  - the coupon line showed a `42` EGP discount
  - payment initiation proceeded to the Paymob test checkout URL after applying the refund policy and coupon

Screenshots:
- [patient-pay-cookie.png](D:/Web/full-projects/fayed/artifacts/phase15g/patient-pay-cookie.png)
- [patient-pay-e2e10-ready.png](D:/Web/full-projects/fayed/artifacts/phase15g/patient-pay-e2e10-ready.png)
- [patient-pay-e2e10-afterclick.png](D:/Web/full-projects/fayed/artifacts/phase15g/patient-pay-e2e10-afterclick.png)

## Mobile QA Results
- Mobile package tests passed.
- Mobile device/emulator smoke was **skipped** because no emulator/device was available in this session.
- No mobile code changes were needed in this phase.

## Settlement / Payout Validation
Settlement math is coupon-aware through the payment snapshot and accounting journal path:
- payment snapshot stores coupon code and split data
- redemption row stores discount and split data
- ledger entries reflect the net practitioner earning and platform commission
- journal entry metadata also records the final posted values

Observed on the successful payment:
- gross `420`
- discount `42`
- patient paid `378`
- platform share of discount `21`
- practitioner share of discount `21`
- practitioner earning ledger credit `283.5`
- platform commission ledger credit `94.5`

No double-counting was observed.

## Security / Abuse Validation
Validated:
- cross-practitioner coupon rejection
- disabled coupon rejection
- usage-limit exhaustion
- invalid coupon handling
- fixed-amount rejection for practitioner coupons
- >20% rejection for practitioner coupons
- idempotent redemption on repeated success handling

No privilege escalation or discount bypass was observed.

## Verification Commands and Results

### Backend
- `npm audit --audit-level=moderate` ✅
- `npm run build` ✅
- `npx prisma validate` ✅
- `npx prisma migrate status` ✅
- Targeted tests: `9` suites, `24` tests passed ✅

### Frontend
- `npm audit --audit-level=moderate` ✅
- `npm run lint` ✅ with existing repository warnings only
- `npx tsc --noEmit` ✅
- `npm run build` ✅

### Mobile
- `npm audit --audit-level=moderate` ✅
- `npm run lint` ✅ with existing repository warnings only
- `npx tsc --noEmit` ✅
- `npm test -- --runInBand` ✅
- `npm run build` not available in the mobile package

## Remaining Gaps
- Mobile device/emulator smoke was not executed.
- The report does not claim package coupon support, because that remains intentionally out of scope.

## Files Changed
- [coupon.repository.ts](D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/financial-rules/repositories/coupon.repository.ts)
- [phase15g_promo_codes_e2e_qa_settlement_validation.md](D:/Web/full-projects/fayed/docs/phase15g_promo_codes_e2e_qa_settlement_validation.md)

## Final Answers
- Is promo-code E2E flow working? **yes**
- Is 20% max enforced end-to-end? **yes**
- Is 50/50 split persisted correctly? **yes**
- Is redemption idempotent? **yes**
- Are audit events visible? **yes**
- Is settlement/payout math coupon-aware? **yes**
- Is mobile fully device-tested? **no**
- Is package coupon support included? **no**
