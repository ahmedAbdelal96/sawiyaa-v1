# Release Blockers and Launch Gates

**Phase:** 8
**Created:** 2026-06-17
**Purpose:** Explicit enumeration of what must and must not launch, with explicit gates

---

## P0 Release Blockers — Must Not Launch

These findings represent active security exploits or data-integrity violations. No internal pilot, no development-only deployment, no closed-beta may proceed until these are resolved.

### 🔴 AUDIT-031 — Academy Enrollment Has No Auth Guard
**Surface:** Backend
**Module:** Academy Controller
**Severity:** P0 — Critical
**Exploit path:** `POST /api/v1/academy/enrollments` accepts enrollment creation requests without any authentication token. Anyone on the internet can create fraudulent enrollments, poisoning platform data and enabling unverified users to access academy content.
**Fix requirement:** Add `@UseGuards(AuthGuard)` + `@Roles(Role.PATIENT)` to the enrollment endpoint. Confirm whether `APP_GUARD` global guard already covers this endpoint.
**Gate:** Backend must confirm auth guard is applied. Source must be verified post-fix.
**Sprint 1-R3 status:** ✅ Reclassified / Accepted Risk — `createEnrollment` POST endpoint intentionally public (phone/email-based enrollment, no authenticated user required). Sprint 1-R2 removed class-level `@Public()`, added `@Public()` to individual GET methods only. Sprint 1-R3 added explicit `@Public()` to `createEnrollment`, making the intentional public design unambiguous. `CreateAcademyEnrollmentUseCase.execute()` has no `currentUserId` parameter. No global JWT APP_GUARD exists. Adding `@UseGuards(JwtAccessAuthGuard)` would break the phone/email enrollment flow. Accepted Risk documented. Full closure: `sprints/sprint-1-r3-final-p0-gate-closure.md`.

### 🔴 AUDIT-032 — Internal UUID Exposed in Public Practitioner DTOs
**Surface:** Backend → Public API
**Module:** Practitioner DTO
**Severity:** P0 — Critical
**Exploit path:** Public practitioner endpoints (`GET /practitioners`, `GET /practitioners/:id`) return the internal database `id` (UUID) in the response DTO. An attacker can enumerate IDs by incrementing a counter and harvest the entire practitioner database.
**Fix requirement:** Replace the internal UUID with a public-facing surrogate key (e.g., a separate `publicId` or slug) in all public DTOs. Internal UUID must not appear in any client-receivable response.
**Gate:** DTOs must be verified with a fuzzing test (enumerate 100 IDs, confirm no internal UUID in response).

### 🔴 AUDIT-033 — Web Refresh Token Cookie Missing httpOnly
**Surface:** Web Frontend
**Module:** Auth Token Storage
**Severity:** P0 — Critical
**Exploit path:** The web refresh token is stored in a browser cookie without the `httpOnly` flag. Any JavaScript XSS on the domain (e.g., via a reflected XSS in a search parameter, a malicious browser extension, or a supply-chain attack on a dependency) can read the refresh token and send it to an attacker-controlled server, enabling account takeover.
**Fix requirement:** Set `httpOnly: true` on the refresh token cookie. Also set `sameSite: 'strict'` and `secure: true` in production. Confirm backend sets these flags on cookie issuance.
**Gate:** Browser DevTools inspection of the `refreshToken` cookie must show `HttpOnly`, `Secure`, and `SameSite` attributes set. An XSS payload must not be able to read the cookie.
**Sprint 1-R3 status:** ✅ Fixed + Verified — Backend sets `Set-Cookie: fayed_refresh_token=...; HttpOnly; Secure; SameSite=Strict` on login/register/refresh/logout in all three auth controllers. Frontend `tokenManager.setTokens()` no longer overwrites the server-set httpOnly cookie. Sprint 1-R3 hardening: `WebResponseHardeningInterceptor` strips `refreshToken` from JSON response body for web clients (Origin-header detection). Browser JavaScript at login/refresh time can no longer read refreshToken from response body — only from the HttpOnly cookie (inaccessible to JS). Native/mobile clients receive full token body. TypeScript `tsc --noEmit`: ✅ pass (0 src/ errors). Full closure: `sprints/sprint-1-r3-final-p0-gate-closure.md`.

### 🔴 AUDIT-010 — Instant Booking Accept Race Condition / Unhandled Prisma Exception
**Surface:** Backend
**Module:** Instant Booking Use Case
**Severity:** P0 — Critical (per normal impact model; originally P0)
**Exploit path:** When two practitioners accept the same instant booking request simultaneously, the second acceptance triggers a Prisma `UniqueConstraintViolation` exception that is not caught. The API returns HTTP 500 instead of a clean rejection, and the transaction state may be inconsistent.
**Fix requirement:** Catch the Prisma exception and return HTTP 409 Conflict with a user-friendly message. Add a database-level pessimistic lock or SELECT FOR UPDATE on the request row before acceptance.
**Gate:** Load test with 10 concurrent accepts on the same request must return 1 success + 9 clean rejections (no 500s).

---

### ✅ Resolved by Fix Sprint 1 — Phase 9a (2026-06-17)

All 4 P0 release blockers were addressed in Phase 9a Security First Fix Sprint 1. Sprint 1-R1 hard verification (2026-06-17) revealed 2 of 4 fixes were incomplete. Sprint 1-R2 (2026-06-17) corrected both reopeners.

| ID | Title | Sprint 1 Fix | Sprint 1-R1 Verification | Sprint 1-R2 Correction | Sprint 1-R3 Final Closure |
|----|-------|-------------|------------------------|----------------------|--------------------------|
| AUDIT-031 | Academy Enrollment Has No Auth Guard | `@Public()` + `@UseGuards(JwtAccessAuthGuard)` applied | ❌ REOPENED — `@Public()` on class bypasses guard | ⚠️ Partially Fixed — class `@Public()` removed; `createEnrollment` unprotected but phone/email-based by design | ✅ Reclassified / Accepted Risk — `@Public()` added to `createEnrollment` explicitly; enrollment is by phone/email (no user account); no global APP_GUARD |
| AUDIT-032 | Internal UUID Exposed in Public Practitioner DTOs | `id` field removed from DTOs; mapper updated | ✅ VERIFIED — public responses contain no UUID | N/A | N/A |
| AUDIT-033 | Web Refresh Token Cookie Missing httpOnly | `httpOnly: true` added to `AUTH_COOKIE_OPTIONS` | ❌ REOPENED — js-cookie cannot set httpOnly; backend required | ✅ Fixed — backend sets real httpOnly cookie via `Set-Cookie` header | ✅ Fixed + Verified — `WebResponseHardeningInterceptor` strips `refreshToken` from web JSON response body; browser JS cannot read it at login/refresh time |
| AUDIT-010 | Instant Booking Accept Race Condition | Belt-and-suspenders `status === ACCEPTED` check added | ✅ VERIFIED — no raw 500s possible in race scenarios | N/A | N/A |

**Gate status after Sprint 1-R3: AUDIT-031 ✅ Reclassified / Accepted Risk, AUDIT-033 ✅ CLOSED + Verified**

---

## P1 Launch Blockers — Must Fix Before Production Launch

These findings represent security gaps, data-integrity risks, or user-facing defects that would degrade trust or enable fraud in a production environment. A closed pilot with real users may proceed with these if limited to internal testing, but production launch is not permitted.

### Immediate P1 Fixes (Wave 0–1)

| ID | Title | Surface | Module | Fix Gate |
|----|-------|---------|--------|---------|
| AUDIT-003 | Admin refund panel unconstrained amount | Web Admin | Payment Ops | Amount field must enforce max cap (e.g., session price). Confirmation dialog required. |
| AUDIT-004 | Settlement mark-paid/failed no confirmation | Web Admin | Settlement | Confirmation dialog required before financial state mutation. |
| AUDIT-011 | `flowType` absent from AdminSessionListItem | Web Admin | Session List | Admin list must show session type (instant vs scheduled). |
| AUDIT-012 | Patient session list raw `presentationStatus` | Mobile Patient | Session List | All session status badges must use `t()` with fallback. |
| AUDIT-013 | Practitioner session list raw `presentationStatus` | Mobile Practitioner | Session List | All session status badges must use `t()` with fallback. |
| AUDIT-014 | `mapSessionBadge` missing `UNDER_REVIEW` case | Web Patient | Session Badge | Missing enum case must be added with proper i18n label. |
| AUDIT-016 | Slot conflict not pre-checked | Web | Booking | Backend must return slot conflict error before confirmation. |
| AUDIT-018 | Frozen price stored but not retrieved | Web Patient | Instant Booking | Price must be fetched from the frozen-price record on confirmation. |
| AUDIT-020 | No price visibility in instant booking | Web Patient | Instant Booking | Patient must see the price before requesting instant booking. |
| AUDIT-022 | No booking acceptance confirmation UI | Web Patient | Instant Booking | Acceptance flow must show confirmation screen. |
| AUDIT-034 | Practitioner support bypasses OTP verification | Backend | Support | `PRACTITIONER_OTP_VERIFIED` guard must be applied to ticket creation. |
| AUDIT-035 | Practitioner financial ops bypass OTP verification | Backend | Financial | `PRACTITIONER_OTP_VERIFIED` guard must be applied to payout operations. |
| AUDIT-037 | Practitioner approval/rejection not logged | Backend | Audit | Security audit log entry required for each approval/rejection action. |
| AUDIT-038 | Manual payout not logged | Backend | Audit | Security audit log entry required for each manual payout. |
| AUDIT-039 | No account lockout on failed login | Backend | Auth | Account lockout after N failed attempts (N to be defined, typically 5–10). |
| AUDIT-040 | No global JWT auth guard | Backend | Auth | New endpoints must not default to unprotected. Global guard or explicit `@Public()` decorator required. |
| AUDIT-041 | Practitioner login missing `deviceId` | Backend | Auth | Device ID binding must be included in practitioner login. |
| AUDIT-044 | `__DEV__` URL allowlist active in production | Web | Auth | `__DEV__` check must be stripped or verified absent from production builds. |
| AUDIT-045 | AdminPermissionGate not auto-applied | Web Admin | Permissions | Systematic audit: all admin routes must have permission gates. |
| AUDIT-047 | GeneralChatConversationsController lacks RolesGuard | Backend | Chat | `RolesGuard` must be applied to the conversations controller. |
| AUDIT-053 | Room name/URL exposed in blocked join contract | Backend | Daily Join | Blocked contract must not include `roomName`, `roomUrl`, or join tokens. |
| AUDIT-054 | Daily room expiry mismatch | Backend | Daily | Room expiry must match session actual duration, not a fixed buffer. |
| AUDIT-055 | DISPLAY_NAME_MATCH fallback enables fraud | Backend | Attendance | Fallback behavior must be reconsidered; manual attendance confirmation recommended. |
| AUDIT-056 | No notifications on instant booking events | Backend | Notifications | Notification dispatch required for accept/reject/expire events. |
| AUDIT-057 | Push payload includes PHI fields | Backend | Notifications | `threadId`, `relatedEntityType` must be removed from push payload. |
| AUDIT-058 | Notification routePath bypasses Messages Shell | Mobile | Notifications | `/messages/{threadId}` notifications must go through Messages Shell. |
| AUDIT-062 | APP_URL falls back to localhost:3000 | Backend | Config | Production `APP_URL` must be configured; no localhost fallback permitted for push. |
| AUDIT-067 | Care-chat notifications bypass Messages Shell | Mobile | Notifications | Care-chat notification lane routing must be consistent with Messages Shell. |
| AUDIT-068 | `admin/care-chat/[id]` missing AdminPermissionGate | Web Admin | Permissions | Permission gate required. |
| AUDIT-069 | `admin/sessions/runtime-inspection` missing gate | Web Admin | Permissions | Permission gate required. |
| AUDIT-070 | AdminNotificationDetailsPanel HTML render gap | Web Admin | Notifications | Add HTML sanitization as defense-in-depth even though XSS not confirmed. |
| AUDIT-072 | Join token in URL query parameter | Web | Session Join | Join token must be sent via POST body or secure channel, not URL. |
| AUDIT-075 | Runtime inspector has no audit log | Web Admin | Runtime Inspector | Instrument key actions in the inspector with audit log entries. |
| AUDIT-102 | `admin/refund-policies` missing AdminPermissionGate | Web Admin | Permissions | Permission gate required. |
| AUDIT-103 | `admin/notifications/[id]` missing gate | Web Admin | Permissions | Permission gate required. |
| AUDIT-105 | Raw `PENDING_PAYMENT`/`CONFIRMED` in success.tsx | Mobile Patient | Payments | All payment status labels must use `t()` with fallback. |
| AUDIT-106 | Raw `SupportTicketType` enum in support/new.tsx | Mobile Patient | Support | All support category labels must use `t()` with fallback. |
| AUDIT-107 | `formatNotificationType()` bypasses i18n | Mobile Patient | Notifications | Function must use `t()` or locale-aware string lookup. |
| AUDIT-116 | `formatRequirementLabel()` renders raw keys | Mobile Practitioner | i18n | Dashboard requirement labels must use i18n. |

### Pending Verification P1s — Gate Held on Verification

| ID | Title | Surface | Blocking Question | Resolution Required |
|----|-------|---------|------------------|-------------------|
| AUDIT-095 | `providerRoomRef` exposed in runtime inspector | Web Admin | Is `providerRoomRef` a secrets-bearing join token or an opaque room name? | Backend confirmation: if token, P1 fix required; if opaque room name, P2 acceptable |

### Needs Decision P1s — Gate Held on Product Decision

| ID | Title | Surface | Decision Required | Owner |
|----|-------|---------|----------------|-------|
| AUDIT-108 | Web tokens in AsyncStorage | Mobile Web | Is Expo web production-facing? If yes, HTTP-only cookie or encrypted storage required. If dev-only, downgrade to P2. | Product + Backend |

---

## P2 Rollout Blockers — Fix Before Broad Rollout

These findings may be addressed during a pilot phase but must be resolved before scaling to a broad public rollout. A limited pilot with internal or select external users may proceed.

| ID | Title | Surface | Module |
|----|-------|---------|--------|
| AUDIT-002 | AdminSessionListBadge missing `presentationStatus` prop | Mobile Admin | Admin Sessions |
| AUDIT-005 | Hardcoded EGP/USD currency validation | Web Admin/Mobile | Currency |
| AUDIT-006 | Manual payout bypasses MFA | Web Admin | Financial |
| AUDIT-007 | Cancel preview raw backend values without `formatMoney()` | Mobile Patient | Payments |
| AUDIT-008 | `pendingStill` i18n key missing | Mobile Patient | i18n |
| AUDIT-009 | Payment return route in public group (downgraded from P0) | Web Patient | Auth Layout |
| AUDIT-015 | Practitioner timezone not displayed | Web Practitioner | Availability |
| AUDIT-017 | presentationStatus i18n without fallback (web) | Web Patient | i18n |
| AUDIT-019 | No admin surface for practitioner availability | Web Admin | Availability |
| AUDIT-021 | Availability editor ignores existing bookings | Web Practitioner | Booking |
| AUDIT-023 | No admin surface for instant booking management | Web Admin | Instant Booking |
| AUDIT-025 | No practitioner availability visibility in admin | Web Admin | Availability |
| AUDIT-027 | `formatModeLabel` raw string fallback | Mobile Patient | Formatting |
| AUDIT-028 | `formatFlowTypeLabel` raw string fallback | Mobile Patient | Formatting |
| AUDIT-029 | Presence TTL stale records | Backend | Presence |
| AUDIT-042 | Android SecureStore software-backed | Mobile | Security |
| AUDIT-043 | Web access token 7-day expiry | Web | Auth |
| AUDIT-046 | Web layouts don't check account-state | Web Patient/Practitioner | Auth |
| AUDIT-049 | OTP verification not logged | Backend | Audit |
| AUDIT-050 | Password reset not logged | Backend | Audit |
| AUDIT-051 | No global throttle guard | Backend | Auth |
| AUDIT-052 | Silent logout on refresh expiry | Web | Auth |
| AUDIT-059 | Unread count only counts IN_APP | Mobile | Notifications |
| AUDIT-064 | Expo push token without EAS project ID | Mobile | Push |
| AUDIT-065 | Notification routing role fallback | Mobile | Notifications |
| AUDIT-066 | NormalizedInboxItem navigates without ownership validation | Mobile | Messages |
| AUDIT-071 | JSON copy only redacts URLs, not userId | Web Admin | Notification |
| AUDIT-073 | No HTML sanitization on notification content | Backend | Notifications |
| AUDIT-076 | SESSION_JOIN_LAG_MINUTES = 0 | Backend | Session Join |
| AUDIT-078 | Support status enum rendered without i18n | Web Admin | i18n |
| AUDIT-080 | Notification href falls back to "/" | Mobile | Notifications |
| AUDIT-082 | Push registration stored without timestamp | Mobile | Push |
| AUDIT-083 | Notification deduplication uses in-memory ref | Backend | Notifications |
| AUDIT-084 | Cold-start notification conflict with OS center | Mobile | Notifications |
| AUDIT-086 | Missing JOINABLE/IN_PROGRESS i18n keys | Web | i18n |
| AUDIT-087 | Zero `loading.tsx` across 80+ routes | Web | Route Infrastructure |
| AUDIT-088 | Toast provider hardcoded `dir="rtl"` | Web | RTL |
| AUDIT-089 | ChatKit hardcoded `dir="ltr"` | Web | RTL |
| AUDIT-090 | Admin back arrows missing RTL flip | Web Admin | RTL |
| AUDIT-091 | AppErrorFallback logs error.stack | Web | Error Handling |
| AUDIT-092 | AppErrorFallback identical for all error types | Web | Error Handling |
| AUDIT-093 | AdminPermissionGate raw "Loading..." text | Web Admin | i18n |
| AUDIT-094 | No PatientPermissionGate/PractitionerPermissionGate | Web | Permissions |
| AUDIT-096 | userId masking inconsistent | Web Admin | Notification |
| AUDIT-097 | Inline Arabic/English ternary | Web Admin | i18n |
| AUDIT-098 | FinancialReconciliation toLowerCase() on enums | Web Admin | i18n |
| AUDIT-100 | Payment EXPIRED state lacks retry CTA | Web Patient | Payments |
| AUDIT-104 | SessionLaneWorkspace raw `presentationStatus` | Web | Session Lane |
| AUDIT-109 | Patient notification typeSlug coverage gap | Mobile Patient | Notifications |
| AUDIT-111 | No loading/error route files in mobile | Mobile | Route Infrastructure |
| AUDIT-112 | `cleanReasonText()` limited prefix handling | Mobile Practitioner | Onboarding |
| AUDIT-113 | Credential fileUrl raw text display | Mobile Practitioner | Onboarding |
| AUDIT-114 | `onboarding.tsx` accessible via direct navigation | Mobile Practitioner | Route Protection |
| AUDIT-115 | `I18nManager.isRTL` instead of `getAppDirection()` | Mobile | RTL |
| AUDIT-117 | Messages inbox stale data on lane error | Mobile | Messages Shell |

---

## P3 / INFO — May Defer Safely

These findings are polish or observations. They may be addressed in a post-launch cycle.

| ID | Title | Notes |
|----|-------|-------|
| AUDIT-060 | Admin no broadcast permission | Not in current launch scope |
| AUDIT-063 | Notification body render (not XSS) | React Native Text escapes; P3 at worst |
| AUDIT-077 | No timezone configuration enforcement | Low risk; device/backend TZ used |
| AUDIT-079 | `markReadMutation` no debounce | Low risk; API-level rate limit helps |
| AUDIT-081 | `messages/[id]` accepts string[] without UUID validation | Low risk; backend validates |
| AUDIT-099 | Root not-found.tsx English-only | Low risk; edge case |
| AUDIT-101 | Bare pulsing div no a11y label | Accessibility; post-launch |
| AUDIT-110 | Care-chat redirect Arabic hardcode | INFO; same pattern as AUDIT-065 |
| AUDIT-118 | Auth layout delegates to AuthProvider | Intentional — no issue |
| AUDIT-119 | Race condition window in segments guard | Standard pattern — no fix warranted |
| AUDIT-120 | Duplicate JSON key | No runtime impact |
| AUDIT-121 | Singular/plural naming | No runtime impact |
| AUDIT-122 | Cross-phase string manipulation pattern | INFO — same anti-pattern |
| AUDIT-123 | Overlay vs scaffold | Functional inconsistency |
| AUDIT-124 | replaceAll fallback | Explicit cases cover all statuses |

---

## Must Not Launch Until (Explicit Gate List)

1. **Academy enrollment endpoint has auth guard** (AUDIT-031) — ✅ RESOLVED (Sprint 1-R3): `createEnrollment` explicitly marked `@Public()`; enrollment is by phone/email, not user account. Reclassified as Accepted Risk — no user account required for public course enrollment. `CreateAcademyEnrollmentUseCase` has no `currentUserId` parameter.
2. **Public practitioner DTOs contain no internal UUIDs** (AUDIT-032) — ✅ RESOLVED (Phase 9a Sprint 1) — Verified in Sprint 1-R1
3. **Web refresh token cookie has httpOnly + secure + sameSite** (AUDIT-033) — ✅ RESOLVED + VERIFIED (Sprint 1-R3): backend sets `Set-Cookie` header with `HttpOnly; Secure; SameSite=Strict` on all auth endpoints. `WebResponseHardeningInterceptor` strips `refreshToken` from JSON response body for web clients — browser JS cannot read it at login/refresh time.
4. **Instant booking accept returns 409 (not 500) under race condition** (AUDIT-010) — ✅ RESOLVED (Phase 9a Sprint 1) — Verified in Sprint 1-R1
5. **Admin refund panel has amount cap + confirmation dialog** (AUDIT-003)
6. **Settlement mark-paid/mark-failed has confirmation dialog** (AUDIT-004)
7. **Push notifications contain no `threadId` or `relatedEntityType`** (AUDIT-057)
8. **APP_URL production value is set; no localhost fallback in push** (AUDIT-062)
9. **`providerRoomRef` sensitivity verified — if token, not exposed in inspector** (AUDIT-095)
10. **All 5 missing admin permission gates are applied** (AUDIT-068, 069, 102, 103, 045)

---

## Can Defer Safely (Explicit Allow List)

1. **AUDIT-060** — Broadcast notification permission (not in launch scope)
2. **AUDIT-063** — Notification body sanitization (React Native Text not executable)
3. **AUDIT-077** — Timezone configuration enforcement (device/backend TZ is adequate)
4. **AUDIT-079** — markReadMutation debouncing (API-level protection exists)
5. **AUDIT-081** — UUID validation on messages/[id] (backend validates)
6. **AUDIT-099** — not-found.tsx i18n (root 404; edge case)
7. **AUDIT-101** — Pulsing div a11y label (post-launch accessibility)
8. **AUDIT-118–124** — INFO observations (no code change warranted)

---

*Release blockers document produced by Phase 8 read-only triage. No application code was modified.*
