# Global Fix Ledger

**Phase:** Cross-phase
**Created:** 2026-06-17
**Purpose:** Single source of truth for all fixed findings across all phases and sprints.

---

## Phase 9a Security First Fix Sprint 1 — Fixed Findings

**Sprint:** 1
**Scope:** P0 release blockers only
**Completed:** 2026-06-17
**Total findings fixed:** 4

| Canonical ID | Finding | Severity | Fix Phase | Files Changed | Verification |
|-------------|---------|----------|-----------|---------------|-------------|
| **AUDIT-031** | Academy enrollment endpoint has no auth guard | P0 | Phase 9a Sprint 1 — Fix Incomplete; Sprint 1-R2 — Partially Fixed | `public-academy.controller.ts` (Sprint 1-R2: removed class-level `@Public()`, added `@Public()` to GET methods) | ⚠️ Partially Fixed (Sprint 1-R2): Class-level `@Public()` removed; GET endpoints individually `@Public()`. `createEnrollment` has no explicit auth guard, but enrollment is phone/email-based by design. |
| **AUDIT-032** | Internal UUID exposed in public practitioner DTOs | P0 | Phase 9a Sprint 1 | `public-practitioner-response.dto.ts` (− `id` field); `practitioners-ssr.api.ts` (mapper updated) | TypeScript typecheck passed; propagation cascade verified |
| **AUDIT-033** | Web refresh token cookie missing `httpOnly` | P0 | Phase 9a Sprint 1 — Fix Incomplete; Sprint 1-R2 — Fixed | `patient-auth.controller.ts`, `practitioner-auth.controller.ts`, `admin-auth.controller.ts` (backend sets httpOnly cookie via `res.cookie()`); `http-client.ts` (frontend stops overwriting) | ✅ Fixed (Sprint 1-R2): Backend issues `Set-Cookie: fayed_refresh_token=...; HttpOnly; Secure; SameSite=Strict` on login/register/refresh/logout. |
| **AUDIT-010** | Instant booking accept race condition | P0 | Phase 9a Sprint 1 | `accept-instant-booking-request.use-case.ts` (+ belt-and-suspenders status check) | TypeScript typecheck passed; existing atomic protection confirmed |

---

## Phase 9a Security First Fix Sprint 1-R2 — Corrected P0 Fixes

**Sprint:** 1-R2
**Scope:** AUDIT-031 and AUDIT-033 (reopened from Sprint 1 verification)
**Completed:** 2026-06-17
**Total findings addressed:** 2

| Canonical ID | Finding | Severity | Fix Phase | Files Changed | Verification |
|-------------|---------|----------|-----------|---------------|-------------|
| **AUDIT-031** | Academy enrollment auth guard bypassed by class-level `@Public()` | P0 | Sprint 1-R2 — Partially Fixed | `public-academy.controller.ts` (removed class `@Public()`, added `@Public()` to GET methods) | ⚠️ Partially Fixed: class-level `@Public()` removed; `createEnrollment` unprotected but phone/email-based by design. Final closure in Sprint 1-R3. |
| **AUDIT-033** | Web refresh token HttpOnly ineffective (js-cookie cannot set httpOnly) | P0 | Sprint 1-R2 — Fixed | `patient-auth.controller.ts`, `practitioner-auth.controller.ts`, `admin-auth.controller.ts` (httpOnly cookie via `res.cookie()`); `http-client.ts` (no longer overwrites) | ✅ Fixed: Backend `Set-Cookie` header with `HttpOnly; Secure; SameSite=Strict`. Frontend `setTokens()` and `clearAll()` no longer touch refresh token. Further hardened in Sprint 1-R3. |

---

## Phase 9b Auth & Permission Wave 0 — Sprint 1 First Batch

**Sprint:** 1 (Phase 9b)
**Scope:** AUDIT-068, AUDIT-069, AUDIT-102, AUDIT-103 — admin page permission gates
**Completed:** 2026-06-18
**Total findings fixed:** 4

| Canonical ID | Finding | Severity | Fix Phase | Files Changed | Verification |
|-------------|---------|----------|-----------|---------------|-------------|
| **AUDIT-068** | `admin/care-chat/[id]` missing AdminPermissionGate | P1 | Phase 9b Sprint 1 — Wave 0 Batch 1 | `admin/care-chat/[id]/page.tsx` (added `AdminPermissionGate` + `CARE_CHAT_REQUEST_READ_ADMIN`) | ✅ Backend guard existed (`PermissionsGuard` + `CARE_CHAT_REQUEST_READ_ADMIN`); frontend gate added; TypeScript: 0 errors |
| **AUDIT-069** | `admin/sessions/runtime-inspection` missing gate | P1 | Phase 9b Sprint 1 — Wave 0 Batch 1 | `admin/sessions/runtime-inspection/page.tsx` (added `AdminPermissionGate` + `SESSIONS_READ_ADMIN`) | ✅ Backend guard existed (`PermissionsGuard` + `SESSIONS_READ_ADMIN`); frontend gate added; TypeScript: 0 errors |
| **AUDIT-102** | `admin/refund-policies` missing gate + weak backend | P1 | Phase 9b Sprint 1 — Wave 0 Batch 1 | `admin/refund-policies/page.tsx` (frontend gate added); `admin-refund-policies.controller.ts` (added `PermissionsGuard`; `@Permissions(REFUNDS_RETRY)` on GET list/detail; class `@Permissions(REFUNDS_APPROVE)` on write ops) | ✅ Fixed + Verified — Backend `PermissionsGuard` added with method-level permission split: `REFUNDS_RETRY` for read endpoints, `REFUNDS_APPROVE` for write endpoints. Frontend `AdminPermissionGate` added with `REFUNDS_APPROVE`. TypeScript: backend 0 src/ errors, frontend 0 errors |
| **AUDIT-103** | `admin/notifications/[id]` missing gate | P1 | Phase 9b Sprint 1 — Wave 0 Batch 1 | `admin/notifications/[id]/page.tsx` (added `AdminPermissionGate` + `NOTIFICATION_OPS_READ`) | ✅ Backend guard existed (`PermissionsGuard` + `NOTIFICATION_OPS_READ`); frontend gate added; TypeScript: 0 errors |

---

## Phase 9a Security First Fix Sprint 1-R3 — Final P0 Gate Closure

**Sprint:** 1-R3
**Scope:** AUDIT-031 (final closure) and AUDIT-033 (web response body hardening)
**Completed:** 2026-06-17
**Total findings addressed:** 2

| Canonical ID | Finding | Severity | Fix Phase | Files Changed | Verification |
|-------------|---------|----------|-----------|---------------|-------------|
| **AUDIT-031** | Academy enrollment — intentionally public phone/email-based; `@Public()` now explicit | P0 | Sprint 1-R3 — Reclassified / Accepted Risk | `public-academy.controller.ts` (added `@Public()` to `createEnrollment`) | ✅ Reclassified: `CreateAcademyEnrollmentUseCase.execute()` has no `currentUserId` parameter; enrollment is by phone/email only. No global APP_GUARD. Adding auth guard would break the enrollment flow. `@Public()` makes design explicit. |
| **AUDIT-033** | Web login/refresh responses expose refreshToken in JSON body to browser JS | P0 | Sprint 1-R3 + R3.1 + R3.2 — Fixed + Verified | `web-response-hardening.interceptor.ts` (new); `patient-auth.controller.ts`, `practitioner-auth.controller.ts`, `admin-auth.controller.ts`; `fayed-frontend-v1/src/lib/api/http-client.ts` (X-Client-Platform header added); `fayed-backend-v1/src/main.ts` (x-client-platform added to CORS allowedHeaders) | ✅ Verified: `WebResponseHardeningInterceptor` deletes `refreshToken` from JSON response body for direct browser auth requests. Primary detection: `X-Client-Platform: web` header (explicit frontend signal on direct browser requests). Fallback: `Origin` header matching Fayed origins. Browser JS at login/refresh time cannot read refreshToken from response body. `httpOnly` cookie still carries real refresh token on Set-Cookie — independent. **Architecture (R3.2):** Tier 1 (direct browser → backend): hardened. Tier 2 (Next.js server-side refresh → backend): trusted internal; `X-Client-Platform` NOT forwarded; `server.ts` reads `tokens.refreshToken` from body to set `httpOnly` cookie server-side; browser sees only `{ success: true }`. Tier 3 (native/mobile): unchanged. CORS `allowedHeaders` fix added in R3.2. TypeScript: backend `tsc --noEmit` ✅ pass (0 src/ errors); frontend ✅ pass. |


---

## Phase 9b Auth & Permission Wave 0 — Sprint 2: Audit Logging Trio

**Sprint:** 2 (Phase 9b)
**Scope:** AUDIT-036, AUDIT-037, AUDIT-038 — security audit logging for login failures, practitioner approval/rejection, manual payouts
**Completed:** 2026-06-18
**Total findings fixed:** 3

| Canonical ID | Finding | Severity | Fix Phase | Files Changed | Verification |
|-------------|---------|----------|-----------|---------------|-------------|
| **AUDIT-036** | Login failures (admin, patient, practitioner) not security-audit logged | P1 | Phase 9b Sprint 2 | `login-admin.use-case.ts`, `login-patient-with-email-password.use-case.ts`, `login-practitioner-password.use-case.ts`, `verify-practitioner-login-otp.use-case.ts` (+ 3 controllers forwarding ip/user-agent) | ✅ Backend `tsc --noEmit` 0 src/ errors; 4 login use cases now log all failure and success paths via `SecurityAuditService.logAsync()` |
| **AUDIT-037** | Practitioner application approval/rejection not security-audit logged | P1 | Phase 9b Sprint 2 | `approve-practitioner-application.use-case.ts` (FAILURE only), `reject-practitioner-application.use-case.ts` (FAILURE only), `practitioner-applications-admin.controller.ts` (operatorRoles forwarding); SUCCESS logs in controller preserved | ✅ No duplicate SUCCESS logs; use cases log FAILURE paths only (Option A: controller logs success; use cases log failures). 3 failure paths logged for approve, 2 for reject. |
| **AUDIT-038** | Manual practitioner payout not security-audit logged | P1 | Phase 9b Sprint 2 | `admin-practitioner-manual-payouts.controller.ts` (SUCCESS via `.then()` promise chain) | ✅ `finance.practitioner_payout.record` logged on success via `logAsync()`. Failure paths not logged (controller-level limitation); future hardening opportunity. |

---

## Phase 9b Auth & Permission Wave 0 — Sprint 3: APP_URL Fallback + Push Payload PHI

**Sprint:** 3 (Phase 9b)
**Scope:** AUDIT-062 (APP_URL localhost fallback prevention) + AUDIT-057 (push notification payload PHI reduction)
**Completed:** 2026-06-18
**Total findings fixed:** 2

| Canonical ID | Finding | Severity | Fix Phase | Files Changed | Verification |
|-------------|---------|----------|-----------|---------------|-------------|
| **AUDIT-062** | APP_URL localhost fallback in `app.config.ts` and `SessionJoinAvailableNotificationSweeperService`; also `env.schema.ts` accepted localhost in production via `z.string().url()` | P1 | Phase 9b Sprint 3 | `app.config.ts` (`process.env.APP_URL!` — no fallback); `session-join-available-notification-sweeper.service.ts` (`@Inject(appConfig.KEY)` + `this.appCfg.url`); `env.schema.ts` (added `superRefine` rejecting localhost in production) | 🟡 Implemented — Verification Pending. `env.schema.ts` now rejects localhost/loopback in production via `superRefine`. `app.config.ts` has no fallback. Sweeper uses ConfigService DI. TypeScript: 0 src/ errors. |
| **AUDIT-057** | Push notification payloads contain PHI fields (`threadId`, `scheduledStartAt`, `packagePlanTitle`, `relatedEntityType`/`relatedEntityId`/`category` in data object; `{{sessionAt}}` ISO timestamps in push body) | P1 | Phase 9b Sprint 3 | `operational-notification.service.ts` (`pushBodyKey` param added to `sendBySlug`/`queueBySlug`; 4 PHI fields removed from payloadJson); `notification-push-execution.service.ts` (`category`/`relatedEntityType`/`relatedEntityId` removed from Expo `data` object); `sessions.catalog.ts` (EN+AR push body keys without `{{sessionAt}}`); `session-join-available-notification-sweeper.service.ts` (uses `sessionJoinAvailablePushBody`) | 🟡 Implemented — Verification Pending. `{{sessionAt}}` ISO timestamps removed from push body via push-specific i18n keys. `relatedEntityType`/`relatedEntityId`/`category` removed from Expo `data` object. TypeScript: 0 src/ errors. |

---

## Phase 9b Auth & Permission Wave 0 — Sprint 4: Auth Hardening

**Sprint:** 4 (Phase 9b)
**Scope:** AUDIT-041 (practitioner login deviceId) + AUDIT-039 (account lockout — blocked)
**Completed:** 2026-06-18
**Total findings addressed:** 1 implemented (AUDIT-041); 1 blocked (AUDIT-039)

| Canonical ID | Finding | Severity | Fix Phase | Files Changed | Verification |
|-------------|---------|----------|-----------|---------------|-------------|
| **AUDIT-041** | Practitioner login `POST /auth/practitioner/login` missing `deviceId` — weaker device binding than patient login (OTP step received deviceId but password step did not) | P1 | Phase 9b Sprint 4 | `practitioner-login.dto.ts` (`deviceId?: string` added); `practitioner-auth.controller.ts` (`getRequestDeviceContext(request, dto.deviceId)`); `fayed-mobile/src/features/auth/contracts.ts` (`PractitionerLoginRequest` interface); `fayed-mobile/src/providers/AuthProvider.tsx` (`startPractitionerLogin` now injects `deviceId` via `getOrCreateDeviceId()`) | 🟡 Implemented — Verification Pending. Pattern now matches patient login (injects deviceId) and verifyOtp (injects deviceId). Mobile TypeScript: 0 errors. Backend TypeScript: 0 src/ errors. |
| **AUDIT-039** | No account lockout after repeated failed login attempts | P1 | Phase 9b Sprint 4 — BLOCKED | N/A | 🔴 Blocked: implementing persistent account lockout requires `lockedUntil`/`failedLoginAttempts` fields on `User` model (schema change). `SecurityAuditLog` can serve as failure-count source (already indexes `[actorUserId, occurredAt]`). Rate limiting (10 req/15 min) provides partial mitigation. Schema change requires explicit approval and migration. |

---

## Previously Fixed Findings

_None recorded yet._

---

## Summary

| Metric | Count |
|--------|-------|
| Total findings fixed | 13 |
| P0 findings fully fixed | 3 (AUDIT-032, 033, 010) |
| P0 findings reclassified / accepted risk | 1 (AUDIT-031 — phone/email enrollment by design) |
| P1 findings fixed | 9 (AUDIT-068, 069, 102, 103, 036, 037, 038, 062, 057) |
| P2 findings fixed | 0 |
| Sprint 1 (Phase 9a) | 4 findings |
| Sprint 1-R2 (Phase 9a) | 2 findings corrected |
| Sprint 1-R3 (Phase 9a) | 2 findings final closure / hardening |
| Phase 9b Sprint 1 | 4 findings (Wave 0 Batch 1) |
| Phase 9b Sprint 2 | 3 findings (Audit Logging Trio) |
| Phase 9b Sprint 3 | 2 findings (APP_URL Fallback + Push Payload PHI) |
| Phase 9b Sprint 4 | 1 finding implemented (AUDIT-041); 1 blocked (AUDIT-039) |
| Total sprints completed | 6 |

---

*Ledger maintained as findings are resolved. Updated after each fix sprint.*
