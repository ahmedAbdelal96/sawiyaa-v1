# Phase 9b — Auth & Permission Wave 0 / Sprint 2
## Audit Logging Trio Report

**Phase:** 9b
**Sprint:** 2 — Wave 0 Audit Logging Trio
**Executed:** 2026-06-18
**Status:** ✅ COMPLETE — All three findings fixed + verified

---

## Overview

Sprint 2 fixes the "audit logging trio" (AUDIT-036, 037, 038) — three P1 findings where security-significant actions were not being recorded to the `SecurityAuditLog` table via `SecurityAuditService.logAsync()`.

All three fixes use the **existing** `SecurityAuditService` — no new services, no DB schema changes, no fake logging.

**Rules followed:** No DB schema/migration changes; no new services created; verifiable by source-level checks (presence/absence of `SecurityAuditService` injection and `logAsync` calls); no fake or stub logging.

---

## Sprint 2 Final Status

| Finding | Status |
|---------|--------|
| **AUDIT-036** — Login failures not security-audit logged | ✅ Fixed + Verified |
| **AUDIT-037** — Practitioner approval/rejection not logged | ✅ Fixed + Verified |
| **AUDIT-038** — Manual payout not logged | ✅ Fixed + Verified |

---

## AUDIT-036 — Login Failures Not Security-Audit Logged

### Finding Summary
All primary login flows (admin, patient, practitioner) lacked `SecurityAuditService` injection and `logAsync` calls. Only the `VerifyAdminStepUpUseCase` (re-authentication flow, not primary login) was properly logging.

### Fix: 4 Login Use Cases + 3 Controllers

#### Use Case Changes

**1. `LoginAdminUseCase** (`src/modules/auth/use-cases/login-admin.use-case.ts`)

- Injected `SecurityAuditService` into constructor
- Added `ipAddress?: string | null` and `userAgent?: string | null` parameters to `execute()`
- Added `logAsync` calls:
  - `auth.admin.login.failure` / `FAILURE` — email not found, no admin role, account not active, no password identity, invalid password
  - `auth.admin.login.success` / `SUCCESS` — after token issuance

**2. `LoginPatientWithEmailPasswordUseCase** (`src/modules/auth/use-cases/login-patient-with-email-password.use-case.ts`)

- Injected `SecurityAuditService` into constructor
- Added `ipAddress?: string | null` and `userAgent?: string | null` parameters to `execute()`
- Added `logAsync` calls:
  - `auth.patient.login.failure` / `FAILURE` — email not found, no patient role, account not active, no password identity, invalid password
  - `auth.patient.login.success` / `SUCCESS` — after token issuance

**3. `LoginPractitionerPasswordUseCase** (`src/modules/auth/use-cases/login-practitioner-password.use-case.ts`)

- Injected `SecurityAuditService` into constructor
- Added `ipAddress?: string | null` and `userAgent?: string | null` parameters to `execute()`
- Added `logAsync` calls:
  - `auth.practitioner.login.failure` / `FAILURE` — email not found/not primary, no practitioner role, practitioner profile not found, practitioner suspended/inactive, account not active, no password identity, invalid password
  - `auth.practitioner.login.success` / `SUCCESS` — after token issuance (dev bypass path and OTP-challenge path both logged)

**4. `VerifyPractitionerLoginOtpUseCase** (`src/modules/auth/use-cases/verify-practitioner-login-otp.use-case.ts`)

- Injected `SecurityAuditService` into constructor
- Added `ipAddress?: string | null` and `userAgent?: string | null` parameters to `execute()`
- Added `logAsync` calls:
  - `auth.practitioner.login.failure` / `FAILURE` — challenge user not found or no practitioner role, account not active, practitioner profile not found, practitioner suspended/inactive
  - `auth.practitioner.login.success` / `SUCCESS` — after token issuance

#### Controller Changes

**Admin:** `src/modules/auth/controllers/admin-auth.controller.ts`
- Added `ipAddress: request.ip ?? null` and `userAgent: request.headers['user-agent'] ?? null` to `LoginAdminUseCase.execute()` call

**Patient:** `src/modules/auth/controllers/patient-auth.controller.ts`
- Added `ipAddress: request.ip ?? null` and `userAgent: request.headers['user-agent'] ?? null` to `LoginPatientWithEmailPasswordUseCase.execute()` call

**Practitioner:** `src/modules/auth/controllers/practitioner-auth.controller.ts`
- Added `ipAddress: request.ip ?? null` and `userAgent: request.headers['user-agent'] ?? null` to `LoginPractitionerPasswordUseCase.execute()` and `VerifyPractitionerLoginOtpUseCase.execute()` calls

### Pattern Notes
- `actorUserId` is captured from the resolved user on failure (not null when user was found)
- `actorRoles` extracted from `userEmail.user.roles.map(r => r.role)` or `user.roles.map(r => r.role)`
- `reason` field provides structured failure codes (e.g., `INVALID_PASSWORD`, `USER_NOT_FOUND`, `ADMIN_ROLE_REQUIRED`, `ACCOUNT_NOT_ACTIVE`)
- `metadata` contains only safe fields — no passwords, tokens, OTPs (service has BANNED_KEYS sanitization but these are not passed)
- `ipAddress`/`userAgent` passed via optional parameters — backward compatible with existing call sites that don't pass them (they receive `undefined` and become `null` in the log entry)

### Verification
- TypeScript: 0 errors in `src/` on both backend and frontend
- Source-level: All 4 use cases now have `SecurityAuditService` injected and `logAsync` called on all failure paths and the success path

---

## AUDIT-037 — Practitioner Approval/Rejection Not Logged

### Finding Summary
`ApprovePractitionerApplicationUseCase` and `RejectPractitionerApplicationUseCase` had no `SecurityAuditService` injection. The controller was logging success via `.then()` blocks, but error paths were unlogged.

### Fix: 2 Use Cases + Controller Updates

#### `ApprovePractitionerApplicationUseCase** (`src/modules/admin/practitioner-applications/use-cases/approve-practitioner-application.use-case.ts`)

- Injected `SecurityAuditService` into constructor
- Added `operatorRoles: string[]` parameter to `execute()` input (passed from `currentUser.roles` at controller)
- Added `logAsync` calls:
  - `security.practitioner.application.approve` / `FAILURE` — application not found (pre-transaction)
  - `security.practitioner.application.approve` / `FAILURE` — application not approvable (readiness check failure with `missingRequirements` in metadata)
  - `security.practitioner.application.approve` / `FAILURE` — application not found inside transaction
  - Controller logs `SUCCESS` via `.then()` — no duplicate use case SUCCESS log added

#### `RejectPractitionerApplicationUseCase** (`src/modules/admin/practitioner-applications/use-cases/reject-practitioner-application.use-case.ts`)

- Injected `SecurityAuditService` into constructor
- Added `operatorRoles: string[]` parameter to `execute()` input
- Added `logAsync` calls:
  - `security.practitioner.application.reject` / `FAILURE` — application not found (pre-transaction)
  - `security.practitioner.application.reject` / `FAILURE` — application not found inside transaction
  - Controller logs `SUCCESS` via `.then()` — no duplicate use case SUCCESS log added

#### Controller Update (`practitioner-applications-admin.controller.ts`)

- Both `approve()` and `reject()` controller methods updated to pass `operatorRoles: currentUser.roles` to the use case

### Final Audit Log Pattern (Option A)
**Controller logs success; use cases log failure paths only.**
- `ApprovePractitionerApplicationUseCase`: logs `FAILURE` on 3 error paths (pre-tx not-found, readiness check failure, in-tx not-found)
- `RejectPractitionerApplicationUseCase`: logs `FAILURE` on 2 error paths (pre-tx not-found, in-tx not-found)
- Controller `.then()` blocks: log `SUCCESS` for both approve and reject — these were already present and are preserved
- **No duplicate SUCCESS logs** — use case SUCCESS calls were removed to avoid duplication

### Verification
- TypeScript: 0 errors in `src/`
- Source-level: Both use cases have `SecurityAuditService` injected and `logAsync` on all failure paths only (no SUCCESS — controller handles success path); no duplicate SUCCESS logs exist

---

## AUDIT-038 — Manual Payout Not Logged

### Finding Summary
The manual payout endpoint (`POST /admin/practitioner-payouts`) lacked any `SecurityAuditService` call. The sibling automatic payout endpoint (`POST /admin/practitioners/:practitionerId/payouts`) was already logging with action `finance.practitioner_payout.record`.

### Fix: Manual Payouts Controller Only

**File:** `src/modules/financial-operations/controllers/admin-practitioner-manual-payouts.controller.ts`

- Imported `SecurityAuditService` and `SecurityAuditOutcome`
- Injected `SecurityAuditService` into constructor
- Changed `record()` method from direct use-case call to promise chain:
  ```typescript
  return this.recordPayoutUseCase.execute({...}).then((result) => {
    this.securityAuditService.logAsync({
      action: 'finance.practitioner_payout.record',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'PractitionerPayout',
      resourceId: result.item?.id ?? null,
      targetUserId: body.practitionerId,
      metadata: { amount: body.amount, currency: body.currency, note: body.note ?? null },
    });
    return result;
  });
  ```
- Uses the **same action slug** (`finance.practitioner_payout.record`) as the automatic payout controller for consistency

### Failure Path Limitation
Error paths (use case throwing exceptions) are not caught by the `.then()` pattern — a throwing use case produces an unlogged failure. This is a known limitation of a controller-level fix. **AUDIT-038 finding closure:** The finding required logging of successful manual payout recording; failure path logging is a future hardening opportunity, not a requirement of this finding's closure.

### Finding Closure Scope
- **AUDIT-038 requires:** Successful manual payout recording is audited. ✅ Achieved.
- **Future hardening (not in scope):** Failure paths (use case exceptions) should also be logged. Not logged in this sprint.

### Verification
- TypeScript: 0 errors in `src/`
- Source-level: `SecurityAuditService` now injected in `AdminPractitionerManualPayoutsController` and `logAsync` called after successful payout recording

---

## Verification

### TypeScript Compilation

**Backend:** `cd fayed-backend-v1 && npx tsc --noEmit` → ✅ 0 errors in `src/`
(pre-existing unrelated error in `check-articles2.ts` outside `src/`)

**Frontend:** `cd fayed-frontend-v1 && npx tsc --noEmit` → ✅ 0 errors

### Source-Level Verification

| Check | Evidence |
|-------|----------|
| AUDIT-036: `LoginAdminUseCase` has `SecurityAuditService` | Constructor injects `securityAuditService`; `logAsync` on all 5 failure paths + success ✅ |
| AUDIT-036: `LoginPatientWithEmailPasswordUseCase` has `SecurityAuditService` | Constructor injects `securityAuditService`; `logAsync` on all 5 failure paths + success ✅ |
| AUDIT-036: `LoginPractitionerPasswordUseCase` has `SecurityAuditService` | Constructor injects `securityAuditService`; `logAsync` on all 7 failure paths + success (both dev bypass and OTP paths) ✅ |
| AUDIT-036: `VerifyPractitionerLoginOtpUseCase` has `SecurityAuditService` | Constructor injects `securityAuditService`; `logAsync` on all 4 failure paths + success ✅ |
| AUDIT-036: Controllers pass IP/user-agent | `admin-auth.controller.ts`, `patient-auth.controller.ts`, `practitioner-auth.controller.ts` all pass `request.ip` and `request.headers['user-agent']` ✅ |
| AUDIT-037: `ApprovePractitionerApplicationUseCase` has `SecurityAuditService` | Constructor injects `securityAuditService`; `logAsync` on all 3 FAILURE paths only; controller `.then()` handles SUCCESS — no duplicate ✅ |
| AUDIT-037: `RejectPractitionerApplicationUseCase` has `SecurityAuditService` | Constructor injects `securityAuditService`; `logAsync` on all 2 FAILURE paths only; controller `.then()` handles SUCCESS — no duplicate ✅ |
| AUDIT-037: Controller passes `operatorRoles` | `approve()` and `reject()` controller methods pass `currentUser.roles` as `operatorRoles` ✅ |
| AUDIT-038: `AdminPractitionerManualPayoutsController` has `SecurityAuditService` | Constructor injects `securityAuditService`; `logAsync` called after successful `record()` ✅ |

---

## Files Changed

| File | Change | Finding |
|------|--------|---------|
| `src/modules/auth/use-cases/login-admin.use-case.ts` | Injected `SecurityAuditService`; added `ipAddress`/`userAgent` params; added `logAsync` on all 5 failure + success paths | AUDIT-036 |
| `src/modules/auth/use-cases/login-patient-with-email-password.use-case.ts` | Injected `SecurityAuditService`; added `ipAddress`/`userAgent` params; added `logAsync` on all 5 failure + success paths | AUDIT-036 |
| `src/modules/auth/use-cases/login-practitioner-password.use-case.ts` | Injected `SecurityAuditService`; added `ipAddress`/`userAgent` params; added `logAsync` on all 7 failure + success paths | AUDIT-036 |
| `src/modules/auth/use-cases/verify-practitioner-login-otp.use-case.ts` | Injected `SecurityAuditService`; added `ipAddress`/`userAgent` params; added `logAsync` on all 4 failure + success paths | AUDIT-036 |
| `src/modules/auth/controllers/admin-auth.controller.ts` | Passes `ipAddress`/`userAgent` to `LoginAdminUseCase.execute()` | AUDIT-036 |
| `src/modules/auth/controllers/patient-auth.controller.ts` | Passes `ipAddress`/`userAgent` to `LoginPatientWithEmailPasswordUseCase.execute()` | AUDIT-036 |
| `src/modules/auth/controllers/practitioner-auth.controller.ts` | Passes `ipAddress`/`userAgent` to `LoginPractitionerPasswordUseCase.execute()` and `VerifyPractitionerLoginOtpUseCase.execute()` | AUDIT-036 |
| `src/modules/admin/practitioner-applications/use-cases/approve-practitioner-application.use-case.ts` | Injected `SecurityAuditService`; added `operatorRoles` param; added `logAsync` on 3 failure paths only (SUCCESS handled by controller) | AUDIT-037 |
| `src/modules/admin/practitioner-applications/use-cases/reject-practitioner-application.use-case.ts` | Injected `SecurityAuditService`; added `operatorRoles` param; added `logAsync` on 2 failure paths only (SUCCESS handled by controller) | AUDIT-037 |
| `src/modules/admin/practitioner-applications/controllers/practitioner-applications-admin.controller.ts` | Passes `operatorRoles: currentUser.roles` to both approve and reject use cases | AUDIT-037 |
| `src/modules/financial-operations/controllers/admin-practitioner-manual-payouts.controller.ts` | Injected `SecurityAuditService`; changed `record()` to promise chain with `logAsync` on success | AUDIT-038 |

---

## Status Summary

| Finding | Status | Notes |
|---------|--------|-------|
| AUDIT-036 | ✅ Fixed + Verified | 4 login use cases now log all failure and success paths; controllers forward IP/user-agent |
| AUDIT-037 | ✅ Fixed + Verified | 2 approval use cases log failure paths; controller SUCCESS logs preserved; no duplicates |
| AUDIT-038 | ✅ Fixed + Verified | Manual payout controller now logs success via `logAsync` with same action slug as automatic payout |

*Phase 9b Sprint 2 — Audit Logging Trio — Complete. 2026-06-18.*
