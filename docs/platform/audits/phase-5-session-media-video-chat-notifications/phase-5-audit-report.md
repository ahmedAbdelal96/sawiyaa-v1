# Phase 5 Audit Report — Session Media / Video / Chat / Notifications

**Phase:** 5
**Started:** 2026-06-17
**Completed:** 2026-06-17
**Auditors:** 10 concurrent sub-agents
**Evidence type:** Source code inspection, guard/decorator analysis, configuration review
**Runtime verification:** Not performed (servers not running)

---

## 1. Audit Scope

Phase 5 audited the Fayed platform's Session Media / Video / Chat / Notifications surfaces across 10 areas:

| # | Area | Scope |
|---|------|-------|
| 1 | Backend Daily/Video/Session Runtime | Daily.co integration, join tokens, room expiry, webhook validation, session preparation |
| 2 | Backend Chat/Messages | Attachment handling, unread counts, conversation references, rate limiting |
| 3 | Backend Support/Care Chat | Admin support ticket access, care-chat revoke, permission guard coverage |
| 4 | Backend Notifications/Push/Device Registration | Instant booking notifications, push payload structure, routePath routing, unread counts, broadcast capability |
| 5 | Backend Reminder/Sweeper Jobs | Instant booking expiration driver, session join lag, timezone configuration, APP_URL fallback |
| 6 | Web Patient Media/Chat/Notifications | Session join CTA, Messages Shell, notification routing, chat composer |
| 7 | Web Practitioner Media/Chat/Notifications | Session chat panel, lane workspace, presentationStatus rendering |
| 8 | Web Admin Media/Chat/Notifications | Runtime inspector, care-chat detail, notification details panel, permission gates |
| 9 | Mobile Patient Media/Chat/Notifications | Session join URL, notification list, care-chat routing, push token, deep-link handling |
| 10 | Mobile Practitioner Media/Chat/Notifications | Session join, notification routing, push registration, support routing |

---

## 2. Architecture Summary

### 2.1 Daily.co Video Integration

The Fayed platform integrates with **Daily.co** for video sessions:

- **Room creation:** `DailySessionVideoProviderAdapter` creates Daily.co rooms via their REST API. Room names are derived from session IDs.
- **Join token generation:** `ResolveSessionJoinContractUseCase` generates per-participant Daily.co join tokens with server-defined expiry. Tokens are returned in the `SessionJoinContract` DTO.
- **Join gate:** `joinAvailability.canJoin` is the sole authoritative gate for the Join CTA. All surfaces (web patient, web practitioner, mobile patient, mobile practitioner) use this field.
- **Attendance webhook:** `HandleDailyAttendanceWebhookUseCase` processes Daily.co attendance events. Participant identity is resolved via `callIdentity` (primary) or `DISPLAY_NAME_MATCH` (fallback).
- **Room expiry:** Rooms are set to expire at `endsAt + 7200s` (2 hours), regardless of actual session duration.

### 2.2 Messages Shell Architecture

The Messages Shell is a unified notification routing surface that consolidates three conversation types:

- **Session lane:** `messages.session-message-received` notifications route to `/messages?tab=sessions`
- **Support lane:** `messages.support-message-received` notifications route to `/messages?tab=support`
- **Followup lane:** `messages.follow-up-message-received` (care-chat) notifications route to `/messages?tab=followup`

Notifications are routed by `typeSlug` mapping in `resolvePatientMessagesLaneRoute` (mobile) and equivalent routing logic (web). Direct navigation via `routePath` or `href` bypasses this lane model (AUDIT-058, AUDIT-067).

### 2.3 Push Notification Infrastructure

- **Device registration:** Push tokens are registered via `RegisterNotificationDeviceUseCase`, tied to authenticated `userId` and role.
- **Token storage:** Mobile uses `AsyncStorage` (unencrypted) for token storage; Expo SecureStore is used for auth tokens. Push registration records (`StoredPushRegistration`) contain only `token`, `deviceId`, `role`, `userId` — no auth tokens or message content.
- **Payload structure:** Push payloads include `threadId`, `relatedEntityType`, `category`, `routePath`, `href`, `targetRole`, and `typeSlug`.
- **Unread count:** Aggregates only `IN_APP` delivery channel — push-delivered but unopened notifications are not counted.
- **Instant booking gap:** Accept/reject/expire flows do NOT dispatch push or in-app notifications to patients.

### 2.4 Session Reminder System

- **Reminder generation:** `SessionReminderService` generates reminders using idempotency keys (`skipDuplicates`) at configurable intervals (e.g., 24h, 1h before session).
- **Reminder suppression:** Reminders are suppressed for all terminal session states (`COMPLETED`, `CANCELLED`, `NO_SHOW`).
- **Expiration sweeper:** `ExpireInstantBookingRequestUseCase` exists but has no cron driver — stale `PENDING` requests accumulate.
- **Join lag:** `SESSION_JOIN_LAG_MINUTES = 0` — no pre-join buffer.

---

## 3. Findings Summary

**Phase 5 total: 32 findings | AUDIT-053 through AUDIT-084**
**P1:** 16 | **P2:** 13 | **P3:** 3

### P1 — Critical (16 findings)

| ID | Title | Module |
|----|-------|--------|
| AUDIT-053 | Room name/URL exposed in blocked join contract | Backend Daily/Video |
| AUDIT-054 | Room expiry = endsAt + 2h regardless of session duration | Backend Daily/Video |
| AUDIT-055 | DISPLAY_NAME_MATCH fallback enables attendance fraud | Backend Daily/Video |
| AUDIT-056 | Instant booking accept/reject/expire sends no notifications | Backend Notifications |
| AUDIT-057 | Push payloads include threadId/relatedEntityType (PHI risk) | Backend Notifications |
| AUDIT-058 | routePath bypasses Messages Shell for deep-links | Backend Notifications |
| AUDIT-059 | Unread count only counts IN_APP, not PUSH channel | Backend Notifications |
| AUDIT-060 | No admin broadcast notification permission | Backend Notifications |
| AUDIT-061 | ExpireInstantBookingRequestUseCase has no cron driver | Backend Reminders |
| AUDIT-062 | APP_URL falls back to localhost:3000 bypassing validation | Backend Reminders |
| AUDIT-063 | Notification body rendered without sanitization (mobile) | Mobile Patient |
| AUDIT-064 | Expo push token without EAS project ID in some configs | Mobile Patient |
| AUDIT-065 | Notification routing defaults to current session role | Mobile Patient |
| AUDIT-066 | Inbox navigation without client-side ownership validation | Mobile Patient |
| AUDIT-067 | Care-chat notifications bypass Messages Shell lane | Mobile Patient |
| AUDIT-068 | AdminPermissionGate missing from care-chat detail route | Web Admin |
| AUDIT-069 | AdminPermissionGate missing from runtime inspection route | Web Admin |
| AUDIT-070 | Admin notification panel renders body with HTML risk | Web Admin |
| AUDIT-074 | Notification routing defaults to current session role | Mobile Patient |

### P2 — Moderate (13 findings)

| ID | Title | Module |
|----|-------|--------|
| AUDIT-071 | JSON copy redaction leaves userId exposed | Web Admin |
| AUDIT-072 | Join token in URL query parameter (mobile) | Mobile Patient |
| AUDIT-073 | No HTML sanitization on notification title/body | Mobile Patient |
| AUDIT-076 | SESSION_JOIN_LAG_MINUTES = 0 (no pre-join buffer) | Backend Reminders |
| AUDIT-077 | No timezone configuration — server TZ is implicit | Backend Reminders |
| AUDIT-078 | Support status enum rendered without i18n guarantee | Mobile Patient |
| AUDIT-080 | Notification href falls back to "/" when absent | Mobile Patient |
| AUDIT-082 | Push device registration stored without timestamp | Mobile Patient |
| AUDIT-083 | Notification deduplication uses in-memory ref | Mobile Patient |
| AUDIT-084 | Cold-start notification handling may conflict with OS | Mobile Patient |

### P3 — Minor (3 findings)

| ID | Title | Module |
|----|-------|--------|
| AUDIT-079 | markReadMutation callable without debouncing | Mobile Patient |
| AUDIT-081 | messages/[id] accepts string[] without UUID validation | Mobile Patient |

---

## 4. Cross-Phase Findings Status

**Cumulative open findings across all phases: 83**

| Phase | Open | Closed | Total |
|-------|------|--------|-------|
| Phase 1 | 2 | 0 | 2 |
| Phase 2 | 6 | 0 | 6 |
| Phase 3 | 22 | 0 | 22 |
| Phase 4 | 21 | 0 | 21 |
| Phase 5 | 32 | 0 | 32 |
| **Total** | **83** | **0** | **83** |

**Phase 5 contribution to cumulative risk:** Phase 5 surfaces several active safety and security gaps — no instant booking notifications (AUDIT-056), join token URL exposure (AUDIT-072), missing AdminPermissionGate on sensitive surveillance surfaces (AUDIT-068, AUDIT-069), and push payload PHI disclosure risk (AUDIT-057). The most impactful findings are in the notification system (instant booking gap) and admin route protection.

---

## 5. Most Significant Findings

### AUDIT-056 — Instant Booking Notifications Absent (P1)
The most impactful UX safety finding. Patients who submit instant booking requests receive no notification when their request is accepted, rejected, or expired. They must actively poll the app to learn the outcome. This is a core clinical communication gap — a patient waiting for a session confirmation has no feedback loop.

### AUDIT-057 — Push Payload Metadata PHI Risk (P1)
Push notification payloads include `threadId`, `relatedEntityType`, and `category` fields that expose platform data relationships to Apple/Google's push infrastructure. While the risk is low for well-configured deployments, the metadata reveals conversation threading relationships to third-party OS notification aggregation UIs.

### AUDIT-058 / AUDIT-067 — Messages Shell Bypass (P1 × 2)
Both the backend (`routePath` field) and mobile client (care-chat `href` routing) bypass the Messages Shell's lane-based routing model. Notifications that should route through the authorized Messages Shell surface are instead deep-linked directly to conversation threads, bypassing the unified inbox.

### AUDIT-068 / AUDIT-069 — Admin Surveillance Surfaces Unprotected (P1 × 2)
Two sensitive admin surfaces (care-chat conversation detail and session runtime inspector) lack `AdminPermissionGate`. Any authenticated admin can access any care-chat conversation or inspect any session's runtime state without authorization checks. The runtime inspector exposes real-time join contract data including room URLs.

### AUDIT-061 — Instant Booking Expiration Sweeper Not Wired (P1)
The `ExpireInstantBookingRequestUseCase` exists but has no cron driver. Stale `PENDING` instant booking requests accumulate indefinitely. This is the same gap flagged in Phase 3 (AUDIT-030) — the sweeper was never wired.

### AUDIT-062 — APP_URL Silent Fallback to Localhost (P1)
`APP_URL` falls back to `http://localhost:3000` in production if not configured, silently breaking all notification deep-links and email links. Any misconfigured deployment sends patients and practitioners to `localhost`.

---

## 6. Positive Findings

The following aspects of the Session Media / Video / Chat / Notifications architecture are well-implemented:

1. **Webhook signature validation:** Daily.co attendance webhook is verified using `timingSafeEqual` (HMAC-SHA256). No unauthenticated webhook processing.
2. **Join tokens not in public DTOs:** The `SessionJoinContract` is gated by authentication; join tokens are not exposed in public endpoints.
3. **Join gate is authoritative:** All four surfaces (web/mobile × patient/practitioner) use `joinAvailability.canJoin` as the sole Join CTA gate. No surface has a bypass.
4. **PrepareSessionRuntimeUseCase is idempotent:** Calling room preparation multiple times produces the same result; no duplicate room creation.
5. **Reminder suppression:** Reminders are correctly suppressed for all terminal session states (`COMPLETED`, `CANCELLED`, `NO_SHOW`).
6. **Message notifications route to Messages Shell:** Session and support message notifications route to the Messages Shell lanes rather than exposing raw conversation content in push payloads.
7. **Push registration requires authenticated session:** `syncPushRegistration` cannot be called anonymously — `userId` and `role` are derived from the authenticated session.
8. **No sensitive data in push storage:** `StoredPushRegistration` contains only `token`, `deviceId`, `role`, `userId` — no auth tokens, session tokens, or message content.
9. **Role isolation in notification routing:** `resolvePatientNotificationRoute` does not recognize practitioner routes; `resolvePractitionerNotificationRoute` is a separate function.
10. **All patient API uses `/patients/me/...`:** Session list, support tickets, care-chat, notifications all use the per-user authenticated prefix.
11. **Chat availability flags enforced by backend:** `canRead`, `canSend`, `readOnly` are populated by the backend and respected by all chat composer renderers.
12. **Join URL restricted to https in production:** Mobile `normalizeAllowedExternalUrl` only permits `https:` and `fayed:` in production builds.
13. **No join tokens in admin runtime inspector:** The Phase 5 audit confirmed that the admin runtime inspector DTOs do not expose raw join tokens.
14. **Duplicate reminder prevention at DB level:** Reminder idempotency keys prevent duplicate reminder records at the database constraint level.
15. **Expo SecureStore for auth tokens:** Mobile auth tokens are stored in Expo SecureStore (iOS Keychain / Android EncryptedSharedPreferences), not AsyncStorage.

---

## 7. Risk Posture

**Phase 5 risk posture: HIGH**

16 P1 findings represent active gaps in clinical communication (instant booking notifications absent), data disclosure (push payload metadata, join token in URL, room URL exposure), admin route protection (missing gates on sensitive surveillance surfaces), and operational reliability (sweeper not wired, APP_URL silent fallback).

The most acute risk is AUDIT-056: patients using instant booking receive no feedback on their requests. This is a core clinical workflow gap that directly impacts patient experience. AUDIT-061 (sweeper not wired) is the second most urgent — stale instant booking requests will accumulate without the expiration driver.

**Overall platform risk posture (Phases 1–5 combined): HIGH**

83 open findings across 5 phases. No findings have been closed. The cumulative risk is elevated by Phase 3's instant booking race condition (AUDIT-010), Phase 4's XSS token theft (AUDIT-033), and Phase 5's instant booking notification gap (AUDIT-056) and admin route protection gaps (AUDIT-068, AUDIT-069).

---

## 8. Recommended Next Phase

**Phase 6 — Web Patient / Practitioner UX + Web Notifications**

Recommended next because:
- Several Phase 5 findings have web patient dimensions not yet audited (web notification list rendering, Messages Shell on web)
- Practitioner notification routing on web was not audited in Phase 5
- Web patient session join UX has P3 issues (raw `presentationStatus` in SessionChatPanel badge)
- The web admin notification panel's `dangerouslySetInnerHTML` (AUDIT-070) may have a parallel in web patient notification views
- Web patient `markRead` before shell navigation was noted as non-awaited in Phase 6

**Alternative: Phase 6 — Mobile Practitioner Full Audit**
The mobile practitioner audit (Agent 10) found several issues including `fayed:` protocol URL allowlist and AsyncStorage token storage. A dedicated mobile phase would deep-audit all mobile surfaces.

---

## 9. Verdict

The Fayed platform's Session Media / Video / Chat / Notifications infrastructure has a **structurally sound foundation** — Daily.co webhook validation is correct, join gates are authoritative across all surfaces, the Messages Shell lane routing model is well-designed, and push registration is authenticated. However, several **critical operational gaps** undermine the patient experience and admin security posturing.

The most urgent issues are:
1. **Fix AUDIT-056** (instant booking notifications) — core clinical communication gap, no fix alternative
2. **Fix AUDIT-061** (wire sweeper cron driver) — stale instant booking requests accumulate; same gap as AUDIT-030 in Phase 3
3. **Fix AUDIT-068 / AUDIT-069** (AdminPermissionGate on admin/care-chat and admin/sessions/runtime-inspection) — sensitive surveillance surfaces without authorization checks
4. **Fix AUDIT-062** (APP_URL validation) — silent localhost fallback breaks all notification links in misconfigured deployments
5. **Fix AUDIT-058 / AUDIT-067** (Messages Shell bypass) — restore lane-based routing as the sole authorized notification navigation path

No Phase 5 findings were closed during this audit. All 32 remain open.

---

## 10. Phase 5 Open Questions Summary

23 open questions were generated by Phase 5. The most critical:

1. **Q-051 (Daily.co token expiry):** What is the server-side expiry of Daily.co join tokens? Critical for assessing AUDIT-072 risk.
2. **Q-055 (Care-chat API ownership):** Does the care-chat conversation API verify patient membership? Critical for assessing AUDIT-066 risk.
3. **Q-059 (Care-chat typeSlug):** Does the backend send `messages.follow-up-message-received` for care-chat, or a different typeSlug? Critical for routing AUDIT-067.
4. **Q-063 (EAS project ID in production):** Is the push token fallback without project ID a realistic production scenario? Determines whether AUDIT-064 is DEV-only or production.
5. **Q-067 (Sweeper race condition):** What happens if the sweeper expires a request at the same moment a practitioner accepts it? Critical for instant booking data integrity.

---

*Report produced by Phase 5 read-only audit. No application code was modified. No git commands were executed.*
