# Phase 9b — Auth & Permission Wave 0 / Sprint 4
## Auth Hardening: Account Lockout & DeviceId

**Phase:** 9b
**Sprint:** 4 — Auth Hardening
**Executed:** 2026-06-18
**Status:** 🟡 PARTIAL — AUDIT-041 Implemented; AUDIT-039 Blocked

---

## Overview

Sprint 4 addresses two findings: AUDIT-039 (account lockout after failed login) and AUDIT-041 (practitioner login missing deviceId). AUDIT-041 is implemented for backend and mobile; a web gap was identified during verification. AUDIT-039 is blocked — the fix requires a DB schema change not permitted in this sprint.

**Rules followed:** No DB schema/migration changes; no Prisma generated files; no git commands; no real payments/notifications/refunds triggered; no unrelated P2/P3 fixes.

---

## Sprint 4 Final Status

| Finding | Status |
|---------|--------|
| **AUDIT-039** — No account lockout after failed login | 🔴 Still Open — Blocked (DB schema change required) |
| **AUDIT-041** — Practitioner login missing `deviceId` | 🟡 Implemented — Verification Pending |

---

## AUDIT-041 — Practitioner Login Missing `deviceId`

### Finding Summary

Practitioner login on mobile sends only `email` + `password` to `POST /auth/practitioner/login`. The OTP verification step (which creates the authenticated session) receives `deviceId`, but the initial password step — which triggers OTP challenge creation and is the first point of contact with the auth flow — does not. This prevents device tracking from the first auth interaction.

### Root Cause

Three-surface gap:

1. **Backend DTO** (`PractitionerLoginDto`): `deviceId` was not declared as a field
2. **Backend Controller** (`PractitionerAuthController.login()`): called `getRequestDeviceContext(request)` with no `dto.deviceId`, so `deviceContext.deviceId` was always `null` even when the client sent it
3. **Mobile** (`PractitionerLoginRequest` contract + `AuthProvider.startPractitionerLogin`): did not include `deviceId` in the request payload

The OTP verification step already worked correctly — `PractitionerVerifyOtpDto` had `deviceId?: string` and `verifyPractitionerLoginOtpUseCase` passed it through to `issueAuthTokensUseCase.execute()`.

### Fix: Backend DTO — `src/modules/auth/dto/practitioner-login.dto.ts`

Added `deviceId?: string` as an optional field:

```typescript
@ApiProperty({ required: false, description: 'Device identifier for session tracking' })
@IsOptional()
@IsString()
deviceId?: string;
```

### Fix: Backend Controller — `src/modules/auth/controllers/practitioner-auth.controller.ts`

Changed the `login()` method to pass `dto.deviceId` to `getRequestDeviceContext`:

```typescript
// Before:
deviceContext: getRequestDeviceContext(request),

// After:
deviceContext: getRequestDeviceContext(request, dto.deviceId),
```

### Fix: Mobile Contract — `src/features/auth/contracts.ts`

Added `deviceId?: string` to `PractitionerLoginRequest`:

```typescript
export interface PractitionerLoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}
```

### Fix: Mobile AuthProvider — `src/providers/AuthProvider.tsx`

Updated `startPractitionerLogin` to inject `deviceId` via `getOrCreateDeviceId()`, mirroring the pattern already used by `patientGoogleAuth` and `verifyPractitionerOtp`:

```typescript
// Before:
const response = await practitionerLogin(payload);

// After:
const deviceId = await getOrCreateDeviceId();
const response = await practitionerLogin({ ...payload, deviceId });
```

### Verification

- TypeScript validation: ✅ Backend `tsc --noEmit` — 0 errors in `src/`; mobile `tsc --noEmit` — 0 errors (pre-existing unrelated errors excluded)
- Pattern consistency (mobile): ✅ `startPractitionerLogin` now injects deviceId, consistent with `patientGoogleAuth` and `verifyPractitionerOtp`
- **Web gap confirmed:** web practitioner login does NOT send `deviceId` on either the password step or OTP verification step (see below)

### Web Gap — Identified During Verification

⚠️ **Web practitioner login does NOT send `deviceId`:**
- `PractitionerLoginRequest` in `fayed-frontend-v1/src/features/auth/types/auth.types.ts` has only `email` + `password`
- `SignInForm.tsx` calls `practitionerLogin.mutateAsync(data)` with no deviceId
- `practitionerVerifyOtp` in web sends only `challengeId` + `code` (no `deviceId` in the call at line 333)
- Web has no `getOrCreateDeviceId()` helper — browser `localStorage`/`cookies` could be used but is out of scope for this sprint

**Backend accepts null safely:** `deviceId` is optional in `PractitionerLoginDto` and `PractitionerVerifyOtpDto`. Sessions are only created at OTP verification step (via `issueAuthTokensUseCase.execute()`), which receives `deviceContext.deviceId` from the optional `dto.deviceId`. Making `deviceId` required would break web clients that don't send it. Status remains **Implemented — Verification Pending**.

---

## AUDIT-039 — No Account Lockout After Failed Login

### Finding Summary

There is no account lockout mechanism after repeated failed login attempts. An attacker with knowledge of a valid email/username could brute-force credentials without any progressive friction or account suspension.

### Implementability Analysis

**Evidence gathered from source inspection:**

| Component | Present? | Notes |
|-----------|----------|-------|
| `User.lockedUntil` field | ❌ No | Not in Prisma schema |
| `User.failedLoginAttempts` counter | ❌ No | Not in Prisma schema |
| `AccountStateService` | ❌ Not found | No dedicated lockout service |
| Login use-case lockout checks | ❌ No | None found in any login use-case |
| `SecurityAuditLog` failure logging | ✅ Yes | All 4 login flows write `outcome: FAILURE` with `actorUserId` |
| `SecurityAuditLog` composite index | ✅ Yes | `@@index([actorUserId, occurredAt])` supports efficient time-window queries |
| Rate limiting (throttle) | ✅ Yes | 10 req / 15 min per IP/userId on all login endpoints |

**All failure paths write to `SecurityAuditLog` with `actorUserId` and `occurredAt`:**
- `LoginPatientPasswordUseCase.execute()` — line 138: `logAsync('PATIENT_LOGIN', 'FAILURE', { actorUserId: user.id })`
- `LoginPractitionerPasswordUseCase.execute()` — line 179: `logAsync('PRACTITIONER_LOGIN', 'FAILURE', { actorUserId: user.id })`
- `LoginAdminUseCase.execute()` — line 88: `logAsync('ADMIN_LOGIN', 'FAILURE', { actorUserId: adminUser.id })`
- `VerifyPractitionerLoginOtpUseCase.execute()` — line 140: `logAsync('PRACTITIONER_OTP_VERIFY', 'FAILURE', { actorUserId: actorUserId ?? undefined })`

### Blocking Decision

**Status: 🔴 BLOCKED — Requires DB Schema Change**

The `SecurityAuditLog` table can serve as the failure-count source (no schema changes needed), and rate limiting already provides partial mitigation (10 req/15 min/IP). However, **implementing persistent account lockout requires storing state on the User model**, which is a schema change not permitted in this sprint.

**Required schema change (requires explicit approval):**

Option A — Add lockout fields to `User` model:
```prisma
lockedUntil        DateTime?  // null = not locked; set to future datetime when locked
failedLoginAttempts Int      @default(0)  // reset on successful login
lockoutReason      String?
```

Option B — Add a dedicated `LoginLockout` table:
```prisma
model LoginLockout {
  id          String   @id @default(cuid())
  userId      String
  lockedUntil DateTime
  reason      String?
  @@unique([userId])
}
```

### Minimum Viable Lockout Implementation (When Approved)

1. Add `lockedUntil` + `failedLoginAttempts` fields to `User` model (Option A) or create `LoginLockout` table (Option B)
2. Run `prisma migrate dev` to generate migration (out of scope for this sprint per rules)
3. In each login use-case's failure path, increment `failedLoginAttempts` and set `lockedUntil` after threshold (e.g., 5 attempts)
4. In each login use-case's entry point, check `lockedUntil` and reject if `lockedUntil > now()`
5. On successful login, reset `failedLoginAttempts` to 0

**Note:** The `SecurityAuditLog`-based counting approach (query failures in last 15 min) was considered but rejected: it would require a DB read on every login attempt, adding latency and complexity, and would not survive across read replicas. The schema-backed approach is the correct implementation.

### Audit Log Path for Future Lockout

When implementing, use existing `SecurityAuditService.logAsync()` in failure paths — already present in all 4 login flows. No new audit logging calls needed; only the lockout check and state update.

---

## Tracking Doc Updates

The following docs were updated as part of this sprint:

| Document | Update |
|----------|--------|
| `fix-ledger.md` | AUDIT-039: blocked (schema); AUDIT-041: implemented |
| `normalized-findings-register.md` | AUDIT-039: blocked; AUDIT-041: implemented |
| `phase-4-findings-register.md` | AUDIT-039: status + schema req noted |
| `phase-8-open-questions.md` | Q-005 (lockout threshold) remains open; schema req added |
| `audit-progress.md` | Sprint 4 row added |
| `remaining-risk-register.md` | AUDIT-039 risk maintained; AUDIT-041 risk reduced |
| `release-blockers-and-launch-gates.md` | AUDIT-039 noted as blocked P1 |
| `fix-roadmap.md` | Wave 0 AUDIT-039/AUDIT-041 rows updated |

---

*Generated 2026-06-18 — Phase 9b Sprint 4 — Auth Hardening*
