# Phase 5 Open Questions — Session Media / Video / Chat / Notifications

**Phase:** 5
**Created:** 2026-06-17
**Questions:** 23

Open questions discovered during Phase 5 that warrant investigation in later phases or before fixes are applied.

---

## Session Media / Video

### Q-051: What is the maximum server-side join token expiry enforced by Daily.co?
**Asked in:** Phase 5 (Backend Daily/Video/Session Runtime)
**Question:** Join tokens are passed as URL query parameters (`?t=<token>`) to Daily.co rooms. What is the server-side expiry of these tokens? Is it configurable per-session-type (instant vs scheduled)?
**Why it matters:** If the token expiry is long (e.g., > 5 minutes), the risk of URL capture is higher. If tokens are short-lived, the window of exposure is limited.
**Phase:** Phase 5
**Status:** Not resolved — Daily.co token expiry configuration not inspected

---

### Q-052: Can the DISPLAY_NAME_MATCH fallback be triggered by name collision between practitioners?
**Asked in:** Phase 5 (Backend Daily/Video/Session Runtime)
**Question:** Two practitioners with identical display names would both match the `DISPLAY_NAME_MATCH` fallback. How many practitioners could share a display name on the platform? Is there a uniqueness constraint on practitioner display names?
**Why it matters:** If name collisions are possible in production, AUDIT-055 (DISPLAY_NAME_MATCH fallback) represents a real attendance fraud vector.
**Phase:** Phase 5
**Status:** Not resolved — practitioner display name uniqueness not verified

---

### Q-053: What is the room naming convention used by Daily.co?
**Asked in:** Phase 5 (Backend Daily/Video/Session Runtime)
**Question:** The `roomName` and `roomUrl` fields are exposed in the blocked join contract (AUDIT-053). What naming convention does Daily.co use for room names? Do they contain predictable patterns (e.g., session UUID, practitioner ID)?
**Why it matters:** If room names are predictable or contain session UUIDs, an attacker who learns the naming convention could probe for active rooms even without a valid join token.
**Phase:** Phase 5
**Status:** Not resolved — Daily.co room naming convention not inspected

---

### Q-054: Does the Daily.co webhook handler verify the call ended event timestamp against session end time?
**Asked in:** Phase 5 (Backend Daily/Video/Session Runtime)
**Question:** The webhook handler uses `DISPLAY_NAME_MATCH` as a fallback for participant identity. Does it also verify that the attendance event timestamp is within the session's `startsAt`/`endsAt` window? Could a practitioner record attendance for a session that hasn't started yet?
**Why it matters:** If attendance can be recorded before the session starts, practitioners could fraudulently record attendance for sessions they intend to conduct but haven't yet.
**Phase:** Phase 5
**Status:** Not resolved — timestamp bounds checking in webhook not verified

---

## Chat / Messages

### Q-055: Does the backend API for care-chat conversation detail enforce participant membership?
**Asked in:** Phase 5 (Mobile Patient Messages)
**Question:** When a patient navigates to a care-chat conversation (via notification deep-link or direct navigation), does the backend API (`/patients/me/care-chat/conversations/{id}`) verify that the authenticated patient is a participant in that conversation? What HTTP status does it return for unauthorized access (403, 404)?
**Why it matters:** If the API returns 404 for unauthorized access (rather than 403), it provides no information about whether the conversation exists. If it returns 403, the unauthorized access is explicit. The client-side `destinationRoute` navigation relies on this behavior.
**Phase:** Phase 5
**Status:** Not resolved — requires endpoint behavior testing

---

### Q-056: Is there rate limiting on the mark-read mutation endpoint?
**Asked in:** Phase 5 (Mobile Patient Notifications)
**Question:** The mark-read mutation (`PATCH /notifications/{id}/read`) is called per notification tap (AUDIT-079). Is there rate limiting on this endpoint? Could a malicious actor spam mark-read requests for many notification IDs?
**Why it matters:** Without rate limiting, an attacker with a valid session could flood the mark-read endpoint. The actual impact depends on what side effects the mark-read has (e.g., does it trigger any downstream events?).
**Phase:** Phase 5
**Status:** Not resolved — endpoint throttle configuration not verified

---

### Q-057: Does the backend deduplicate care-chat follow-up notifications server-side?
**Asked in:** Phase 5 (Mobile Patient Notifications)
**Question:** If a care-chat message triggers both a push notification and an in-app notification, are these deduplicated? If a patient opens the app before the push is delivered, do they receive the in-app notification as well, resulting in duplicate notifications?
**Why it matters:** Duplicate notifications create a poor user experience and could cause patients to mark messages as read before actually reading them.
**Phase:** Phase 5
**Status:** Not resolved — notification deduplication logic not inspected

---

### Q-058: Are there push notification payload size limits on iOS APNs or Android FCM?
**Asked in:** Phase 5 (Mobile Patient Notifications)
**Question:** Notification payloads include `threadId`, `relatedEntityType`, `category`, `routePath`, `href`, and `targetRole`. Are there payload size limits that could truncate these fields? What happens if both `routePath` and `href` are absent from the payload?
**Why it matters:** Truncated payloads could result in missing routing fields, causing notifications to fall back to generic routes or fail to navigate entirely.
**Phase:** Phase 5
**Status:** Not resolved — APNs/FCM payload size constraints not verified

---

### Q-059: Does care-chat notification use `messages.follow-up-message-received` or a care-chat-specific typeSlug?
**Asked in:** Phase 5 (Mobile Patient Notifications)
**Question:** The backend sends `messages.follow-up-message-received` for care-chat messages (identified in the Phase 5 audit). However, `resolvePatientMessagesLaneRoute` does not handle this `typeSlug`. Is there a care-chat-specific typeSlug that should be added to the lane routing?
**Why it matters:** If care-chat messages use the same `typeSlug` as session follow-up messages, they would be routed to the `followup` lane. If they use a different typeSlug, a separate routing rule is needed.
**Phase:** Phase 5
**Status:** Not resolved — care-chat notification typeSlug not verified in backend

---

### Q-060: Can a session message notification include an href pointing directly to `/messages/{threadId}`?
**Asked in:** Phase 5 (Mobile Patient Notifications)
**Question:** The notification routing supports both `routePath` (direct navigation) and `href` parsing. Can a session message notification include an `href` pointing directly to `/(patient)/messages/{conversationId}` bypassing the Messages Shell? Is this ever sent by the backend intentionally?
**Why it matters:** Direct thread navigation bypasses the Messages Shell's lane model. If the backend ever sends such notifications, AUDIT-058 applies (routePath bypasses Messages Shell).
**Phase:** Phase 5
**Status:** Not resolved — backend notification payload content not inspected

---

## Notifications / Push

### Q-061: Does the Messages Shell deduplicate notifications for the same conversation?
**Asked in:** Phase 5 (Mobile Patient Notifications)
**Question:** If a patient receives multiple messages in the same conversation within a short window, are notifications deduplicated (e.g., "You have 3 new messages" vs. 3 separate notifications)?
**Why it matters:** Multiple notifications for the same conversation create notification fatigue and may cause patients to disable notifications.
**Phase:** Phase 5
**Status:** Not resolved — notification aggregation logic not inspected

---

### Q-062: What is the expected behavior for push notification delivery when the app is force-quit?
**Asked in:** Phase 5 (Mobile Patient Push)
**Question:** On iOS and Android, when an app is force-quit by the user, push notifications may not be delivered to the app (the OS kills the app's background processes). Does the platform rely on push notifications for critical clinical information (e.g., session reminders, instant booking updates)? What happens if these are missed?
**Why it matters:** If critical notifications are missed because the app was force-quit, patients could miss session starts or booking updates. The in-app notification list provides a fallback, but only if the patient opens the app.
**Phase:** Phase 5
**Status:** Not resolved — push delivery guarantees not verified

---

### Q-063: Is Expo push token retrieval without projectId a realistic production scenario?
**Asked in:** Phase 5 (Mobile Patient Push)
**Question:** The `getExpoPushToken()` fallback without `projectId` (AUDIT-064) was described as a development-build scenario. Are production builds (via EAS Build) always configured with a valid `eas.projectId`? Is there any production scenario where the fallback would activate?
**Why it matters:** If the fallback never activates in production, AUDIT-064 is DEV-only and the risk is negligible. If it can activate in production, it's a P1 issue.
**Phase:** Phase 5
**Status:** Not resolved — EAS build configuration not verified

---

### Q-064: Are there duplicate notification delivery scenarios (APNs/FCM vs Expo push)?
**Asked in:** Phase 5 (Mobile Patient Push)
**Question:** Expo's push notification service routes to APNs/FCM. Could a notification be delivered via both Expo's push service AND directly via APNs/FCM, resulting in duplicate notifications?
**Why it matters:** Duplicate notifications create a poor UX. If deduplication is not handled, patients could receive the same notification twice.
**Phase:** Phase 5
**Status:** Not resolved — Expo push vs native push delivery overlap not verified

---

### Q-065: Does the backend notification service send push notifications for all notification types, or only a subset?
**Asked in:** Phase 5 (Backend Notifications/Push)
**Question:** The Phase 5 audit found that instant booking accept/reject/expire does NOT send push notifications (AUDIT-056). Are there other notification types that are also missing push delivery? Which notification types send push, and which only create in-app records?
**Why it matters:** The notification system has two delivery channels (in-app + push). If only in-app is used for certain event types, patients who don't open the app won't know about them.
**Phase:** Phase 5
**Status:** Not resolved — notification type coverage not mapped

---

### Q-066: Is the unread count also affected on the practitioner side?
**Asked in:** Phase 5 (Mobile Patient Notifications)
**Question:** AUDIT-059 found that unread counts only aggregate `IN_APP` channel, not `PUSH`. Does the practitioner notification unread count have the same issue?
**Why it matters:** If the same bug exists for practitioners, practitioners also would not see accurate unread counts when they receive push-delivered notifications.
**Phase:** Phase 6 (Practitioner) or Phase 7 (Mobile Practitioner)
**Status:** Not resolved — practitioner notification query not inspected

---

## Reminder / Sweeper Jobs

### Q-067: What happens to instant booking requests that expire while the practitioner is in the acceptance flow?
**Asked in:** Phase 5 (Backend Reminder/Sweeper Jobs)
**Question:** The `ExpireInstantBookingRequestUseCase` (AUDIT-061) has no cron driver. If it did, there could be a race condition: a practitioner submits an accept request at the same moment the sweeper expires the same request. What is the expected behavior?
**Why it matters:** Race conditions in the instant booking accept/expire flow could result in inconsistent state (e.g., a request that is both ACCEPTED and EXPIRED).
**Phase:** Phase 5
**Status:** Not resolved — transaction isolation level of accept/expire not verified

---

### Q-068: Is there any manual cleanup mechanism for stale PENDING instant booking requests?
**Asked in:** Phase 5 (Backend Reminder/Sweeper Jobs)
**Question:** Without the sweeper (AUDIT-061), stale PENDING requests accumulate. Is there a manual admin interface to expire or cancel these requests? Or are they intended to be cleaned up only by the sweeper?
**Why it matters:** If there's no manual cleanup and no automatic cleanup, stale requests accumulate forever, creating noise in the instant booking queue.
**Phase:** Phase 5
**Status:** Not resolved — admin interface for instant booking management not inspected

---

## Web Admin

### Q-069: What is the retention period for the SecurityAuditLog?
**Asked in:** Phase 5 (Web Admin)
**Question:** AUDIT-075 recommends adding audit logging to the admin runtime inspector. What is the retention period for `SecurityAuditLog` records? Are there GDPR/data retention requirements that would limit how long admin inspection events can be stored?
**Why it matters:** Audit logs for session inspection contain personal health-related metadata. Retention policies must balance security needs with data minimization principles.
**Phase:** Phase 5
**Status:** Not resolved — SecurityAuditLog retention policy not verified

---

### Q-070: Can the runtime inspector display be accessed without triggering the deduplication warning for join tokens?
**Asked in:** Phase 5 (Web Admin)
**Question:** The Phase 5 summary noted positive findings around the admin runtime inspector not exposing join tokens in public DTOs. However, the inspector itself (per AUDIT-069) lacks AdminPermissionGate. Who can access the inspector, and what data can they see?
**Why it matters:** The runtime inspector is a sensitive surveillance surface. Without permission gating (AUDIT-069), any authenticated admin can access it. With permission gating, only authorized admins can.
**Phase:** Phase 5
**Status:** Partially resolved (AdminPermissionGate gap confirmed) — data visible per authorization level not fully mapped

---

### Q-071: Is there a notification broadcast feature for admins that was not found?
**Asked in:** Phase 5 (Web Admin)
**Question:** AUDIT-060 found no admin permission for broadcast notifications. Was a broadcast feature planned but not implemented? Is there a ticket or design doc for it?
**Why it matters:** Without understanding why the feature is absent (never planned vs. deferred), it's hard to assess whether to build it.
**Phase:** Phase 5
**Status:** Not resolved — feature intent not verified

---

### Q-072: Does the notification body sanitization gap on web admin (AUDIT-070) affect the patient notification list?
**Asked in:** Phase 5 (Web Admin)
**Question:** AUDIT-070 found `dangerouslySetInnerHTML` in the admin notification detail panel. Is the same pattern used in the patient notification list (mobile or web)?
**Why it matters:** If the same unsafe rendering pattern exists in patient-facing notification views, the XSS risk extends beyond admin users.
**Phase:** Phase 5 (mobile — confirmed safe with React Native Text) or Phase 6 (web patient)
**Status:** Not resolved — patient web notification rendering not inspected

---

## Questions Deferred from Phase 5

| Question | Phase assigned | Reason |
|----------|---------------|--------|
| Q-038: Android SecureStore hardware backing | Phase 6 (Mobile) | Requires Expo SDK verification |
| Q-041: `__DEV__` in production builds | Phase 6 (Mobile) | Requires production build testing |
| Q-045: Admin permission caching | Phase 6 (Web) | Requires performance review |
| Q-049: CSRF token mechanism coverage | Phase 6 (Web) | Requires guard coverage verification |
| Q-066: Practitioner unread count | Phase 6 (Practitioner) | Practitioner side not inspected |
| Q-072: Patient web notification rendering | Phase 6 (Web Patient) | Web patient notifications not inspected |

---

## Resolved Questions

*No questions resolved in Phase 5.*

---

*Open questions produced by Phase 5 read-only audit. No application code was modified.*
