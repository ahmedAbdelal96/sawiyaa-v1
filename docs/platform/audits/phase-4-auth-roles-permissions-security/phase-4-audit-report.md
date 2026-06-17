# Phase 4 Audit Report — Auth / Roles / Permissions / Security

**Phase:** 4
**Started:** 2026-06-17
**Completed:** 2026-06-17
**Auditors:** 8 concurrent sub-agents (Backend Auth Core, Patient Authorization, Practitioner Auth, Admin RBAC, Web Auth, Mobile Auth, Public Endpoints, Security Logging)
**Evidence type:** Source code inspection, guard/decorator analysis, configuration review
**Runtime verification:** Not performed (servers not running)

---

## 1. Audit Scope

Phase 4 audited the Fayed platform's authentication and authorization architecture across 10 areas:

| # | Area | Scope |
|---|------|-------|
| 1 | Backend Auth Core | JWT access/refresh tokens, password hashing, session management, token rotation, guard registration |
| 2 | Patient Authorization | Patient role enforcement, account-state guards, session/data ownership |
| 3 | Practitioner OTP / Account State | OTP verification gating, PRACTITIONER_APPROVED enforcement, support/financial bypasses |
| 4 | Admin RBAC / Permissions | Role-based access control, permission resolver, SUPER_ADMIN bypass, permission coverage |
| 5 | Step-Up / MFA | Admin step-up flow, MFA requirements on sensitive mutations |
| 6 | Web Route Protection | Next.js proxy middleware, cookie storage, token expiry, layout-level guards |
| 7 | Mobile Auth | Expo SecureStore, AsyncStorage, device binding, auth provider enforcement |
| 8 | Public Endpoint Exposure | Unauthenticated endpoints, UUID exposure in public DTOs, academy controller guards |
| 9 | Security Audit Logging | SecurityAuditService, banned keys, unaudited auth events, financial operations |
| 10 | Runtime Checks | Live probe of auth guards, token expiry, account-state enforcement |

---

## 2. Architecture Summary

### 2.1 Authentication Model

The Fayed platform uses a **JWT access token + refresh token rotation** pattern:

- **Access token:** Short-lived (15 minutes, confirmed in `auth-token.service.ts`), stored client-side in cookies (web) or Expo SecureStore/AsyncStorage (mobile). Payload includes `sub` (userId), `sessionId`, `role`, `tokenVersion`, `tokenType`.
- **Refresh token:** Long-lived (7 days), bcrypt-hashed and stored in the database (`AuthSession` table). Rotated on every use — the presented token is compared against the stored hash using bcrypt; if they match (token reuse / theft detection), the entire session family is invalidated via `tokenVersion` increment.
- **Role-bound refresh:** `RefreshAuthSessionUseCase:34` enforces `requestedRole === storedRole` — a patient refresh token cannot produce a practitioner or admin access token.
- **Password hashing:** bcryptjs with 12 salt rounds — strong.
- **No global APP_GUARD:** `JwtAccessAuthGuard` is **not** registered as an application-wide guard. Every protected endpoint must explicitly declare `@UseGuards(JwtAccessAuthGuard)`. Without this, new endpoints added without explicit guards default to unauthenticated.
- **No global throttle guard:** `ThrottlePolicyGuard` is opt-in per-route only.

### 2.2 Authorization Model

- **RolesGuard:** Enforces `@Roles()` decorator — checked after `JwtAccessAuthGuard`.
- **PermissionsGuard:** Enforces `@Permissions()` decorator — database lookup via `PermissionResolverService` on every check. `SUPER_ADMIN` bypasses all permission checks at `PermissionResolverService:23`.
- **Account-state guards:** `ActiveAccountGuard`, `PractitionerOtpVerifiedGuard`, `PractitionerApprovedGuard` enforce account lifecycle states. `@RequireAccountStates()` composes up to 6 guards.
- **StepUpGuard:** Enforces MFA/step-up for sensitive mutations. `@RequireStepUp()` decorator marks endpoints requiring step-up.
- **~47 permission keys** across finance, sessions, care-chat, patients, support, practitioner-applications, admin-users, corporate, and featured-practitioners.

### 2.3 Security Audit Logging

`SecurityAuditService` provides async structured logging to the `SecurityAuditLog` table. Key characteristics:

- **BANNED_KEYS denylist** of 23 sensitive keys (password, token, secret, apiKey, etc.) prevents accidental PII/secret logging.
- **`sanitizeMetadata()`** applies 2-layer protection (direct key match + nested object scan).
- **Well-audited events:** Admin step-up verification, admin session runtime events, financial payout recording.
- **Gaps:** Login failures, OTP verification, password resets, practitioner application approval/rejection, manual payouts — all unaudited.

---

## 3. Findings Summary

**Phase 4 total: 21 findings | 3 P0 | 17 P1 | 1 P2 | 0 P3**

### P0 — Critical Security Bypasses

| ID | Title | Module |
|----|-------|--------|
| AUDIT-031 | Academy enrollment controller has no auth guards | Route Protection |
| AUDIT-032 | Internal UUID `id` exposed in public practitioner DTOs | Public Data Exposure |
| AUDIT-033 | Web refresh token cookie lacks httpOnly — XSS exfiltration possible | Token Storage (Web) |

### P1 — Significant Security Gaps

| ID | Title | Module |
|----|-------|--------|
| AUDIT-034 | Practitioner support tickets bypass PRACTITIONER_OTP_VERIFIED | Practitioner Account State |
| AUDIT-035 | Practitioner financial operations bypass PRACTITIONER_OTP_VERIFIED | Practitioner Account State |
| AUDIT-036 | Login failures not security-audit logged | Security Audit Logging |
| AUDIT-037 | Practitioner application approval/rejection not security-audited | Security Audit Logging |
| AUDIT-038 | Manual practitioner payout not security-audited | Security Audit Logging |
| AUDIT-039 | No account lockout after repeated failed login attempts | Account Security |
| AUDIT-040 | No global JWT auth guard — new endpoints default unprotected | Guard Architecture |
| AUDIT-041 | Practitioner login missing deviceId — weaker device binding | Device Binding |
| AUDIT-042 | Android SecureStore uses software-backed encryption | Token Storage (Mobile) |
| AUDIT-043 | Web session access token 7-day expiry — compounds cookie risk | Token Expiry |
| AUDIT-044 | `__DEV__` URL allowlist exception could be active in production | Mobile URL Validation |
| AUDIT-045 | AdminPermissionGate not auto-applied to all admin pages | Admin Route Protection |
| AUDIT-046 | Web patient/practitioner layouts do not check account-state | Account State (Web) |
| AUDIT-047 | GeneralChatConversationsController lacks RolesGuard | Patient Authorization |
| AUDIT-048 | Practitioner application approval/rejection not security-audited (×2) | Security Audit Logging |
| AUDIT-049 | OTP verification attempts not security-audit logged | Security Audit Logging |
| AUDIT-050 | Password reset requests/completions not security-audit logged | Security Audit Logging |
| AUDIT-051 | No global throttle guard | Rate Limiting Architecture |

### P2 — Moderate Concerns

| ID | Title | Module |
|----|-------|--------|
| AUDIT-052 | Silent logout on refresh token expiry — no user notification | UX |

---

## 4. Cross-Phase Findings Status

**Cumulative open findings across all phases: 51**

| Phase | Open | Closed | Total |
|-------|------|--------|-------|
| Phase 1 | 2 | 0 | 2 |
| Phase 2 | 6 | 0 | 6 |
| Phase 3 | 22 | 0 | 22 |
| Phase 4 | 21 | 0 | 21 |
| **Total** | **51** | **0** | **51** |

**Phase 4 contribution to cumulative risk:** The 3 P0 findings in Phase 4 represent active security bypasses — unauthenticated academy enrollment, UUID enumeration, and XSS-accessible session tokens. These are more severe than the P0s found in Phase 3 (which were UX/i18n gaps with session status display). Phase 4 P0s are direct attack enablers.

---

## 5. Runtime Checks

**Status: Not Performed**

Backend (port 6000), frontend (port 3000), and mobile Metro (port 8081) servers were not running at time of audit. Runtime verification of guard behavior, token expiry enforcement, and account-state access control could not be performed.

All findings are based on static code analysis of TypeScript source files.

**Runtime checks that would have been performed if servers were running:**

1. Probe `GET /public/practitioners` without auth token — verify UUID exposure in response
2. Probe `POST /academy/courses/:slug/enrollments` without auth — verify 401 vs 200 behavior
3. Probe `POST /auth/patient/login` with wrong password — verify no SecurityAuditLog entry created
4. Probe `GET /practitioners/me/wallet` with OTP-unverified practitioner token — verify 403 vs 200
5. Probe admin mutation endpoints with non-step-upped session — verify 403 vs 200
6. Inspect web cookie attributes (`httpOnly`, `secure`, `sameSite`) via browser DevTools

---

## 6. Most Significant Findings

### AUDIT-033 — Web Token Cookie XSS Exposure (P0)
The most architecturally significant finding. Both access and refresh tokens are stored in non-httpOnly cookies accessible to JavaScript. Any XSS vulnerability on the Fayed domain enables full session hijacking. The 7-day access token expiry (AUDIT-043) compounds this — a stolen token remains valid for up to 7 days.

**The root issue is architectural:** The non-httpOnly pattern was chosen to allow Next.js server-side code to read the token for API call attachment. The fix requires either (a) moving to httpOnly cookies with a server-side token reader, or (b) encrypting the cookie value. This is a non-trivial architectural change.

### AUDIT-040 — No Global APP_GUARD (P1)
The absence of a global auth guard means every new protected endpoint must explicitly declare `@UseGuards(JwtAccessAuthGuard)`. A developer who forgets this creates an unauthenticated endpoint. The fix is straightforward (register `JwtAccessAuthGuard` as `APP_GUARD` in `main.ts`) and would retroactively secure any accidentally unguarded endpoints. This is the single highest-leverage fix in Phase 4.

### AUDIT-031 — Academy Controller Missing Guards (P0)
The academy enrollment endpoint has no `@Public()` and no `@UseGuards()`. Without APP_GUARD, its authentication status is ambiguous — it may be unintentionally unprotected. This is both a direct security risk and a maintainability issue (the developer's intent is unclear).

### AUDIT-034 / AUDIT-035 — Practitioner Account State Bypass (P1)
Two separate modules (support tickets, financial operations) allow practitioner OTP-verification to be bypassed. OTP verification is the platform's mechanism for confirming a practitioner controls their phone number. Bypassing it on financial and support endpoints is a policy inconsistency that could enable fraud.

---

## 7. Positive Findings

The following aspects of the Fayed auth architecture are well-implemented and do not require changes:

1. **Refresh token rotation with reuse detection:** `AuthSessionService.rotate()` uses bcrypt comparison to detect token theft/reuse and immediately invalidates the entire session family.
2. **Role-bound refresh tokens:** Patient, practitioner, and admin refresh tokens cannot cross-authenticate.
3. **SUPER_ADMIN bypass is intentional and localized:** The `PermissionResolverService` SUPER_ADMIN bypass is at line 23, clearly marked, and limited to the permission resolution phase.
4. **bcrypt with 12 salt rounds:** Strong password hashing, noMD5/SHA1.
5. **Short access token TTL (15 minutes):** Access tokens expire quickly, limiting the window of a stolen token.
6. **Payment webhook signature verification:** Both Stripe and Paymob webhook handlers verify signatures before processing — no AUDIT-033-style cookie risk on payment callbacks.
7. **Idempotency on payment webhooks:** `findEventByProviderEventRef` prevents duplicate payment processing.
8. **Practitioner account-state enforcement on mobile:** `AuthProvider.tsx:486-500` correctly redirects unapproved practitioners to `/application-status`.
9. **SecurityAuditService BANNED_KEYS denylist:** 23 sensitive keys are explicitly blocked from metadata logging.
10. **Throttle rate limiting on auth endpoints:** All 3 login flows have rate limiting (patient: 10/15min, practitioner OTP: 5/15min, admin login: 10/15min).
11. **Practitioner credentials not in public DTOs:** `fileUrl` (credentials documents) is not exposed in `PublicPractitionerResponseDto`.

---

## 8. Risk Posture

**Phase 4 risk posture: HIGH**

The 3 P0 findings represent active attack surfaces:
- XSS → session token theft (AUDIT-033) is a realistic, high-impact attack path on any site with even minor XSS
- Academy enrollment without auth (AUDIT-031) allows unauthenticated enrollment creation
- UUID enumeration (AUDIT-032) enables cross-referencing of practitioner data across API endpoints

The 17 P1 findings represent defense-in-depth failures and audit logging gaps that reduce the platform's ability to detect and respond to attacks:
- No login failure audit trail (AUDIT-036) means brute-force attacks are invisible
- No account lockout (AUDIT-039) means distributed password attacks are only rate-limited, not blocked
- No global auth guard (AUDIT-040) means future endpoint additions are fragile

**Overall platform risk posture (Phases 1–4 combined): HIGH**

51 open findings across 4 phases. No findings have been closed. The cumulative risk is elevated by the combination of Phase 3's instant booking race condition (AUDIT-010) and payment return route (AUDIT-009), Phase 2's admin refund cap gap (AUDIT-003), and Phase 4's auth architecture weaknesses.

---

## 9. Recommended Next Phase

**Phase 5 — Session Media / Video / Chat / Notifications**

Recommended next because:
- Session video (Daily.co integration) is a critical attack surface not yet audited
- Chat module (`care-chat`, `chat`) handles sensitive medical information — HIPAA/clinical data handling
- Push notification security (FCM credentials, device tokens) not audited
- The `care-experience-intelligence` module (Q-005 from Phase 0) is still unaudited
- Several Phase 4 findings (AUDIT-031 academy enrollment, AUDIT-032 UUID exposure) have cross-cutting implications for other public-facing modules

---

## 10. Verdict

The Fayed platform's authentication and authorization architecture has a **solid foundation** (JWT + refresh rotation, role boundaries, account-state guards, permission resolver, step-up MFA) but suffers from **significant defense-in-depth gaps** and **audit logging blind spots**.

The most urgent issues are:
1. **Fix AUDIT-033** (httpOnly cookies) — the highest-impact, most complex architectural change
2. **Fix AUDIT-040** (register global APP_GUARD) — the single highest-leverage security improvement
3. **Fix AUDIT-031** (academy controller guards) — clarify auth intent and close the unprotected endpoint
4. **Fix AUDIT-036/037/038/049/050** (security audit logging) — close the blind spots in auth event coverage

No Phase 4 findings were closed during this audit. All 21 remain open.

---

*Report produced by Phase 4 read-only audit. No application code was modified. No git commands were executed.*
