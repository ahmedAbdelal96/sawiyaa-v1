# Fix Roadmap — Wave-Based Execution Plan

**Phase:** 8
**Created:** 2026-06-17
**Purpose:** Ordered fix waves with dependencies, smallest safe next steps, and validation per wave

---

## Wave Structure Overview

| Wave | Scope | P0/P1 Count | Target | Dependencies |
|------|-------|------------|--------|-------------|
| **Wave 0** | Security Core — P0 blockers + immediate auth gates | 4 P0 + 17 P1 | Before any pilot | None |
| **Wave 1** | i18n + Session Rendering + Admin Gates | 0 P0 + 18 P1 | Before production launch | Wave 0 |
| **Wave 2** | Instant Booking Infrastructure + Admin Oversight | 0 P0 + 16 P1 | Before broad rollout | Wave 0 |
| **Wave 3** | Notification Infrastructure + Polish | 0 P0 + 5 P2/P3 | Before broad rollout | Wave 0 |
| **Wave 4** | RTL/UX Polish + Route Infrastructure | 0 P0 + 5 P2 | Post-pilot | Wave 1 |
| **Wave 5** | Observational / Long-term Architecture | 0 P0 + 0 P1 | Future release | All prior waves |

---

## Wave 0 — Security Core

**Goal:** Eliminate P0 release blockers and close the most critical auth/permission gaps.
**Execution:** Backend team primary; frontend team on cookie-flag items.
**Duration estimate:** 1–2 weeks

### Included Findings

| ID | Title | Surface | Module | Fix Complexity |
|----|-------|---------|--------|---------------|
| AUDIT-031 | Academy enrollment no auth guard | Backend | Academy | High | ✅ Reclassified / Accepted Risk (Sprint 1-R3): `@Public()` added to `createEnrollment` explicitly; enrollment is by phone/email (no user account); no global APP_GUARD; adding auth guard would break public enrollment flow |
| AUDIT-032 | Internal UUID in public DTOs | Backend | Practitioner DTO | Medium | ✅ Done + Verified — Phase 9a Sprint 1 |
| AUDIT-033 | Web refresh token no httpOnly | Web | Auth | Medium | ✅ Done + Verified — Sprint 1-R2: backend `Set-Cookie` header with `HttpOnly; Secure; SameSite=Strict`; Sprint 1-R3: `WebResponseHardeningInterceptor` strips `refreshToken` from web JSON response body |
| AUDIT-010 | Instant booking accept race / Prisma exception | Backend | Instant Booking | High | ✅ Done + Verified — Phase 9a Sprint 1 |
| AUDIT-034 | Support ticket bypasses OTP | Backend | Support | Medium |
| AUDIT-035 | Financial ops bypass OTP | Backend | Financial | Medium |
| AUDIT-037 | Practitioner approval/rejection not logged | Backend | Audit | Medium |
| AUDIT-038 | Manual payout not logged | Backend | Audit | Medium |
| AUDIT-039 | No account lockout | Backend | Auth | High |
| AUDIT-040 | No global JWT auth guard | Backend | Auth | High |
| AUDIT-041 | Practitioner login missing deviceId | Backend | Auth | Low |
| AUDIT-044 | __DEV__ URL allowlist in production | Web | Auth | Medium |
| AUDIT-047 | GeneralChatConversationsController lacks RolesGuard | Backend | Chat | Medium |
| AUDIT-053 | Room name/URL in blocked join contract | Backend | Daily Join | High |
| AUDIT-055 | DISPLAY_NAME_MATCH fraud risk | Backend | Attendance | Medium |
| AUDIT-056 | No instant booking notifications | Backend | Notifications | High |
| AUDIT-057 | Push payload PHI fields | Backend | Notifications | Medium |
| AUDIT-062 | APP_URL localhost fallback | Backend | Config | Low |
| AUDIT-067 | Care-chat notifications bypass Messages Shell | Mobile | Notifications | Medium |
| AUDIT-068 | admin/care-chat/[id] missing gate | Web Admin | Permissions | Low |
| AUDIT-069 | admin/sessions/runtime-inspection missing gate | Web Admin | Permissions | Low |
| AUDIT-102 | admin/refund-policies missing gate | Web Admin | Permissions | Low |
| AUDIT-103 | admin/notifications/[id] missing gate | Web Admin | Permissions | Low |
| AUDIT-003 | Admin refund panel no max cap | Web Admin | Payment Ops | Medium |
| AUDIT-004 | Settlement mark-paid/failed no confirmation | Web Admin | Settlement | Medium |

### Dependency Order Within Wave 0

```
1. AUDIT-040 (global auth guard)    → Prerequisite for most other backend fixes
2. AUDIT-031 (academy auth guard)    → ✅ CLOSED — Reclassified Accepted Risk (Sprint 1-R3): phone/email enrollment intentionally public
3. AUDIT-032 (UUID removal)          → ✅ DONE — Phase 9a Sprint 1 (Sprint 1-R1 verified)
4. AUDIT-033 (httpOnly cookie)       → ✅ DONE + VERIFIED — Sprint 1-R2 (backend Set-Cookie) + Sprint 1-R3 (response body hardening)
5. AUDIT-010 (race condition)        → ✅ DONE — Phase 9a Sprint 1 (Sprint 1-R1 verified)
6. AUDIT-044 (__DEV__ allowlist)     → Independent; quick verify + strip
7. AUDIT-039 (account lockout)       → After AUDIT-040
8. AUDIT-034/035 (OTP bypass)        → After AUDIT-040
9. AUDIT-037/038 (audit logging)     → After AUDIT-040
10. AUDIT-041 (deviceId)             → Independent
11. AUDIT-047 (RolesGuard)           → After AUDIT-040
12. AUDIT-053 (room URL exposure)    → After AUDIT-040
13. AUDIT-055 (DISPLAY_NAME_MATCH)   → Independent
14. AUDIT-056/057 (notifications)    → After AUDIT-040
15. AUDIT-062 (APP_URL)              → Independent; env config
16. AUDIT-067 (care-chat routing)    → Independent
17. AUDIT-068/069/102/103 (gates)   → Independent; permission gate wiring
18. AUDIT-003/004 (admin dialogs)    → Independent; UI work
```

### Smallest Safe Next Step for Wave 0

**Start with AUDIT-062 (APP_URL localhost fallback)** — a single environment variable check in the notification service. No code refactoring required. Provides immediate risk reduction (no risk of push notifications pointing to localhost in production).

**Second action: AUDIT-044 (__DEV__ allowlist)** — add a runtime check `if (process.env.NODE_ENV === 'production') { assert(!__DEV__URLs.length) }`. Quick verification and strip.

**Third action: AUDIT-041 (deviceId in practitioner login)** — straightforward parameter addition to login DTO.

### Validation Plan for Wave 0

| Finding | Validation Method |
|---------|------------------|
| AUDIT-031 | Attempt `POST /api/v1/academy/enrollments` without auth token — expect 200 (public phone/email enrollment by design) ✅ VALIDATED — Phase 9a Sprint 1-R3; Reclassified as Accepted Risk |
| AUDIT-032 | Enumerate practitioner IDs 1–100 via public endpoint — expect no internal UUID in response ✅ VALIDATED — Phase 9a Sprint 1 |
| AUDIT-033 | Inspect `refreshToken` cookie in browser DevTools — expect `HttpOnly`, `Secure`, `SameSite` ✅ VALIDATED (Sprint 1-R2); Response body hardening verified: `refreshToken` absent from web JSON response body for web clients (Origin-header detection) ✅ VALIDATED (Sprint 1-R3) |
| AUDIT-010 | Concurrent accept test: 10 simultaneous accepts on same request — expect 1×200 + 9×409, zero 500s ✅ VALIDATED — Phase 9a Sprint 1 |
| AUDIT-040 | Create new endpoint without guard, attempt access — expect 401 by default |
| AUDIT-039 | Attempt 10 failed logins on test account — expect account locked after N attempts |
| AUDIT-003/004 | Attempt refund/settlement action without dialog confirmation — expect action blocked |
| AUDIT-056 | Trigger instant booking accept — expect push notification received by patient device |
| AUDIT-057 | Inspect push payload — expect no `threadId`, `relatedEntityType`, `userId` |
| AUDIT-068/069/102/103 | Navigate to each route without admin session — expect redirect to login |
| AUDIT-062 | Trigger push in production — confirm `APP_URL` resolves to production domain |

---

## Wave 1 — i18n + Session Rendering + Admin Gates

**Goal:** Fix all raw enum rendering, missing translation keys, and remaining permission gates.
**Execution:** Frontend team (web + mobile); backend team on DTO changes.
**Duration estimate:** 1–2 weeks (can run parallel to Wave 0 backend work)

### Included Findings

| ID | Title | Surface | Module | Fix Complexity |
|----|-------|---------|--------|---------------|
| AUDIT-002 | AdminSessionListBadge missing presentationStatus | Mobile Admin | Admin Sessions | Low |
| AUDIT-012 | Patient session list raw enum | Mobile Patient | Session List | Low |
| AUDIT-013 | Practitioner session list raw enum | Mobile Practitioner | Session List | Low |
| AUDIT-014 | mapSessionBadge missing UNDER_REVIEW | Web Patient | Session Badge | Low |
| AUDIT-017 | presentationStatus i18n without fallback (web) | Web Patient | i18n | Low |
| AUDIT-018 | Frozen price not retrieved | Web Patient | Instant Booking | Medium |
| AUDIT-020 | No price visibility in instant booking | Web Patient | Instant Booking | Low |
| AUDIT-022 | No booking acceptance confirmation UI | Web Patient | Instant Booking | Medium |
| AUDIT-027 | formatModeLabel raw fallback | Mobile Patient | Formatting | Low |
| AUDIT-028 | formatFlowTypeLabel raw fallback | Mobile Patient | Formatting | Low |
| AUDIT-045 | AdminPermissionGate not auto-applied | Web Admin | Permissions | Medium |
| AUDIT-065 | Notification routing role fallback | Mobile | Notifications | Medium |
| AUDIT-070 | AdminNotificationDetailsPanel sanitization gap | Web Admin | Notifications | Low |
| AUDIT-072 | Join token in URL | Web | Session Join | Medium |
| AUDIT-075 | Runtime inspector no audit log | Web Admin | Runtime Inspector | Medium |
| AUDIT-085 | SessionChatPanel raw enum (regression) | Web | Session Chat | Low |
| AUDIT-086 | Missing JOINABLE/IN_PROGRESS i18n keys | Web | i18n | Low |
| AUDIT-098 | FinancialReconciliation toLowerCase() on enums | Web Admin | i18n | Low |
| AUDIT-104 | SessionLaneWorkspace raw enum | Web | Session Lane | Low |
| AUDIT-105 | Raw PENDING_PAYMENT/CONFIRMED in success.tsx | Mobile Patient | Payments | Low |
| AUDIT-106 | Raw SupportTicketType enum in support/new.tsx | Mobile Patient | Support | Low |
| AUDIT-107 | formatNotificationType bypasses i18n | Mobile Patient | Notifications | Low |
| AUDIT-116 | formatRequirementLabel raw keys on dashboard | Mobile Practitioner | i18n | Low |
| AUDIT-108 | Web tokens in AsyncStorage | Mobile Web | Auth | **Pending product decision** |
| AUDIT-095 | providerRoomRef exposed | Web Admin | Runtime Inspector | **Pending backend confirmation** |

### Dependency Order Within Wave 1

```
1. AUDIT-086 (missing i18n keys)     → Add keys to en.json/ar.json — prerequisite for all enum fixes
2. AUDIT-105/106/107 (mobile raw enums) → After translation keys confirmed
3. AUDIT-085/104/002/012/013/014 (session badge raw enums) → After keys
4. AUDIT-098 (toLowerCase on enums)  → After keys confirmed
5. AUDIT-017 (web i18n fallback)     → After keys
6. AUDIT-116 (formatRequirementLabel) → After keys
7. AUDIT-027/028 (formatMode/FlowTypeLabel) → After keys
8. AUDIT-020/022 (instant booking UX) → After AUDIT-018
9. AUDIT-018 (frozen price retrieval) → After AUDIT-040 infrastructure ready
10. AUDIT-045 (permission gate systematization) → After Wave 0 gate infrastructure
11. AUDIT-065 (notification role routing) → Independent
12. AUDIT-070 (HTML sanitization)     → Independent
13. AUDIT-072 (join token in URL)     → Independent
14. AUDIT-075 (inspector audit log)   → After AUDIT-040
15. AUDIT-108 (AsyncStorage)          → **Only if product confirms Expo web is production**
16. AUDIT-095 (providerRoomRef)       → **Only after backend confirms token sensitivity**
```

### Smallest Safe Next Step for Wave 1

**Start with AUDIT-086 (missing JOINABLE/IN_PROGRESS keys)** — add two keys to `en.json` and `ar.json`. No code changes required. Prerequisite for all other enum-rendering fixes.

**Second action: AUDIT-105, AUDIT-106** — add `patientSessionsFlow.statuses.PENDING_PAYMENT` and `support.categories.GENERAL` etc. to locale files. Check actual key existence first (Q-083, Q-084) before assuming absence.

### Validation Plan for Wave 1

| Finding | Validation Method |
|---------|------------------|
| AUDIT-086 | Inspect en.json/ar.json — confirm `presentationStatus.*` has all 9 status keys |
| AUDIT-105 | Load sessions/success.tsx in Arabic mode — confirm payment status renders in Arabic |
| AUDIT-106 | Open support/new.tsx in Arabic mode — confirm categories render in Arabic |
| AUDIT-107 | Open profile-notifications.tsx in Arabic mode — confirm notification types render in Arabic |
| AUDIT-085/104/002 | Open session detail in Arabic mode — confirm status badges render in Arabic, not raw enum |
| AUDIT-116 | Open practitioner dashboard in Arabic mode — confirm requirement labels render in Arabic |
| AUDIT-098 | Open FinancialReconciliationScreen in Arabic mode — confirm status labels correct |
| AUDIT-065 | Tap notification with absent targetRole — confirm routes to correct role's session |
| AUDIT-068/069/102/103 | Re-verify permission gates (from Wave 0) |
| AUDIT-108 | If Expo web is production — verify tokens are in httpOnly cookie or encrypted storage |

---

## Wave 2 — Instant Booking Infrastructure + Admin Oversight

**Goal:** Close the operational infrastructure gaps for instant booking (cron, notifications, admin surfaces, availability validation).
**Execution:** Backend team primary; frontend team on admin UI.
**Duration estimate:** 2–3 weeks

### Included Findings

| ID | Title | Surface | Module | Fix Complexity |
|----|-------|---------|--------|---------------|
| AUDIT-011 | flowType absent from AdminSessionListItem | Web Admin | Session List | Medium |
| AUDIT-015 | Practitioner timezone not displayed | Web Practitioner | Availability | Low |
| AUDIT-016 | Slot conflict not pre-checked | Web | Booking | High |
| AUDIT-019 | No admin surface for practitioner availability | Web Admin | Availability | Medium |
| AUDIT-021 | Availability editor ignores existing bookings | Web Practitioner | Booking | High |
| AUDIT-023 | No admin surface for instant booking management | Web Admin | Instant Booking | High |
| AUDIT-024 | No notifications on instant booking events | Backend | Notifications | High |
| AUDIT-025 | No availability visibility in admin | Web Admin | Availability | Medium |
| AUDIT-026 | No admin surface for instant booking oversight | Web Admin | Instant Booking | High |
| AUDIT-029 | Presence TTL stale ONLINE records | Backend | Presence | High |
| AUDIT-030 | No cron driver for instant booking expiration | Backend | Instant Booking | High |
| AUDIT-054 | Daily room expiry mismatch | Backend | Daily | High |
| AUDIT-059 | Unread count only counts IN_APP | Mobile | Notifications | Low |
| AUDIT-064 | Expo push token without EAS project ID | Mobile | Push | Medium |
| AUDIT-066 | InboxItem navigates without ownership validation | Mobile | Messages | Low |
| AUDIT-071 | JSON copy only redacts URLs | Web Admin | Notification | Low |
| AUDIT-073 | No HTML sanitization on notification content | Backend | Notifications | Low |
| AUDIT-076 | SESSION_JOIN_LAG_MINUTES = 0 | Backend | Session Join | Low |
| AUDIT-078 | Support status enum without i18n | Web Admin | i18n | Low |
| AUDIT-080 | Notification href falls back to "/" | Mobile | Notifications | Low |
| AUDIT-082 | Push registration without timestamp | Mobile | Push | Low |
| AUDIT-083 | Notification deduplication in-memory | Backend | Notifications | Medium |
| AUDIT-084 | Cold-start notification conflict | Mobile | Notifications | Medium |
| AUDIT-087 | Zero loading.tsx across 80+ routes | Web | Route Infrastructure | Medium |
| AUDIT-090 | Admin back arrows missing RTL | Web Admin | RTL | Low |
| AUDIT-091 | AppErrorFallback logs error.stack | Web | Error Handling | Low |
| AUDIT-092 | AppErrorFallback identical for all error types | Web | Error Handling | Medium |
| AUDIT-093 | AdminPermissionGate raw "Loading..." | Web Admin | i18n | Low |
| AUDIT-094 | No PatientPermissionGate/PractitionerPermissionGate | Web | Permissions | High |
| AUDIT-096 | userId masking inconsistent | Web Admin | Notification | Low |
| AUDIT-097 | Inline Arabic/English ternary | Web Admin | i18n | Low |
| AUDIT-100 | Payment EXPIRED lacks retry CTA | Web Patient | Payments | Low |
| AUDIT-109 | Patient notification typeSlug coverage gap | Mobile Patient | Notifications | Low |
| AUDIT-111 | No loading/error route files in mobile | Mobile | Route Infrastructure | Medium |
| AUDIT-112 | cleanReasonText limited prefix handling | Mobile Practitioner | Onboarding | Low |
| AUDIT-113 | Credential fileUrl raw text | Mobile Practitioner | Onboarding | Low |
| AUDIT-114 | onboarding.tsx accessible via direct navigation | Mobile Practitioner | Route Protection | Low |
| AUDIT-115 | I18nManager.isRTL instead of getAppDirection() | Mobile | RTL | Low |
| AUDIT-117 | Messages inbox stale data on lane error | Mobile | Messages Shell | Medium |

### Smallest Safe Next Step for Wave 2

**Start with AUDIT-030 (instant booking expiration cron)** — wire the `ExpireInstantBookingRequestUseCase` to a cron driver (e.g., `@nestjs/schedule`). This is the operational foundation for instant booking. Without it, pending requests never expire automatically.

**Second action: AUDIT-054 (Daily room expiry)** — change room expiry calculation from fixed `endsAt + 7200s` to `endsAt + (duration_in_seconds)` based on the actual session duration field.

**Third action: AUDIT-076 (SESSION_JOIN_LAG_MINUTES = 0)** — set to a reasonable buffer value (5–10 minutes).

### Validation Plan for Wave 2

| Finding | Validation Method |
|---------|------------------|
| AUDIT-030 | Create pending instant booking request, wait past expiry time, confirm status changes to EXPIRED automatically |
| AUDIT-054 | Create session with 30-minute duration, check Daily room expiry — confirm expires at session end, not 2 hours after |
| AUDIT-024 | Practitioner accepts instant booking — confirm patient receives push notification |
| AUDIT-016 | Attempt to book overlapping slots — confirm conflict error returned before confirmation |
| AUDIT-021 | Create overlapping availability slots — confirm editor rejects or warns |
| AUDIT-023/026 | Open admin panel — confirm instant booking requests visible with accept/reject controls |
| AUDIT-087 | Inspect any route's network tab — confirm no missing streaming boundaries |

---

## Wave 3 — Notification Infrastructure + Polish

**Goal:** Stabilize notification dispatch, push registration, and mobile polish items.
**Execution:** Mobile team primary; backend team on notification dispatch.
**Duration estimate:** 1–2 weeks

### Included Findings

| ID | Title | Surface | Fix Complexity |
|----|-------|---------|---------------|
| AUDIT-059 | Unread count only counts IN_APP | Mobile | Low |
| AUDIT-064 | Expo push token without EAS project ID | Mobile | Medium |
| AUDIT-066 | InboxItem navigates without ownership validation | Mobile | Low |
| AUDIT-071 | JSON copy only redacts URLs | Web Admin | Low |
| AUDIT-073 | No HTML sanitization on notification content | Backend | Low |
| AUDIT-080 | Notification href falls back to "/" | Mobile | Low |
| AUDIT-082 | Push registration without timestamp | Mobile | Low |
| AUDIT-083 | Notification deduplication in-memory ref | Backend | Medium |
| AUDIT-084 | Cold-start notification conflict | Mobile | Medium |
| AUDIT-090 | Admin back arrows missing RTL | Web Admin | Low |
| AUDIT-091 | AppErrorFallback logs error.stack | Web | Low |
| AUDIT-092 | AppErrorFallback identical for all types | Web | Medium |
| AUDIT-093 | AdminPermissionGate raw "Loading..." | Web Admin | Low |
| AUDIT-096 | userId masking inconsistent | Web Admin | Low |
| AUDIT-097 | Inline Arabic/English ternary | Web Admin | Low |
| AUDIT-100 | Payment EXPIRED lacks retry CTA | Web Patient | Low |
| AUDIT-109 | Patient notification typeSlug coverage gap | Mobile Patient | Low |
| AUDIT-111 | No loading/error route files in mobile | Mobile | Medium |
| AUDIT-112 | cleanReasonText limited prefix handling | Mobile Practitioner | Low |
| AUDIT-113 | Credential fileUrl raw text | Mobile Practitioner | Low |
| AUDIT-114 | onboarding.tsx accessible via direct navigation | Mobile Practitioner | Low |
| AUDIT-115 | I18nManager.isRTL instead of getAppDirection() | Mobile | Low |
| AUDIT-117 | Messages inbox stale data on lane error | Mobile | Medium |

---

## Wave 4 — RTL/UX Polish + Route Infrastructure

**Goal:** Complete RTL fixes, route infrastructure, and post-pilot polish.
**Execution:** Frontend team.
**Duration estimate:** 1 week

### Included Findings

| ID | Title | Surface | Fix Complexity |
|----|-------|---------|---------------|
| AUDIT-087 | Zero loading.tsx across 80+ routes | Web | Medium |
| AUDIT-088 | Toast provider hardcoded dir="rtl" | Web | Low |
| AUDIT-089 | ChatKit hardcoded dir="ltr" | Web | Low |
| AUDIT-090 | Admin back arrows missing RTL flip | Web Admin | Low |
| AUDIT-094 | No PatientPermissionGate/PractitionerPermissionGate | Web | High |
| AUDIT-099 | Root not-found.tsx English-only | Web | Low |
| AUDIT-101 | Bare pulsing div no a11y label | Web Admin | Low |

---

## Wave 5 — Long-Term Architecture

**Goal:** Address findings that require architectural refactoring or are deferred to future releases.

| ID | Title | Notes |
|----|-------|-------|
| AUDIT-042 | Android SecureStore software-backed encryption | Future: migrate to hardware-backed Keystore |
| AUDIT-043 | Web access token 7-day expiry | Future: implement refresh-before-expiry logic |
| AUDIT-046 | Web layouts don't check account-state | Future: account-state checks on web layouts |
| AUDIT-051 | No global throttle guard | Future: rate limiting infrastructure |
| AUDIT-052 | Silent logout on refresh expiry | Future: user notification on token expiry |
| AUDIT-077 | No timezone configuration enforcement | Future: explicit TZ configuration |
| AUDIT-079 | markReadMutation no debounce | Future: debounce implementation |
| AUDIT-081 | messages/[id] accepts string[] | Future: strict UUID validation |
| AUDIT-118–124 | INFO observations | No action |

---

## Risk Notes

1. **Wave 0 backend fixes (AUDIT-040, 039, 010) require database migration planning** — pessimistic locks and account lockout need careful rollback planning.

2. **Wave 1 i18n fixes may reveal missing keys** — exhaustive key coverage check should be performed before Wave 1 execution to avoid discovering additional gaps mid-wave.

3. **AUDIT-095 and AUDIT-108 are blocked on external decisions** — these cannot be executed until product confirms Expo web scope and backend confirms `providerRoomRef` sensitivity.

4. **Wave 2 instant booking fixes are interdependent** — AUDIT-030 (cron), AUDIT-024 (notifications), AUDIT-016 (slot conflict), and AUDIT-021 (availability editor) all touch the booking state machine. Changes should be staged carefully.

5. **RTL fixes (Wave 4) carry regression risk** — direction changes affect layout throughout the app. Full Arabic-mode regression testing is required after Wave 4.

---

*Fix roadmap produced by Phase 8 read-only triage. No application code was modified.*
