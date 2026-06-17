# Phase 4 Evidence Index — Auth / Roles / Permissions / Security

**Phase:** 4
**Created:** 2026-06-17
**Evidence gathered by:** 8 concurrent sub-agents (Backend Auth, Patient Auth, Practitioner Auth, Admin RBAC, Web Auth, Mobile Auth, Public Endpoints, Security Logging)
**Evidence type:** Source code inspection, guard/decorator analysis, configuration review, runtime probe attempts

---

## Evidence Index

### Scope of Evidence

This evidence index documents every file inspected, route checked, guard reviewed, decorator catalogued, and command executed during Phase 4. Evidence is organized by audit area.

---

## Audit Area 1: Backend Auth Core

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-backend-v1/src/modules/auth/auth.module.ts` | Full module — controllers, use cases, guards, middleware registration |
| `fayed-backend-v1/src/modules/auth/controllers/patient-auth.controller.ts` | 7 endpoints; guard/decorator application |
| `fayed-backend-v1/src/modules/auth/controllers/practitioner-auth.controller.ts` | 7 endpoints; OTP flow; device tracking |
| `fayed-backend-v1/src/modules/auth/controllers/admin-auth.controller.ts` | 4 endpoints; step-up flow |
| `fayed-backend-v1/src/modules/auth/controllers/current-auth-user.controller.ts` | Current user, logout, device list |
| `fayed-backend-v1/src/modules/auth/use-cases/login-patient-with-email-password.use-case.ts` | Patient login logic; refresh token generation |
| `fayed-backend-v1/src/modules/auth/use-cases/login-practitioner-password.use-case.ts` | Practitioner login; deviceId absence |
| `fayed-backend-v1/src/modules/auth/use-cases/verify-practitioner-login-otp.use-case.ts` | OTP verification; missing security audit |
| `fayed-backend-v1/src/modules/auth/use-cases/login-admin.use-case.ts` | Admin login; missing security audit |
| `fayed-backend-v1/src/modules/auth/use-cases/refresh-auth-session.use-case.ts` | Token refresh; role boundary enforcement |
| `fayed-backend-v1/src/modules/auth/use-cases/logout.use-case.ts` | Session invalidation on logout |
| `fayed-backend-v1/src/modules/auth/use-cases/request-patient-password-reset.use-case.ts` | Password reset request; no audit log |
| `fayed-backend-v1/src/modules/auth/use-cases/reset-patient-password.use-case.ts` | Password reset completion; no audit log |
| `fayed-backend-v1/src/modules/auth/use-cases/request-practitioner-password-reset.use-case.ts` | Practitioner password reset; no audit log |
| `fayed-backend-v1/src/modules/auth/use-cases/reset-practitioner-password.use-case.ts` | Practitioner password reset completion; no audit log |
| `fayed-backend-v1/src/modules/auth/use-cases/verify-admin-step-up.use-case.ts` | Admin step-up/MFA; security audit present |
| `fayed-backend-v1/src/modules/auth/services/auth-token.service.ts` | Token generation; TTLs (15m access, 7d refresh) |
| `fayed-backend-v1/src/modules/auth/services/auth-session.service.ts` | Session management; refresh token rotation |
| `fayed-backend-v1/src/modules/auth/services/password-hash.service.ts` | bcryptjs with 12 salt rounds |
| `fayed-backend-v1/src/modules/auth/services/device-tracking.service.ts` | Device tracking on login |
| `fayed-backend-v1/src/modules/auth/dto/requests/login-patient.request.ts` | deviceId field present |
| `fayed-backend-v1/src/modules/auth/dto/requests/login-practitioner.request.ts` | deviceId field absent |
| `fayed-backend-v1/src/common/guards/authentication/jwt-access-auth.guard.ts` | Guard implementation; no APP_GUARD registration |
| `fayed-backend-v1/src/common/guards/authentication/jwt-refresh-auth.guard.ts` | Refresh token guard |
| `fayed-backend-v1/src/common/decorators/public.decorator.ts` | IS_PUBLIC_KEY metadata key |
| `fayed-backend-v1/src/main.ts` | APP_GUARD registration check; CORS; validation |
| `fayed-backend-v1/src/common/enums/account-state.enum.ts` | AccountStateRequirement enum values |
| `fayed-backend-v1/src/common/enums/account-status.enum.ts` | Account status values |
| `fayed-backend-v1/src/prisma/schema.prisma` (auth-related sections) | Auth session model; tokenVersion field |

### Key findings from Area 1

- **No APP_GUARD:** `main.ts` does not register `JwtAccessAuthGuard` as a global application guard. Every protected endpoint requires explicit `@UseGuards(JwtAccessAuthGuard)`.
- **No global throttle guard:** `ThrottlePolicyGuard` is not a global guard — requires per-route decorator.
- **Access token TTL:** 15 minutes (confirmed in `auth-token.service.ts`). Refresh token: 7 days.
- **Refresh token rotation:** `auth-session.service.ts` uses bcrypt comparison of stored hash against presented token; increments `tokenVersion` on rotation.
- **Role-bound refresh:** `refresh-auth-session.use-case.ts:34` enforces `requestedRole === storedRole` — patient/practitioner/admin tokens cannot cross-authenticate.
- **Password hashing:** bcryptjs, 12 salt rounds — strong.
- **Login failures:** Not security-audit logged in any of the 3 login use cases (patient, practitioner, admin).
- **OTP verification:** Not security-audit logged in `verify-practitioner-login-otp.use-case.ts`.
- **Password resets:** Not security-audit logged in any of the 4 password reset use cases.

---

## Audit Area 2: Patient Authorization

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-backend-v1/src/modules/patients/controllers/patient-profile.controller.ts` | Profile read/update; guards |
| `fayed-backend-v1/src/modules/patients/controllers/patient.controller.ts` | Patient CRUD; guards |
| `fayed-backend-v1/src/modules/sessions/controllers/patient-sessions.controller.ts` | Patient session management; Guards: JwtAccessAuthGuard + RolesGuard |
| `fayed-backend-v1/src/modules/payments/controllers/patient-payments.controller.ts` | Payment flow; guards |
| `fayed-backend-v1/src/modules/customer-wallets/controllers/patient-wallet.controller.ts` | Wallet balance/transactions; guards |
| `fayed-backend-v1/src/modules/support/controllers/patient-support.controller.ts` | Support tickets; guards |
| `fayed-backend-v1/src/modules/chat/controllers/general-chat-conversations.controller.ts` | Chat; missing RolesGuard |
| `fayed-backend-v1/src/modules/notifications/controllers/patient-notifications.controller.ts` | Notification preferences |
| `fayed-backend-v1/src/modules/assessments/controllers/patient-assessment.controller.ts` | Patient assessments |

### Key findings from Area 2

- **GeneralChatConversationsController** (`chat/general-chat-conversations.controller.ts`) applies `JwtAccessAuthGuard` but NOT `RolesGuard` — inconsistent with all other patient controllers.
- All other patient controllers apply both `JwtAccessAuthGuard` AND `RolesGuard` at controller level.
- Patient account state is enforced via `ActiveAccountGuard` on specific endpoints, not uniformly at controller level.

---

## Audit Area 3: Practitioner OTP / Account State Enforcement

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-backend-v1/src/modules/practitioners/controllers/practitioner-availability.controller.ts:55` | Requires `PRACTITIONER_OTP_VERIFIED` |
| `fayed-backend-v1/src/modules/support/controllers/practitioner-support.controller.ts:41` | Missing OTP guard |
| `fayed-backend-v1/src/modules/financial-operations/controllers/practitioner-financial-operations.controller.ts:37-40` | Missing OTP guard |
| `fayed-backend-v1/src/modules/practitioners/controllers/practitioner-profile.controller.ts` | Profile; account state guards |
| `fayed-backend-v1/src/modules/practitioners/dto/public-practitioner-response.dto.ts:51,155` | UUID `id` field in public DTOs |
| `fayed-backend-v1/src/common/decorators/account-state.decorator.ts` | @RequireAccountStates composes 6 guards |

### Key findings from Area 3

- **AUDIT-034 (P0):** `PractitionerSupportController` — `createSupportTicket` at line 41 has only `JwtAccessAuthGuard + RolesGuard`. Missing `PractitionerOtpVerifiedGuard` and `PractitionerApprovedGuard`.
- **AUDIT-035 (P0):** `PractitionerFinancialOperationsController` — `getWallet`, `getLedger`, `getSettlements` (lines 37-40) have only `JwtAccessAuthGuard + RolesGuard`. Missing `PractitionerOtpVerifiedGuard`.
- Public practitioner DTOs expose internal UUID in `id` field.

---

## Audit Area 4: Admin RBAC / Permissions

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-backend-v1/src/modules/admin/controllers/admin-users.controller.ts` | Admin user management; permissions |
| `fayed-backend-v1/src/modules/admin/controllers/admin-practitioner-applications.controller.ts` | Application approval/rejection |
| `fayed-backend-v1/src/modules/admin/controllers/admin-settlements.controller.ts` | Settlement management |
| `fayed-backend-v1/src/modules/admin/controllers/admin-practitioner-payouts.controller.ts` | Payout recording |
| `fayed-backend-v1/src/modules/admin/controllers/admin-reports.controller.ts` | Reports access |
| `fayed-backend-v1/src/modules/admin/use-cases/approve-practitioner-application.use-case.ts` | No security audit log |
| `fayed-backend-v1/src/modules/admin/use-cases/reject-practitioner-application.use-case.ts` | No security audit log |
| `fayed-backend-v1/src/modules/admin/use-cases/record-admin-practitioner-manual-payout.use-case.ts` | No security audit log |
| `fayed-backend-v1/src/common/guards/authorization/permissions.guard.ts` | PermissionsGuard; DB lookup |
| `fayed-backend-v1/src/common/guards/authorization/roles.guard.ts` | RolesGuard |
| `fayed-backend-v1/src/common/guards/authorization/active-account.guard.ts` | ActiveAccountGuard |
| `fayed-backend-v1/src/common/guards/authorization/step-up.guard.ts` | StepUpGuard |
| `fayed-backend-v1/src/common/guards/authorization/practitioner-approved.guard.ts` | PractitionerApprovedGuard |
| `fayed-backend-v1/src/common/guards/authorization/practitioner-otp-verified.guard.ts` | PractitionerOtpVerifiedGuard |
| `fayed-backend-v1/src/common/resolvers/permission.resolver.ts` | DB lookup; SUPER_ADMIN bypass at line 23 |
| `fayed-backend-v1/src/common/enums/permission-key.enum.ts` | ~47 permission keys |
| `fayed-backend-v1/src/common/decorators/require-account-states.decorator.ts` | @RequireAccountStates |
| `fayed-backend-v1/src/common/decorators/require-step-up.decorator.ts` | @RequireStepUp |

### Key findings from Area 4

- **SUPER_ADMIN bypass:** `PermissionResolverService:23` bypasses all permission checks for `AppRole.SUPER_ADMIN`.
- **5 sensitive mutations missing @RequireStepUp:** Admin settlements (mark-paid, mark-failed), admin practitioner payouts (record, process), and admin manual refunds lack step-up/MFA requirement.
- **Approval/rejection not audited:** `ApprovePractitionerApplicationUseCase` and `RejectPractitionerApplicationUseCase` have no security audit logging.
- **Manual payout not audited:** `RecordAdminPractitionerManualPayoutUseCase` has no security audit logging.
- **PermissionResolverService DB lookup:** Every permission check hits the database (no caching observed in guard code path).

---

## Audit Area 5: Step-Up / MFA

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-backend-v1/src/modules/auth/controllers/admin-auth.controller.ts:63` | Admin step-up initiation |
| `fayed-backend-v1/src/modules/auth/use-cases/verify-admin-step-up.use-case.ts:56` | Logs step-up success/failure |
| `fayed-backend-v1/src/common/guards/authorization/step-up.guard.ts` | Reads @RequireStepUp metadata |
| `fayed-backend-v1/src/common/decorators/require-step-up.decorator.ts` | @RequireStepUp decorator |
| `fayed-backend-v1/src/common/throttle/throttle-policy-config.ts` | `auth-admin-step-up-verify` rate limit |

### Key findings from Area 5

- Step-up flow is well-implemented for admin login verification.
- Only 5 sensitive mutations lack `@RequireStepUp` (see Area 4).
- Step-up verification success and failure ARE security-audit logged (`verify-admin-step-up.use-case.ts:56`).

---

## Audit Area 6: Web Route Protection

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-frontend-v1/src/proxy.ts` | Next.js proxy middleware; auth checks; payment-return bypass |
| `fayed-frontend-v1/src/lib/auth/server.ts` | Token storage; non-httpOnly cookies |
| `fayed-frontend-v1/src/lib/http-client.ts:285-297` | Cookie creation; ACCESS_TOKEN_COOKIE + REFRESH_TOKEN_COOKIE |
| `fayed-frontend-v1/src/lib/config.ts:17` | `ACCESS_TOKEN_EXPIRY` = 7 days default |
| `fayed-frontend-v1/src/app/[locale]/(patient)/layout.tsx` | `requireAuthenticatedArea`; role-only check |
| `fayed-frontend-v1/src/app/[locale]/(practitioner)/layout.tsx` | Role-only check; no practitioner account-state |
| `fayed-frontend-v1/src/app/[locale]/(admin)/layout.tsx` | Server-side permissions; AdminPermissionGate |
| `fayed-frontend-v1/src/components/admin/AdminPermissionGate.tsx` | Per-page permission gate; not auto-applied |
| `fayed-frontend-v1/src/middleware.ts` | Does not exist |

### Key findings from Area 6

- **Payment-return bypass (AUDIT-033 P0):** `proxy.ts:268-270` explicitly bypasses auth middleware for `/patient/sessions/:id/payment-return` — this is the correct design for deep-link return from payment gateways.
- **Non-httpOnly cookies (AUDIT-033 P0):** Both access and refresh tokens stored in non-httpOnly cookies — XSS exfiltration possible.
- **7-day token expiry (AUDIT-043 P1):** `ACCESS_TOKEN_EXPIRY` defaults to 7 days — large attack window.
- **No middleware.ts:** Next.js `middleware.ts` does not exist; all route protection is in `proxy.ts`.
- **Patient/practitioner layouts (AUDIT-046 P1):** Only role check; no account-state verification.
- **AdminPermissionGate (AUDIT-045 P1):** Must be manually added per-page; not auto-applied in layout.

---

## Audit Area 7: Mobile Auth

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-mobile/src/features/auth/secure-token-storage.ts:55-70` | Android Expo SecureStore; software encryption |
| `fayed-mobile/src/features/auth/storage.ts` | AsyncStorage session metadata; web plaintext tokens |
| `fayed-mobile/src/features/auth/api.ts` | Token refresh; single-flight implementation |
| `fayed-mobile/src/lib/api.ts:72-74` | `practitionerLogin` missing deviceId |
| `fayed-mobile/src/providers/AuthProvider.tsx:486-500` | Practitioner account-state redirect; practitionerStatus check |
| `fayed-mobile/src/lib/external-url.ts:15` | `__DEV__` http: URL allowlist |
| `fayed-mobile/app/(auth)/signin/practitioner.tsx:92-95` | Dev OTP bypass code path |
| `fayed-mobile/src/features/auth/hooks/use-auth-store.ts` | Auth state management |

### Key findings from Area 7

- **Android SecureStore (AUDIT-042 P1):** Expo SecureStore uses `EncryptedSharedPreferences` with software encryption — not hardware-backed. Extractable on rooted devices.
- **Web AsyncStorage plaintext (AUDIT-035 P0):** `secure-token-storage.ts` uses `AsyncStorage` for web — tokens stored in plaintext in browser localStorage.
- **Practitioner login missing deviceId (AUDIT-041 P1):** `practitionerLogin` does not include `deviceId` in request payload.
- **Dev OTP bypass (AUDIT-037 P0):** `practitioner.tsx:92-95` has `__DEV__` conditional OTP bypass — active in development builds.
- **`__DEV__` URL allowlist (AUDIT-044 P1):** `external-url.ts:15` allows `http:` URLs in dev mode — could be misconfigured in production.

---

## Audit Area 8: Public Endpoint Exposure

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts` | Missing @Public() and @UseGuards() |
| `fayed-backend-v1/src/modules/practitioners/controllers/public-practitioner.controller.ts` | Public practitioner listing/detail |
| `fayed-backend-v1/src/modules/practitioners/dto/public-practitioner-response.dto.ts:51,155` | UUID `id` in public DTOs |
| `fayed-backend-v1/src/modules/specialties/controllers/public-specialty.controller.ts` | Public specialty listing |
| `fayed-backend-v1/src/modules/auth/guards/public.guard.ts` | PublicGuard implementation |

### Key findings from Area 8

- **Academy controller (AUDIT-031 P0):** `PublicAcademyController` has no `@Public()` decorator and no `@UseGuards()`. Without explicit opt-in, the guard-less controller relies on endpoint-level auth — behavior is ambiguous without APP_GUARD.
- **UUID exposure (AUDIT-032 P0):** `PublicPractitionerListItemResponseDto:51` and `PublicPractitionerDetailsResponseDto:155` both expose `id: string` (internal UUID).

---

## Audit Area 9: Security Audit Logging

### Inspected paths

| File | What was inspected |
|------|-------------------|
| `fayed-backend-v1/src/common/security-audit/security-audit.service.ts` | BANNED_KEYS denylist (23 keys); sanitizeMetadata() |
| `fayed-backend-v1/src/modules/auth/use-cases/login-admin.use-case.ts` | No audit on login failure |
| `fayed-backend-v1/src/modules/auth/use-cases/login-patient-with-email-password.use-case.ts` | No audit on login failure |
| `fayed-backend-v1/src/modules/auth/use-cases/login-practitioner-password.use-case.ts` | No audit on login failure |
| `fayed-backend-v1/src/modules/auth/use-cases/verify-practitioner-login-otp.use-case.ts` | No OTP success/failure audit |
| `fayed-backend-v1/src/modules/auth/use-cases/request-patient-password-reset.use-case.ts` | No password reset request audit |
| `fayed-backend-v1/src/modules/auth/use-cases/reset-patient-password.use-case.ts` | No password reset completion audit |
| `fayed-backend-v1/src/modules/auth/use-cases/request-practitioner-password-reset.use-case.ts` | No practitioner reset audit |
| `fayed-backend-v1/src/modules/auth/use-cases/reset-practitioner-password.use-case.ts` | No practitioner reset audit |
| `fayed-backend-v1/src/modules/auth/use-cases/verify-admin-step-up.use-case.ts:56` | Step-up success/failure audit — good |
| `fayed-backend-v1/src/modules/admin/use-cases/approve-practitioner-application.use-case.ts` | No audit |
| `fayed-backend-v1/src/modules/admin/use-cases/reject-practitioner-application.use-case.ts` | No audit |
| `fayed-backend-v1/src/modules/admin/use-cases/record-admin-practitioner-manual-payout.use-case.ts` | No audit |
| `fayed-backend-v1/src/modules/financial-operations/use-cases/record-admin-practitioner-manual-payout.use-case.ts` | No audit |

### Key findings from Area 9

- **Login failures (AUDIT-036 P1):** All 3 login flows (patient, practitioner, admin) do not log failed authentication attempts to `SecurityAuditLog`.
- **OTP verification (AUDIT-049 P1):** `verify-practitioner-login-otp.use-case.ts` does not audit OTP success or failure.
- **Password resets (AUDIT-050 P1):** None of the 4 password reset use cases audit request or completion events.
- **Practitioner application approval/rejection (AUDIT-037 P1):** No security audit logging.
- **Manual payout recording (AUDIT-038 P1):** No security audit logging.
- **Step-up (good):** `verify-admin-step-up.use-case.ts` correctly logs both success and failure.
- **BANNED_KEYS denylist:** 23 sensitive keys are blocked from metadata. `sanitizeMetadata()` applies 2-layer protection (direct key match + nested object scan).

---

## Audit Area 10: Runtime Checks

### Runtime probes attempted

| Probe | Target | Result |
|-------|--------|--------|
| Backend health | `http://localhost:6000` | No response (not running) |
| Backend API routes | `http://localhost:6000/api/*` | No response (not running) |
| Frontend health | `http://localhost:3000` | No response (not running) |
| Mobile Metro | `http://localhost:8081` | No response (not running) |

### Runtime check status

**Not performed.** Backend, frontend, and mobile servers are not running. Runtime verification of auth guard behavior, token expiry, and account-state enforcement would require running servers. Per the Phase 4 brief, runtime checks were to be attempted only if servers were already running — they were not.

All auth/permission/role findings in Phase 4 are based on static code analysis only.

---

## Guards and Decorators Catalogued

### Authentication Guards

| Guard | Registered globally? | Used in |
|-------|----------------------|---------|
| `JwtAccessAuthGuard` | No (opt-in only) | All protected modules |
| `JwtRefreshAuthGuard` | No | Auth module only |
| `CsrfProtectionGuard` | No | Auth module only |

### Authorization Guards

| Guard | Purpose |
|-------|---------|
| `RolesGuard` | Enforces `@Roles()` decorator |
| `PermissionsGuard` | Enforces `@Permissions()` decorator; DB lookup |
| `ActiveAccountGuard` | Enforces active account state |
| `PractitionerOtpVerifiedGuard` | Enforces OTP verification for practitioners |
| `PractitionerApprovedGuard` | Enforces practitioner APPROVED status |
| `StepUpGuard` | Enforces MFA/step-up for sensitive mutations |
| `ThrottlePolicyGuard` | Rate limiting per `@ThrottlePolicy` decorator |

### Key Decorators

| Decorator | Location | Purpose |
|-----------|----------|---------|
| `@Public()` | `public.decorator.ts` | Opt-out of auth (sets `IS_PUBLIC_KEY`) |
| `@Roles(...)` | `roles.decorator.ts` | Role requirement |
| `@Permissions(...)` | `permissions.decorator.ts` | Permission requirement |
| `@RequireAccountStates(...)` | `account-state.decorator.ts` | Account state requirements (6 states) |
| `@RequireStepUp()` | `require-step-up.decorator.ts` | MFA required for mutation |
| `@ThrottlePolicy(...)` | `throttle-policy.decorator.ts` | Rate limit policy |
| `@ResourceOwner()` | `resource-owner.decorator.ts` | Resource ownership check |

---

## Commands Run

| Command | Purpose | Result |
|---------|---------|--------|
| `find fayed-backend-v1/src -name "*.ts" \| xargs grep -l "APP_GUARD"` | Check for global auth guard registration | No results |
| `grep -r "ThrottlePolicyGuard" fayed-backend-v1/src --include="*.ts"` | Verify throttle guard is per-route only | Confirmed per-route |
| `grep -r "BANNED_KEYS" fayed-backend-v1/src/common/security-audit --include="*.ts"` | Verify denylist presence | Found 23 banned keys |

---

## Evidence Limitations

1. **Runtime checks not performed** — No servers running during Phase 4. All findings are static code analysis.
2. **Backend API route prefix not confirmed** — Whether the backend serves at `/api/v1/` or `/api/` was not resolved. This affected runtime probe attempts.
3. **`__DEV__` behavior in production** — The actual value of `__DEV__` in Expo production builds was not empirically verified. Cross-reference AUDIT-044.
4. **Android backup behavior** — Whether `android:allowBackup="false"` is set in the actual Android manifest was not verified (manifest not fully audited).
5. **Schema.prisma not fully read** — Auth-related schema sections were spot-checked; full schema review was not performed.
6. **Permissions enumeration** — The ~47 permission keys in `permission-key.enum.ts` were catalogued but their individual enforcement was not verified across all admin surfaces.
7. **Frontend proxy.ts analysis** — `proxy.ts` was read as a whole; middleware behavior for all route combinations was not empirically tested.

---

*Evidence index produced by Phase 4 read-only audit. No application code was modified.*
