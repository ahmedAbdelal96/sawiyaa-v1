# Phase 4 Findings Register — Auth / Roles / Permissions / Security

**Phase:** 4
**Created:** 2026-06-17
**Findings:** 21 (AUDIT-031 through AUDIT-051)
**Severity breakdown:** 3 P0 | 17 P1 | 1 P2 | 0 P3

---

## Summary

Phase 4 audited authentication architecture, JWT/token handling, guards and decorators, patient/practitioner/admin authorization, admin RBAC, step-up/MFA, web route protection, mobile auth, public endpoints, and security audit logging across the Fayed platform.

Phase 1 findings (AUDIT-001, AUDIT-002) and Phase 2 (AUDIT-003–AUDIT-008) and Phase 3 (AUDIT-009–AUDIT-030) remain **open and unchanged**.

---

## Finding Format Reference

All findings use the standard format from `findings-register-template.md`.

---

## P0 Findings

---

### Finding ID: AUDIT-031
**Title:** Academy enrollment controller has no auth guards — enrollment creation potentially unprotected
**Severity:** P0
**Module:** Auth / Route Protection
**Affected users:** Any unauthenticated user; patients who should not be able to enroll without payment
**Affected surfaces:** `POST /academy/courses/:slug/enrollments`; academy enrollment flow
**Evidence:** `fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts` — Controller has neither `@Public()` decorator nor `@UseGuards(...)`. All other academy endpoints lack explicit auth decorators. The `AcademyEnrollmentTokenDto.token` field is used for authorization but there is no `@Public()` to confirm intent, and no guard class is registered on the controller. Enrollment creation (`POST /academy/courses/:slug/enrollments`) should require authentication or a valid enrollment token — the absence of any guard declaration means the endpoint relies entirely on use-case-level logic.
**Root cause hypothesis:** The academy controller was likely built with token-based auth assumptions (enrollment tokens as URL params) but the `@Public()` decorator was never added to opt into NestJS's guard-bypass mechanism. Without `@Public()`, unauthenticated requests would be rejected by `JwtAccessAuthGuard` — but since no guard is explicitly registered and there is no global `APP_GUARD`, the actual behavior is ambiguous. If a new developer adds `@Public()` to make the enrollment token flow work, the entire controller would become unauthenticated.
**Risk:** An unauthenticated user could call the academy enrollment creation endpoint. Without auth guard, the endpoint may be accessible to anyone who can reach the API. A malicious actor could create fraudulent enrollment records without paying.
**Smallest safe next step:** Add explicit `@Public()` decorator to `PublicAcademyController` and all its methods. For enrollment creation, add `JwtAccessAuthGuard` or a custom guard that validates the enrollment token. Add `@ThrottlePolicy('academy-public-enrollment')` for rate limiting.
**Do not fix yet:** yes
**Fixed in phase:** Phase 9a Sprint 1 (initial); Sprint 1-R2 (corrected); Sprint 1-R3 (final closure)
**Resolution summary:** Phase 9a Sprint 1 added `@Public()` + `@UseGuards(JwtAccessAuthGuard)` but class-level `@Public()` caused guard bypass (structural failure). Sprint 1-R2 corrected: class-level `@Public()` removed; `@Public()` added to individual GET methods only. `createEnrollment` POST endpoint has no explicit `@UseGuards`. Sprint 1-R3 final: Added explicit `@Public()` to `createEnrollment` to make the intentional public design unambiguous. `CreateAcademyEnrollmentUseCase.execute()` has no `currentUserId` parameter — enrollment is by phone/email only. No global JWT APP_GUARD exists. Adding `@UseGuards(JwtAccessAuthGuard)` would break the public enrollment flow. Reclassified as Accepted Risk. Full closure: `sprints/sprint-1-r3-final-p0-gate-closure.md`.

---

### Finding ID: AUDIT-032
**Title:** Internal UUID `id` exposed in public practitioner list and detail DTOs
**Severity:** P0
**Module:** Auth / Public Data Exposure
**Affected users:** Any public (unauthenticated) user browsing practitioners
**Affected surfaces:** `GET /public/practitioners`; `GET /public/practitioners/:slug`
**Evidence:** `fayed-backend-v1/src/modules/practitioners/dto/public-practitioner-response.dto.ts:51` — `PublicPractitionerListItemResponseDto` has `id: string` field at line 51. `fayed-backend-v1/src/modules/practitioners/dto/public-practitioner-response.dto.ts:155` — `PublicPractitionerDetailsResponseDto` has `id: string` field at line 155. Both are returned by `PublicPractitionerController` at `public-practitioner.controller.ts:32` and `:97` without authentication.
**Root cause hypothesis:** The DTOs were derived from internal Prisma models and the `id` field was not stripped before publishing to the public API contract. The `slug` field is the intended public identifier.
**Risk:** An attacker can enumerate/increment practitioner UUIDs to harvest all practitioner profile data. While the data is not highly sensitive (practitioners are public figures), the UUID allows cross-referencing with other API endpoints and potentially correlating with other platform data. This is a data separation violation.
**Smallest safe next step:** Remove `id: string` from `PublicPractitionerListItemResponseDto` and `PublicPractitionerDetailsResponseDto`. Use only `slug` as the public-facing identifier. Update any internal references that rely on the public DTOs including the `id` field.
**Do not fix yet:** yes
**Fixed in phase:** Phase 9a Sprint 1
**Resolution summary:** `id` field removed from both `PublicPractitionerListItemResponseDto` and `PublicPractitionerDetailsResponseDto`. Frontend SSR mapper updated to use `slug` as the sole identifier. Propagation verified: profile SSR API inherits from base type, React keys use slug (stable).

---

### Finding ID: AUDIT-033
**Title:** Web refresh token cookie lacks httpOnly — XSS can exfiltrate session tokens
**Severity:** P0
**Module:** Auth / Token Storage (Web)
**Affected users:** All web users (patients, practitioners, admins)
**Affected surfaces:** All authenticated web sessions on Fayed platform
**Evidence:** `fayed-frontend-v1/src/lib/http-client.ts:285-297` — Both `ACCESS_TOKEN_COOKIE` and `REFRESH_TOKEN_COOKIE` are set with `Cookies.set(...)` which creates regular browser cookies, NOT httpOnly cookies. The tokens are accessible to JavaScript via `document.cookie`. `config.ts:17` — `ACCESS_TOKEN_EXPIRY` defaults to 7 days. `http-client.ts:293` — `sameSite: "lax"` (not `"strict"`) on refresh token cookie enables cross-site POST CSRF attacks.
**Root cause hypothesis:** The original implementation used non-httpOnly cookies for SSR accessibility (the Next.js server-side code needs to read the token to attach it to API calls). Using httpOnly cookies would prevent server-side token reading but require a different SSR token injection mechanism.
**Risk:** Any XSS vulnerability anywhere on the Fayed domain allows an attacker to read `document.cookie, extract the access and refresh tokens, and hijack the user's session. With a 7-day access token expiry and no httpOnly protection, the attack window is large. The `sameSite: lax` CSRF risk means a malicious site can trigger token refresh on behalf of the user.
**Smallest safe next step:** Investigate whether the SSR token access pattern can be refactored to use httpOnly cookies with a server-side token reader for API calls, or encrypt the cookie value so JavaScript cannot read the raw token. At minimum, set `sameSite: "strict"` on the access token cookie and ensure the refresh token is httpOnly. This is a complex change because it affects the entire auth architecture.
**Do not fix yet:** yes
**Fixed in phase:** Phase 9a Sprint 1 (initial fix ineffective); Sprint 1-R2 (corrected); Sprint 1-R3 (hardening)
**Resolution summary:** Sprint 1 added `httpOnly: true` to js-cookie's `Cookies.set()` — browser-ignored no-op. Sprint 1-R2 corrected: Backend sets real `HttpOnly; Secure; SameSite=Strict` refresh cookie via `Set-Cookie` header on login/register/refresh/logout across all three auth controllers. Frontend `tokenManager.setTokens()` no longer overwrites server httpOnly cookie. Sprint 1-R3 hardening: `WebResponseHardeningInterceptor` strips `refreshToken` from JSON response body for web clients (detected by Origin header). Browser JavaScript at login/refresh time can no longer read refreshToken from response body — it is only in the HttpOnly cookie (inaccessible to JS). Native/mobile clients receive full token body. TypeScript `tsc --noEmit`: ✅ pass (0 src/ errors). Full closure: `sprints/sprint-1-r3-final-p0-gate-closure.md`.

---

## P1 Findings

---

### Finding ID: AUDIT-034
**Title:** Practitioner support ticket endpoints bypass PRACTITIONER_OTP_VERIFIED requirement
**Severity:** P1
**Module:** Auth / Practitioner Account State Enforcement
**Affected users:** Practitioners who are APPROVED but not OTP-verified
**Affected surfaces:** `POST /practitioners/me/support/tickets`; practitioner support ticket creation and listing
**Evidence:** `fayed-backend-v1/src/modules/support/controllers/practitioner-support.controller.ts:41` — `createSupportTicket` method has only `@UseGuards(JwtAccessAuthGuard, RolesGuard)` applied. No `PractitionerOtpVerifiedGuard` or `@RequireAccountStates(...)` decorator. By contrast, `PractitionerAvailabilityController` at line 55 requires `@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT, AccountStateRequirement.PRACTITIONER_OTP_VERIFIED, ...)`. The support controller is missing the OTP guard that all other operational modules enforce.
**Root cause hypothesis:** The support module was likely built before the OTP requirement was standardized across modules, or the developer copied from a template that lacked the account-state guard.
**Risk:** A practitioner whose application is APPROVED but who has not completed OTP verification can create and view support tickets. This breaks the OTP-gating policy: OTP verification is supposed to be required before a practitioner can perform any operational platform action. An unverified practitioner could open support tickets that affect platform operations.
**Smallest safe next step:** Add `@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT, AccountStateRequirement.PRACTITIONER_OTP_VERIFIED, AccountStateRequirement.PRACTITIONER_APPROVED)` to the `createSupportTicket` method (and all other methods in `PractitionerSupportController`).
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-035
**Title:** Practitioner financial operations bypass PRACTITIONER_OTP_VERIFIED requirement
**Severity:** P1
**Module:** Auth / Practitioner Account State Enforcement
**Affected users:** Practitioners who are APPROVED but not OTP-verified
**Affected surfaces:** `GET /practitioners/me/wallet`; `GET /practitioners/me/ledger`; `GET /practitioners/me/settlements`
**Evidence:** `fayed-backend-v1/src/modules/financial-operations/controllers/practitioner-financial-operations.controller.ts:37-40` — All three financial operation methods (`getWallet`, `getLedger`, `getSettlements`) have `@UseGuards(JwtAccessAuthGuard, RolesGuard)` but no `PractitionerOtpVerifiedGuard`. These endpoints return sensitive financial data (wallet balance, earnings ledger, settlement records) that should require OTP verification before access, consistent with how all other practitioner operational endpoints are protected.
**Root cause hypothesis:** Financial data endpoints were likely considered "read-only" and therefore not subject to the same account-state requirements as write operations. However, financial data exposure without OTP verification is a policy inconsistency.
**Risk:** A practitioner who is APPROVED but not OTP-verified can view their wallet balance, ledger entries, and settlement history. This violates the platform policy that OTP must be verified before operational platform access. An attacker with a compromised but approved practitioner account could access financial data before completing OTP setup.
**Smallest safe next step:** Add `@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT, AccountStateRequirement.PRACTITIONER_OTP_VERIFIED, AccountStateRequirement.PRACTITIONER_APPROVED)` to all methods in `PractitionerFinancialOperationsController`.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-036
**Title:** Login failures (admin, patient, practitioner) not security-audit logged — brute-force detection not possible
**Severity:** P1
**Module:** Auth / Security Audit Logging
**Affected users:** Platform operators monitoring auth security
**Affected surfaces:** `POST /auth/admin/login`; `POST /auth/patient/login`; `POST /auth/practitioner/login`; `POST /auth/practitioner/login/verify-otp`
**Evidence:** `fayed-backend-v1/src/modules/auth/use-cases/login-admin.use-case.ts` — No call to `SecurityAuditService.logAsync()` on login failure. Returns `UnauthorizedException` without audit. `fayed-backend-v1/src/modules/auth/use-cases/login-patient-with-email-password.use-case.ts` — Same pattern. `fayed-backend-v1/src/modules/auth/use-cases/login-practitioner-password.use-case.ts` — Same pattern. `fayed-backend-v1/src/modules/auth/use-cases/verify-practitioner-login-otp.use-case.ts` — No security audit logging on OTP failure. By contrast, `VerifyAdminStepUpUseCase` at `verify-admin-step-up.use-case.ts:56` logs `security.step_up.verify.failure`.
**Root cause hypothesis:** Security audit logging was added to the step-up verification flow as an afterthought but was not added to the primary login flows. Login success/failure was likely considered application-level rather than security-audit-level.
**Risk:** Failed login attempts produce no security audit trail. Platform operators cannot detect brute-force attacks, credential stuffing, or targeted password spraying through the security audit log. An attacker could make unlimited login attempts against a known email address without any automated detection triggering. Rate limiting exists (10 req/15min per IP) but produces no security audit entries — an operator has no visibility into whether the rate limit is being hit by an attacker or legitimate users.
**Smallest safe next step:** Add `securityAuditService.logAsync()` calls to `LoginAdminUseCase`, `LoginPatientWithEmailPasswordUseCase`, and `LoginPractitionerPasswordUseCase` for both success and failure outcomes. Include `outcome: 'FAILURE'` and `reason` field for failures.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-037
**Title:** Practitioner application approval and rejection not security-audit logged
**Severity:** P1
**Module:** Auth / Security Audit Logging
**Affected users:** Platform operators, compliance auditors
**Affected surfaces:** `POST /admin/practitioner-applications/:id/approve`; `POST /admin/practitioner-applications/:id/reject`
**Evidence:** `fayed-backend-v1/src/modules/admin/use-cases/approve-practitioner-application.use-case.ts` — No call to `SecurityAuditService.logAsync()`. `fayed-backend-v1/src/modules/admin/use-cases/reject-practitioner-application.use-case.ts` — No call to `SecurityAuditService.logAsync()`. These are critical access-granting/revoking operations: approving a practitioner grants them the ability to practice on the platform; rejecting revokes that path. Both are high-trust operations requiring an audit trail.
**Root cause hypothesis:** The practitioner approval use cases were likely built before the `SecurityAuditService` was fully adopted across all admin use cases. The financial operations and admin user management use cases were retrofitted with audit logging, but the practitioner application use cases were missed.
**Risk:** Practitioner application approval/rejection decisions leave no security audit trail. In the event of a compliance dispute, internal investigation, or fraud case, there is no record of who approved or rejected a specific application, when, or from which IP. An insider with admin access could approve fraudulent practitioner applications without detection.
**Smallest safe next step:** Add `securityAuditService.logAsync()` calls to both `ApprovePractitionerApplicationUseCase` and `RejectPractitionerApplicationUseCase`, recording `action: 'practitioner_application.approved'` / `'practitioner_application.rejected'`, `outcome: 'SUCCESS'`, `resourceType: 'PractitionerApplication'`, `resourceId`, `actorUserId`, `ipAddress`.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-038
**Title:** Manual practitioner payout recording not security-audit logged
**Severity:** P1
**Module:** Auth / Security Audit Logging
**Affected users:** Platform operators, financial auditors
**Affected surfaces:** `POST /admin/practitioner-payouts/manual`
**Evidence:** `fayed-backend-v1/src/modules/financial-operations/use-cases/record-admin-practitioner-manual-payout.use-case.ts` — No call to `SecurityAuditService.logAsync()`. By contrast, `AdminPractitionerPayoutsController` at `admin-practitioner-payouts.controller.ts:170` does log `finance.practitioner_payout.record` for automatic payouts, but the manual payout use case is separate and lacks logging.
**Root cause hypothesis:** The manual payout use case was built separately from the automatic payout controller and the audit logging was not added to the use case.
**Risk:** Manual practitioner payouts are high-value financial operations. A financial operator could record a fraudulent manual payout to a practitioner's account without any security audit trail. This is a financial fraud enabler.
**Smallest safe next step:** Add `securityAuditService.logAsync()` to `RecordAdminPractitionerManualPayoutUseCase`, recording `action: 'finance.manual_payout.recorded'`, `outcome: 'SUCCESS'`, `resourceType: 'PractitionerPayout'`, `resourceId`, `targetUserId` (practitioner ID), `amount`, `currency`, `actorUserId`, `ipAddress`.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-039
**Title:** No account lockout mechanism after repeated failed login attempts
**Severity:** P1
**Module:** Auth / Account Security
**Affected users:** All platform users (patients, practitioners, admins)
**Affected surfaces:** All login endpoints
**Evidence:** `fayed-backend-v1/src/common/throttle/throttle-policy-config.ts` — Rate limiting is configured (10 req/15min for login). `fayed-backend-v1/src/common/throttle/throttle-policy.guard.ts` — Throttle store enforces sliding-window rate limits. However, there is no permanent or temporary account lockout after N failed attempts. A brute-force attacker with 10 attempts per 15 minutes per IP can attempt 960 passwords per day per IP against a target account. With enough distributed IPs, this becomes feasible.
**Root cause hypothesis:** The platform relies entirely on rate limiting for brute-force protection. Account lockout was either not implemented or was deferred.
**Risk:** An attacker with access to a target's email address can perform offline password attacks against the account by making repeated login requests from multiple IP addresses. While rate limiting slows the attack, it does not stop it. The attacker can use a botnet or cloud IP pool to scale the attack.
**Smallest safe next step:** Implement account lockout after N consecutive failed attempts (e.g., 10 failures → lock for 30 minutes). Log lockout events to `SecurityAuditLog`. Notify the user via email when their account is locked.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-040
**Title:** No global JWT auth guard — new protected endpoints default to unprotected
**Severity:** P1
**Module:** Auth / Backend Guard Architecture
**Affected users:** All platform users if new endpoints are added without explicit guards
**Affected surfaces:** All backend API modules
**Evidence:** `fayed-backend-v1/src/main.ts` — No `APP_GUARD` registration found. `fayed-backend-v1/src/modules/auth/auth.module.ts:123` — `AuthRequestContextMiddleware` is applied globally, but `JwtAccessAuthGuard` is NOT registered as an application-wide guard. All protected endpoints must explicitly declare `@UseGuards(JwtAccessAuthGuard)` or `@Public()`. `fayed-backend-v1/src/common/decorators/public.decorator.ts` — `@Public()` sets `IS_PUBLIC_KEY = false` to bypass auth.
**Root cause hypothesis:** The NestJS `APP_GUARD` pattern (registering `JwtAccessAuthGuard` globally so all endpoints require auth by default, with `@Public()` as the opt-out) was not implemented. Instead, every endpoint must explicitly declare its guard. This is a defense-in-depth failure.
**Risk:** A developer adding a new sensitive endpoint (e.g., a new financial operation, a new patient data endpoint) without explicitly adding `@UseGuards(JwtAccessAuthGuard)` would create a fully unauthenticated endpoint. Without the global guard, there is no automatic protection for forgotten endpoints. In the current codebase this has not caused a visible breach, but the architecture makes it easy to introduce such a vulnerability.
**Smallest safe next step:** Register `JwtAccessAuthGuard` as `APP_GUARD` in `main.ts`. This would make all endpoints require authentication by default, with `@Public()` as the opt-out. Existing `@Public()` endpoints must be reviewed to confirm they should remain public. This is a safe architectural change that retroactively secures any accidentally unguarded endpoints.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-041
**Title:** Practitioner login request does not include deviceId — weaker device binding than patient login
**Severity:** P1
**Module:** Auth / Device Binding
**Affected users:** Practitioners on mobile devices
**Affected surfaces:** `POST /auth/practitioner/login`
**Evidence:** `fayed-mobile/src/lib/api.ts:72-74` — `practitionerLogin` does NOT include `deviceId` in the `PractitionerLoginRequest` payload. `fayed-mobile/src/lib/api.ts:36-38` — `patientLogin` DOES include `deviceId?: string` in `PractitionerLoginRequest` (`contracts.ts:164-167` vs `contracts.ts:119`). `fayed-mobile/src/lib/api.ts:169-172` — `practitionerVerifyOtp` includes `deviceId`. Device binding happens at the OTP stage, but the initial credential transmission has no device identifier for practitioners.
**Root cause hypothesis:** The device tracking feature was added to patient login first, and when practitioner login was built (with its two-step OTP flow), the deviceId was only included in the OTP verification step, not the initial login.
**Risk:** Practitioner login credentials (email + password) are sent without a device identifier. If an attacker intercepts practitioner credentials, they can authenticate from any device without the device binding that patients have. The weaker device binding makes practitioner credential theft more exploitable on mobile.
**Smallest safe next step:** Add `deviceId: string` to `PractitionerLoginRequest` and include it in the `practitionerLogin` API call from the mobile signin screen, consistent with how `patientLogin` includes it.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-042
**Title:** Android Expo SecureStore uses software-backed encryption — tokens extractable on rooted devices
**Severity:** P1
**Module:** Auth / Token Storage (Mobile)
**Affected users:** Practitioners and patients on rooted Android devices
**Affected surfaces:** All authenticated mobile sessions on Android
**Evidence:** `fayed-mobile/src/features/auth/secure-token-storage.ts:55-70` — On Android, Expo SecureStore uses `EncryptedSharedPreferences` backed by software encryption, not hardware-backed Android Keystore. `AndroidManifest.xml` (standard Expo template, not audited in full) likely does not set `android:allowBackup="false"`, meaning Android's ADB backup could include encrypted shared preferences data.
**Root cause hypothesis:** The mobile app was built using the default Expo SecureStore configuration for Android, which uses `EncryptedSharedPreferences` (software encryption). Hardware-backed Keystore requires additional native module configuration that was not implemented.
**Risk:** On a rooted Android device, an attacker can extract the `fayed.mobile.auth.tokens.*` values from `EncryptedSharedPreferences` (the encryption key is stored alongside the data on rooted devices). With the refresh token extracted, the attacker can obtain a new access token and hijack the session. The 7-day refresh token expiry (or longer if the user stays logged in) creates a large attack window.
**Smallest safe next step:** Configure `android:allowBackup="false"` in `AndroidManifest.xml` to prevent ADB backup extraction. Evaluate whether `expo-local-authentication` with hardware-backed Keystore can be used for storing sensitive tokens on Android.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-043
**Title:** Web session access token has 7-day expiry — compounds cookie exposure risk
**Severity:** P1
**Module:** Auth / Token Expiry
**Affected users:** All web users
**Affected surfaces:** All authenticated web sessions
**Evidence:** `fayed-frontend-v1/src/lib/config.ts:17` — `Number(process.env.NEXT_PUBLIC_TOKEN_EXPIRY_DAYS) || 7`. Default access token expiry is 7 days. `http-client.ts:285-297` — Token stored in non-httpOnly cookie with no refresh window restriction.
**Root cause hypothesis:** The 7-day expiry was likely set to avoid frequent re-authentication for users who leave the browser open. The cookie-based storage was chosen for SSR token accessibility.
**Risk:** If an XSS vulnerability exists on any Fayed page (even a reflected XSS in a search parameter), an attacker can exfiltrate the access token. With a 7-day expiry, the stolen token remains valid for up to 7 days. An attacker with the refresh token (also non-httpOnly) can obtain new access tokens indefinitely.
**Smallest safe next step:** Reduce access token expiry to a maximum of 1 hour (e.g., 30 minutes). The frontend already has automatic token refresh via the refresh endpoint. A shorter expiry limits the window during which a stolen token is valid.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-044
**Title:** __DEV__ URL allowlist exception in production builds
**Severity:** P1
**Module:** Auth / Mobile URL Validation
**Affected users:** Patients and practitioners joining sessions on Expo web
**Affected surfaces:** Session join URL validation on Expo web
**Evidence:** `fayed-mobile/src/lib/external-url.ts:15` — `isAllowedExternalUrl` permits `http:` URLs in `__DEV__` mode. `__DEV__` is Expo/Metro bundler-defined and should be `false` in production builds, but if the bundler is misconfigured, `http:` URLs would be allowed in production. External join URLs using `http:` could be served from a man-in-the-middle position.
**Root cause hypothesis:** The developer added `http:` as an allowed scheme in dev mode to test with local development servers, then failed to restrict it to production builds properly.
**Risk:** If `__DEV__` evaluates to `true` in a production Expo web build (configuration error), an attacker could craft a session join URL using `http://` instead of `https://`, enabling man-in-the-middle interception of the join token. This would allow the attacker to hijack the session call.
**Smallest safe next step:** Replace the `__DEV__` conditional with a build-time environment variable check that is explicitly set to `false` in production builds. Alternatively, remove the `http:` allowlist entry entirely since production session join URLs should always use `https://`.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-045
**Title:** AdminPermissionGate not auto-applied to all admin pages — backend is sole enforcement
**Severity:** P1
**Module:** Auth / Admin Route Protection
**Affected users:** Admin users with restricted permissions
**Affected surfaces:** `/admin/*` pages not wrapped in `AdminPermissionGate`
**Evidence:** `fayed-frontend-v1/src/components/admin/AdminPermissionGate.tsx` — `AdminPermissionGate` must be manually added to each admin page. `fayed-frontend-v1/src/app/[locale]/(admin)/layout.tsx` — The admin layout calls `getServerCurrentUserPermissions()` and `filterAdminNavigation()` (server-side), but does not auto-apply `AdminPermissionGate` to all child routes. Pages that do not use `AdminPermissionGate` render without frontend permission checks, relying entirely on backend enforcement.
**Root cause hypothesis:** The `AdminPermissionGate` was built as a per-page component rather than a layout-level guard. Each admin page is responsible for adding it. Pages that were not updated during the permission-gate rollout are unprotected on the frontend.
**Risk:** Admin users who should not have access to a specific page see that page rendered in the browser (UX leak). While the backend correctly enforces permissions and returns 403, the frontend renders sensitive admin UI to unauthorized users. This is primarily a UX/information-disclosure issue, but it could expose sensitive admin UI components and data-fetching patterns to unauthorized admin users.
**Smallest safe next step:** Audit all admin page components to confirm each has `AdminPermissionGate` wrapping its sensitive actions. Alternatively, create a higher-order component or layout-level guard that auto-applies to all admin pages.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-046
**Title:** Web patient and practitioner layouts do not check account-state — suspended users retain access
**Severity:** P1
**Module:** Auth / Account State Enforcement (Web)
**Affected users:** Patients and practitioners with SUSPENDED or inactive account status
**Affected surfaces:** All `(patient)/*` routes; all `(practitioner)/*` routes
**Evidence:** `fayed-frontend-v1/src/app/[locale]/(patient)/layout.tsx` — `requireAuthenticatedArea(locale, "patient")` only checks `role === "PATIENT"`, not `user.isActive` or `user.status`. No check for `SUSPENDED`, `PENDING_VERIFICATION`, or other account states. `fayed-frontend-v1/src/app/[locale]/(practitioner)/layout.tsx` — Same pattern: only role check, no account state check. `AuthProvider.tsx` (mobile) at lines 486-500 correctly checks `practitionerStatus === "APPROVED"` and redirects unapproved practitioners to `/application-status`, but the web layout does not perform this check.
**Root cause hypothesis:** The web layouts were built with role-based access only. Account-state checks were added in the mobile app but not retrofitted to the web layouts. The backend likely enforces account state on each API call, but the frontend renders full pages before those calls fail.
**Risk:** A patient with `status: "SUSPENDED"` can still access the full patient dashboard and all patient routes in the browser. The backend API calls will likely fail with 403, but the page renders first. A suspended practitioner who somehow retains their token can still access the practitioner area. The UX shows a broken experience (pages that load then error) rather than a clean redirect.
**Smallest safe next step:** Add account-state checks to `requireAuthenticatedArea` or a dedicated `requireActiveAccount` guard in the patient and practitioner layouts. On `isActive === false` or relevant suspended status, redirect to an account-suspended screen rather than allowing the full protected layout to render.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-047
**Title:** GeneralChatConversationsController lacks RolesGuard — inconsistent defense-in-depth with other patient controllers
**Severity:** P1
**Module:** Auth / Patient Authorization
**Affected users:** All users of the General Chat module
**Affected surfaces:** `GET /chat/conversations`; `GET /chat/conversations/:id`
**Evidence:** `fayed-backend-v1/src/modules/chat/controllers/general-chat-conversations.controller.ts` — The controller applies `@UseGuards(JwtAccessAuthGuard)` but NOT `RolesGuard`. All other patient-facing controllers (`PatientSessionsController`, `PatientPaymentsController`, `PatientWalletController`, `PatientSupportController`) apply both `JwtAccessAuthGuard` AND `RolesGuard` at the controller level. `GeneralChatConversationsController` is an outlier.
**Root cause hypothesis:** The chat controller was likely built before the dual-guard pattern was standardized, or was modified after the pattern was established without updating the guard list.
**Risk:** If a non-patient user (e.g., a practitioner with a stolen patient token, or a misconfigured role) obtained a valid JWT, the `GeneralChatConversationsController` would not reject them at the guard level. The use-case-level logic would likely handle ownership correctly, but the defense-in-depth layer is missing. This is a maintainability and defense-in-depth gap rather than an active exploit.
**Smallest safe next step:** Add `RolesGuard` with `@Roles(AppRole.PATIENT)` to `GeneralChatConversationsController`, consistent with all other patient controllers.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-048
**Title:** Practitioner practitioner application approval/rejection not security-audit logged (cross-reference AUDIT-037 — already registered)
**Severity:** P1
**Module:** Auth / Security Audit Logging
**Affected users:** Platform operators, compliance auditors
**Affected surfaces:** `POST /admin/practitioner-applications/:id/approve`; `POST /admin/practitioner-applications/:id/reject`
**Note:** This finding is cross-referenced as AUDIT-037. It appears in both the practitioner and admin RBAC sections because the practitioner application approval flow spans both modules.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-049
**Title:** OTP verification attempts (success and failure) not security-audit logged
**Severity:** P1
**Module:** Auth / Security Audit Logging
**Affected users:** Platform operators monitoring auth security
**Affected surfaces:** `POST /auth/practitioner/login/verify-otp`
**Evidence:** `fayed-backend-v1/src/modules/auth/use-cases/verify-practitioner-login-otp.use-case.ts` — No call to `SecurityAuditService.logAsync()` on either success or failure. By contrast, `VerifyAdminStepUpUseCase` logs both success and failure for step-up password verification. OTP verification is a critical security boundary — tracking who successfully or unsuccessfully completes it is essential for detecting OTP brute-force attacks and credential theft.
**Root cause hypothesis:** Same as AUDIT-036 — the OTP verification use case predates the security audit logging standardization.
**Risk:** OTP verification brute-force attacks (4-6 digit codes) leave no audit trail. An attacker who has obtained a practitioner's credentials can systematically attempt OTP codes without detection. With 5 attempts per 15 minutes per IP (rate limit on `auth-practitioner-otp-verify`), an attacker has a window for limited attempts, but without logging there is no way to correlate failed OTP attempts across IPs or detect coordinated attacks.
**Smallest safe next step:** Add `securityAuditService.logAsync()` to `VerifyPractitionerLoginOtpUseCase` for both `SUCCESS` and `FAILURE` outcomes. Include `reason: 'INVALID_OTP'` for failures.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-050
**Title:** Password reset requests and completions not security-audit logged
**Severity:** P1
**Module:** Auth / Security Audit Logging
**Affected users:** Platform operators, affected users
**Affected surfaces:** `POST /auth/patient/forgot-password`; `POST /auth/patient/reset-password`; `POST /auth/practitioner/forgot-password`; `POST /auth/practitioner/reset-password`
**Evidence:** `fayed-backend-v1/src/modules/auth/use-cases/request-patient-password-reset.use-case.ts` — No `SecurityAuditService` call. `fayed-backend-v1/src/modules/auth/use-cases/reset-patient-password.use-case.ts` — No `SecurityAuditService` call. Same for practitioner variants. Password reset is a high-risk security event — it represents a credential recovery attempt and a window of account vulnerability.
**Root cause hypothesis:** Password reset flows were not included in the security audit logging scope.
**Risk:** A credential stuffing attack using a "password reset" flow against known platform emails would leave no audit trail. An insider or attacker could systematically probe which email addresses are registered on the platform by observing the response (though the backend does return a generic message, the existence of the use case call is not logged). More critically, successful password resets are not tracked — if an attacker compromises an email account, they could reset the platform password without detection.
**Smallest safe next step:** Add `securityAuditService.logAsync()` to all four password reset use cases (`RequestPatientPasswordReset`, `ResetPatientPassword`, `RequestPractitionerPasswordReset`, `ResetPractitionerPassword`), logging both request and completion events.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

### Finding ID: AUDIT-051
**Title:** No global throttle guard — rate limiting requires per-route decorator
**Severity:** P1
**Module:** Auth / Rate Limiting Architecture
**Affected users:** All API consumers
**Affected surfaces:** Any new endpoint added without `@ThrottlePolicy` decorator
**Evidence:** `fayed-backend-v1/src/common/decorators/throttle-policy.decorator.ts` — `ThrottlePolicy` is a decorator that must be explicitly applied to each route. `fayed-backend-v1/src/common/throttle/throttle-policy.guard.ts` — The guard is only activated when `@ThrottlePolicy` decorator is present. There is no global throttle guard equivalent to `APP_GUARD`. `throttle-policy-config.ts` — Only explicitly decorated endpoints have rate limiting.
**Root cause hypothesis:** Throttling was implemented as an opt-in per-route decorator rather than a global guard, consistent with the opt-in auth guard pattern.
**Risk:** A developer adding a new public endpoint (e.g., a search endpoint, a public data endpoint) without adding `@ThrottlePolicy` would create an unrate-limited endpoint vulnerable to abuse, scraping, or DDoS. This is the same architectural risk as AUDIT-040 (no global auth guard).
**Smallest safe next step:** Register `ThrottlePolicyGuard` as a global guard in `main.ts` with a default policy, allowing specific endpoints to override with stricter policies via `@ThrottlePolicy`.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## P2 Findings

---

### Finding ID: AUDIT-052
**Title:** Silent logout on refresh token expiry — no user-facing session-expired message
**Severity:** P2
**Module:** Auth / UX
**Affected users:** Web and mobile users whose refresh token has expired
**Affected surfaces:** All authenticated sessions on web and mobile
**Evidence:** `fayed-frontend-v1/src/lib/http-client.ts:238-243` — On `refreshed === false`, `handleLogout()` is called without user notification. `fayed-mobile/src/lib/api.ts` — On refresh failure, `clearAuthenticatedState()` + `router.replace("/(auth)")` with no session-expired dialog. `fayed-mobile/src/providers/AuthProvider.tsx:440-443` — `onAuthFailure` silently redirects to auth without showing a message.
**Root cause hypothesis:** The session expiry was treated as a local cleanup event rather than a user communication opportunity. The backend is authoritative for session state, and the frontend defers to it.
**Risk:** A user who is actively using the app and suddenly gets logged out without explanation may contact support, assuming a bug. There is no data exposure because the logout is legitimate (expired token), but the UX is confusing. This does not enable account takeover.
**Smallest safe next step:** Show a toast notification ("Your session has expired. Please sign in again.") before redirecting to the auth screen, using the `SESSION_EXPIRED` error type already tracked by the error handling system.
**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Open Findings

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| AUDIT-031 | Academy enrollment controller has no auth guards | P0 | ⚠️ Partially Fixed — Sprint 1-R2: class `@Public()` removed; `createEnrollment` unprotected but phone/email-based by design |
| AUDIT-032 | Internal UUID `id` exposed in public practitioner DTOs | P0 | ✅ Fixed + Verified — Phase 9a Sprint 1 |
| AUDIT-033 | Web refresh token cookie lacks httpOnly — XSS can exfiltrate tokens | P0 | ✅ Fixed — Sprint 1-R2: backend sets real httpOnly cookie via `Set-Cookie` header |
| AUDIT-034 | Practitioner support tickets bypass PRACTITIONER_OTP_VERIFIED | P1 | Open |
| AUDIT-035 | Practitioner financial operations bypass PRACTITIONER_OTP_VERIFIED | P1 | Open |
| AUDIT-036 | Login failures not security-audit logged | P1 | Open |
| AUDIT-037 | Practitioner application approval/rejection not security-audit logged | P1 | Open |
| AUDIT-038 | Manual practitioner payout not security-audit logged | P1 | Open |
| AUDIT-039 | No account lockout after repeated failed login attempts | P1 | Open |
| AUDIT-040 | No global JWT auth guard — new endpoints default to unprotected | P1 | Open |
| AUDIT-041 | Practitioner login missing deviceId — weaker device binding | P1 | Open |
| AUDIT-042 | Android SecureStore uses software-backed encryption | P1 | Open |
| AUDIT-043 | Web session access token 7-day expiry — compounds cookie risk | P1 | Open |
| AUDIT-044 | `__DEV__` URL allowlist exception could be active in production | P1 | Open |
| AUDIT-045 | AdminPermissionGate not auto-applied to all admin pages | P1 | Open |
| AUDIT-046 | Web patient/practitioner layouts do not check account-state | P1 | Open |
| AUDIT-047 | GeneralChatConversationsController lacks RolesGuard | P1 | Open |
| AUDIT-048 | Practitioner application approval/rejection not security-audit logged | P1 | Open |
| AUDIT-049 | OTP verification attempts not security-audit logged | P1 | Open |
| AUDIT-050 | Password reset requests/completions not security-audit logged | P1 | Open |
| AUDIT-051 | No global throttle guard | P1 | Open |
| AUDIT-052 | Silent logout on refresh token expiry | P2 | Open |

**Phase 4 total: 21 findings | Open: 21 | Closed: 0**

---

## Closed Findings

_No findings closed in Phase 4._

---

## Findings by Phase

| Phase | Open | Closed | Total |
|-------|------|--------|-------|
| Phase 1 | 2 | 0 | 2 |
| Phase 2 | 6 | 0 | 6 |
| Phase 3 | 22 | 0 | 22 |
| Phase 4 | 21 | 0 | 21 |
| **Total** | **51** | **0** | **51** |

---

*This register was produced by a read-only audit. No application code was modified. No findings were fixed during this phase.*
