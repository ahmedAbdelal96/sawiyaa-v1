# Phase 4 — Runtime Security Hardening: Completion Summary

**Scope**: Backend only. No frontend/mobile changes. No destructive DB migrations. No business logic changes.

---

## 1. What Was Implemented

### 1.1 Real Rate Limiting / Throttle Enforcement

**New files:**

- `src/common/constants/auth-metadata.constants.ts` — `THROTTLE_POLICY_KEY = 'auth:throttle-policy'`
- `src/common/decorators/throttle-policy.decorator.ts` — `@ThrottlePolicy('key')` metadata decorator
- `src/common/throttle/throttle-policy-config.ts` — Named policy limits (limit + windowMs) for 12 auth endpoints
- `src/common/throttle/throttle-store.service.ts` — In-memory TTL-based rate-limit store (Redis-replaceable)
- `src/common/throttle/throttle-policy.guard.ts` — Guard that reads `@ThrottlePolicy` metadata and enforces limits
- `src/common/throttle/throttle.module.ts` — `@Global()` module, exports `ThrottleStoreService` + `ThrottlePolicyGuard`

**Key behaviours:**

- No `@ThrottlePolicy` decorator → guard is a complete no-op (zero overhead)
- Anonymous endpoints keyed by client IP; authenticated endpoints keyed by user ID
- 429 responses include `Retry-After` header (seconds) and reveal nothing about account existence
- `ThrottlePolicyGuard` registered globally via `APP_GUARD` in `AppModule`

**Policies configured (limit / 15-min window unless stated):**

| Policy key                          | Limit | Window |
| ----------------------------------- | ----- | ------ |
| `auth-patient-google`               | 10    | 15 min |
| `auth-patient-register`             | 5     | 60 min |
| `auth-patient-login`                | 10    | 15 min |
| `auth-patient-refresh`              | 30    | 15 min |
| `auth-practitioner-register`        | 5     | 60 min |
| `auth-practitioner-login`           | 10    | 15 min |
| `auth-practitioner-otp-verify`      | 5     | 15 min |
| `auth-practitioner-refresh`         | 30    | 15 min |
| `auth-practitioner-forgot-password` | 5     | 60 min |
| `auth-practitioner-reset-password`  | 5     | 60 min |
| `auth-admin-login`                  | 10    | 15 min |
| `auth-admin-refresh`                | 30    | 15 min |

---

### 1.2 Audit Logging — SecurityAuditLog

**Database change (non-destructive):**

- Added `SecurityAuditOutcome` enum (`SUCCESS`, `FAILURE`, `DENIED`) to `prisma/schema.prisma`
- Added `SecurityAuditLog` model with fields: `id`, `action`, `outcome`, `actorUserId`, `actorRolesJson`, `resourceType`, `resourceId`, `targetUserId`, `ipAddress`, `userAgent`, `correlationId`, `reason`, `metadataJson`, `occurredAt`
- Five DB indexes: `(action, occurredAt)`, `(actorUserId, occurredAt)`, `(outcome, occurredAt)`, `(resourceType, resourceId)`, `(occurredAt)`
- Applied via `prisma db push` (not `migrate dev`, due to pre-existing drift in dev environment)

**New files:**

- `src/common/security-audit/security-audit.service.ts` — Fire-and-forget async writes. Never throws. Sanitizes banned metadata keys.
- `src/common/security-audit/security-audit.module.ts` — `@Global()` module; exports `SecurityAuditService`

**Sanitized metadata keys (never persisted):**
`password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `idToken`, `otp`, `otpCode`, `code`, `secret`, `apiKey`, `apiSecret`, `authorization`, `cookie`, `credentials`

---

### 1.3 Audit Events Wired

#### Security / Access

| Action                       | Where              | Trigger                     |
| ---------------------------- | ------------------ | --------------------------- |
| `security.permission.denied` | `PermissionsGuard` | `@Permissions` check denied |

#### Finance Mutations (high-risk admin actions)

| Action                                     | Controller                           | Endpoint                                                  |
| ------------------------------------------ | ------------------------------------ | --------------------------------------------------------- |
| `finance.accounting.reconciliation.review` | `AdminAccountingController`          | `PATCH reconciliation/items/:sourceType/:sourceId/review` |
| `finance.settlement.generate`              | `AdminSettlementsController`         | `POST generate`                                           |
| `finance.settlement.mark_paid`             | `AdminSettlementsController`         | `POST :id/mark-paid`                                      |
| `finance.settlement.payout.record`         | `AdminSettlementsController`         | `POST practitioners/:pid/payouts/:sid`                    |
| `finance.settlement.mark_failed`           | `AdminSettlementsController`         | `POST :id/mark-failed`                                    |
| `finance.package_settlement.release`       | `AdminPackageSettlementsController`  | `POST :id/release`                                        |
| `finance.practitioner_payout.record`       | `AdminPractitionerPayoutsController` | `POST /`                                                  |

All audit calls are fire-and-forget (`logAsync`) — they do not affect endpoint response latency or error handling.

---

### 1.4 Upload Hardening

Transport-level `fileSize` limits added to `FileInterceptor` calls:

| File                                     | Old                       | New                                                                           |
| ---------------------------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| `current-user-avatar.controller.ts`      | `FileInterceptor('file')` | `FileInterceptor('file', { limits: { fileSize: 512 * 1024 } })` — 512 KB      |
| `general-chat-attachments.controller.ts` | `FileInterceptor('file')` | `FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })` — 10 MB |

Multer now rejects oversized uploads at the transport layer before they reach application code, preventing memory exhaustion attacks.

---

## 2. Files Created

| File                                                       | Description                    |
| ---------------------------------------------------------- | ------------------------------ |
| `src/common/constants/auth-metadata.constants.ts`          | `THROTTLE_POLICY_KEY` constant |
| `src/common/decorators/throttle-policy.decorator.ts`       | `@ThrottlePolicy` decorator    |
| `src/common/throttle/throttle-policy-config.ts`            | Named policy limits            |
| `src/common/throttle/throttle-store.service.ts`            | In-memory TTL store            |
| `src/common/throttle/throttle-policy.guard.ts`             | Rate-limit guard               |
| `src/common/throttle/throttle.module.ts`                   | ThrottleModule                 |
| `src/common/security-audit/security-audit.service.ts`      | Audit log writer               |
| `src/common/security-audit/security-audit.module.ts`       | SecurityAuditModule            |
| `src/common/throttle/throttle-store.service.spec.ts`       | Unit tests                     |
| `src/common/throttle/throttle-policy.guard.spec.ts`        | Unit tests                     |
| `src/common/security-audit/security-audit.service.spec.ts` | Unit tests                     |

---

## 3. Files Modified

| File                                                                                    | Change                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                                  | Added `SecurityAuditOutcome` enum + `SecurityAuditLog` model                                               |
| `src/app.module.ts`                                                                     | Imported `ThrottleModule`, `SecurityAuditModule`; registered `ThrottlePolicyGuard` as `APP_GUARD`          |
| `src/common/guards/authorization/permissions.guard.ts`                                  | Injected `SecurityAuditService`; emits `security.permission.denied` on DENIED                              |
| `src/common/guards/authorization/permissions.guard.spec.ts`                             | Updated constructor mock (3rd arg); added DENIED audit assertion                                           |
| `src/modules/financial-operations/controllers/admin-accounting.controller.ts`           | Injected `SecurityAuditService`; audit on `updateReconciliationReview`                                     |
| `src/modules/financial-operations/controllers/admin-settlements.controller.ts`          | Injected `SecurityAuditService`; audit on `generate`, `markPaid`, `recordPractitionerPayout`, `markFailed` |
| `src/modules/financial-operations/controllers/admin-package-settlements.controller.ts`  | Injected `SecurityAuditService`; audit on `release`                                                        |
| `src/modules/financial-operations/controllers/admin-practitioner-payouts.controller.ts` | Injected `SecurityAuditService`; audit on `record`                                                         |
| `src/modules/users/controllers/current-user-avatar.controller.ts`                       | Added `limits: { fileSize: 512 * 1024 }` to `FileInterceptor`                                              |
| `src/modules/chat/controllers/general-chat-attachments.controller.ts`                   | Added `limits: { fileSize: 10 * 1024 * 1024 }` to `FileInterceptor`                                        |

---

## 4. Test Coverage

**4 spec files, 36 tests — all passing.**

| Suite                            | Tests                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `throttle-store.service.spec.ts` | increment starts at 1, accumulates, resets after expiry, future resetAt, separate keys; reset clears key, no-op for unknown                       |
| `throttle-policy.guard.spec.ts`  | no-op without metadata, no-op for unknown policy, allows within limit, 429 + Retry-After on breach, user-ID keying vs IP, x-forwarded-for parsing |
| `security-audit.service.spec.ts` | fire-and-forget create, no-throw on DB error, truncation to 500 chars, 14 banned key stripping tests, keeps safe keys, undefined metadataJson     |
| `permissions.guard.spec.ts`      | super-admin pass, support denied + audit logAsync called, finance staff pass, practitioner reviewer pass                                          |

---

## 5. Architecture Notes

- **`ThrottleModule` and `SecurityAuditModule` are both `@Global()`** — no need to add them to individual module imports. All providers can receive injected services from these modules automatically.
- **`SecurityAuditService` never throws** — all errors are caught internally and logged via NestJS Logger.
- **`ThrottleStoreService` is swap-ready** — replace its class in `ThrottleModule` providers with a Redis-backed implementation without changing the guard.
- **`@ThrottlePolicy` is opt-in** — only endpoints that have the decorator are throttled. All other routes pass through the guard with zero overhead.

---

## 6. Follow-up Items (Not in Phase 4 Scope)

- **Redis-backed ThrottleStoreService** — for multi-instance / production deployments where in-memory state does not persist across pods
- **Admin UI for SecurityAuditLog** — read-only audit viewer for security team
- **`@ThrottlePolicy` on additional sensitive endpoints** — e.g. OTP resend, password change, email verification
- **Correlation ID propagation** — pass request correlation IDs into audit log entries for distributed tracing
- **Refund approval / retry audit** — wire audit to refund state machine transitions in PaymentsModule
