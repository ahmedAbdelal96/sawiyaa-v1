# Payments Module API

## Purpose

Payments Module owns payment initiation, provider abstraction, provider webhook handling, and session-payment orchestration.

This module intentionally does **not** own:

- wallet / ledger / settlement accounting
- commission rule authoring
- coupon authoring
- admin finance reporting
- full refund policy tooling

## Endpoints

### Patient

- `POST /api/v1/patients/me/sessions/:id/payments/initiate`
- `GET /api/v1/patients/me/payments`
- `GET /api/v1/patients/me/payments/:id`

### Admin / Ops Refunds

- `GET /api/v1/admin/payments/:id`
- `GET /api/v1/admin/payments/:id/refunds`
- `POST /api/v1/admin/payments/:id/refunds`
- `POST /api/v1/admin/payments/:paymentId/refunds/:refundId/retry`

`GET /api/v1/admin/payments/:id` returns an operational snapshot:

- current payment lifecycle state and provider references
- linked session runtime context (if linked)
- refund summary and refund timeline
- recent payment events for troubleshooting/idempotency visibility

Payment initiation accepts an optional `couponCode` and delegates all monetary resolution to Financial Rules Module before the provider call starts.
Provider selection is backend-controlled through centralized routing policy. Frontend does not send provider choice in normal checkout flow.

### Routing Policy Baseline

- Routing source of truth is a normalized checkout context:
  - resolved payment currency
  - resolved commission `marketType` (`LOCAL`, `CROSS_BORDER`, `ANY`)
  - operating country context (practitioner country)
  - checkout country context (patient country)
- `EGP` + Egypt-local checkout market → `PAYMOB`
- `USD` + international / non-Egypt flow → `STRIPE`
- unsupported or ambiguous routing context fails explicitly (`PAYMENT_ROUTING_AMBIGUOUS` / `PAYMENT_UNSUPPORTED_ROUTING_COMBINATION`)

### Provider Availability Guardrails

- `PAYMENT_STRIPE_ENABLED` and `PAYMENT_PAYMOB_ENABLED` control runtime availability
- enabled provider must have required credentials
- if routing selects an unavailable provider, initiation fails explicitly (`PAYMENT_PROVIDER_UNAVAILABLE`)
- provider mode is env-driven:
  - `STRIPE_MODE=test|live`
  - `PAYMOB_MODE=test|live`
- non-production environment is guarded against live-mode misconfiguration at startup
- all provider URLs/secrets/IDs are loaded from env (no hardcoded credentials in source)

### Webhooks

- `POST /api/v1/payments/webhooks/stripe`
- `POST /api/v1/payments/webhooks/paymob`

## Current Provider Baseline

- Stripe: implemented for payment intent initiation and webhook verification
- Paymob: implemented for auth/order/payment-key initiation and HMAC-verified webhook normalization

## Session Relationship

- Sessions remain the business target being paid for
- payable sessions must still be `PENDING_PAYMENT`
- successful payment capture confirms the linked session
- expired payments expire the linked unpaid session through the Sessions module
- failed payments do not silently confirm or complete sessions

## Pricing Source of Truth

V1 now uses the Financial Rules layer, which resolves:

- `PractitionerProfile.sessionPrice30`
- `PractitionerProfile.sessionPrice60`
- practitioner country currency
- active commission rules
- optional coupon discounts and contribution split

Payments persists the resolved commission and coupon snapshots on the `Payment` record for later ledger posting.

## Geo / Country Trust Policy

- payment country is backend-owned; the client may only provide a hint in public enrollment flows
- authoritative country comes from stored account/profile state when available
- public enrollment flows may derive a country from verified phone prefix and compare it with the declared country
- country mismatch is recorded in `metadataJson.countrySnapshot` and must never silently change the resolved market
- session payments, training enrollments, academy enrollments, and future payment flows should all persist the same country snapshot shape
- frontend country, browser locale, or IP are not source of truth for currency or market selection

## Webhook Notes

- Stripe webhook verification uses the configured webhook secret and raw body
- Paymob webhook verification uses configured HMAC secret and verified callback signature
- provider event refs are checked for idempotent replay handling
- repeated terminal webhook outcomes are treated idempotently without replaying capture/failure side effects
- only safe event summaries are logged
- coupon redemption is consumed only after successful payment capture, not during initiation
- webhook endpoints:
  - `POST /api/v1/payments/webhooks/stripe`
  - `POST /api/v1/payments/webhooks/paymob`
- callback/redirect URLs are env-driven:
  - `APP_BASE_URL`
  - `PAYMENT_SUCCESS_URL`
  - `PAYMENT_FAILED_URL`
  - `PAYMENT_PENDING_URL`

## Operational Notifications Baseline

- payment capture success emits operational notification to the paying patient
- payment failure emits operational notification to the paying patient
- refund request/success/failure emits operational notification to the paying patient
- notifications are best-effort and must not block payment/refund state transitions
- currently supported channels in this baseline: `IN_APP` persistence and SMTP `EMAIL` when available

## Out of Scope

- settlement batches
- wallet balances
- practitioner earnings accounting
- coupon campaign management
- admin finance dashboards
