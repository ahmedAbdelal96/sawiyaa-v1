# Remaining Risk Register — Phase 9a Security First Fix Sprint

**Phase:** 9a
**Created:** 2026-06-17
**Sprint:** 1
**Scope:** P0 fixes only — P1/P2/P3 risks documented here for tracking

---

## Documented Gaps (Not Fixed in Sprint 1)

### 🔴 AUDIT-033 — Web Refresh Token HttpOnly + Response Body — ✅ FIXED + VERIFIED in Sprint 1-R3 + R3.1 + R3.2

**Sprint 1 (R1) state:** `httpOnly: true` added to js-cookie's `Cookies.set()` — this was ineffective (browser ignores httpOnly when set via JavaScript).

**Sprint 1-R2 correction:** Backend now sets `Set-Cookie: fayed_refresh_token=...; HttpOnly; Secure; SameSite=Strict` via `res.cookie()` in all auth controllers. Frontend `tokenManager.setTokens()` no longer overwrites the server-set httpOnly cookie. `AuthRequestContextMiddleware` already reads `fayed_refresh_token` from cookies.

**Sprint 1-R3 hardening + R3.1 corrections:** `WebResponseHardeningInterceptor` deletes `refreshToken` and `refreshTokenExpiresAt` from the JSON response body for direct browser auth requests. Detection: `X-Client-Platform: web` header (primary, explicit frontend signal on direct browser API calls) + `Origin` header matching known Fayed origins (fallback for direct browser calls). Browser JavaScript at login/refresh time cannot read the refresh token from `fetch(...).then(r => r.json())`. The `httpOnly` cookie continues to carry the real refresh token on `Set-Cookie` — independent of response body.

**Sprint 1-R3.2 CORS fix:** `x-client-platform` added to CORS `allowedHeaders` in `main.ts` — enables the header for cross-domain API deployments.

**Three-tier architecture (R3.2 clarification):**
- **Tier 1 — Direct browser auth (hardened):** `httpClient` sends `X-Client-Platform: web` on all requests. Backend interceptor strips `refreshToken` from response body. Browser JS cannot read it.
- **Tier 2 — Next.js server-side refresh (trusted internal, not hardened):** `server.ts` intentionally does NOT forward `X-Client-Platform` to backend. This is required: `server.ts` reads `tokens.refreshToken` from the backend response body to set the `httpOnly` cookie server-side (`cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {...SECURE_COOKIE_OPTIONS})`). If `refreshToken` were stripped, line 323 in `server.ts` would return `null` and refresh would fail. Browser only sees `{ success: true }` from `POST /api/auth/refresh` — the refresh token is consumed by Next.js server-side code before the browser can access it.
- **Tier 3 — Native/mobile (unchanged):** No `X-Client-Platform` header sent. `isWebClient()` returns `false`. Full token body returned. Used for SecureStore/AsyncStorage.

**SSR status:** Access token remains readable by js-cookie (not httpOnly) — SSR token reader gap is **not applicable to the refresh token**. Access token is intentionally non-httpOnly for payment redirect compatibility (Paymob/Stripe return to app). Refresh token is httpOnly and not needed by SSR — browser sends it automatically via `credentials: "include"` on refresh calls.

**Status:** ✅ RESOLVED + VERIFIED (Sprint 1-R3 + R3.1 + R3.2)

---

### 🔴 AUDIT-032 — Mobile Practitioner API Unverified

**Risk:** The mobile app may consume `GET /public/practitioners` responses and expect an `id` field. Removing `id` from the backend DTO could cause mobile TypeScript errors or runtime issues if mobile has its own type definitions for this response.

**Severity:** P1 if mobile is affected, P2 if mobile uses a separate API layer

**Required before production:** Audit mobile practitioner listing and profile screens. Check `fayed-mobile` for `PublicPractitioner` types and API consumption of the public practitioners endpoint.

**Owner:** Mobile team

---

### 🟡 AUDIT-024 — No Push Notifications on Instant Booking Accept/Reject

**Risk:** Patients waiting for instant booking request outcomes receive no push notification. They must manually poll the app to check if their request was accepted or rejected.

**Severity:** P1

**Required before production:** Add notification dispatch to `accept-instant-booking-request.use-case.ts` and `reject-instant-booking-request.use-case.ts`. Emit domain events or call `OperationalNotificationService.notifyInstantBookingAccepted/Rejected`.

**Owner:** Backend

---

### 🟡 AUDIT-030 — No Cron Driver for Instant Booking Request Expiration

**Risk:** `PENDING` instant booking requests past their TTL are only expired lazily (on access). Requests that are never accessed remain `PENDING` indefinitely, creating operational inconsistency.

**Severity:** P1

**Required before production:** Add `@Cron('*/30 * * * *')` job to `InstantBookingModule` that calls `ExpireInstantBookingRequestUseCase` for all `PENDING` requests where `expiresAt < now`.

**Owner:** Backend

---

## P1 Risks Not Addressed (Planned for Subsequent Waves)

| ID | Title | Severity | Wave |
|----|-------|----------|------|
| AUDIT-034 | Practitioner support ticket endpoints bypass OTP verification | P1 | Wave 0–1 |
| AUDIT-035 | Practitioner financial operations bypass OTP verification | P1 | Wave 0–1 |
| AUDIT-036 | Login failures not security-audit logged | P1 | ✅ Fixed — Phase 9b Sprint 2: all 4 primary login use cases (admin, patient, practitioner password, practitioner OTP) now log via `SecurityAuditService.logAsync` on all failure and success paths |
| AUDIT-037 | Practitioner approval/rejection not security-audit logged | P1 | ✅ Fixed — Phase 9b Sprint 2: `ApprovePractitionerApplicationUseCase` and `RejectPractitionerApplicationUseCase` now log via `SecurityAuditService.logAsync` |
| AUDIT-038 | Manual payout not security-audit logged | P1 | ✅ Fixed — Phase 9b Sprint 2: `AdminPractitionerManualPayoutsController.record()` now logs via `SecurityAuditService.logAsync` |
| AUDIT-039 | No account lockout after repeated failed login attempts | P1 | 🔴 Blocked — requires DB schema change (User model lockout fields); rate limiting partial mitigation |
| AUDIT-040 | No global JWT auth guard — new endpoints default to unprotected | P1 | Wave 0 |
| AUDIT-041 | Practitioner login missing deviceId | P1 | 🟡 Implemented — Verification Pending (Phase 9b Sprint 4): mobile+backend done; web does not send deviceId |
| AUDIT-043 | Web session access token 7-day expiry | P1 | Wave 1 |
| AUDIT-044 | `__DEV__` URL allowlist could be active in production | P1 | Wave 0 |
| AUDIT-045 | AdminPermissionGate not auto-applied to all admin pages | P1 | Wave 0–1 |
| AUDIT-046 | Web patient/practitioner layouts don't check account-state | P1 | Wave 1 |
| AUDIT-047 | GeneralChatConversationsController lacks RolesGuard | P1 | Wave 0 |
| AUDIT-053 | Room name/URL exposed in blocked join contract | P1 | Wave 0 |
| AUDIT-054 | Daily room expiry mismatch | P1 | Wave 1 |
| AUDIT-055 | DISPLAY_NAME_MATCH fallback enables attendance fraud | P1 | Wave 1 |
| AUDIT-057 | Push payload includes PHI fields | P1 | 🟡 Implemented — Verification Pending — Phase 9b Sprint 3: threadId, relatedEntityType, category, relatedEntityId, scheduledStartAt, packagePlanTitle removed from push payloads; `{{sessionAt}}` removed from push body via push-specific i18n keys. Runtime verification pending. |
| AUDIT-058 | Notification routePath bypasses Messages Shell | P1 | Wave 1 |
| AUDIT-062 | APP_URL falls back to localhost:3000 in push | P1 | 🟡 Implemented — Verification Pending — Phase 9b Sprint 3: app.config.ts removed localhost fallback; sweeper uses ConfigService DI; env.schema.ts rejects localhost in production. Runtime verification pending. |
| AUDIT-067 | Care-chat notifications bypass Messages Shell | P1 | Wave 1 |
| AUDIT-068 | `admin/care-chat/[id]` missing AdminPermissionGate | P1 | ✅ Fixed — Phase 9b Sprint 1 Wave 0 Batch 1 (frontend gate added; backend guard already existed) |
| AUDIT-069 | `admin/sessions/runtime-inspection` missing gate | P1 | ✅ Fixed — Phase 9b Sprint 1 Wave 0 Batch 1 (frontend gate added; backend guard already existed) |
| AUDIT-070 | AdminNotificationDetailsPanel HTML render gap | P1 | Wave 1 |
| AUDIT-072 | Join token in URL query parameter | P1 | Wave 0 |
| AUDIT-075 | Runtime inspector has no audit log | P1 | Wave 1 |
| AUDIT-102 | `admin/refund-policies` missing AdminPermissionGate + weak backend | P1 | ✅ Fixed — Phase 9b Sprint 1 Wave 0 Batch 1 (frontend gate + backend `PermissionsGuard` + method-level permissions: `REFUNDS_RETRY` for GETs, `REFUNDS_APPROVE` for writes) |
| AUDIT-103 | `admin/notifications/[id]` missing gate | P1 | ✅ Fixed — Phase 9b Sprint 1 Wave 0 Batch 1 (frontend gate added; backend guard already existed) |
| AUDIT-105 | Raw payment status enum in success screen | P1 | Wave 1 |
| AUDIT-106 | Raw support category enum in support/new.tsx | P1 | Wave 1 |
| AUDIT-107 | formatNotificationType bypasses i18n | P1 | Wave 1 |
| AUDIT-116 | formatRequirementLabel renders raw keys | P1 | Wave 1 |

**Count:** 33 P1 risks remaining from Phase 8 normalized register.

---

## P2 Risks Not Addressed

| ID | Title | Severity |
|----|-------|----------|
| AUDIT-002 | AdminSessionListBadge missing `presentationStatus` prop | P2 |
| AUDIT-003 | Admin refund panel unconstrained amount | P1 (launch gate, not sprint gate) |
| AUDIT-004 | Settlement mark-paid/failed no confirmation | P1 (launch gate) |
| AUDIT-005 | Hardcoded EGP/USD currency validation | P2 |
| AUDIT-006 | Manual payout bypasses MFA | P2 |
| AUDIT-007 | Cancel preview raw backend values | P2 |
| AUDIT-008 | `pendingStill` i18n key missing | P2 |
| AUDIT-009 | Payment return route in public group | P2 |
| AUDIT-011 | `flowType` absent from AdminSessionListItem | P1 (launch gate) |
| AUDIT-012 | Patient session list raw `presentationStatus` | P1 (launch gate) |
| AUDIT-013 | Practitioner session list raw `presentationStatus` | P1 (launch gate) |
| AUDIT-014 | `mapSessionBadge` missing `UNDER_REVIEW` case | P1 (launch gate) |
| AUDIT-015 | Practitioner timezone not displayed | P2 |
| AUDIT-016 | Slot conflict not pre-checked | P1 |
| AUDIT-017 | presentationStatus i18n without fallback (web) | P2 |
| AUDIT-018 | Frozen price stored but not retrieved | P1 |
| AUDIT-019 | Availability editor ignores existing bookings | P2 |
| AUDIT-020 | No price visibility in instant booking | P1 |
| AUDIT-021 | Availability editor no awareness of existing bookings | P2 |
| AUDIT-022 | No booking acceptance confirmation UI | P1 |
| AUDIT-023 | No admin surface for instant booking management | P2 |
| AUDIT-025 | No practitioner availability visibility in admin | P2 |
| AUDIT-026 | No admin surface for instant booking oversight | P1 |
| AUDIT-027 | formatModeLabel raw string fallback | P2 |
| AUDIT-028 | formatFlowTypeLabel raw string fallback | P2 |
| AUDIT-029 | Presence TTL stale ONLINE records | P2 |
| AUDIT-042 | Android SecureStore software-backed | P1 |
| AUDIT-043 | Web access token 7-day expiry | P1 |
| AUDIT-046 | Web layouts don't check account-state | P1 |
| AUDIT-049 | OTP verification not logged | P2 |
| AUDIT-050 | Password reset not logged | P2 |
| AUDIT-051 | No global throttle guard | P2 |
| AUDIT-052 | Silent logout on refresh expiry | P2 |
| AUDIT-059 | Unread count only counts IN_APP | P2 |
| AUDIT-064 | Expo push token without EAS project ID | P2 |
| AUDIT-065 | Notification routing role fallback | P2 |
| AUDIT-066 | NormalizedInboxItem navigates without ownership validation | P2 |
| AUDIT-071 | JSON copy only redacts URLs, not userId | P2 |
| AUDIT-073 | No HTML sanitization on notification content | P2 |
| AUDIT-076 | SESSION_JOIN_LAG_MINUTES = 0 | P2 |
| AUDIT-078 | Support status enum rendered without i18n | P2 |
| AUDIT-080 | Notification href falls back to "/" | P2 |
| AUDIT-082 | Push registration stored without timestamp | P2 |
| AUDIT-083 | Notification deduplication uses in-memory ref | P2 |
| AUDIT-084 | Cold-start notification conflict with OS center | P2 |
| AUDIT-086 | Missing JOINABLE/IN_PROGRESS i18n keys | P2 |
| AUDIT-087 | Zero `loading.tsx` across 80+ routes | P2 |
| AUDIT-088 | Toast provider hardcoded `dir="rtl"` | P2 |
| AUDIT-089 | ChatKit hardcoded `dir="ltr"` | P2 |
| AUDIT-090 | Admin back arrows missing RTL flip | P2 |
| AUDIT-091 | AppErrorFallback logs error.stack | P2 |
| AUDIT-092 | AppErrorFallback identical for all error types | P2 |
| AUDIT-093 | AdminPermissionGate raw "Loading..." text | P2 |
| AUDIT-094 | No PatientPermissionGate/PractitionerPermissionGate | P2 |
| AUDIT-095 | `providerRoomRef` exposed in runtime inspector | P1 pending verification |
| AUDIT-096 | userId masking inconsistent | P2 |
| AUDIT-097 | Inline Arabic/English ternary | P2 |
| AUDIT-098 | FinancialReconciliation toLowerCase() on enums | P2 |
| AUDIT-100 | Payment EXPIRED state lacks retry CTA | P2 |
| AUDIT-104 | SessionLaneWorkspace raw `presentationStatus` | P2 |
| AUDIT-109 | Patient notification typeSlug coverage gap | P2 |
| AUDIT-111 | No loading/error route files in mobile | P2 |
| AUDIT-112 | cleanReasonText limited prefix handling | P2 |
| AUDIT-113 | Credential fileUrl raw text display | P2 |
| AUDIT-114 | onboarding.tsx accessible via direct navigation | P2 |
| AUDIT-115 | I18nManager.isRTL instead of getAppDirection() | P2 |
| AUDIT-117 | Messages inbox stale data on lane error | P2 |

**Count:** 64 P2/INFO risks remaining.

---

## Summary

| Category | Count | Sprint 1 Addressed | Sprint 1-R2 Addressed | Sprint 1-R3 + R3.1 + R3.2 Addressed |
|----------|-------|-------------------|----------------------|------------------------|
| P0 release blockers | 4 | ✅ All 4 initially marked resolved | 3 fully resolved; 1 partial (AUDIT-031 design gap) | 1 reclassified / accepted risk (AUDIT-031); 1 verified hardening (AUDIT-033); 1 CORS fix added (AUDIT-033 R3.2) |
| P1 launch blockers | 33 | ❌ Not in sprint scope | ❌ Not in sprint scope | ❌ Not in sprint scope |
| P2 rollout blockers | 64 | ❌ Not in sprint scope | ❌ Not in sprint scope | ❌ Not in sprint scope |
| **Total remaining** | **97** | **4 (P0s only)** | **97 + 1 partial** | **97 + 0 partial** |

---

## Recommended Next Steps

1. **Immediate (before pilot):** Audit mobile practitioner API types for AUDIT-032 impact
2. **Immediate (before pilot):** Verify SSR page renders with httpOnly cookies — implement SSR token reader if broken
3. **Wave 0 (concurrent with pilot):** Fix remaining 33 P1 auth/permission/notification issues
4. **Wave 1 (pre-production):** Fix i18n gaps, instant booking infrastructure, admin surfaces
5. **Wave 2 (pre-broad rollout):** Fix all P2 findings

---

*Remaining risk register produced by Phase 9a Sprint 1. P0 fixes confirmed — all release gates lifted. No P1/P2/P3 changes made.*
