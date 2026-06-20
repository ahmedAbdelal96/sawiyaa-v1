# Phase 5 Findings Register — Session Media / Video / Chat / Notifications

**Phase:** 5
**Started:** 2026-06-17
**Completed:** 2026-06-17
**Findings:** AUDIT-053 through AUDIT-084
**Total findings:** 32
**P1:** 16 | **P2:** 13 | **P3:** 3
**Open:** 32 | **Closed:** 0

---

## Finding Template

Each finding follows this structure:

```
### AUDIT-XXX: [Title]

- **Severity:** P0 / P1 / P2 / P3
- **Type:** Security / Privacy / Safety / Functional / Data Exposure / Positive
- **Module:** [Backend|Web|Mobile] [Area]
- **Evidence:** [File:Line] or [Route]
- **Affected surfaces:** [Comma-separated list]
- **Description:** [What the finding is]
- **Risk:** [Why this matters]
- **Root cause hypothesis:** [What likely caused this]
- **Recommended action:** [One-line next step]
- **Do not fix yet:** [Yes/No — per audit brief]
```

---

## P1 Findings

---

### AUDIT-053: Room name and URL exposed in session join contract blocked response

- **Severity:** P1
- **Type:** Data Exposure
- **Module:** Backend Daily/Video/Session Runtime
- **Evidence:** `resolve-session-join-contract.use-case.ts:130-148`
- **Affected surfaces:** `SessionJoinContract` DTO when `canJoin = false`
- **Description:** When `canJoin` is false, the blocked contract response still includes `roomName` and `roomUrl` fields (both provider-supplied URL strings), exposing internal room identifiers to the client even when the patient cannot join.
- **Risk:** Internal room naming conventions or infrastructure details are disclosed to patients who cannot join. An attacker who queries the join endpoint for any session (even one they cannot join) learns the room URL.
- **Root cause hypothesis:** The DTO is returned uniformly regardless of `canJoin` state; the room fields are not gated on `canJoin === true`.
- **Recommended action:** Return null/undefined for `roomName` and `roomUrl` in the blocked contract response.
- **Do not fix yet:** Yes

---

### AUDIT-054: Daily room expiry set to session endsAt + 7200s regardless of session duration

- **Severity:** P1
- **Type:** Security
- **Module:** Backend Daily/Video/Session Runtime
- **Evidence:** `daily-session-video-provider.adapter.ts:55`
- **Affected surfaces:** Daily.co room creation, session video infrastructure
- **Description:** Room expiry is calculated as `endsAt + 7200s` (2 hours) rather than being derived from actual session duration. Short sessions (e.g., 15-minute instant bookings) result in rooms that remain open for 2+ hours after the session ends.
- **Risk:** Unused rooms remain active for extended periods post-session, potentially allowing unauthorized re-entry or resource accumulation. The 2-hour buffer is arbitrary and not tied to actual clinical workflow.
- **Root cause hypothesis:** A hardcoded buffer was applied uniformly for all session types; instant booking sessions (which may be shorter) inherit the same expiry as scheduled sessions.
- **Recommended action:** Derive room expiry from actual session duration plus a minimal safety buffer (e.g., `endsAt + 15min`).
- **Do not fix yet:** Yes

---

### AUDIT-055: DISPLAY_NAME_MATCH fallback in webhook participant identity uses unsafe comparison

- **Severity:** P1
- **Type:** Security
- **Module:** Backend Daily/Video/Session Runtime
- **Evidence:** `handle-daily-attendance-webhook.use-case.ts:246-318`
- **Affected surfaces:** Daily.co attendance webhook handler
- **Description:** When callIdentity lookup fails, the webhook falls back to matching participants by `displayName`. A practitioner with the same display name as the booked practitioner could be matched incorrectly, enabling attendance fraud.
- **Risk:** If two practitioners share the same display name (possible in development or through name collision), a different practitioner could join and their attendance would be recorded for the wrong session.
- **Root cause hypothesis:** The fallback `DISPLAY_NAME_MATCH` was added as a convenience for edge cases but introduces a weak identity signal that bypasses the primary callIdentity lookup.
- **Recommended action:** Remove `DISPLAY_NAME_MATCH` fallback; require primary callIdentity lookup to succeed or reject the webhook.
- **Do not fix yet:** Yes

---

### AUDIT-056: Instant booking accept/reject/expire sends NO push or in-app notifications to patient

- **Severity:** P1
- **Type:** Safety
- **Module:** Backend Notifications/Push
- **Evidence:** `instant-booking/use-cases/` — no notification dispatch found in accept/reject/expire flows
- **Affected surfaces:** Instant booking patient experience
- **Description:** When a practitioner accepts, rejects, or when an instant booking request expires, no push notification or in-app notification is sent to the patient. The patient has no way to know their request was acted upon unless they are actively polling the app.
- **Risk:** Patients submitting instant booking requests receive no feedback on their requests. A rejected or expired request leaves the patient waiting indefinitely with no communication. This is a core UX gap in the instant booking flow.
- **Root cause hypothesis:** Notification dispatch was not implemented in the instant booking accept/reject/expire use cases.
- **Recommended action:** Implement notification dispatch in all three instant booking flows (accept/reject/expire) targeting the patient.
- **Do not fix yet:** Yes

---

### AUDIT-057: Push notification payloads include `threadId`, `relatedEntityType`, and `category` metadata

- **Severity:** P1
- **Type:** Privacy
- **Module:** Backend Notifications/Push
- **Evidence:** Push payload structure — `threadId`, `relatedEntityType`, `category` fields present
- **Affected surfaces:** APNs/FCM push delivery to patient and practitioner devices
- **Description:** Push notification payloads include structural metadata about the notification's related entity (e.g., `threadId`, `relatedEntityType`). While these fields enable routing, they also reveal information about the platform's internal data relationships to Apple/Google push infrastructure and potentially to OS-level notification aggregation UIs.
- **Risk:** Push notification aggregation interfaces (iOS notification center, Android lock screen) display notification content and may expose these metadata fields. An observer with access to the device's notification log could infer conversation threading relationships.
- **Root cause hypothesis:** Push payloads were designed to carry routing metadata but the fields were not reviewed for PHI/relationship disclosure risk.
- **Recommended action:** Remove `threadId`, `relatedEntityType` from the visible push payload. Use them server-side for routing decisions only; do not include in the APNs/FCM payload sent to the OS.
- **Do not fix yet:** No — **Fixed in Phase 9b Sprint 3**

---

### AUDIT-058: Notification `routePath` bypasses Messages Shell for deep-links to `/messages/{threadId}`

- **Severity:** P1
- **Type:** Security
- **Module:** Backend Notifications/Push
- **Evidence:** `notifications.module.ts` / notification routing configuration
- **Affected surfaces:** All notification click handlers (mobile + web)
- **Description:** The `routePath` field in notification payloads is constructed as `/messages/{threadId}` for session messages. This creates a direct deep-link to the conversation, bypassing the Messages Shell's lane-based routing which is the authorized surface for accessing message threads.
- **Risk:** If `routePath` is used as the primary navigation target (instead of the Messages Shell), patients could potentially access message threads for sessions or conversations they don't have active relationships with, by manipulating the threadId.
- **Root cause hypothesis:** The notification routing was designed with direct thread navigation before the Messages Shell lane model was established, and `routePath` was kept as a legacy field.
- **Recommended action:** Remove direct `/messages/{threadId}` routing from `routePath`. Route all session message notifications through the Messages Shell `/messages?tab=sessions` lane.
- **Do not fix yet:** Yes

---

### AUDIT-059: Unread notification count only counts IN_APP type, not PUSH type

- **Severity:** P1
- **Type:** Functional
- **Module:** Backend Notifications/Push
- **Evidence:** Notification query logic — count filter only on `IN_APP` delivery channel
- **Affected surfaces:** Notification badge counts (mobile tab bar, web header)
- **Description:** The unread notification count query filters only for `deliveryChannel: IN_APP` notifications. Push-delivered notifications that have not been opened in-app are not counted, causing the unread badge to undercount.
- **Risk:** Patients who receive push notifications but don't open the app see no badge, potentially missing notifications entirely. The count is functionally incorrect.
- **Root cause hypothesis:** The query was written before push-delivered notifications existed, or push channel was added later without updating the count aggregation.
- **Recommended action:** Aggregate unread count across all delivery channels (IN_APP + PUSH).
- **Do not fix yet:** Yes

---

### AUDIT-060: Admin has no write permission for broadcast notifications to all users

- **Severity:** P1
- **Type:** Functional
- **Module:** Backend Notifications/Push
- **Evidence:** Permission registry — no broadcast notification permission found
- **Affected surfaces:** Admin notifications panel, broadcast capabilities
- **Description:** There is no admin permission for broadcasting platform-wide notifications to all users. Admins who need to communicate service disruptions or important updates to all patients/practitioners have no tool to do so through the existing notification system.
- **Risk:** Admins cannot send mass notifications through the platform's notification infrastructure. Out-of-band communication (email, social media) is required for urgent updates.
- **Root cause hypothesis:** The broadcast notification feature was never scoped or implemented; no permission or use case exists for it.
- **Recommended action:** Design and implement an admin broadcast notification feature with appropriate permission `NOTIFICATIONS_BROADCAST`.
- **Do not fix yet:** Yes

---

### AUDIT-061: ExpireInstantBookingRequestUseCase has no cron/scheduler driver

- **Severity:** P1
- **Type:** Functional
- **Module:** Backend Reminder/Sweeper Jobs
- **Evidence:** `expire-instant-booking-request.use-case.ts` — no cron decorator or scheduler registration found
- **Affected surfaces:** Instant booking stale request cleanup
- **Description:** The `ExpireInstantBookingRequestUseCase` exists but has no cron driver. The sweeper's `handleExpiredInstantBookingRequests` is defined but not wired to any `@Cron` decorator or scheduler. Stale `PENDING` instant booking requests never expire automatically.
- **Risk:** `PENDING` instant booking requests that are never accepted or expired manually accumulate indefinitely. The instant booking request table grows with stale records. AUDIT-030 (Phase 3) flagged the same gap — no sweeper driver.
- **Root cause hypothesis:** The use case was written but the scheduler integration was deferred.
- **Recommended action:** Register `@Cron` on `handleExpiredInstantBookingRequests` or wire it into the existing scheduler infrastructure.
- **Do not fix yet:** Yes

---

### AUDIT-062: APP_URL falls back to `http://localhost:3000` bypassing Zod validation

- **Severity:** P1
- **Type:** Security
- **Module:** Backend Reminder/Sweeper Jobs
- **Evidence:** `app.config.ts:23` — `APP_URL = z.string().url().default('http://localhost:3000')`
- **Affected surfaces:** Email links, deep links, notification routePath generation
- **Description:** The `APP_URL` environment variable falls back to `http://localhost:3000` when not set. This value is used to construct notification `routePath` and email links. If the fallback activates in a non-development environment (e.g., misconfigured deployment), all notification links point to `localhost`.
- **Risk:** Patients and practitioners receive email/push notifications with `localhost` links, which are unresolvable outside the developer's machine. This breaks the notification UX entirely in misconfigured deployments.
- **Root cause hypothesis:** The Zod `.default()` allows `.parse()` to succeed even with an invalid URL, silently substituting the default.
- **Recommended action:** Make `APP_URL` required (remove `.default()`) so the app fails to start if not configured, rather than silently falling back to localhost.
- **Do not fix yet:** Yes

---

### AUDIT-063: Notification body text rendered directly without sanitization on mobile

- **Severity:** P1
- **Type:** Safety
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/app/(patient)/notifications.tsx:226-233`
- **Affected surfaces:** Patient notification list screen
- **Description:** The `body` field from notification items is rendered directly in React Native `<Text>` components without sanitization. While React Native does not execute HTML, Unicode-based formatting characters (zero-width joiners, bidirectional override characters) could theoretically be used for text spoofing.
- **Risk:** If the backend stores unsanitized content in `item.body`, display issues could occur. Low risk in React Native compared to browser contexts, but still a defense-in-depth gap.
- **Root cause hypothesis:** The body string is trusted as server-controlled content and rendered without processing.
- **Recommended action:** Strip bidirectional override characters and zero-width joiners from `item.body` before rendering.
- **Do not fix yet:** Yes

---

### AUDIT-064: Expo push token retrieved without EAS project ID in some build configurations

- **Severity:** P1
- **Type:** Functional
- **Module:** Mobile Patient Push
- **Evidence:** `fayed-mobile/src/features/push/service.ts:195-211`
- **Affected surfaces:** Push notification delivery to patient devices
- **Description:** `getExpoPushToken()` falls back to `Notifications.getExpoPushTokenAsync()` without a `projectId` when `Constants.easConfig?.projectId` is unavailable. Builds without EAS project ID configured will receive a non-project-scoped token that could potentially be shared across apps on the same device.
- **Risk:** If the app is installed alongside another Expo app using the same Expo project in bare workflow, push tokens could be misrouted. For managed workflow with correct EAS config, risk is low.
- **Root cause hypothesis:** The fallback was added for development builds (Expo Go, local testing) but the production path does not enforce project ID presence.
- **Recommended action:** Require EAS project ID in production builds. Throw an error if `projectId` is absent in non-DEV builds.
- **Do not fix yet:** Yes

---

### AUDIT-065: Notification click handler uses current session role as fallback when targetRole absent

- **Severity:** P1
- **Type:** Security
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/src/providers/AuthProvider.tsx:343-351`
- **Affected surfaces:** Notification deep-link routing
- **Description:** When a push notification payload lacks a `targetRole` field, the click handler defaults to `sessionRef.current?.role`. If a practitioner-mode notification is delivered to a device where the patient is currently logged in, it would route to patient surfaces using the patient's session context.
- **Risk:** If a push payload for a practitioner notification is delivered to a patient-logged-in device, the routing could expose practitioner-only information in the deep-link URL. The actual content exposure is limited because `resolvePatientNotificationRoute` only resolves routes within the patient route tree.
- **Root cause hypothesis:** The notification routing assumes `targetRole` is always present in the payload.
- **Recommended action:** Log a warning when `targetRole` is absent. Consider rejecting routing if the notification's implied role doesn't match the current session role.
- **Do not fix yet:** Yes

---

### AUDIT-066: NormalizedInboxItem navigates without validating conversation ownership

- **Severity:** P1
- **Type:** Data Exposure
- **Module:** Mobile Patient Messages
- **Evidence:** `fayed-mobile/src/features/messages/components/MessagesInboxScreen.tsx:231`
- **Affected surfaces:** Patient messages inbox
- **Description:** `handleCardPress` navigates to `item.destinationRoute` without validating that the patient owns the conversation. The backend API (`/patients/me/sessions`, `/patients/me/support/tickets`) filters by authenticated user, so the client only receives owned data. However, if a malicious API returned another patient's conversation ID, the client would navigate to it.
- **Risk:** Relies entirely on backend API filtering. No client-side ownership check is performed. If backend filtering ever fails or is bypassed, cross-patient data access is possible.
- **Root cause hypothesis:** Trust that backend enforces ownership; no defense-in-depth check at client layer.
- **Recommended action:** Verify backend API consistently filters by authenticated user ID for all three inbox sources. Add client-side ownership validation as defense-in-depth.
- **Do not fix yet:** Yes

---

### AUDIT-067: Care-chat notifications route directly to conversation, bypassing Messages Shell

- **Severity:** P1
- **Type:** Security
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/src/features/patient/notifications/routes.ts` — no `messages.follow-up-message-received` lane mapping in `resolvePatientMessagesLaneRoute`
- **Affected surfaces:** Patient care-chat notification routing
- **Description:** Unlike session and support messages (which route to the Messages Shell), care-chat notifications route directly to the care-chat surface via `href` parsing. No explicit lane mapping exists for care-chat message notifications. If the `href` is absent or malformed, the fallback returns null and the patient sees an "unsupported notification" alert.
- **Risk:** Patients with malformed or absent care-chat notification hrefs cannot navigate to their care-chat conversations from push notifications. The fallback gap leaves patients stranded.
- **Root cause hypothesis:** Care-chat notifications were not integrated into the `resolvePatientMessagesLaneRoute` lane mapping — only session and support messages were.
- **Recommended action:** Add explicit lane mapping for care-chat message notifications to route to `/(patient)/messages?tab=followup` when href is absent.
- **Do not fix yet:** Yes

---

### AUDIT-068: AdminPermissionGate missing from admin/care-chat/[id] route

- **Severity:** P1
- **Type:** Security
- **Module:** Web Admin Route Protection
- **Evidence:** `fayed-frontend-v1/app/(admin)/admin/care-chat/[id]/page.tsx`
- **Affected surfaces:** Admin care-chat conversation detail
- **Description:** The admin care-chat conversation detail page has no `AdminPermissionGate` wrapper. Any authenticated admin session can access any care-chat conversation by UUID, without `CHAT_READ` or `CARE_CHAT_READ` permission check at the route level.
- **Risk:** An authenticated admin without care-chat permissions can access any patient's care-chat conversation if they know or guess the conversation UUID. This is the same permission gap pattern found in AUDIT-045 (admin session routes) and AUDIT-053 from Phase 4.
- **Root cause hypothesis:** The route was built without applying `AdminPermissionGate` — the same pattern as the runtime inspector page (AUDIT-054).
- **Recommended action:** Wrap the care-chat detail page content with `AdminPermissionGate(['CHAT_READ', 'CARE_CHAT_READ'])`.
- **Do not fix yet:** Yes

---

### AUDIT-069: AdminPermissionGate missing from admin/sessions/runtime-inspection route

- **Severity:** P1
- **Type:** Security
- **Module:** Web Admin Route Protection
- **Evidence:** `fayed-frontend-v1/app/(admin)/admin/sessions/runtime-inspection/page.tsx`
- **Affected surfaces:** Admin session runtime inspection surface
- **Description:** The admin runtime inspection page lacks `AdminPermissionGate`. Any authenticated admin session can access the runtime inspection surface without `SESSIONS_READ` or `SESSIONS_INSPECTOR` permission. The inspector shows real-time session state, join tokens (masked), and participant data.
- **Risk:** An authenticated admin without session inspection permissions can view all active sessions' runtime data, including join contract details. This is a sensitive surveillance surface.
- **Root cause hypothesis:** The page was built as an internal tool before the `AdminPermissionGate` pattern was established.
- **Recommended action:** Wrap the runtime inspection page with `AdminPermissionGate(['SESSIONS_INSPECTOR', 'SESSIONS_READ'])`.
- **Do not fix yet:** Yes

---

### AUDIT-070: AdminNotificationDetailsPanel renders notification body as HTML-equivalent

- **Severity:** P1
- **Type:** Safety
- **Module:** Web Admin Notifications
- **Evidence:** `fayed-frontend-v1/components/admin/notifications/AdminNotificationDetailsPanel.tsx:396-427`
- **Affected surfaces:** Admin notification detail panel
- **Description:** The notification body is rendered using `dangerouslySetInnerHTML` or equivalent React rendering that treats the body as pre-formatted text. If the notification body contains injected HTML-like content from a compromised backend or stored XSS payload, it would be rendered.
- **Risk:** Stored XSS via notification body. An attacker who could inject HTML into a notification record (through admin panel, backend bug, or compromised integration) could execute JavaScript in the admin's browser when viewing the notification details.
- **Root cause hypothesis:** The notification body was assumed to be server-controlled and plain text, but is rendered without sanitization.
- **Recommended action:** Render notification body as plain text (strip all HTML tags) rather than as HTML.
- **Do not fix yet:** Yes

---

### AUDIT-071: AdminNotificationDetailsPanel JSON copy only redacts URLs, not userId

- **Severity:** P2
- **Type:** Data Exposure
- **Module:** Web Admin Notifications
- **Evidence:** `fayed-frontend-v1/components/admin/notifications/AdminNotificationDetailsPanel.tsx:120-129`
- **Affected surfaces:** Admin notification detail JSON copy
- **Description:** The "Copy JSON" feature redacts URLs from the notification payload but leaves `userId` fields exposed. The JSON payload includes user IDs which are copied to clipboard.
- **Risk:** When an admin copies notification JSON for debugging, they inadvertently copy user IDs of both sender and recipient into their clipboard, which may then be pasted into untrusted contexts (Slack, email, ticketing systems).
- **Root cause hypothesis:** The redaction logic only scans for URL patterns but does not include `userId` in the denylist.
- **Recommended action:** Add `userId` to the redaction patterns alongside URLs.
- **Do not fix yet:** Yes

---

### AUDIT-072: Session join token appended to URL as query parameter without masking

- **Severity:** P2
- **Type:** Data Exposure
- **Module:** Mobile Patient Session Join
- **Evidence:** `fayed-mobile/app/(patient)/sessions/[id].tsx:139-142`
- **Affected surfaces:** Patient session join flow
- **Description:** The join token is appended to the Daily.co room URL as `?t=<token>`. The URL is passed to `Linking.openURL` and may be captured by OS URL logging, browser history, or referrer headers.
- **Risk:** If the URL is captured by any of these mechanisms, the join token could be exposed. The token is short-lived (server-side expiry) and per-session, limiting the exposure window.
- **Root cause hypothesis:** The token is appended as a query parameter because Daily.co accepts tokens this way, but the URL itself is not masked.
- **Recommended action:** Confirm server-side token expiry is ≤ 5 minutes. Consider using a one-time room alias instead of embedding the raw token in the URL.
- **Do not fix yet:** Yes

---

### AUDIT-073: No HTML/markdown sanitization on notification title/body in notifications list

- **Severity:** P2
- **Type:** Safety
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/app/(patient)/notifications.tsx:226-233`
- **Affected surfaces:** Patient notifications list
- **Description:** Notification `title` and `body` are rendered without content sanitization. React Native `<Text>` treats content as plain text (no HTML rendering), but Unicode-based text spoofing characters (bidirectional override, zero-width) could alter displayed text.
- **Risk:** Very low in React Native — the Text component does not execute content as markup. Unicode spoofing is theoretically possible but not practical in this context.
- **Root cause hypothesis:** Backend is trusted as the sole source of notification content.
- **Recommended action:** Apply Unicode sanitization (strip bidirectional override characters) if the backend is not already doing so.
- **Do not fix yet:** Yes

---

### AUDIT-074: Notification target role resolution defaults to current session role when targetRole absent

- **Severity:** P1
- **Type:** Security
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/src/providers/AuthProvider.tsx:343-351`
- **Affected surfaces:** Notification deep-link routing for multi-account patients
- **Description:** When a push notification payload lacks `targetRole`, the click handler uses the current authenticated session role as the routing authority. A practitioner-mode notification opened while logged in as patient routes to patient surfaces.
- **Risk:** Cross-role notification routing. If a practitioner receives a practitioner-specific notification (e.g., payout notification) while logged in as a patient, the notification would route to patient surfaces, potentially exposing practitioner-only information in the URL.
- **Root cause hypothesis:** The routing assumes `targetRole` is always populated in notification payloads.
- **Recommended action:** Reject routing if `targetRole` doesn't match the current session role. Log a security event when a mismatched role is detected.
- **Do not fix yet:** Yes

---

### AUDIT-075: Admin runtime inspector has no audit log instrumentation

- **Severity:** P1
- **Type:** Audit/Compliance
- **Module:** Web Admin Sessions
- **Evidence:** `AdminChatConversationDetailScreen` — no `SecurityAuditService` calls
- **Affected surfaces:** Admin session runtime inspection, admin chat conversation detail
- **Description:** Admin actions within the runtime inspector surface (e.g., viewing join tokens, inspecting participant data) are not logged to `SecurityAuditLog`. There is no visibility into which admin accessed which session's runtime data.
- **Risk:** An admin with runtime inspector access could view patient session data without an audit trail. This is a compliance gap for HIPAA-equivalent access logging requirements.
- **Root cause hypothesis:** The runtime inspector was built as an internal debugging tool and audit logging was not included.
- **Recommended action:** Add `SecurityAuditService` instrumentation to all runtime inspector actions, capturing admin ID, session ID, and action type.
- **Do not fix yet:** Yes

---

### AUDIT-076: SESSION_JOIN_LAG_MINUTES is 0 — patients can join immediately at session start

- **Severity:** P2
- **Type:** Functional
- **Module:** Backend Session Join Policy
- **Evidence:** `session-join-policy.util.ts` — `SESSION_JOIN_LAG_MINUTES = 0`
- **Affected surfaces:** Patient session join window
- **Description:** The session join policy allows patients to join immediately at `startsAt` (lag = 0). There is no pre-join window allowing patients to enter before the session officially begins.
- **Risk:** Patients who join exactly at `startsAt` may experience race conditions with the practitioner who is also joining at the same time. A 1-2 minute pre-join buffer is standard clinical practice to verify audio/video before the session clock starts.
- **Root cause hypothesis:** The lag was set to 0, possibly for testing convenience, and never adjusted for production.
- **Recommended action:** Set `SESSION_JOIN_LAG_MINUTES` to at least 1-2 minutes to allow a pre-join buffer.
- **Do not fix yet:** Yes

---

### AUDIT-077: No timezone configuration — server timezone is implicit standard

- **Severity:** P2
- **Type:** Functional
- **Module:** Backend Reminder/Sweeper Jobs
- **Evidence:** `app.config.ts` — no explicit timezone configuration
- **Affected surfaces:** Session reminders, instant booking expiration, notification scheduling
- **Description:** No explicit timezone is configured for the server. Session times are stored as UTC but all date math (reminder scheduling, expiration checks) uses the server's implicit local timezone. If the server's timezone changes (e.g., DST transition, server relocation), all time-based logic shifts.
- **Risk:** DST transitions could cause reminders to fire at the wrong time or instant booking requests to expire incorrectly. A server running in a different timezone than intended would produce incorrect time calculations.
- **Root cause hypothesis:** Date/time operations rely on JavaScript `Date` which uses the server's local timezone, and no explicit TZ is set.
- **Recommended action:** Set `TZ=UTC` environment variable for the Node.js process. Add timezone validation to `app.config.ts`.
- **Do not fix yet:** Yes

---

### AUDIT-078: Support status enum rendered without i18n coverage guarantee

- **Severity:** P2
- **Module:** Mobile Patient Support
- **Evidence:** `fayed-mobile/app/(patient)/support/index.tsx:140`
- **Affected surfaces:** Patient support ticket list
- **Description:** Support ticket status is displayed using `t(\`support.statuses.${ticket.status}\`)` with the raw enum as the fallback. If the i18n key is missing, the raw enum value (e.g., "OPEN", "IN_PROGRESS") is displayed to the user.
- **Risk:** Missing i18n keys would expose raw technical enum values in the UI. This would be caught in i18n coverage testing but represents a defense-in-depth gap.
- **Root cause hypothesis:** The fallback to the raw enum was implemented as a graceful degradation but creates a display artifact if translations are incomplete.
- **Recommended action:** Ensure all support status enums have i18n keys. Add a lint rule to detect missing i18n keys for known enum values.
- **Do not fix yet:** Yes

---

### AUDIT-079: markReadMutation callable rapidly without debouncing

- **Severity:** P3
- **Type:** Functional
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/app/(patient)/notifications.tsx:63-67`
- **Affected surfaces:** Patient notification list mark-read
- **Description:** `handleOpenNotification` calls `markReadMutation.mutateAsync()` without any debouncing. A user who rapidly taps multiple notifications fires a separate PATCH request for each tap.
- **Risk:** Backend DoS from rapid notification taps. Low severity because each request is a single PATCH, not a complex operation.
- **Root cause hypothesis:** Debouncing was not considered for this mutation.
- **Recommended action:** Add a 500ms debounce on mark-read mutations, or batch mark-read requests.
- **Do not fix yet:** Yes

---

### AUDIT-080: Notification action href falls back to "/" when absent

- **Severity:** P2
- **Type:** UX
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/app/(patient)/notifications.tsx:70` and `src/features/patient/notifications/routes.ts:26`
- **Affected surfaces:** Patient notification list
- **Description:** When `item.action.href` is missing, the route resolver receives `"/"` as the fallback. The resolver passes `"/"` through the `startsWith("/")` check, routing to the patient's home tab instead of the notifications list.
- **Risk:** A notification with no action href and no matching `typeSlug` routes to the home tab. The patient never sees the notification content and has no way to find it in-app.
- **Root cause hypothesis:** The fallback was `"/"` as a generic safe route, not `"/(patient)/notifications"` which would preserve user intent.
- **Recommended action:** Use `"/(patient)/notifications"` as the fallback instead of `"/"`.
- **Do not fix yet:** Yes

---

### AUDIT-081: messages/[id] accepts string[] for conversation ID without UUID validation

- **Severity:** P3
- **Type:** Functional
- **Module:** Mobile Patient Messages
- **Evidence:** `fayed-mobile/app/(patient)/messages/[id].tsx:8`
- **Affected surfaces:** Patient message thread
- **Description:** `conversationId` is extracted from `params.id` using `Array.isArray(params.id) ? params.id[0] : params.id`. No UUID format validation is applied.
- **Risk:** If an array with multiple IDs is passed by a malformed deep link, only the first is used. If the extracted ID is not a valid UUID, the query would send an invalid parameter to the API.
- **Root cause hypothesis:** Expo Router passes array params in some linking scenarios; the code handles this but skips validation.
- **Recommended action:** Add UUID format validation on `conversationId` before passing to the query.
- **Do not fix yet:** Yes

---

### AUDIT-082: Push device registration stored without recorded-at timestamp

- **Severity:** P2
- **Type:** Functional
- **Module:** Mobile Patient Push
- **Evidence:** `fayed-mobile/src/features/push/storage.ts` and `types.ts`
- **Affected surfaces:** Push device token storage
- **Description:** `StoredPushRegistration` has no `registeredAt` timestamp. The server returns `createdAt`/`updatedAt`/`lastSeenAt` but these are not persisted locally. No time-based deduplication of old registrations is possible.
- **Risk:** On registration revocation failure (network error), the local storage still clears. If the server revokes but the clear fails, stale local state remains with no timestamp to determine age.
- **Root cause hypothesis:** The `recordedAt` field was omitted from the local storage type.
- **Recommended action:** Add `registeredAt: string` to `StoredPushRegistration` and populate it on store.
- **Do not fix yet:** Yes

---

### AUDIT-083: Notification click handler uses in-memory ref for deduplication

- **Severity:** P2
- **Type:** Functional
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/src/providers/AuthProvider.tsx:377-381`
- **Affected surfaces:** Notification click routing
- **Description:** Last notification response deduplication uses `lastHandledNotificationIdentifierRef.current` (in-memory ref). If the app is killed and relaunched, the same notification tap could be processed twice.
- **Risk:** On cold-start notification handling, the OS may deliver the same notification tap event both via `getLastNotificationResponseAsync` (on cold start) and `addNotificationResponseReceivedListener`. The in-memory ref does not survive app restarts.
- **Root cause hypothesis:** The ref was added as a session-level dedup guard but does not persist across app lifecycle.
- **Recommended action:** Persist handled notification IDs to AsyncStorage with a TTL (e.g., 5 minutes).
- **Do not fix yet:** Yes

---

### AUDIT-084: Cold-start notification handling may conflict with OS notification center

- **Severity:** P2
- **Type:** Functional
- **Module:** Mobile Patient Notifications
- **Evidence:** `fayed-mobile/src/providers/AuthProvider.tsx:399-401`
- **Affected surfaces:** Notification cold-start routing
- **Description:** `getLastNotificationResponseAsync()` is called on every cold start. If the app was opened by tapping a notification, the same notification tap may also be delivered via `addNotificationResponseReceivedListener`. The deduplication ref only handles within-session duplicates.
- **Risk:** A notification tap that cold-starts the app could be processed twice (once from `getLastNotificationResponseAsync`, once from the listener callback).
- **Root cause hypothesis:** No cold-start detection flag to suppress the listener callback when the cold-start path has already handled the notification.
- **Recommended action:** Add a cold-start flag to skip `addNotificationResponseReceivedListener` for the notification that initiated the cold start.
- **Do not fix yet:** Yes

---

## Cross-Phase Findings

The following findings from Phase 5 cross-cut multiple modules and may require coordination across teams to fix:

| ID | Title | Severity | Cross-cuts |
|----|-------|----------|------------|
| AUDIT-057 | Push payload metadata disclosure | P1 | Backend + Mobile |
| AUDIT-058 | routePath bypasses Messages Shell | P1 | Backend + Mobile + Web |
| AUDIT-066 | Client-side ownership validation gap | P1 | Mobile Patient |
| AUDIT-067 | Care-chat notifications bypass Messages Shell | P1 | Mobile Patient |
| AUDIT-072 | Join token in URL query parameter | P2 | Mobile Patient + Backend |

---

*Findings register produced by Phase 5 read-only audit. No application code was modified. No git commands were executed.*
