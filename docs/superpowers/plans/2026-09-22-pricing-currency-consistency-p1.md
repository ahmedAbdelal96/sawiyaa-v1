# Patient Pricing Currency Consistency P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the patient financial quote use the same trusted regional currency context as discovery, profile, and payment initiation, then prove the amount/currency pair remains authoritative through checkout and payment.

**Architecture:** The existing `CalculateSessionFinancialBreakdownService` and `resolvePaymentRegionalResolution` remain the sole pricing/currency authorities. A booking freezes the selected currency in the session pricing snapshot; quote/payment consume that frozen decision, while Web/Mobile render the returned quote and persisted payment currency without local regional decisions.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, Next.js/React, React Native/Jest.

**Spec:** User request: Patient Pricing Currency Consistency Audit & Fix — P1.

## Global Constraints

- Do not change practitioner prices, payment rules, currency policy, or database pricing architecture.
- Do not duplicate currency resolution in Web or Mobile.
- Preserve package/session pricing and provider routing behavior.
- Backend quote, Payment snapshot, gateway amount, and currency must remain authoritative.

## Review Focus

- Trusted Egypt request context must reach the financial-breakdown endpoint; otherwise checkout can default to USD while payment initiation resolves EGP.
- Existing payment snapshots must remain immutable and must not be repriced from a later request country.
- Foreign request context must continue producing USD.
- Checkout must never use a hardcoded currency when an authoritative quote exists.
- A scheduled or instant booking must persist the selected currency alongside its price snapshot so later participant-country data cannot silently reprice it.
- Mobile and Web display adapters must consume the response currency and must not infer it from locale.

---

### Task 1: Prove the missing quote country propagation

**Files:**
- Create: `sawiyaa-backend-v1/src/modules/financial-rules/use-cases/calculate-session-financial-breakdown.use-case.spec.ts`
- Modify: none before RED verification

- [ ] Write a failing use-case test asserting an Egypt request country is forwarded to the pricing service and produces an EGP quote.
- [ ] Run the focused Jest test and verify it fails because the use-case does not accept/forward request country.

### Task 2: Propagate trusted country through the Backend quote endpoint

**Files:**
- Modify: `sawiyaa-backend-v1/src/modules/financial-rules/use-cases/calculate-session-financial-breakdown.use-case.ts`
- Modify: `sawiyaa-backend-v1/src/modules/financial-rules/controllers/patient-session-financial-rules.controller.ts`
- Modify: `sawiyaa-backend-v1/src/modules/financial-rules/use-cases/calculate-session-financial-breakdown.use-case.spec.ts`

- [ ] Add optional `requestCountryIsoCode` to the use-case input and pass it to `CalculateSessionFinancialBreakdownService.calculate`.
- [ ] Read `resolveCountryFromRequest(request).countryCode` in the controller and pass it to the use case.
- [ ] Run the focused Backend test and confirm Egypt produces EGP while US produces USD.

### Task 3: Add contract regression coverage for quote/payment currency integrity

**Files:**
- Modify: `sawiyaa-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.spec.ts`
- Modify: `sawiyaa-backend-v1/src/modules/financial-rules/services/calculate-session-financial-breakdown.service.spec.ts`
- Modify: `sawiyaa-frontend-v1/src/features/payments/unified-checkout.test.tsx`
- Create or modify: `sawiyaa-mobile/__tests__/patient-pricing-currency-consistency.test.ts`

- [ ] Pin Egypt/foreign quote currency, frozen Payment snapshot behavior, and gateway initiation currency.
- [ ] Pin Web checkout rendering and payment initiation to the same quote currency.
- [ ] Pin Mobile money parsing/rendering to response currency without locale fallback.
- [x] Freeze scheduled and instant booking currency in the session pricing snapshot and consume it in quote/payment resolution.

### Task 4: Closure artifact and full verification

**Files:**
- Create: `qa-artifacts/pricing-currency-consistency-p1/PRICING-CURRENCY-CONSISTENCY-P1-CLOSURE.md`

- [ ] Document the source of truth, before/after flow, exact root cause, files changed, tests, and preserved rules.
- [ ] Run targeted Backend, Web, and Mobile tests plus typecheck/build/i18n checks.
- [ ] Record visual QA status and final verdict.
