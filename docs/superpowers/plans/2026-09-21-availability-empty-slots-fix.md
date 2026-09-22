# Patient Booking Availability Empty Slots Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove where published current-week availability disappears between practitioner editing and patient booking, then apply the smallest production fix and regression coverage without changing scheduling policy.

**Architecture:** Trace the authoritative Backend path from `AvailabilityWeek` persistence and publication through `ListPublicPractitionerAvailabilityWindowsUseCase` and the published-week window builder, then compare the Web/Mobile adapters and query keys. Add a failing regression at the layer that reproduces the observed disappearance, fix only that boundary, and verify booking protections remain intact.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest/ts-jest, Next.js React Query, Expo/React Native Jest.

**Spec:** `C:\Users\IT\.codex\attachments\f8bca7e4-9b0f-45f0-99e2-6065fbfb85d4\Pasted text.txt`

## Global Constraints

- Do not redesign availability or change scheduling business rules.
- Preserve timezone authority, published-week lifecycle, occupancy, package booking, instant booking, minimum notice, duration validation, and conflict prevention.
- Returned slots must remain genuinely bookable.
- Do not weaken past-slot, booked-slot, blocked-period, or invalid-duration protections.

## Review Focus

- Week boundary/date conversion: a published current-week slot must be queried and built in the practitioner timezone.
- Publication state and slot linkage: only the published week and its active slots may feed the public endpoint.
- Past/minimum-notice filtering: future slots remain visible while past slots stay hidden.
- Duration projection: 30- and 60-minute requests must follow the existing authoritative duration contract.
- Client cache/mapping: Web and Mobile must not turn a valid Backend window into an empty state or retain a stale empty query.

### Task 1: Reproduce and trace the Backend path

**Files:**
- Inspect: `sawiyaa-backend-v1/src/modules/availability/use-cases/list-public-practitioner-availability-windows.use-case.ts`
- Inspect: `sawiyaa-backend-v1/src/modules/availability/services/build-published-week-availability-windows.service.ts`
- Inspect: `sawiyaa-backend-v1/src/modules/availability/services/availability-week-calendar.service.ts`
- Inspect: `sawiyaa-backend-v1/src/modules/availability/repositories/practitioner-availability-week.repository.ts`
- Inspect: practitioner update/publish use cases and Prisma schema models
- Test: existing availability unit and PostgreSQL integration specs

- [ ] **Step 1: Capture the exact request and date/UTC inputs** from the controller DTO and client call, including timezone and selected date.
- [ ] **Step 2: Trace persistence, publication, repository predicates, window generation, and filtering** and record each transformation in the closure artifact.
- [ ] **Step 3: Run the narrow existing Backend availability tests** to establish the current baseline before a new regression.

### Task 2: Add the failing regression at the actual break

**Files:**
- Test: the smallest existing availability spec that can reproduce the published current-week slot disappearance; create `sawiyaa-backend-v1/src/modules/availability/use-cases/availability-empty-slots.regression.spec.ts` only if no existing spec can express it.

- [ ] **Step 1: Write one test** that publishes/loads a current-week future slot and asserts the public availability contract contains it for both 30- and 60-minute-compatible requests.
- [ ] **Step 2: Add protection assertions** for past and booked slots in the same focused suite.
- [ ] **Step 3: Run only that test and verify it fails for the observed root cause**, not because of setup or a typo.

### Task 3: Implement the minimal root-cause fix

**Files:**
- Modify only the Backend or client file identified by Task 1 evidence.
- Test: the regression from Task 2.

- [ ] **Step 1: Change one boundary only** (date/week predicate, window construction, duration mapping, or client query/mapping) while preserving existing policy helpers.
- [ ] **Step 2: Run the focused regression and confirm it passes.**
- [ ] **Step 3: Refactor only if needed for clarity, without changing behavior.**

### Task 4: Verify Web/Mobile contract and cache behavior

**Files:**
- Inspect/modify only the affected Web/Mobile availability hook, API adapter, projection, or invalidation call.
- Test: existing Web tests under `sawiyaa-frontend-v1/src/features/practitioner-profile` and Mobile patient booking tests.

- [ ] **Step 1: Assert the Backend window shape survives client projection** and duration switching.
- [ ] **Step 2: Assert availability query keys distinguish date/range and refresh after publish where the existing mutation path exposes invalidation.**
- [ ] **Step 3: Run the focused Web and Mobile tests; do not add UI redesign or new scheduling policy.**

### Task 5: Full verification and closure artifact

**Files:**
- Create: `qa-artifacts/availability-empty-slots-investigation/AVAILABILITY-EMPTY-SLOTS-ROOT-CAUSE.md`
- Create if available: `qa-artifacts/availability-empty-slots-investigation/visual/`

- [ ] **Step 1: Run Backend targeted tests, typecheck, and build.**
- [ ] **Step 2: Run affected Web tests/typecheck/build and affected Mobile tests/typecheck.**
- [ ] **Step 3: Record reproduction evidence, root cause, exact layer where slots disappeared, fix, preserved rules, tests, visual QA availability, and remaining issues.**
- [ ] **Step 4: Select the final verdict strictly from fresh command evidence.**
