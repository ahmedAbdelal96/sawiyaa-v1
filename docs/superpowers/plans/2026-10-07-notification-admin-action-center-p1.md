# Notification Admin Action Center P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the leaking global Admin notification bell with an explicit allowlisted Action Center, preserve Delivery Operations and user feeds, and route known notifications through one backend-owned canonical action contract without a schema migration.

**Architecture:** Add one typed notification policy catalog beside the existing baseline contract. The Admin Action Center queries only policy-approved existing reviewer/action families; Delivery Operations retains the current delivery-state query under separate semantics. Normalize the existing enrichment `primaryAction` into the backend response and make web consumers use it, leaving producers and delivery state unchanged.

**Tech Stack:** NestJS, Prisma client types, Jest, Next.js/React, TanStack Query, next-intl, existing Playwright/local QA tooling.

**Spec:** `C:/Users/IT/.codex/attachments/3620cc80-4a49-4d0b-88d7-b3e421267fc4/Pasted text.txt`

## Global Constraints

- Admin Action Center uses explicit allowlist/classification; unknown/new types default to not visible.
- Do not create Admin copies of routine Patient/Practitioner notifications.
- Delivery Operations remains separate from Action Center.
- `/admin/notifications/:id` is fallback/diagnostics only.
- Backend owns canonical action semantics; frontend consumes the contract.
- Runtime inventory is 41 notification types / 53 templates; report template gaps separately.
- Repair only the confirmed corrupted Arabic string.
- No schema migration.
- Do not implement retention, partitioning, provider rate limiting, queue tuning, or broad audit redesign.
- Do not invent new Admin exception notification producers.
- Preserve user feeds, producers, templates, queue behavior, idempotency, delivery fallback, preferences, and timing.
- Do not touch Automatic Session Completion changes.
- Do not commit, push, deploy, or stage files.

## Review Focus

- A new or unknown type must not enter Action Center by default — covered by policy unit tests.
- A participant delivery row must remain visible in Delivery Operations but absent from Action Center — covered by repository/use-case tests.
- Admin action routes must be canonical and role-authorized rather than trusting payload href — covered by resolver tests.
- Missing/stale action data must use generic diagnostics fallback — covered by frontend resolver tests.
- Admin bell must not enrich routine participant rows — covered by projection spy/count tests and synthetic check.

---

### Task 1: Reconcile inventory and define the typed policy catalog

**Files:**
- Modify: `sawiyaa-backend-v1/prisma/seed/modules/notification-baseline.contract.ts`
- Create: `sawiyaa-backend-v1/src/modules/notifications/policies/notification-policy.catalog.ts`
- Modify: `sawiyaa-backend-v1/prisma/seed/modules/notifications.seed.ts` only for the confirmed corrupted Arabic string
- Test: `sawiyaa-backend-v1/src/modules/notifications/policies/notification-policy.catalog.spec.ts`
- Test/modify: existing notification baseline/seed contract tests if present

**Interfaces:**
- Produces `NOTIFICATION_POLICY_CATALOG`, `NotificationPolicy`, and helpers `getNotificationPolicy(slug)` and `isAdminActionCenterVisible(slug)`.
- Policy metadata includes `purpose`, `audienceKind`, `adminActionCenterVisible`, `deliveryOperationsVisible`, `actionKind`, and optional `priority`.

- [ ] **Step 1: Write failing tests** for 41 unique runtime slugs, 53 template slugs remaining accounted for, unknown slug defaulting to not visible, routine session/payment/message/availability types being false, `moderation.report-created` being true, and the confirmed Arabic source string being valid Arabic text.
- [ ] **Step 2: Run the focused policy/seed tests** and verify they fail for the stale 37-type contract, missing policy catalog, unknown-policy behavior, and corrupted copy.
- [ ] **Step 3: Add the four runtime type slugs to the authoritative baseline contract without deleting any valid type; create the typed catalog with explicit entries for all 41 slugs and safe default behavior for unknown types; repair only the corrupted Arabic reminder string.**
- [ ] **Step 4: Run the focused tests again** and verify all inventory, policy, and copy assertions pass.
- [ ] **Step 5: Run the full existing backend notification test command** and record any unrelated pre-existing failures without changing unrelated code.

### Task 2: Split Admin Action Center projection from Delivery Operations

**Files:**
- Modify: `sawiyaa-backend-v1/src/modules/notifications/policies/admin-notification-feed.policy.ts` or replace its semantic use with the typed catalog
- Modify: `sawiyaa-backend-v1/src/modules/notifications/repositories/operational-notification.repository.ts`
- Modify: `sawiyaa-backend-v1/src/modules/notifications/use-cases/list-admin-operational-notifications.use-case.ts`
- Modify/create: Admin Action Center DTO/presenter types under `sawiyaa-backend-v1/src/modules/notifications/{dto,presenters,use-cases}`
- Test: focused policy, repository, and use-case tests under `sawiyaa-backend-v1/src/modules/notifications`

**Interfaces:**
- Action Center query returns only explicitly visible action-center rows and uses a bounded projection without context enrichment for routine rows.
- Delivery Operations query preserves current diagnostic filters and can inspect failed Patient/Practitioner rows.
- Existing producer and user notification APIs remain unchanged.

- [ ] **Step 1: Write failing tests** proving all six routine session reminder slugs, participant messages, payment success, practitioner earning, and availability are absent from Action Center; `moderation.report-created` is present; failed participant delivery is absent from Action Center but available in Delivery Operations; unknown type is absent.
- [ ] **Step 2: Run the projection tests** and verify they fail because the current implementation uses the global notification query and denylist.
- [ ] **Step 3: Implement explicit allowlist/classification-based Action Center projection.** Do not add Admin notification rows, do not alter reminder producers, and do not call enrichment for routine non-action rows. Preserve current Delivery Operations query under explicit operations naming.
- [ ] **Step 4: Run the projection tests** and verify the required audience and delivery separation passes.
- [ ] **Step 5: Run all backend notification tests** and verify no producer, queue, preference, or user-feed regressions.

### Task 3: Normalize the backend canonical primary action contract

**Files:**
- Modify: `sawiyaa-backend-v1/src/modules/notifications/services/notification-context-enrichment.service.ts`
- Modify: `sawiyaa-backend-v1/src/modules/notifications/presenters/notification-ops.presenter.ts`
- Modify: `sawiyaa-backend-v1/src/modules/notifications/presenters/user-notifications.presenter.ts` if required for the shared contract
- Modify: `sawiyaa-backend-v1/src/modules/notifications/types/user-notifications.types.ts`
- Test: `notification-context-enrichment.service.spec.ts`, presenter tests, and routing contract tests

**Interfaces:**
- `primaryAction` has stable fields: `kind`, `targetType`, `targetId`, `href`, and `label` where available.
- Action hrefs are generated from recognized domain relationships and role, not trusted blindly from arbitrary payload values.
- Unknown/stale targets produce no actionable target and remain eligible for generic diagnostics fallback.

- [ ] **Step 1: Write failing tests** for patient/practitioner session actions, moderation action, conversation/support action, payment/refund action, unknown action, and stale target behavior.
- [ ] **Step 2: Run the action tests** and verify current action shape/role behavior fails or routes Admin to `/admin`/generic behavior.
- [ ] **Step 3: Normalize the existing enrichment/presenter contract without creating a second routing system.** Keep existing relationship lookups and preserve payload compatibility for older clients.
- [ ] **Step 4: Run focused backend action/presenter tests** and verify canonical fields and safe fallback behavior.
- [ ] **Step 5: Run the full backend notification suite** and verify user feed output remains compatible.

### Task 4: Make the Admin header consume Action Center and canonical actions

**Files:**
- Modify: `sawiyaa-frontend-v1/src/components/header/NotificationDropdown.tsx`
- Modify: `sawiyaa-frontend-v1/src/features/notifications/lib/resolve-notification-click-target.ts`
- Modify: Admin notification types/API hook files only as needed for Action Center vs Delivery Operations semantics
- Modify: existing Admin notification translations only for labels required by this feature
- Test: resolver tests and Admin notification component tests under `sawiyaa-frontend-v1/src`

**Interfaces:**
- Admin dropdown consumes Action Center response and `primaryAction`.
- Known action → canonical domain href; unknown/stale/diagnostic → `/admin/notifications/:id`.
- `/admin/notifications` is labeled Delivery Operations; the bell is labeled Action Center.

- [ ] **Step 1: Write failing frontend tests** for known moderation route, known patient/practitioner session route, generic fallback, and Admin dropdown link behavior.
- [ ] **Step 2: Run the focused frontend tests** and verify the current hardcoded `/admin/notifications/:id` behavior fails the known-action assertions.
- [ ] **Step 3: Update the resolver and dropdown to use the backend contract.** Remove the unconditional Admin generic link; retain generic fallback only when canonical action is missing/invalid. Avoid frontend-only slug routing beyond compatibility normalization.
- [ ] **Step 4: Run the focused frontend tests and typecheck** and verify route behavior and labels.
- [ ] **Step 5: Run targeted ESLint for changed frontend files** and record results.

### Task 5: Add authenticated QA and synthetic projection verification

**Files:**
- Create: `qa-artifacts/notification-admin-action-center-p1/NOTIFICATION-ADMIN-ACTION-CENTER-P1-CLOSURE.md`
- Create: local-only QA screenshots/scripts outside committed source as required by the frontend testing workflow
- Modify: no production implementation files unless a failing QA result is fixed through TDD

- [ ] **Step 1: Create disposable local fixtures** for routine participant reminders, participant message/payment rows, failed delivery, and moderation report action without sending real providers.
- [ ] **Step 2: Run the old-vs-new shadow comparison** and record which old global-feed items disappear from Action Center and why, while keeping Delivery Operations visibility.
- [ ] **Step 3: Run the bounded synthetic 1,000-reminder projection check** and record rows created, Action Center rows/count, Delivery Operations availability, query/enrichment call counts, and participant-feed validity.
- [ ] **Step 4: Run authenticated local QA** for Admin Action Center, Delivery Operations, Patient reminder, Practitioner reminder, canonical click routes, and generic diagnostics fallback at desktop and mobile-sized viewports where practical.
- [ ] **Step 5: Write the closure artifact** with exact changed files, tests, routes/results, synthetic results, no-schema statement, and deferred P2 items.

### Task 6: Final verification and scope audit

**Files:**
- Read-only review of all changed files and current working tree.

- [ ] **Step 1: Run focused backend tests, focused frontend tests, backend typecheck if backend files changed, frontend typecheck, targeted ESLint, i18n/copy checks, and `git diff --check`.**
- [ ] **Step 2: Verify no Prisma schema/migration/config/production env/mobile/session-completion files were modified by this task.**
- [ ] **Step 3: Verify no files are staged and no commit/push/deploy occurred.**
- [ ] **Step 4: Review the final diff and closure artifact against every non-negotiable boundary.**
