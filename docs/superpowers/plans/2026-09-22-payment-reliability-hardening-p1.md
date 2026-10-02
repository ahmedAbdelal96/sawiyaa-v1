# Payment Reliability Hardening P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the identified payment reliability gaps without changing payment economics, provider behavior, wallet accounting, coupon accounting, or session lifecycle rules.

**Architecture:** Reuse the existing unique `PaymentWebhookReceipt(provider, providerEventRef)` table for Stripe, add a narrowly scoped late-success operational event while keeping the Payment `EXPIRED` and Session `EXPIRED`, expose the existing reconciliation scheduler state through existing readiness/operations surfaces, pass the existing pending payment identifiers into journey actions, and align Web/Mobile return polling to one bounded window while preserving backend `CAPTURED` authority.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, Next.js/React/Vitest, React Native/Jest.

**Spec:** `C:\Users\IT\.codex\attachments\9a158b4a-d7a0-4018-a350-0c3b7ce35f5d\Pasted text.txt`

## Global Constraints

- Do not redesign checkout or add a second payment architecture.
- Do not change payment providers, currency resolution, wallet ledger, coupon accounting, or session lifecycle rules.
- Backend `CAPTURED` remains the only financial success authority.
- No external redirect or gateway secret may be introduced.
- Preserve patient ownership and admin permission guards.

## Review Focus

- Concurrent Stripe replay must produce one receipt and one financial effect; owned by the Stripe handler tests.
- Late success must remain `EXPIRED`/non-resurrecting while producing a deterministic operational event; owned by late-success handler tests.
- Disabled reconciliation must not silently run, while enabled reconciliation must report active/readiness state; owned by scheduler/config tests.
- Pending journey actions must carry the patient-owned Session/Payment context; owned by journey service/use-case tests.
- Web and Mobile return polling must use the same timeout and still render success only for backend capture; owned by Web/Mobile return tests.

### Task 1: Stripe receipt parity

**Files:**
- Modify: `sawiyaa-backend-v1/src/modules/payments/use-cases/handle-stripe-webhook.use-case.ts`
- Test: `sawiyaa-backend-v1/src/modules/payments/use-cases/handle-stripe-webhook.use-case.spec.ts`

- [ ] Add failing tests for receipt-first duplicate/replay handling and concurrent receipt conflict handling.
- [ ] Run the Stripe handler spec and confirm failure because the handler currently queries `PaymentEvent` instead of the unique receipt.
- [ ] Implement receipt creation/find-duplicate using `PaymentWebhookReceipt` for Stripe and keep capture orchestration unchanged.
- [ ] Run the handler spec and then the payment regression set.

### Task 2: Late-success operational event

**Files:**
- Modify: `sawiyaa-backend-v1/prisma/schema.prisma`
- Create: `sawiyaa-backend-v1/prisma/migrations/20260922100000_add_late_payment_success_event/migration.sql`
- Modify: `sawiyaa-backend-v1/src/modules/payments/use-cases/handle-stripe-webhook.use-case.ts`
- Modify: `sawiyaa-backend-v1/src/modules/payments/use-cases/handle-paymob-webhook.use-case.ts`
- Test: corresponding Stripe/Paymob webhook specs

- [ ] Add a failing assertion for a dedicated deterministic late-success event while Payment and Session remain expired.
- [ ] Add the enum value and migration only; do not change statuses or reopen a session.
- [ ] Persist the unique receipt and operational event with reason/amount/currency/provider references, preserving existing audit sanitization.
- [ ] Expose the existing event through admin payment operations (already included in recent events) and verify it in tests.

### Task 3: Reconciliation readiness

**Files:**
- Modify: `sawiyaa-backend-v1/src/config/validation/env.schema.ts`
- Modify: `sawiyaa-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-scheduler.service.ts`
- Modify or create: existing readiness/health service and scheduler specs

- [ ] Add failing validation/readiness assertions for production configuration visibility and scheduler active state.
- [ ] Implement fail-fast validation for invalid reconciliation configuration, while allowing explicit disabled mode.
- [ ] Include enabled/active/cron/last-run/critical counts in the existing readiness/operations projection; do not auto-enable it.
- [ ] Run config and scheduler tests.

### Task 4: Pending-payment journey context

**Files:**
- Modify: `sawiyaa-backend-v1/src/modules/patient-journey/services/build-patient-journey-next-steps.service.ts`
- Modify: `sawiyaa-backend-v1/src/modules/patient-journey/use-cases/get-my-patient-journey.use-case.ts`
- Test: `sawiyaa-backend-v1/src/modules/patient-journey/services/build-patient-journey-next-steps.service.spec.ts`

- [ ] Add a failing test that `COMPLETE_PAYMENT` contains the pending Session id and Payment id in `action`/`entityRefs`.
- [ ] Pass the already ownership-scoped `pendingPayment` object to the builder.
- [ ] Set `targetType: SESSION`, `targetId: sessionId`, and include the payment reference without changing frontend routes or authorization.
- [ ] Run journey backend tests and existing Web journey tests.

### Task 5: Return polling parity

**Files:**
- Modify: `sawiyaa-frontend-v1/src/features/payments/components/PaymentReturnPanel.tsx`
- Modify: `sawiyaa-mobile/app/(patient)/sessions/[id]/payment-return.tsx`
- Test: existing Web/Mobile payment return tests, adding focused timeout assertions if absent

- [ ] Add failing assertions showing Web and Mobile use different polling deadlines.
- [ ] Extract/choose one shared bounded duration (30 seconds) at each client boundary without trusting redirect status.
- [ ] Preserve backend reconciliation, `CAPTURED` checks, retry, expired, and timeout states.
- [ ] Run Web/Mobile payment return tests and typechecks.

### Task 6: Closure artifact and full verification

**Files:**
- Create: `D:\Web\full-projects\sawiyaa\qa-artifacts\payment-reliability-hardening-p1\PAYMENT-RELIABILITY-HARDENING-P1-CLOSURE.md`

- [ ] Document root cause, exact changes, security validation, preserved business rules, tests, and remaining decisions.
- [ ] Run backend targeted tests/typecheck/build, Web targeted tests/typecheck, and Mobile targeted tests/i18n/typecheck.
- [ ] Confirm no unrelated product surface changed.
