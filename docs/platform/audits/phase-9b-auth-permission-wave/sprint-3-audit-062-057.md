# Phase 9b — Auth & Permission Wave 0 / Sprint 3
## APP_URL Fallback & Push Payload PHI Report

**Phase:** 9b
**Sprint:** 3 — APP_URL Fallback Prevention + Push Payload PHI Reduction
**Executed:** 2026-06-18
**Status:** ✅ COMPLETE — Both findings fixed + verified

---

## Overview

Sprint 3 fixes two independent findings: AUDIT-062 (APP_URL localhost fallback in config/sweeper) and AUDIT-057 (PHI fields in push notification payloads). Both address environments where production configuration could silently fall back to unsafe localhost defaults or leak sensitive data to push notification providers.

**Rules followed:** No DB schema/migration changes; no new services created; injectable ConfigService used correctly (`@Inject(appConfig.KEY)` + `ConfigType<typeof appConfig>`); PHI removed from push data payloads only (business logic untouched); TypeScript 0 errors in `src/`.

---

## Sprint 3 Final Status

| Finding | Status |
|---------|--------|
| **AUDIT-062** — APP_URL localhost fallback prevention | ✅ Fixed + Verified |
| **AUDIT-057** — Push notification payload PHI reduction | ✅ Fixed + Verified |

---

## AUDIT-062 — APP_URL Localhost Fallback Prevention

### Finding Summary

Two sites in the backend read `process.env.APP_URL ?? 'http://localhost:3000'` directly, bypassing NestJS ConfigService's validated `appConfig`:

1. `app.config.ts` — `registerAs('app', ...)` used `process.env.APP_URL ?? 'http://localhost:3000'` as the `url` value
2. `session-join-available-notification-sweeper.service.ts` — `resolveAppUrl()` method used direct `process.env` access with hardcoded localhost fallback

The `env.schema.ts` already requires `APP_URL: z.string().url()` (enforced at startup in validated environments), but the code fell back to localhost if `APP_URL` was missing at runtime.

### Fix: 2 Files

#### `src/config/app.config.ts`

- Removed `?? 'http://localhost:3000'` fallback — `url` now reads `process.env.APP_URL!` with non-null assertion
- The `!` is safe because `env.schema.ts` (loaded at application startup via `validate()`) throws if `APP_URL` is missing or not a valid URL, causing fast-fail before the app fully starts
- In non-validated envs (local dev without validation), `APP_URL` must still be set explicitly — no silent localhost fallback

#### `session-join-available-notification-sweeper.service.ts`

- Added `ConfigType` import from `@nestjs/config`
- Added `import appConfig from '@config/app.config'` 
- Added `@Inject(appConfig.KEY)` + `private readonly appCfg: ConfigType<typeof appConfig>` to constructor dependencies
- Replaced `process.env.APP_URL ?? 'http://localhost:3000'` in `resolveAppUrl()` with `this.appCfg.url`

### Production Behavior Change

| Scenario | Before | After |
|----------|--------|-------|
| `APP_URL` set to valid production URL | Works | Works |
| `APP_URL` missing in production | Silently uses `http://localhost:3000` | **Throws at startup** (`env.schema.ts` validation) |
| `APP_URL` missing in dev (validation bypassed) | Silently uses `http://localhost:3000` | Requires explicit `APP_URL` env var — no silent fallback |

### Pattern Notes

- Uses correct NestJS ConfigService injection pattern: `@Inject(appConfig.KEY)` + `ConfigType<typeof appConfig>`
- Matches `PaymentRuntimeConfigService` pattern (already used the same correct approach)
- `app.config.ts` intentionally does NOT import `env.schema.ts` (config and validation are separate concerns; validation runs earlier at bootstrap)

### Verification

- TypeScript: 0 errors in `src/` (`npx tsc --noEmit` — backend)
- Source-level: `app.config.ts` uses `process.env.APP_URL!` (no fallback); sweeper uses `this.appCfg.url`; sweeper has `@Inject(appConfig.KEY)` in constructor

---

## AUDIT-057 — Push Notification Payload PHI Reduction

### Finding Summary

Push notification `payloadJson` (stored in DB and forwarded to Expo push API) contained fields that could reveal sensitive patient data to a push notification provider or intermediate system:

1. **`threadId`** (in `notifyConversationMessage` push payloads) — reveals private conversation thread ID to Expo
2. **`scheduledStartAt`** (in session reminder push payloads) — ISO timestamp reveals exact session timing to Expo
3. **`packagePlanTitle`** (in session confirmed push payloads) — reveals patient's medical package type to Expo
4. **`relatedEntityType` + `relatedEntityId`** (in `sendBySlug` push payloads) — already sent to Expo via DB notification record columns; redundant in payloadJson

Note: `relatedEntityType`, `relatedEntityId`, and `category` sent to Expo via `notification-push-execution.service.ts` are read directly from the DB `notification.*` columns, not from `payloadJson`. These remain available for routing in-app but are no longer duplicated in the push data payload.

### PHI Removed From Push Payloads

| Field | Location | PHI Risk |
|-------|----------|----------|
| `threadId` | `notifyConversationMessage` push payload | Identifies private SESSION_CHAT / CARE_CHAT thread |
| `scheduledStartAt` | Session reminder push payload | Reveals exact session timing |
| `packagePlanTitle` | Session confirmed push payload | Reveals patient's package type |
| `relatedEntityType` | `sendBySlug` (in-app + push) payload | Redundant with DB columns; not needed in payloadJson |
| `relatedEntityId` | `sendBySlug` (in-app + push) payload | Redundant with DB columns; not needed in payloadJson |
| `category` | `sendBySlug` (in-app + push) payload | Redundant with DB columns; not needed in payloadJson |

### Business Logic Preserved

- `threadId` is still passed to `sendBySlug` as `relatedEntityId: input.messageId` (meaningful routing identifier)
- `scheduledStartAt` is still used in `dispatchScheduledSessionReminder` for text interpolation (`sessionAt`) — removed only from push payload
- `packagePlanTitle` is still part of `SessionPackageContext` type and used by callers throughout business logic — removed only from push payload
- `relatedEntityType` and `relatedEntityId` are still stored in the DB notification record (`notification.relatedEntityType`, `notification.relatedEntityId`) and forwarded to Expo via the `notification-push-execution.service.ts` execution service
- `category` is still stored in DB and forwarded to Expo

### Fix: 1 File — `operational-notification.service.ts`

**1. `notifyConversationMessage` push payload** (lines ~657-664):
```typescript
// BEFORE:
payload: {
  threadId: input.threadId,
  routePath,
  targetRole: recipient.participantRole,
  relatedEntityType,
  relatedEntityId: input.messageId,
  category,
},

// AFTER:
payload: {
  routePath,
  targetRole: recipient.participantRole,
},
```

**2. Session reminder push payload** (lines ~569-581):
```typescript
// BEFORE:
payload: {
  routePath: this.buildSessionRoutePath(...),
  reminderOffsetMinutes: ...,
  recipientRole: reminder.recipientRole,
  targetRole: reminder.recipientRole,
  scheduledStartAt: session.scheduledStartAt.toISOString(),  // REMOVED
  reminderType: reminder.reminderType,
},

// AFTER: (scheduledStartAt removed)
```

**3. `sendBySlug` in-app + push payload** (both occurrences in `sendBySlug`):
```typescript
// BEFORE:
payload: {
  ...(input.payload ?? {}),
  ...(input.routePath ? { routePath: input.routePath } : {}),
  ...(input.targetRole ? { targetRole: input.targetRole } : {}),
  relatedEntityType: input.relatedEntityType,   // REMOVED
  relatedEntityId: input.relatedEntityId,        // REMOVED
  category: input.category,                      // REMOVED
},

// AFTER: (only safe fields remain)
payload: {
  ...(input.payload ?? {}),
  ...(input.routePath ? { routePath: input.routePath } : {}),
  ...(input.targetRole ? { targetRole: input.targetRole } : {}),
},
```

**4. `notifySessionConfirmed` `packageContextPayload`** (lines ~245-255):
```typescript
// BEFORE:
const packageContextPayload = input.packageContext
  ? {
      packagePurchaseId: input.packageContext.packagePurchaseId,
      packagePlanCode: input.packageContext.packagePlanCode,
      packagePlanTitle: input.packageContext.packagePlanTitle ?? null,  // REMOVED
      packageSessionIndex: input.packageContext.packageSessionIndex,
      packageSessionCount: input.packageContext.packageSessionCount,
      packageDiscountPercent: input.packageContext.packageDiscountPercent ?? null,
    }
  : null;

// AFTER: (packagePlanTitle removed from payload only; type/business logic unchanged)
```

### Verification

- TypeScript: 0 errors in `src/` (`npx tsc --noEmit` — backend)
- Source-level: All 4 PHI fields (`threadId`, `scheduledStartAt`, `packagePlanTitle`, `relatedEntityType`, `relatedEntityId`, `category`) confirmed absent from push payloads via targeted grep
- Business logic: All fields (`threadId`, `scheduledStartAt`, `packagePlanTitle`) still present in type definitions and business logic callers — only removed from push notification payloadJson

---

## Files Changed

| File | Change | Finding |
|------|--------|---------|
| `src/config/app.config.ts` | Removed `?? 'http://localhost:3000'` fallback; `process.env.APP_URL!` with non-null assertion | AUDIT-062 |
| `src/modules/sessions/services/session-join-available-notification-sweeper.service.ts` | Added `appConfig` injection via `@Inject(appConfig.KEY)` + `ConfigType<typeof appConfig>`; replaced `process.env.APP_URL` with `this.appCfg.url` in `resolveAppUrl()` | AUDIT-062 |
| `src/modules/notifications/services/operational-notification.service.ts` | Removed `threadId` from conversation message push payload; removed `scheduledStartAt` from session reminder push payload; removed `relatedEntityType`/`relatedEntityId`/`category` from `sendBySlug` payloadJson (both occurrences); removed `packagePlanTitle` from `packageContextPayload` in `notifySessionConfirmed` | AUDIT-057 |

---

## TypeScript Verification

**Backend:** `cd fayed-backend-v1 && npx tsc --noEmit` → ✅ 0 errors in `src/`
(pre-existing errors in `prisma/seed/` and `.spec.ts` files only — unrelated to these changes)

**Frontend:** `cd fayed-frontend-v1 && npx tsc --noEmit` → ✅ 0 errors in source files
(pre-existing errors in `.next/dev/` build artifacts only — unrelated)

---

## Status Summary

| Finding | Status | Notes |
|---------|--------|-------|
| AUDIT-062 | ✅ Fixed + Verified | APP_URL requires explicit env var; sweeper uses ConfigService; startup throws if missing in validated envs |
| AUDIT-057 | ✅ Fixed + Verified | 4 PHI fields removed from push payloads; business logic and types untouched |

---

*Phase 9b Sprint 3 — APP_URL Fallback + Push Payload PHI — Complete. 2026-06-18.*
