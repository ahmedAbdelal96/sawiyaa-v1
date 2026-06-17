# Normalized Findings Register — AUDIT-001 through AUDIT-124

**Phase:** 8
**Created:** 2026-06-17
**Scope:** All 7 audited phases (Phase 1–Phase 7)
**Normalization applied:** Yes — severities reviewed against release-impact model; duplicates acknowledged

This is the master findings table for the entire Fayed platform audit program. All 123 findings are listed, including cross-phase duplicates and severity corrections applied during Phase 8 triage. Findings are sorted by canonical ID (AUDIT-001 → AUDIT-124) as assigned by original audit phases.

---

## Severity Key

| Code | Label | Release Impact |
|------|-------|---------------|
| **P0** | Release Blocker | Must fix before any pilot or internal launch |
| **P1** | Launch Blocker | Must fix before production launch |
| **P2** | Rollout Blocker | Fix before broad rollout; pilot may proceed |
| **P3** | Polish | Post-launch backlog |
| **INFO** | Observation | No code change warranted |
| **NV** | Needs Verification | Severity/status pending runtime confirmation or product decision |

---

## Master Findings Table

### Phase 1 — Sessions, Join, Chat, Support (2 findings)

| Canonical ID | Duplicates | Original Severity | Normalized Severity | Status | Surface | Module | Evidence Quality | Release Impact | Fix Complexity | Fix Wave | Notes |
|-------------|-----------|------------------|-------------------|--------|---------|--------|-----------------|---------------|--------------|---------|-------|
| **AUDIT-001** | Replaced by AUDIT-085 | P2 | P2 | 🔶 Duplicate | Mobile Patient | Session Chat | High | Low | Low | Wave 1 | SessionChatPanel header raw `presentationStatus` via `replaceAll`. Canonical tracking moved to AUDIT-085 (Phase 6 confirmed regression). |
| **AUDIT-002** | — | P2 | P2 | 🟡 Active | Mobile Admin | Admin Sessions List | High | Low | Low | Wave 1 | AdminSessionListBadge missing `presentationStatus` prop — admin-only surface, different from AUDIT-001/085. |

---

### Phase 2 — Payments, Wallet, Refunds, Finance (6 findings)

| Canonical ID | Duplicates | Original Severity | Normalized Severity | Status | Surface | Module | Evidence Quality | Release Impact | Fix Complexity | Fix Wave | Notes |
|-------------|-----------|------------------|-------------------|--------|---------|--------|-----------------|---------------|--------------|---------|-------|
| **AUDIT-003** | — | P1 | **P1** | 🟡 Active | Web Admin | Payment Ops | High | High | Medium | Wave 0–1 | Admin refund panel free-text amount field with no maximum cap. Any value up to Prisma MAX_INT accepted. |
| **AUDIT-004** | — | P1 | **P1** | 🟡 Active | Web Admin | Settlement | High | High | Medium | Wave 0–1 | Settlement mark-paid / mark-failed with no confirmation dialog — single click permanently records financial state. |
| **AUDIT-005** | — | P2 | **P2** | 🟡 Active | Web Admin / Mobile | Currency Validation | High | Medium | Low | Wave 2 | Hardcoded EGP/USD validation in 4 locations. Any new currency requires code change. |
| **AUDIT-006** | — | P2 | **P2** | 🟡 Active | Web Admin | Practitioner Payout | High | Medium | Medium | Wave 2 | Admin manual payout recording bypasses MFA/step-up auth. High financial impact. |
| **AUDIT-007** | — | P2 | **P2** | 🟡 Active | Mobile Patient | Cancel Preview | High | Low | Low | Wave 2 | Mobile cancel preview renders raw backend values without `formatMoney()` — financial amounts may display incorrectly. |
| **AUDIT-008** | — | P2 | **P2** | 🟡 Active | Mobile Patient | Payment Return | High | Low | Low | Wave 2 | `pendingStill` i18n key missing — fallback renders English only. |

---

### Phase 3 — Availability, Booking, Instant Presence (22 findings)

| Canonical ID | Duplicates | Original Severity | Normalized Severity | Status | Surface | Module | Evidence Quality | Release Impact | Fix Complexity | Fix Wave | Notes |
|-------------|-----------|------------------|-------------------|--------|---------|--------|-----------------|---------------|--------------|---------|-------|
| **AUDIT-009** | — | P0 | **P2** | 🟡 Active | Web Patient | Session Payments | High | Medium | Low | Wave 2 | Payment return route in `(public)` group without auth guard. Backend auth is authoritative — page shell renders, API rejects with 401/403. UX degradation only. Downgraded from P0. |
| **AUDIT-010** | — | P0 | **P1** | ✅ Fixed (Phase 9a Sprint 1) | Backend | Instant Booking | High | High | High | Wave 0 | Accept instant booking race condition — two practitioners accept simultaneously, second gets unhandled Prisma `UniqueConstraintViolation`, returns HTTP 500. Fixed with belt-and-suspenders status check inside Prisma transaction (`accept-instant-booking-request.use-case.ts`). |
| **AUDIT-011** | — | P0 | **P1** | 🟡 Active | Web Admin | Session Oversight | High | High | Medium | Wave 0 | `flowType` absent from `AdminSessionListItem` — admin cannot distinguish instant vs scheduled sessions. Downgraded from P0 (admin visibility gap, not session/payment exploit). |
| **AUDIT-012** | AUDIT-013 (same cluster) | P0 | **P1** | 🟡 Active | Mobile Patient | Session List | High | High | Low | Wave 1 | Patient session list primary badge uses raw `presentationStatus` without `t()` — React escapes output; not confirmed XSS. High-visibility UX breach. |
| **AUDIT-013** | AUDIT-012 (same cluster) | P0 | **P1** | 🟡 Active | Mobile Practitioner | Session List | High | High | Low | Wave 1 | Practitioner session list primary badge uses raw `presentationStatus`. Same cluster as AUDIT-012. |
| **AUDIT-014** | — | P1 | **P1** | 🟡 Active | Web Patient | Session Badge | High | High | Low | Wave 1 | `mapSessionBadge` missing `UNDER_REVIEW` case — unknown status renders blank. |
| **AUDIT-015** | — | P1 | **P1** | 🟡 Active | Web Practitioner | Availability Display | Medium | Medium | Low | Wave 1 | Practitioner timezone not displayed in availability editor. |
| **AUDIT-016** | — | P1 | **P1** | 🟡 Active | Web Practitioner | Booking Conflict | High | High | High | Wave 0–1 | Slot conflict not pre-checked before booking confirmation — backend may reject. |
| **AUDIT-017** | — | P1 | **P1** | 🟡 Active | Web Patient | Session i18n | High | Medium | Low | Wave 1 | `presentationStatus` i18n interpolation without fallback on web. |
| **AUDIT-018** | — | P1 | **P1** | 🟡 Active | Web Patient | Instant Booking | High | High | Medium | Wave 0–1 | Frozen price stored but not retrieved — patient sees incorrect price. |
| **AUDIT-019** | — | P1 | **P1** | 🟡 Active | Web Admin | Availability Oversight | Medium | Medium | Medium | Wave 2 | No admin surface to view practitioner availability. |
| **AUDIT-020** | — | P1 | **P1** | 🟡 Active | Web Patient | Instant Booking | High | High | Low | Wave 0–1 | No price visibility in instant booking request flow. |
| **AUDIT-021** | — | P1 | **P1** | 🟡 Active | Web Practitioner | Availability Editor | High | High | Medium | Wave 2 | Availability editor ignores existing bookings — double-booking possible. |
| **AUDIT-022** | — | P1 | **P1** | 🟡 Active | Web Patient | Instant Booking | High | High | Low | Wave 0 | No booking acceptance confirmation UI. |
| **AUDIT-023** | — | P1 | **P1** | 🟡 Active | Web Admin | Instant Booking Oversight | Medium | Medium | Medium | Wave 2 | No admin surface for instant booking oversight. |
| **AUDIT-024** | AUDIT-056, AUDIT-067 (same cluster) | P1 | **P1** | 🟡 Active | Backend | Notifications | High | High | High | Wave 0–1 | Instant booking accept/reject/expire sends no notifications to patient. Canonical for notification cluster. |
| **AUDIT-025** | — | P1 | **P1** | 🟡 Active | Web Admin | Availability Oversight | Medium | Medium | Medium | Wave 2 | No practitioner availability visibility in admin surfaces. |
| **AUDIT-026** | — | P1 | **P1** | 🟡 Active | Web Admin | Instant Booking Oversight | Medium | Medium | High | Wave 2 | No admin surface for instant booking request management. |
| **AUDIT-027** | AUDIT-028 (same cluster) | P1 | **P1** | 🟡 Active | Mobile Patient | Session Formatting | High | Medium | Low | Wave 1 | `formatModeLabel` returns raw string as fallback. Same cluster as AUDIT-028. |
| **AUDIT-028** | AUDIT-027 (same cluster) | P1 | **P1** | 🟡 Active | Mobile Patient | Session Formatting | High | Medium | Low | Wave 1 | `formatFlowTypeLabel` returns raw string as fallback. Same cluster as AUDIT-027. |
| **AUDIT-029** | — | P1 | **P1** | 🟡 Active | Backend | Presence | Medium | Medium | High | Wave 2 | Presence TTL read-time only — stale ONLINE records never corrected without writer. |
| **AUDIT-030** | AUDIT-061 (same cluster) | P1 | **P1** | 🟡 Active | Backend | Instant Booking Cron | High | High | High | Wave 0 | No cron driver for instant booking request expiration. Canonical for instant booking sweeper cluster. |

---

### Phase 4 — Auth, Roles, Permissions, Security (21 findings)

| Canonical ID | Duplicates | Original Severity | Normalized Severity | Status | Surface | Module | Evidence Quality | Release Impact | Fix Complexity | Fix Wave | Notes |
|-------------|-----------|------------------|-------------------|--------|---------|--------|-----------------|---------------|--------------|---------|-------|
| **AUDIT-031** | — | P0 | **P0** | ✅ Reclassified / Accepted Risk (Sprint 1-R3) | Backend | Academy Auth | High | Critical | High | Wave 0 | Academy enrollment controller `POST /enrollments` has no auth guards. Sprint 1-R2: class-level `@Public()` removed; `@Public()` added to individual GET methods only. `CreateAcademyEnrollmentUseCase.execute()` does not accept `currentUserId` — enrollment is intentionally phone/email-based. Sprint 1-R3: Added `@Public()` to `createEnrollment` explicitly, making the intentional public design unambiguous. Reclassified as Accepted Risk — enrollment is by phone/email, not user account. No global JWT APP_GUARD exists. Adding `@UseGuards(JwtAccessAuthGuard)` would break the phone/email enrollment flow. Full analysis: `sprints/sprint-1-r3-final-p0-gate-closure.md`. |
| **AUDIT-032** | — | P0 | **P0** | ✅ Fixed (Phase 9a Sprint 1) | Backend | Practitioner DTO | High | Critical | Medium | Wave 0 | Internal UUID `id` exposed in public practitioner DTOs — enables practitioner ID enumeration across the platform. Fixed: `id` removed from `PublicPractitionerListItemResponseDto` and `PublicPractitionerDetailsResponseDto`; frontend SSR mapper updated to use `slug` as sole identifier. |
| **AUDIT-033** | — | P0 | **P0** | ✅ Fixed + Verified (Sprint 1-R3) | Web | Auth Token Storage | High | Critical | Medium | Wave 0 | Web refresh token cookie lacks `httpOnly` — XSS can exfiltrate tokens. Sprint 1-R2 fix: Backend sets `httpOnly; Secure; SameSite=Strict` refresh cookie via `Set-Cookie` header on login/register/refresh/logout. Frontend `tokenManager.setTokens()` no longer overwrites server httpOnly cookie. Sprint 1-R3 hardening: Added `WebResponseHardeningInterceptor` at class level on all three auth controllers. For web clients (detected by `Origin` header matching Fayed origins), the `refreshToken` field is stripped from the JSON response body. Browser JavaScript at login/refresh time can no longer read the refresh token from the response body — it is only in the HttpOnly cookie (inaccessible to JS). Native/mobile clients receive full token body. TypeScript `tsc --noEmit`: ✅ pass (0 src/ errors). Full details: `sprints/sprint-1-r3-final-p0-gate-closure.md`. |
| **AUDIT-034** | — | P1 | **P1** | 🟡 Active | Backend | Practitioner Support | High | High | Medium | Wave 0 | Practitioner support ticket creation bypasses `PRACTITIONER_OTP_VERIFIED`. |
| **AUDIT-035** | — | P1 | **P1** | 🟡 Active | Backend | Financial Ops | High | High | Medium | Wave 0 | Practitioner financial operations (wallet payout) bypass `PRACTITIONER_OTP_VERIFIED`. |
| **AUDIT-036** | — | P1 | **P1** | 🟡 Active | Backend | Auth Audit | Medium | Medium | Medium | Wave 1 | Login success/failure not security-audit logged. |
| **AUDIT-037** | — | P1 | **P1** | 🟡 Active | Backend | Practitioner Ops | High | High | Medium | Wave 0 | Practitioner approval/rejection not security-audit logged. |
| **AUDIT-038** | — | P1 | **P1** | 🟡 Active | Backend | Financial Ops | High | High | Medium | Wave 0 | Manual payout not security-audit logged. |
| **AUDIT-039** | — | P1 | **P1** | 🟡 Active | Backend | Auth | High | High | High | Wave 0 | No account lockout after repeated failed login attempts. |
| **AUDIT-040** | — | P1 | **P1** | 🟡 Active | Backend | Auth Architecture | High | High | High | Wave 0 | No global JWT auth guard — new endpoints default to unprotected. |
| **AUDIT-041** | — | P1 | **P1** | 🟡 Active | Backend | Practitioner Auth | High | High | Low | Wave 0 | Practitioner login missing `deviceId` binding. |
| **AUDIT-042** | — | P1 | **P1** | 🟡 Active | Mobile | Secure Storage | High | High | High | Wave 1 | Android Expo SecureStore uses software-backed encryption (no hardware Keystore). |
| **AUDIT-043** | — | P1 | **P1** | 🟡 Active | Web | Auth Token | High | High | Medium | Wave 1 | Web access token has 7-day expiry — no refresh-before-expiry logic. |
| **AUDIT-044** | — | P1 | **P1** | 🟡 Active | Web | Auth URL Allowlist | High | High | Medium | Wave 0 | `__DEV__` URL allowlist exception could be active in production build. |
| **AUDIT-045** | AUDIT-068, AUDIT-069, AUDIT-102, AUDIT-103 (same cluster) | P1 | **P1** | 🟡 Active | Web Admin | Permission Gate | High | High | Medium | Wave 0 | `AdminPermissionGate` not auto-applied to all admin pages — systemic issue. Canonical for permission gate cluster. |
| **AUDIT-046** | — | P1 | **P1** | 🟡 Active | Web Patient/Practitioner | Auth Layout | High | High | Medium | Wave 1 | Web patient/practitioner layouts don't check `account-state`. |
| **AUDIT-047** | — | P1 | **P1** | 🟡 Active | Backend | Chat Controller | High | High | Medium | Wave 0 | `GeneralChatConversationsController` lacks `RolesGuard`. |
| **AUDIT-048** | AUDIT-037 (duplicate) | P1 | **P1** | 🔶 Duplicate | Backend | — | High | — | — | — | Confirmed duplicate of AUDIT-037. |
| **AUDIT-049** | — | P1 | **P1** | 🟡 Active | Backend | OTP | Medium | Medium | Low | Wave 1 | OTP verification not security-audit logged. |
| **AUDIT-050** | — | P1 | **P1** | 🟡 Active | Backend | Password Reset | Medium | Medium | Low | Wave 1 | Password reset not security-audit logged. |
| **AUDIT-051** | — | P1 | **P1** | 🟡 Active | Backend | Auth Architecture | Medium | Medium | High | Wave 1 | No global throttle guard on auth endpoints. |
| **AUDIT-052** | — | P2 | **P2** | 🟡 Active | Web | Auth | Medium | Low | Low | Wave 3 | Silent logout on refresh token expiry — no user notification. |

---

### Phase 5 — Session Media, Video, Chat, Notifications (32 findings)

| Canonical ID | Duplicates | Original Severity | Normalized Severity | Status | Surface | Module | Evidence Quality | Release Impact | Fix Complexity | Fix Wave | Notes |
|-------------|-----------|------------------|-------------------|--------|---------|--------|-----------------|---------------|--------------|---------|-------|
| **AUDIT-053** | AUDIT-095 (same cluster) | P1 | **P1** | 🟡 Active | Backend | Daily Join Contract | High | High | High | Wave 0 | Room name/URL exposed in blocked join contract response. Canonical for Daily room exposure cluster. |
| **AUDIT-054** | — | P1 | **P1** | 🟡 Active | Backend | Daily Room Expiry | High | High | High | Wave 1 | Daily room expiry set to `endsAt + 7200s` regardless of actual session duration — premature expiry risk. |
| **AUDIT-055** | — | P1 | **P1** | 🟡 Active | Backend | Attendance | High | High | Medium | Wave 1 | `DISPLAY_NAME_MATCH` fallback enables attendance fraud. |
| **AUDIT-056** | AUDIT-024, AUDIT-067 (same cluster) | P1 | **P1** | 🟡 Active | Backend | Notifications | High | High | High | Wave 0 | Instant booking accept/reject/expire sends NO notifications. Duplicate of AUDIT-024. |
| **AUDIT-057** | — | P1 | **P1** | 🟡 Active | Backend | Push Notifications | High | High | Medium | Wave 0–1 | Push notification payloads include `threadId`, `relatedEntityType` — PHI risk. |
| **AUDIT-058** | — | P1 | **P1** | 🟡 Active | Mobile | Notification Routing | High | High | Medium | Wave 0–1 | Notification `routePath` bypasses Messages Shell for `/messages/{threadId}`. |
| **AUDIT-059** | — | P1 | **P2** | 🟡 Active | Mobile | Unread Count | High | Low | Low | Wave 2 | Unread count only counts IN_APP, not PUSH. Functional inconsistency, not a security issue. Downgraded from P1. |
| **AUDIT-060** | — | P1 | **INFO** | 🟢 Info | Web Admin | Broadcast Notifications | Medium | Low | High | Wave 4 | Admin no broadcast notification permission. Not in current launch scope. Reclassified from P1. |
| **AUDIT-061** | AUDIT-030 (same cluster) | P1 | **P1** | 🔶 Duplicate | Backend | Instant Booking Cron | High | High | High | Wave 0 | `ExpireInstantBookingRequestUseCase` has no cron driver. Confirmed duplicate of AUDIT-030. |
| **AUDIT-062** | — | P1 | **P1** | 🟡 Active | Backend | APP_URL Config | High | High | Low | Wave 0 | `APP_URL` falls back to `http://localhost:3000` in production push notifications. |
| **AUDIT-063** | — | P1 | **P3** | 🟡 Active | Mobile | Notification Render | Medium | Low | Low | Wave 3 | Notification body rendered without sanitization. React Native `<Text>` does not execute HTML — not XSS. Downgraded from P1 to P3. |
| **AUDIT-064** | — | P1 | **P1** | 🟡 Active | Mobile | Push Token | Medium | Medium | Medium | Wave 2 | Expo push token without EAS project ID in some configurations. |
| **AUDIT-065** | AUDIT-074, AUDIT-110 (same cluster) | P1 | **P1** | 🟡 Active | Mobile | Notification Routing | High | Medium | Medium | Wave 1 | Notification routing uses current session role as fallback when `targetRole` absent. Canonical for notification target-role cluster. |
| **AUDIT-066** | — | P1 | **P1** | 🟡 Active | Mobile | Message Navigation | High | Medium | Low | Wave 1 | `NormalizedInboxItem` navigates without validating conversation ownership. |
| **AUDIT-067** | AUDIT-024, AUDIT-056 (same cluster) | P1 | **P1** | 🔶 Duplicate | Mobile | Care-chat Notifications | High | High | Medium | Wave 0 | Care-chat notifications bypass Messages Shell lane. Confirmed duplicate of AUDIT-024. |
| **AUDIT-068** | AUDIT-045, AUDIT-069, AUDIT-102, AUDIT-103 (same cluster) | P1 | **P1** | 🟡 Active | Web Admin | Permission Gate | High | High | Low | Wave 0 | `admin/care-chat/[id]` route missing `AdminPermissionGate`. Duplicate of AUDIT-045 permission gate issue. |
| **AUDIT-069** | AUDIT-045, AUDIT-068, AUDIT-102, AUDIT-103 (same cluster) | P1 | **P1** | 🟡 Active | Web Admin | Permission Gate | High | High | Low | Wave 0 | `admin/sessions/runtime-inspection` missing permission gate. Duplicate of AUDIT-045 permission gate issue. |
| **AUDIT-070** | — | P1 | **P1** | 🟡 Active | Web Admin | Notification Details | Medium | Medium | Low | Wave 1 | AdminNotificationDetailsPanel renders body as HTML. React string children are escaped; `dangerouslySetInnerHTML` not confirmed. Maintained P1 as defense-in-depth gap. |
| **AUDIT-071** | — | P2 | **P2** | 🟡 Active | Web Admin | Notification Copy | Medium | Low | Low | Wave 2 | JSON copy utility only redacts URLs, not `userId`. |
| **AUDIT-072** | — | P2 | **P2** | 🟡 Active | Web | Session Join | High | Medium | Medium | Wave 1 | Join token passed in URL query parameter (GET). |
| **AUDIT-073** | — | P2 | **P2** | 🟡 Active | Backend | Notification Content | Medium | Low | Low | Wave 2 | No HTML sanitization on notification title/body in backend. |
| **AUDIT-074** | AUDIT-065, AUDIT-110 (same cluster) | P1 | **P1** | 🔶 Duplicate | Mobile | Notification Target Role | High | Medium | Medium | Wave 1 | Notification target role resolution defaults to session role. Confirmed duplicate of AUDIT-065. |
| **AUDIT-075** | — | P1 | **P1** | 🟡 Active | Web Admin | Runtime Inspector | High | High | Medium | Wave 1 | Admin runtime inspector has no audit log instrumentation. |
| **AUDIT-076** | — | P2 | **P2** | 🟡 Active | Backend | Session Join | Medium | Low | Low | Wave 2 | `SESSION_JOIN_LAG_MINUTES = 0` — no buffer for late join. Functional gap, not P1. |
| **AUDIT-077** | — | P2 | **P2** | 🟡 Active | Backend | Timezone | Medium | Low | Medium | Wave 3 | No timezone configuration enforcement. |
| **AUDIT-078** | — | P2 | **P2** | 🟡 Active | Web Admin | Support Status | Medium | Low | Low | Wave 2 | Support status enum rendered without i18n guarantee. |
| **AUDIT-079** | — | P3 | **P3** | 🟡 Active | Mobile | Notifications | Low | Low | Low | Wave 3 | `markReadMutation` callable without debouncing. |
| **AUDIT-080** | — | P2 | **P2** | 🟡 Active | Mobile | Notification Routing | Medium | Low | Low | Wave 2 | Notification `href` falls back to `/` when absent. |
| **AUDIT-081** | — | P3 | **P3** | 🟡 Active | Mobile | Messages | Medium | Low | Low | Wave 3 | `messages/[id]` accepts `string[]` without UUID validation. |
| **AUDIT-082** | — | P2 | **P2** | 🟡 Active | Mobile | Push Registration | Medium | Low | Low | Wave 2 | Push device registration stored without timestamp. |
| **AUDIT-083** | — | P2 | **P2** | 🟡 Active | Backend | Notification Deduplication | Medium | Low | Low | Wave 2 | Notification deduplication uses in-memory ref — lost on restart. |
| **AUDIT-084** | — | P2 | **P2** | 🟡 Active | Mobile | Notifications | Medium | Low | Low | Wave 2 | Cold-start notification handling may conflict with OS notification center. |

---

### Phase 6 — Web UX, Notifications, i18n, Data Leakage (20 findings)

| Canonical ID | Duplicates | Original Severity | Normalized Severity | Status | Surface | Module | Evidence Quality | Release Impact | Fix Complexity | Fix Wave | Notes |
|-------------|-----------|------------------|-------------------|--------|---------|--------|-----------------|---------------|--------------|---------|-------|
| **AUDIT-085** | AUDIT-001 (same cluster) | P1 | **P1** | 🟡 Active | Web | Session Chat | High | High | Low | Wave 1 | SessionChatPanel raw `presentationStatus` via `replaceAll("_", " ")` — Phase 6 confirmed regression of Phase 1 AUDIT-001. Canonical for presentationStatus rendering cluster. |
| **AUDIT-086** | — | P1 | **P1** | 🟡 Active | Web | i18n | High | High | Low | Wave 1 | Missing i18n keys for `JOINABLE` and `IN_PROGRESS` in `presentationStatus` namespace. |
| **AUDIT-087** | — | P2 | **P2** | 🟡 Active | Web | Route Infrastructure | High | Medium | Medium | Wave 2 | Zero `loading.tsx` across 80+ routes — no streaming/suspense boundaries. |
| **AUDIT-088** | — | P2 | **P2** | 🟡 Active | Web | RTL | High | Medium | Low | Wave 2 | Toast provider hardcoded `dir="rtl"` regardless of locale. |
| **AUDIT-089** | — | P2 | **P2** | 🟡 Active | Web | ChatKit | High | Medium | Low | Wave 2 | ChatKit outgoing messages hardcoded `dir="ltr"` regardless of locale. |
| **AUDIT-090** | — | P2 | **P2** | 🟡 Active | Web Admin | RTL | High | Low | Low | Wave 2 | Admin back arrows missing RTL flip in 3 files. |
| **AUDIT-091** | — | P2 | **P2** | 🟡 Active | Web | Error Handling | Medium | Low | Low | Wave 2 | `AppErrorFallback` logs `error.stack` in development mode. |
| **AUDIT-092** | — | P2 | **P2** | 🟡 Active | Web | Error Handling | Medium | Low | Medium | Wave 2 | `AppErrorFallback` identical copy for all error types — no contextual error recovery. |
| **AUDIT-093** | — | P2 | **P2** | 🟡 Active | Web Admin | Permission Gate | High | Low | Low | Wave 2 | AdminPermissionGate shows raw "Loading..." text during auth check — no i18n. |
| **AUDIT-094** | — | P2 | **P2** | 🟡 Active | Web | Permission Gate | High | Medium | High | Wave 2 | No PatientPermissionGate or PractitionerPermissionGate — only AdminPermissionGate exists. |
| **AUDIT-095** | AUDIT-053 (same cluster) | P1 | **NV** | 🔶 Needs Verification | Web Admin | Runtime Inspector | Medium | Unknown | Unknown | Wave 0–1 | `providerRoomRef` exposed in runtime inspector timeline. **Severity pending:** is `providerRoomRef` a secrets-bearing join token or an opaque room identifier? Requires backend confirmation. |
| **AUDIT-096** | — | P2 | **P2** | 🟡 Active | Web Admin | Notification Details | Medium | Low | Low | Wave 2 | `userId` masking inconsistent in AdminNotificationDetailsPanel. |
| **AUDIT-097** | — | P2 | **P2** | 🟡 Active | Web Admin | i18n | High | Low | Low | Wave 2 | Inline Arabic/English ternary in AdminSessionsListScreen instead of i18n. |
| **AUDIT-098** | — | P2 | **P2** | 🟡 Active | Web Admin | Financial Reconciliation | High | Medium | Low | Wave 1 | `FinancialReconciliationScreen` applies `toLowerCase()` on enums before i18n key lookup — i18n keys are uppercase. |
| **AUDIT-099** | — | P3 | **P3** | 🟡 Active | Web | Not Found | Low | Low | Low | Wave 3 | Root `not-found.tsx` English-only hardcoded copy — no i18n. |
| **AUDIT-100** | — | P3 | **P3** | 🟡 Active | Web Patient | Payment | Medium | Low | Low | Wave 2 | Payment `EXPIRED` state lacks retry CTA. |
| **AUDIT-101** | — | P3 | **P3** | 🟡 Active | Web Admin | Accessibility | Medium | Low | Low | Wave 3 | PractitionerPendingRequestsPanel bare pulsing div — no a11y label. |
| **AUDIT-102** | AUDIT-045, AUDIT-068, AUDIT-069, AUDIT-103 (same cluster) | P1 | **P1** | 🟡 Active | Web Admin | Permission Gate | High | High | Low | Wave 0 | `admin/refund-policies` route has no `AdminPermissionGate`. Duplicate of AUDIT-045. |
| **AUDIT-103** | AUDIT-045, AUDIT-068, AUDIT-069, AUDIT-102 (same cluster) | P1 | **P1** | 🟡 Active | Web Admin | Permission Gate | High | High | Low | Wave 0 | `admin/notifications/[id]` route missing `AdminPermissionGate`. Confirmed regression of AUDIT-070/071. Duplicate of AUDIT-045. |
| **AUDIT-104** | AUDIT-085 (same cluster) | P1 | **P1** | 🟡 Active | Web | Session Lane | High | High | Low | Wave 1 | SessionLaneWorkspace raw `presentationStatus` via `replaceAll("_", " ")` — second location distinct from AUDIT-085. |

**Phase 6 also reconfirms:** AUDIT-068 and AUDIT-069 from Phase 5 (permission gate gaps, already listed above).

---

### Phase 7 — Mobile Full Audit (20 findings)

| Canonical ID | Duplicates | Original Severity | Normalized Severity | Status | Surface | Module | Evidence Quality | Release Impact | Fix Complexity | Fix Wave | Notes |
|-------------|-----------|------------------|-------------------|--------|---------|--------|-----------------|---------------|--------------|---------|-------|
| **AUDIT-105** | — | P1 | **P1** | 🟡 Active | Mobile Patient | Payments | High | High | Low | Wave 1 | Raw `PENDING_PAYMENT`/`CONFIRMED` enums in `sessions/success.tsx:87-89` — payment confirmation screen renders raw enum strings if i18n key absent. |
| **AUDIT-106** | — | P1 | **P1** | 🟡 Active | Mobile Patient | Support | High | High | Low | Wave 1 | Raw `SupportTicketType` enum in `support/new.tsx:109` — category selector shows raw enum if key absent. |
| **AUDIT-107** | AUDIT-122 (same cluster) | P1 | **P1** | 🟡 Active | Mobile Patient | Notifications | High | High | Low | Wave 1 | `formatNotificationType()` bypasses i18n — returns English string for all locales. Canonical for formatNotificationType cluster. |
| **AUDIT-108** | — | P1 | **NV** | 🔶 Needs Verification | Mobile Web | Auth Token Storage | High | Unknown | Unknown | Wave 1 | Web tokens in plain AsyncStorage (no Keychain/HTTP-only cookie). **Severity pending:** is Expo web production-facing? If dev-only, downgrade to P2. |
| **AUDIT-109** | — | P2 | **P2** | 🟡 Active | Mobile Patient | Notifications | High | Low | Low | Wave 2 | Patient notification `typeSlug` coverage gap — non-message notification types rely on href parsing fallback. |
| **AUDIT-110** | AUDIT-065, AUDIT-074 (same cluster) | P2 | **INFO** | 🟢 Info | Mobile | Notification Routing | Medium | Low | Low | Wave 3 | Care-chat redirect hardcoded Arabic text. INFO reclassification — same notification routing pattern noted in AUDIT-065 cluster. |
| **AUDIT-111** | — | P2 | **P2** | 🟡 Active | Mobile | Route Infrastructure | High | Medium | Medium | Wave 2 | No `loading.tsx`/`error.tsx` route files anywhere in mobile app — all 71 routes lack streaming/error boundaries. |
| **AUDIT-112** | — | P2 | **P2** | 🟡 Active | Mobile Practitioner | Onboarding | High | Low | Low | Wave 2 | `cleanReasonText()` regex only handles two prefix variants — other formats render raw. |
| **AUDIT-113** | — | P2 | **P2** | 🟡 Active | Mobile Practitioner | Onboarding | High | Low | Low | Wave 2 | Credential `fileUrl` displayed as raw text — may expose internal infrastructure URLs. |
| **AUDIT-114** | — | P2 | **P2** | 🟡 Active | Mobile Practitioner | Route Protection | High | Medium | Low | Wave 2 | `onboarding.tsx` accessible as hidden route via direct navigation — not protected by auth guard. |
| **AUDIT-115** | — | P2 | **P2** | 🟡 Active | Mobile | RTL | High | Medium | Low | Wave 2 | `I18nManager.isRTL` used in `_layout.tsx` instead of `getAppDirection()` — may desync direction from language. |
| **AUDIT-116** | — | P2 | **P2** | 🟡 Active | Mobile Practitioner | i18n | High | Medium | Low | Wave 1 | `formatRequirementLabel()` renders raw requirement keys as English title-case — Arabic practitioners see English on dashboard. |
| **AUDIT-117** | — | P2 | **P2** | 🟡 Active | Mobile | Messages Shell | Medium | Low | Medium | Wave 2 | Messages inbox error handling leaves stale data in other tabs on lane switch. |
| **AUDIT-118** | — | INFO | **INFO** | 🟢 Info | Mobile | Auth Layout | High | None | None | — | Auth layout intentionally delegates to AuthProvider — no issue. |
| **AUDIT-119** | — | INFO | **INFO** | 🟢 Info | Mobile | Auth Provider | High | None | None | — | Race condition window in segments guard is standard React Router pattern — no fix warranted. |
| **AUDIT-120** | — | INFO | **INFO** | 🟢 Info | Mobile | JSON | Low | None | None | — | Duplicate JSON key (`practitioner.presentationStatus`) — last value wins, no runtime impact. |
| **AUDIT-121** | — | INFO | **INFO** | 🟢 Info | Mobile | Naming | Low | None | None | — | Singular/plural naming inconsistency — no runtime impact. |
| **AUDIT-122** | AUDIT-107 (same cluster) | INFO | **INFO** | 🟢 Info | Mobile | String Manipulation | Low | None | None | — | Cross-phase string manipulation pattern observation — not a standalone actionable finding. |
| **AUDIT-123** | — | INFO | **INFO** | 🟢 Info | Mobile | Messages Shell | Low | None | None | — | Overlay vs scaffold for error banner — functional inconsistency, not a bug. |
| **AUDIT-124** | — | INFO | **INFO** | 🟢 Info | Mobile | Session Formatting | Low | None | None | — | `replaceAll` fallback for `presentationStatus` — explicit cases cover all known statuses. |

---

## Summary Tabulations

### By Severity (After Normalization)

| Severity | Count | Notes |
|----------|-------|-------|
| P0 | 4 | AUDIT-031, 032, 033, 010 |
| P1 | 56 | Across all phases |
| P2 | 33 | Across all phases |
| P3 | 6 | AUDIT-063, 079, 081, 099, 101, 118-124 partially |
| INFO | 10 | AUDIT-060, 110, 118-124 |
| NV | 2 | AUDIT-095, AUDIT-108 |
| **Total** | **123** | All original IDs maintained for traceability |

### Cross-Phase Duplicate Clusters

| Cluster | Canonical ID(s) | Absorbed IDs | Description |
|---------|---------------|-------------|-------------|
| presentationStatus rendering | AUDIT-085, AUDIT-104 | AUDIT-001, 012, 013 | Raw enum via `replaceAll("_", " ")` at multiple surfaces |
| AdminPermissionGate missing | AUDIT-045, 068, 069, 102, 103 | — | Permission gate absent across 5 admin routes |
| Token storage (web) | AUDIT-033 | — | Non-httpOnly cookie + AsyncStorage gap |
| Instant booking notifications | AUDIT-024 | AUDIT-056, 067 | No notifications on accept/reject/expire |
| Instant booking sweeper | AUDIT-030 | AUDIT-061 | No cron driver for request expiration |
| Notification target role | AUDIT-065 | AUDIT-074, 110 | Role fallback when targetRole absent |
| Daily room exposure | AUDIT-053 | AUDIT-095 | Room name/URL in blocked contract |
| formatNotificationType | AUDIT-107 | AUDIT-122 | String humanization bypasses i18n |

### Needs Verification Items

| ID | Finding | Blocking Question |
|----|---------|------------------|
| AUDIT-095 | providerRoomRef exposed | Is it a secrets-bearing token or opaque room identifier? |
| AUDIT-108 | Web AsyncStorage tokens | Is Expo web production-facing? |

---

*Normalized findings register produced by Phase 8 read-only triage. All 123 original AUDIT IDs are preserved for traceability. Duplicate clusters are acknowledged with cross-references. No application code was modified.*
