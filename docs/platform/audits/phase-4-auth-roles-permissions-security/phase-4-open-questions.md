# Phase 4 Open Questions — Auth / Roles / Permissions / Security

**Phase:** 4
**Created:** 2026-06-17
**Questions:** 15

Open questions discovered during Phase 4 that warrant investigation in later phases or before fixes are applied.

---

## New Questions from Phase 4

### Q-036: Should the Academy controller use `@Public()` for the token-based enrollment flow, or should it use `JwtAccessAuthGuard`?
**Asked in:** Phase 4
**Question:** The `PublicAcademyController` has no `@Public()` decorator and no `@UseGuards()`. The enrollment endpoint (`POST /academy/courses/:slug/enrollments`) uses an `AcademyEnrollmentTokenDto.token` field for authorization. Should this endpoint be `@Public()` (intentionally bypassing auth because the token IS the authorization), or should it have `JwtAccessAuthGuard` + token validation as a secondary check?
**Why it matters:** The answer determines whether the academy enrollment endpoint is intentionally public (token-granted) or unintentionally exposed. Adding `@Public()` makes the intent explicit but may create a security issue if the token is guessable or stealable. Adding `JwtAccessAuthGuard` adds a second auth layer but changes the auth model.
**Phase:** Phase 4
**Status:** Not resolved — product/security decision needed

---

### Q-037: Can academy enrollment tokens be replayed across different courses or users?
**Asked in:** Phase 4
**Question:** The `AcademyEnrollmentTokenDto.token` field is used for enrollment authorization. Is this token scoped to a specific course and user, or can it be reused across courses or by different users?
**Why it matters:** If the token is not scoped, an attacker who obtains a valid enrollment token could enroll in any course, bypassing payment.
**Phase:** Phase 4
**Status:** Not resolved — requires code review of enrollment token validation

---

### Q-038: Does the Android Expo SecureStore use hardware-backed Android Keystore or software encryption?
**Asked in:** Phase 4
**Question:** The Phase 4 audit found that Expo SecureStore on Android uses `EncryptedSharedPreferences`, which is software-backed encryption. However, this was not empirically verified — the actual hardware backing depends on the Expo SDK version and Android configuration. Is hardware-backed Keystore used, or is it definitively software-only?
**Why it matters:** If hardware-backed Keystore is available (via `expo-local-authentication` or native module configuration), the token storage security would be significantly stronger. If it's definitively software-only, AUDIT-042 stands as written.
**Phase:** Phase 6 (Mobile)
**Status:** Not resolved — requires Expo SDK / Android configuration verification

---

### Q-039: Can a practitioner's support ticket creation be used to enumerate registered practitioners?
**Asked in:** Phase 4
**Question:** `PractitionerSupportController.createSupportTicket` does not enforce `PRACTITIONER_OTP_VERIFIED` (AUDIT-034). While this is a security gap, does the endpoint also expose whether a given practitioner UUID is registered on the platform (via 404 vs 200 response)?
**Why it matters:** If the endpoint reveals whether a practitioner account exists, it enables user enumeration attacks — a precursor to targeted credential stuffing.
**Phase:** Phase 4
**Status:** Not resolved — requires endpoint behavior testing

---

### Q-040: Can the academy enrollment endpoint be abused for email/username enumeration?
**Asked in:** Phase 4
**Question:** If `POST /academy/courses/:slug/enrollments` returns different error messages for "already enrolled" vs "invalid token" vs "course not found", it could be used to enumerate which email addresses have accounts on the platform.
**Why it matters:** User enumeration is a reconnaissance step that enables targeted phishing and credential stuffing attacks.
**Phase:** Phase 4
**Status:** Not resolved — requires endpoint behavior testing

---

### Q-041: Does the `__DEV__` flag reliably evaluate to `false` in Expo production (hardened) builds?
**Asked in:** Phase 4
**Question:** `fayed-mobile/src/lib/external-url.ts:15` uses `__DEV__` to allow `http:` URLs in development only. `__DEV__` is a Metro Bundler constant that should be replaced with `false` during production builds. However, misconfigured bundlers or custom Expo prebuild setups could theoretically leave `__DEV__` as `true` in production.
**Why it matters:** If `__DEV__` is `true` in production, `http:` URLs would be allowed for session joins, enabling man-in-the-middle attacks on session join tokens. AUDIT-044 flags this as a P1.
**Phase:** Phase 6 (Mobile)
**Status:** Not resolved — requires production build verification

---

### Q-042: Is the refresh token rotation tokenVersion increment atomic with the new token insertion?
**Asked in:** Phase 4
**Question:** `AuthSessionService.rotate()` increments `tokenVersion` and inserts a new refresh token. In a concurrent request scenario (e.g., user has multiple browser tabs), two simultaneous refresh requests could produce a race condition where the second request's rotation overwrites the first request's new token, invalidating the first request's session.
**Why it matters:** Concurrent tab refresh could cause legitimate users to be logged out unexpectedly. The existing single-flight mechanism in the frontend (`api.ts`) addresses this at the HTTP layer, but the backend race condition is not mitigated.
**Phase:** Phase 4
**Status:** Not resolved — requires transaction atomicity verification in `rotate()` method

---

### Q-043: Does the SecurityAuditService use a transaction when logging?
**Asked in:** Phase 4
**Question:** The `SecurityAuditService.logAsync()` method performs a database `create` operation. If this operation fails (e.g., database connection issue), does the calling use case continue executing without logging, or does it roll back?
**Why it matters:** A use case that fails to log a critical security event (like practitioner application approval) should not continue silently. The audit trail is only reliable if log writes are atomic with the action they audit.
**Phase:** Phase 4
**Status:** Not resolved — requires `SecurityAuditService` transaction behavior verification

---

### Q-044: Should failed OTP verification attempts trigger account lockout or notification?
**Asked in:** Phase 4
**Question:** OTP verification (`verify-practitioner-login-otp.use-case.ts`) has no rate limiting on the application side — it relies on the `ThrottlePolicyGuard` (5 attempts per 15 minutes per IP). After exhausting OTP attempts, is the practitioner's account locked or flagged? Does the practitioner receive an email/SMS notification of the failed OTP attempt?
**Why it matters:** OTP brute-force protection at the IP level is insufficient if the attacker has many IPs. An account-level lockout or notification provides defense-in-depth against distributed OTP brute-force attacks.
**Phase:** Phase 4
**Status:** Not resolved — requires OTP verification flow review

---

### Q-045: Does `getServerCurrentUserPermissions()` cache permissions server-side across requests?
**Asked in:** Phase 4
**Question:** The admin layout calls `getServerCurrentUserPermissions()` on every request (server-side). This likely hits the `PermissionResolverService` which does a DB lookup per request (no caching observed). Is there any request-level caching, or does each page navigation trigger a DB query?
**Why it matters:** Permission resolution hits the database on every admin page load. For admin users with many permissions, this could be a performance issue. More importantly, if permissions change during a session (e.g., admin role revoked), the old permissions persist until the next server request.
**Phase:** Phase 6 (Web)
**Status:** Not resolved — requires caching strategy review

---

### Q-046: Does the patient login `deviceId` field serve a security purpose, and is it validated?
**Asked in:** Phase 4
**Question:** Patient login includes `deviceId` in the request payload (`LoginPatientWithEmailPasswordRequest`). Is this field validated against a device registry, or is it merely recorded for analytics/tracking? If it's used for device binding security, can an attacker spoof it?
**Why it matters:** If `deviceId` is used for security (e.g., device whitelisting), a spoofable value weakens the security control. If it's purely for analytics, including it in login is a privacy concern.
**Phase:** Phase 4
**Status:** Not resolved — requires `DeviceTrackingService` review

---

### Q-047: Is there a session expiry notification sent to users before their refresh token expires?
**Asked in:** Phase 4
**Question:** Web access tokens have a 7-day expiry (AUDIT-043). If a user logs in, then doesn't use the platform for 6 days, their session expires on day 7 with no warning. Is there any proactive notification (email/in-app) warning users of upcoming session expiry?
**Why it matters:** A session that expires without warning during active use (e.g., a long-running form) creates a poor UX. Proactive expiry warnings allow users to re-authenticate before their session dies.
**Phase:** Phase 4
**Status:** Not resolved — requires notification configuration review

---

### Q-048: Are there any endpoints that accept user-controlled input for `resourceId` in permission checks?
**Asked in:** Phase 4
**Question:** The `@ResourceOwner()` decorator checks resource ownership. If `resourceId` comes from a URL parameter (e.g., `/sessions/:id`), an attacker who can guess valid UUIDs could potentially probe ownership checks. Are there any endpoints where ID enumeration could reveal other users' resources?
**Why it matters:** ID enumeration is a common vulnerability — an attacker iterates through numeric or UUID-based IDs to access other users' data. The `@ResourceOwner()` guard mitigates this for owned resources, but if the ownership check is missing or bypassed on any endpoint, enumeration is possible.
**Phase:** Phase 4
**Status:** Not resolved — requires `@ResourceOwner()` usage audit across all controllers

---

### Q-049: Does the platform have a CSRF token mechanism for state-changing operations?
**Asked in:** Phase 4
**Question:** The platform has `CsrfProtectionGuard` and `CsrfProtectionService`, but it was not verified whether this guard is applied to all state-changing endpoints (POST, PUT, DELETE). Cross-site request forgery (CSRF) is a documented web vulnerability.
**Why it matters:** Without CSRF protection, a malicious page could trick a logged-in user's browser into making authenticated state-changing requests (e.g., changing email, initiating payments) without the user's knowledge.
**Phase:** Phase 4
**Status:** Not resolved — requires CSRF guard coverage verification

---

### Q-050: Should `CONVERTED_TO_SESSION` be removed from the instant booking state machine?
**Asked in:** Phase 3 (carried forward)
**Question:** `CONVERTED_TO_SESSION` is a terminal state in the instant booking request state machine but is never actually set. The actual pattern is `ACCEPTED + linkedSessionId`. Is `CONVERTED_TO_SESSION` dead code?
**Why it matters:** Dead code in state machines creates confusion and maintenance burden. It could cause issues if a future code path accidentally tries to use it.
**Phase:** Phase 4
**Status:** Not resolved — cleanup decision pending

---

## Questions Deferred from Phase 4

These questions were identified in Phase 4 but have been assigned to a later phase for resolution:

| Question | Phase assigned | Reason |
|----------|---------------|--------|
| Q-038: Android SecureStore hardware backing | Phase 6 (Mobile) | Requires Expo SDK verification |
| Q-041: `__DEV__` in production builds | Phase 6 (Mobile) | Requires production build testing |
| Q-045: Admin permission caching | Phase 6 (Web) | Requires performance review |
| Q-035: Session duration vs practitioner offerings | Phase 4 | Product/financial validation needed |

---

## Resolved Questions

### RQ-013: Are patient refresh tokens role-bound?
**Question:** Can a patient use their refresh token to obtain a practitioner or admin access token?
**Answer:** No. `RefreshAuthSessionUseCase:34` enforces `requestedRole === storedRole`. Patient refresh tokens can only produce patient access tokens. Same enforcement for practitioner and admin. Role boundary check confirmed.
**Resolved by:** Code inspection of `refresh-auth-session.use-case.ts:34`

### RQ-014: Does the platform have a global auth guard?
**Question:** Is `JwtAccessAuthGuard` registered as `APP_GUARD` so all endpoints require auth by default?
**Answer:** No. `main.ts` does not register `JwtAccessAuthGuard` as `APP_GUARD`. Every protected endpoint must explicitly declare `@UseGuards(JwtAccessAuthGuard)`. New endpoints added without explicit guards would be unprotected.
**Resolved by:** Code inspection of `main.ts` and `auth.module.ts`

### RQ-015: Does the platform have a global throttle guard?
**Question:** Is `ThrottlePolicyGuard` a global guard?
**Answer:** No. `ThrottlePolicyGuard` is only activated by explicit `@ThrottlePolicy` decorator. Without the decorator, an endpoint has no rate limiting. No global throttle guard equivalent to `APP_GUARD` exists.
**Resolved by:** Code inspection of `throttle-policy.guard.ts` and `throttle-policy-config.ts`

### RQ-016: Are login failures logged to SecurityAuditLog?
**Question:** Do the patient, practitioner, and admin login use cases log failed authentication attempts?
**Answer:** No. None of the 3 login use cases (`LoginPatientWithEmailPasswordUseCase`, `LoginPractitionerPasswordUseCase`, `LoginAdminUseCase`) call `SecurityAuditService` on failure. Only `VerifyAdminStepUpUseCase` logs auth failures (step-up verification).
**Resolved by:** Code inspection of all 3 login use cases and step-up use case

### RQ-017: Is the refresh token rotation implementation secure against reuse attacks?
**Question:** Does the rotation mechanism detect and invalidate stolen refresh tokens?
**Answer:** Yes. `AuthSessionService.rotate()` uses bcrypt comparison of the presented refresh token against the stored hash. If they match (token reuse), the entire session family is invalidated (`tokenVersion` set to `tokenVersion + 1`). This is a robust rotation scheme.
**Resolved by:** Code inspection of `auth-session.service.ts` `rotate()` and `assertRefreshTokenMatches()` methods

### RQ-018: Do admin permission checks use caching?
**Question:** Does `PermissionsGuard` cache permission lookups, or does it hit the database on every check?
**Answer:** No caching was observed in the `PermissionsGuard` → `PermissionResolverService` code path. Every permission check triggers a database lookup via Prisma. `SUPER_ADMIN` bypasses the DB lookup at `PermissionResolverService:23`.
**Resolved by:** Code inspection of `permissions.guard.ts` and `permission.resolver.ts`

---

*Open questions produced by Phase 4 read-only audit. No application code was modified.*
