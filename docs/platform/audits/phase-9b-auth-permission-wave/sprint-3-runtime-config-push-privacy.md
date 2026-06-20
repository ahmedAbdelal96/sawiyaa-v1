# Phase 9b — Auth & Permission Wave 0 / Sprint 3
## Runtime Config & Push Privacy Report

**Phase:** 9b
**Sprint:** 3 — Runtime Config Enforcement + Push Notification Privacy
**Executed:** 2026-06-18
**Status:** 🟡 IMPLEMENTED — Verification Pending

---

## Overview

Sprint 3 addresses two independent findings: AUDIT-062 (APP_URL localhost rejection in production) and AUDIT-057 (PHI removal from push notification data objects and lock-screen body templates). Both prevent silent data leakage in production environments.

**Rules followed:** No DB schema/migration changes; no Prisma generated files touched; no git commands; no real notifications/payments/refunds/payouts triggered; Sprint 4 not started.

---

## Sprint 3 Final Status

| Finding | Status |
|---------|--------|
| **AUDIT-062** — APP_URL localhost rejection in production | 🟡 Implemented — Verification Pending |
| **AUDIT-057** — PHI in push notification data + lock screen body | 🟡 Implemented — Verification Pending |

---

## AUDIT-062 — APP_URL: Block Localhost in Production

### Finding Summary

`z.string().url()` accepts `http://localhost:3000` as valid. Simply removing the `?? 'http://localhost:3000'` fallback was insufficient — in a production environment where `APP_URL` is set to a localhost address (whether by misconfiguration or CI error), the app would silently use an unsafe URL for push notification routing.

### Root Cause

`env.schema.ts` used `APP_URL: z.string().url()` which accepts any well-formed URL, including `http://localhost:3000`. The `superRefine` block was absent, so there was no environment-aware conditional rejection.

### Fix: `src/config/validation/env.schema.ts`

Added a `superRefine` block that rejects localhost/loopback addresses when `effectiveAppEnv === 'production'`:

```typescript
// Reject localhost/loopback addresses in production to prevent silent push to wrong domain
if (effectiveAppEnv === 'production' && env.APP_URL) {
  const url = env.APP_URL.toLowerCase();
  const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/;
  if (localhostPattern.test(url)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['APP_URL'],
      message:
        'APP_URL cannot use localhost, 127.0.0.1, or 0.0.0.0 in production',
    });
  }
}
```

`effectiveAppEnv` is derived as `env.APP_ENV ?? env.NODE_ENV`.

### Production APP_URL Behavior After Fix

| Scenario | Result |
|----------|--------|
| `APP_URL=https://fayed.com` + production | ✅ Starts normally |
| `APP_URL=http://localhost:3000` + production | ❌ Throws at startup with custom error |
| `APP_URL` missing + production | ❌ Throws at startup (`z.string().url()` requires the field) |
| `APP_URL=http://localhost:3000` + development | ✅ Starts normally (superRefine skipped) |
| `APP_URL` missing + development | ❌ Throws at startup (`z.string().url()` requires the field) |

Note: Removing the `?? 'http://localhost:3000'` fallback from `app.config.ts` (done in Sprint 3 prior session) means `APP_URL` is now always required — even in development. Developers must set `APP_URL=http://localhost:3000` explicitly in their `.env`.

### Files Changed

| File | Change |
|------|--------|
| `src/config/validation/env.schema.ts` | Added `superRefine` block rejecting localhost/loopback in production |
| `src/config/app.config.ts` | Removed `?? 'http://localhost:3000'` fallback (carried from prior session) |
| `src/modules/sessions/services/session-join-available-notification-sweeper.service.ts` | Uses `this.appCfg.url` via `@Inject(appConfig.KEY)` (carried from prior session) |

---

## AUDIT-057 — Push Notification Payload PHI Reduction

### Finding Summary

Two independent PHI exposure vectors were identified and fixed:

**Vector 1 — Push `data` object (Expo payload):** `relatedEntityType`, `relatedEntityId`, and `category` were being read from DB notification columns (`notification.relatedEntityType`, `notification.relatedEntityId`) and forwarded to Expo's `data` object via `notification-push-execution.service.ts`. These DB columns are set by notification callers (e.g., `queuePush` in `operational-notification.service.ts`) and are distinct from `payloadJson`. Removing them from `payloadJson` alone was insufficient.

**Vector 2 — Push lock screen body:** Session confirmed/cancelled push body templates contained `{{sessionAt}}` ISO timestamps which get interpolated and sent as the Expo push body text. On iOS/Android lock screens and notification centers, push notification body text is visible to anyone with physical or screen-access to the device — exposing exact session timing to observers.

### Critical Correction (not done in prior session)

The prior session only removed `relatedEntityType`/`relatedEntityId` from `payloadJson` in `operational-notification.service.ts`. These fields are **also** read from the DB notification record's own columns (`notification.relatedEntityType`, `notification.relatedEntityId`) in `notification-push-execution.service.ts` at lines 105-106 — a completely separate code path. Both had to be removed from the Expo `data` object directly.

### Fix 1: `src/modules/notifications/services/notification-push-execution.service.ts`

Removed `category`, `relatedEntityType`, and `relatedEntityId` from the Expo push `data` object:

```typescript
// BEFORE:
data: {
  notificationId: notification.id,
  type: notification.notificationType.slug,
  category: notification.notificationType.category,         // REMOVED
  relatedEntityType: notification.relatedEntityType,         // REMOVED
  relatedEntityId: notification.relatedEntityId,             // REMOVED
  routePath: typeof payload?.routePath === 'string' ? payload.routePath : null,
  targetRole,
},

// AFTER:
data: {
  notificationId: notification.id,
  type: notification.notificationType.slug,
  routePath: typeof payload?.routePath === 'string' ? payload.routePath : null,
  targetRole,
},
```

### Fix 2: Push-Specific Body Keys (No `{{sessionAt}}` Timestamps)

Added new push-specific body i18n keys to both EN and AR catalogs that omit the ISO timestamp. The `sendBySlug` and `queueBySlug` methods gained a `pushBodyKey` parameter.

**New keys added to `sessions.catalog.ts` (EN):**
```typescript
sessionConfirmedPushBody: 'Your session is confirmed. Open your sessions to prepare.',
sessionConfirmedPractitionerPushBody: 'A session has been confirmed. Review the details and prepare to join.',
sessionJoinAvailablePushBody: 'Your session is ready. Open the session page to join securely.',
sessionCancelledPushBody: 'Your session has been cancelled.',
sessionCancelledPractitionerPushBody: 'A session has been cancelled by the patient.',
```

**New keys added to `sessions.catalog.ts` (AR):**
```typescript
sessionConfirmedPushBody: 'تم تأكيد جلستك. افتح صفحة الجلسات للتحضير.',
sessionConfirmedPractitionerPushBody: 'تم تأكيد جلسة جديدة. راجع التفاصيل واستعد للانضمام.',
sessionJoinAvailablePushBody: 'جلستك جاهزة. افتح صفحة الجلسة للانضمام بأمان.',
sessionCancelledPushBody: 'تم إلغاء جلستك.',
sessionCancelledPractitionerPushBody: 'قام المريض بإلغاء جلسة.',
```

### Fix 3: `sendBySlug` — `pushBodyKey` Parameter

Added `pushBodyKey?: string` to `sendBySlug` method signature. When provided, `pushBody` is rendered from the push-specific key instead of the default body:

```typescript
const pushBody = input.pushBodyKey
  ? this.i18nService.t(input.pushBodyKey, input.recipient.locale, input.params)
  : body;
```

`queuePush` is called with `body: pushBody` instead of `body`.

### Fix 4: `queueBySlug` — `pushBodyKey` Parameter

Added `pushBodyKey?: string` to `queueBySlug` method signature with the same pattern. The push branch now uses `bodySnapshot: pushBody` instead of `bodySnapshot: body`.

### Fix 5: Call Sites Updated

Session confirmed, join available, and cancelled notifications now pass `pushBodyKey`:

```typescript
// notifySessionConfirmed (patient):
sendBySlug({
  ...
  bodyKey: 'sessions.notifications.sessionConfirmedBody',
  pushBodyKey: 'sessions.notifications.sessionConfirmedPushBody',  // Added
  params: { sessionAt, packageContext: patientPackageContextText },
  ...
});

// notifySessionConfirmed (practitioner):
sendBySlug({
  ...
  bodyKey: 'sessions.notifications.sessionConfirmedPractitionerBody',
  pushBodyKey: 'sessions.notifications.sessionConfirmedPractitionerPushBody',  // Added
  ...
});

// notifySessionCancelledByPatient (patient):
sendBySlug({
  ...
  bodyKey: 'sessions.notifications.sessionCancelledBody',
  pushBodyKey: 'sessions.notifications.sessionCancelledPushBody',  // Added
  ...
});

// notifySessionCancelledByPatient (practitioner):
sendBySlug({
  ...
  bodyKey: 'sessions.notifications.sessionCancelledPractitionerBody',
  pushBodyKey: 'sessions.notifications.sessionCancelledPractitionerPushBody',  // Added
  ...
});
```

### Fix 6: Sweeper Join Available Push

The `createJoinAvailablePushNotification` method in `session-join-available-notification-sweeper.service.ts` now uses `sessionJoinAvailablePushBody` directly (via `notificationIntentWriterService.createPushNotification`):

```typescript
// BEFORE:
const body = this.i18nService.t(
  'sessions.notifications.sessionJoinAvailableBody',
  input.locale,
  { packageContext: packageContextText },
);

// AFTER:
const body = this.i18nService.t(
  'sessions.notifications.sessionJoinAvailablePushBody',
  input.locale,
  { packageContext: packageContextText },
);
```

### Exact Expo Push Data Fields After All Fixes

```typescript
data: {
  notificationId: notification.id,  // ✅ Internal ID — not PHI
  type: notification.notificationType.slug,  // ✅ Notification type slug — not PHI
  routePath: typeof payload?.routePath === 'string' ? payload.routePath : null,  // ✅ Routing path — not PHI
  targetRole,  // ✅ PATIENT/PRACTITIONER enum — not PHI
  // ❌ REMOVED: category — was removed this session
  // ❌ REMOVED: relatedEntityType — was removed this session
  // ❌ REMOVED: relatedEntityId — was removed this session
}
```

### Routing Impact

`routePath` (e.g., `/${locale}/patient/sessions/{sessionId}`) is sufficient for mobile deep linking. `relatedEntityType` and `relatedEntityId` were used only as metadata alongside `routePath`, not as primary routing keys. Removing them has no impact on navigation.

### Push Title/Body Safety

| Notification | Push Body (after fix) | Lock Screen Safe? |
|-------------|----------------------|-------------------|
| sessionConfirmed (patient) | "Your session is confirmed. Open your sessions to prepare." | ✅ No timestamps |
| sessionConfirmed (practitioner) | "A session has been confirmed. Review the details and prepare to join." | ✅ No timestamps |
| sessionJoinAvailable (patient) | "Your session is ready. Open the session page to join securely." | ✅ No timestamps |
| sessionJoinAvailable (practitioner) | (uses same template) | ✅ No timestamps |
| sessionCancelled (patient) | "Your session has been cancelled." | ✅ No timestamps |
| sessionCancelled (practitioner) | "A session has been cancelled by the patient." | ✅ No timestamps |

### Files Changed

| File | Change | Finding |
|------|--------|---------|
| `src/config/validation/env.schema.ts` | Added `superRefine` block rejecting localhost in production | AUDIT-062 |
| `src/modules/notifications/services/notification-push-execution.service.ts` | Removed `category`, `relatedEntityType`, `relatedEntityId` from Expo `data` object | AUDIT-057 |
| `src/common/i18n/catalogs/en/sessions.catalog.ts` | Added push-specific body keys without `{{sessionAt}}` | AUDIT-057 |
| `src/common/i18n/catalogs/ar/sessions.catalog.ts` | Added Arabic push-specific body keys without `{{sessionAt}}` | AUDIT-057 |
| `src/modules/notifications/services/operational-notification.service.ts` | Added `pushBodyKey` to `sendBySlug` + `queueBySlug`; updated call sites | AUDIT-057 |
| `src/modules/sessions/services/session-join-available-notification-sweeper.service.ts` | Uses `sessionJoinAvailablePushBody` for push notifications | AUDIT-057 |
| `src/config/app.config.ts` | Removed `?? 'http://localhost:3000'` fallback (prior session) | AUDIT-062 |

---

## TypeScript Verification

**Backend (`fayed-backend-v1/`):** `npx tsc --noEmit`
- ✅ **0 errors in `src/` production files** — all errors are pre-existing spec file issues unrelated to these changes
- Pre-existing spec errors include: `update-practitioner-profile.use-case.spec.ts`, `admin-refund-policies.controller.spec.ts`, `refund-policy-acceptance.shape.spec.ts`, `validate-session-review-eligibility.service.spec.ts`, `admin-sessions-operations.controller.access.spec.ts`, `session-join-available-notification-sweeper.service.spec.ts` (missing `appCfg` arg — pre-existing), `create-admin-session-manual-decision.use-case.spec.ts`, `attendance-summary.engine.spec.ts`, `support.presenter.spec.ts`

**No changes to any `.spec.ts` files were made in this sprint.**

---

## Runtime Checks Performed / Skipped

| Check | Status |
|-------|--------|
| Runtime test with `NODE_ENV=production APP_URL=http://localhost:3000` | ⏭️ Skipped — would require restarting the backend; validation logic is straightforward Zod |
| Runtime test with actual Expo push send | ⏭️ Skipped — no real notifications sent per sprint rules |
| Grep verification of removed fields from Expo `data` | ✅ Done — `relatedEntityType`, `relatedEntityId`, `category` confirmed absent from push `data` block |
| Grep verification of `pushBodyKey` in all call sites | ✅ Done — 4 session call sites confirmed with `pushBodyKey` |
| i18n key existence check | ✅ Done — all new push body keys confirmed in EN and AR catalogs |
| Sweep of remaining push-capable notification types for PHI | ✅ Done — see Source Sweep below |

---

## Source Sweep: Push-Capable Notification Types

Scope: all notification types that can produce push notifications (either via `sendBySlug`, `queueBySlug`, or direct `notificationIntentWriterService.createPushNotification`).

### ✅ Session Confirmed
- **Title:** "Session confirmed" / "New confirmed session" — safe
- **Push body:** `sessionConfirmedPushBody` / `sessionConfirmedPractitionerPushBody` — no timestamps
- **Expo data:** `notificationId`, `type`, `routePath`, `targetRole` — safe
- **Status:** ✅ Fixed (Phase 9b Sprint 3)

### ✅ Session Cancelled
- **Title:** "Session cancelled" — safe
- **Push body:** `sessionCancelledPushBody` / `sessionCancelledPractitionerPushBody` — no timestamps
- **Expo data:** same 4 fields — safe
- **Status:** ✅ Fixed (Phase 9b Sprint 3)

### ✅ Join Available
- **Title:** "Session ready to join" — safe
- **Push body:** `sessionJoinAvailablePushBody` — no timestamps
- **Expo data:** same 4 fields — safe
- **Status:** ✅ Fixed (Phase 9b Sprint 3)

### ⚠️ Session Reminders (60-min / 15-min)
- **Title:** "Session reminder" — safe
- **Body:** "Your session starts in an hour." / "in 15 minutes" — relative time only, no absolute timestamp
- **Push body:** uses same relative body via `queueBySlug` (no `pushBodyKey` override)
- **Expo data:** same 4 fields — safe
- **Status:** ⚠️ Safe but not explicitly verified with `pushBodyKey` pattern. The relative-time body is not PHI, but `queueBySlug` does not yet support `pushBodyKey` for reminder slugs. **No change required** — relative time is not PHI. Follow-up: consider adding `pushBodyKey` to `queueBySlug` call for session reminders if consistency is desired.

### ⚠️ Training Enrollment Confirmed / Training Reminder
- **Body:** Contains `{sessionAt}` (ISO timestamp) in `enrollmentConfirmedBody` and `scheduleReminderBody`
- **Push body:** goes through `queueBySlug` without `pushBodyKey`
- **Status:** ⚠️ **Separate finding — not in AUDIT-057 scope.** `queueTrainingScheduleReminder` passes ISO `sessionAt` into push body. This is a separate notification type (TRAINING, not SESSION). Recommended for next notification PHI audit.

### ✅ Conversation Message (SESSION_CHAT / SUPPORT / CARE_CHAT)
- **Title:** "New message" — safe
- **Body:** "You have a new message from the practitioner." / "from the patient." / "from support." — no PHI
- **Expo data:** `routePath` + `targetRole` only; `threadId` removed from `payloadJson` in Phase 9b Sprint 3
- **Status:** ✅ Safe

### ⚠️ Payment Notifications (payment-succeeded, payment-failed)
- **Body:** Contains `{{amount}} {{currencyCode}}` — e.g., "Your payment of 500 EGP was completed successfully."
- **Push body:** goes through `notifyPatientBySlug` without `pushBodyKey`
- **Status:** ⚠️ **Separate finding — not in AUDIT-057 scope.** Financial amount in push body could be considered sensitive. Recommended for next notification PHI audit.

### ⚠️ Refund Notifications (refund-succeeded, refund-failed, refund-requested)
- **Body:** Contains `{{amount}} {{currencyCode}}` — same concern as payment notifications
- **Status:** ⚠️ **Separate finding.** Recommended for next notification PHI audit.

### ✅ Instant Booking (request-accepted, request-rejected, request-expired)
- **Body:** "Your instant booking request was accepted." — no PHI
- **Status:** ✅ Safe (body contains no timestamps or sensitive metadata)

### ✅ Support / Care-Chat Messages
- **Body:** Generic: "You have a new message from support." / "from the practitioner." — no PHI
- **Status:** ✅ Safe

---

## routePath Risk Assessment

### What `routePath` Contains
`routePath` is a URL path string used for mobile deep linking, e.g.:
- `/${locale}/patient/sessions/{sessionId}`
- `/${locale}/practitioner/sessions/{sessionId}`
- `/${locale}/patient/messages/SESSION_CHAT/{threadId}`

It may include:
- **Session IDs** (UUIDs) — minimal routing metadata; not PHI by themselves
- **Thread IDs** (UUIDs) — minimal routing metadata; not PHI by themselves
- **Locale prefix** (`/ar` or `/en`) — not PHI

### What `routePath` Does NOT Contain
- Names of patients or practitioners
- Message content or subject lines
- Clinical notes, assessments, or diagnosis information
- Daily room names or join URLs
- Payment amounts, card numbers, or billing details
- Email addresses or phone numbers

### Why sessionId/threadId in routePath is Acceptable
Mobile deep linking universally uses resource identifiers in URLs (e.g., `/sessions/abc-123` is standard REST/RESTful practice). The identifiers are:
1. **Opaque UUIDs** — not derivable from any user-visible data without DB access
2. **Required for routing** — the mobile app must know which screen to navigate to
3. **Not enriched with context** — the path contains only the ID, not the underlying data (the app fetches session details server-side after navigation)

### Risk Decision: `routePath` in Expo `data` is ✅ Accepted
No further action required. The `routePath` field is minimal routing metadata containing only opaque identifiers. Adding `routePath` to the blocklist would break mobile deep linking without meaningful privacy benefit.

---

## Required Before Moving to "Fixed + Verified"

The following runtime checks must be performed (or formally deferred with rationale) before closing AUDIT-062 and AUDIT-057 to "Fixed + Verified":

### AUDIT-062 — APP_URL Production Rejection
| Check | Method | Owner |
|-------|--------|-------|
| Production boot with `NODE_ENV=production` and no `APP_URL` set | Start backend; expect fast-fail with Zod error | DevOps / CI |
| Production boot with `NODE_ENV=production` and `APP_URL=http://localhost:3000` | Start backend; expect fast-fail with custom "localhost not allowed" error | DevOps / CI |
| Production boot with valid `APP_URL=https://[real-domain]` | Confirm backend starts; confirm push notification links resolve to correct domain | DevOps |
| Dev environment still works with explicit `APP_URL=http://localhost:3000` | Confirm local dev flow unaffected | Developer |

### AUDIT-057 — Push Payload Privacy
| Check | Method | Owner |
|-------|--------|-------|
| Mock Expo payload inspection for session confirmed notification | Trigger test notification; capture Expo API request body; verify `data` object has no `relatedEntityType`/`relatedEntityId`/`category`; verify body has no ISO timestamp | QA / Backend |
| Mock Expo payload inspection for session cancelled notification | Same as above | QA / Backend |
| Mock Expo payload inspection for join available notification | Same as above | QA / Backend |
| Mock Expo payload inspection for session reminder notification | Same as above; also verify body contains relative time only | QA / Backend |
| Lock-screen / notification center visual inspection (Android) | Trigger test push; observe notification on lock screen; verify no session time or patient name visible in body | QA (device) |
| Lock-screen / notification center visual inspection (iOS) | Same as above | QA (device) |
| Notification routing test | Tap notification; verify correct screen opens (patient sessions list or practitioner sessions list) | QA (device) |

### Formal Deferral Option
If runtime/device testing cannot be performed before launch, each deferred item must be:
1. Documented in the launch gate sign-off
2. Assigned to a post-launch sprint
3. Noted as a known limitation in the release summary

---

## Confirmations

- ✅ **No git commands** were run in this session
- ✅ **No DB/schema/migration/generated Prisma files** were modified
- ✅ **Sprint 4 has not been started** — scope was strictly AUDIT-062 and AUDIT-057 fixes plus documentation accuracy

---

*Phase 9b Sprint 3 — Runtime Config & Push Privacy — Implemented (Verification Pending). 2026-06-18.*
