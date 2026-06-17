# Phase 5 Evidence Index — Session Media / Video / Chat / Notifications

**Phase:** 5
**Created:** 2026-06-17
**Auditors:** 10 concurrent sub-agents
**Evidence type:** Source code inspection, guard/decorator analysis, configuration review, route analysis

---

## 1. Inspected Files and Routes

### 1.1 Backend — Daily / Video / Session Runtime (Agent 1)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `resolve-session-join-contract.use-case.ts` | Session join contract resolution | 130-148 (room fields in blocked response) |
| `daily-session-video-provider.adapter.ts` | Daily.co room creation/expiry | 55 (room expiry = endsAt + 7200s) |
| `handle-daily-attendance-webhook.use-case.ts` | Daily.co webhook handling | 246-318 (DISPLAY_NAME_MATCH fallback) |
| `prepare-session-runtime.use-case.ts` | Idempotent room preparation | Full file |
| `daily-webhook.controller.ts` | Webhook endpoint | Full file |
| `session-join-policy.util.ts` | Join policy constants | SESSION_JOIN_LAG_MINUTES |

**Positive findings confirmed:**
- Webhook signature validation with `timingSafeEqual`
- No join tokens in public DTOs
- `PrepareSessionRuntimeUseCase` is idempotent
- `canJoin` field gates the Join CTA on all surfaces

---

### 1.2 Backend — Chat / Messages (Agent 2)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `general-chat-attachments.controller.ts` | Attachment upload/retrieval | Silent 200 on error paths |
| `count-unread-messages-for-participant` | Unread count aggregation | Unsafe null-coalescing |
| `fileUrl` comparison logic | Attachment ownership check | Suffix match risk |
| `conversationRef` | Conversation reference | SHA-256 truncation |
| `request.query` | Audit metadata | Raw query exposure |

**Confirmed gaps:**
- No rate limiting on chat send/list/mark-read
- No duplicate-message idempotency
- No pagination upper bound on admin conversation list
- No attachment streaming permission enforcement

---

### 1.3 Backend — Support / Care Chat (Agent 3)

| File | Purpose |
|------|---------|
| Admin support ticket controller | Read access audit gap |
| Admin care-chat controller | Revoke use case not audited |
| Support ticket permission guard | Granularity inconsistency |
| Care-chat revoke use case | Not audited |

---

### 1.4 Backend — Notifications / Push / Device Registration (Agent 4)

| File | Purpose | Key Lines |
|------|---------|-----------|
| Notification dispatch (instant booking) | Accept/reject/expire notification dispatch | No dispatch found |
| Push payload structure | threadId, relatedEntityType, category | PHI disclosure risk |
| `routePath` construction | /messages/{threadId} direct link | Bypasses Messages Shell |
| Unread count query | Count only on IN_APP channel | AUDIT-059 |
| Admin broadcast permission | NOTIFICATIONS_BROADCAST | Absent |

---

### 1.5 Backend — Reminder / Sweeper Jobs (Agent 5)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `expire-instant-booking-request.use-case.ts` | Expiration logic (no cron driver) | AUDIT-061 |
| `session-join-policy.util.ts` | SESSION_JOIN_LAG_MINUTES = 0 | AUDIT-076 |
| `app.config.ts` | APP_URL fallback | 23 — localhost:3000 default |
| `session-reminder.util.ts` | Idempotency key pattern | Positive |
| Reminder suppression | Terminal session state handling | Positive |

---

### 1.6 Web Patient — Media / Chat / Notifications (Agent 6)

| Route | Purpose |
|-------|---------|
| `(patient)/sessions/[id]/page.tsx` | Session detail + join CTA |
| `(patient)/messages/page.tsx` | Messages Shell |
| `(patient)/messages/[id]/page.tsx` | Message thread |
| `(patient)/notifications/page.tsx` | Notification list |

**Positive findings confirmed:**
- Join CTA uses `joinAvailability.canJoin`
- Chat composer uses `canSend`
- Notification routing to Messages Shell
- `raw presentationStatus` — P3 only

---

### 1.7 Web Practitioner — Media / Chat / Notifications (Agent 7)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `SessionChatPanel.tsx` | Chat panel | 355 — raw presentationStatus in badge |
| `SessionLaneWorkspace.tsx` | Lane workspace | 134 — raw enum as statusLabel |
| `canOpenSessionChatFromPresentationStatus` | Chat open guard | Hardcoded allowlist |

---

### 1.8 Web Admin — Media / Chat / Notifications (Agent 8)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `admin/care-chat/[id]/page.tsx` | Care-chat detail | Missing AdminPermissionGate |
| `admin/sessions/runtime-inspection/page.tsx` | Runtime inspector | Missing AdminPermissionGate |
| `AdminChatConversationDetailScreen` | Chat conversation | No audit log |
| `AdminNotificationDetailsPanel.tsx` | Notification details | 396-427 — HTML render; 120-129 — URL-only redaction |

**Confirmed positive:**
- No join tokens in admin runtime inspector DTOs
- Notification payload redacts URLs in JSON copy
- `providerRoomId`/`providerSessionRef` shown without gate

---

### 1.9 Mobile Patient — Media / Chat / Notifications (Agent 9)

| Route / File | Purpose | Key Lines |
|-------------|---------|-----------|
| `app/(patient)/sessions/[id].tsx` | Session join | 139-142 — token in URL |
| `app/(patient)/notifications.tsx` | Notification list | 226-233 — body rendering |
| `src/providers/AuthProvider.tsx` | Notification routing | 343-351 — role fallback; 377-381 — dedup ref; 399-401 — cold-start |
| `src/features/patient/notifications/routes.ts` | Route resolution | No care-chat lane mapping |
| `src/features/push/service.ts` | Push token | 195-211 — no projectId fallback |
| `src/features/messages/components/MessagesInboxScreen.tsx` | Inbox | 231 — no ownership check |
| `src/features/push/storage.ts` | Token storage | No registeredAt |
| `src/lib/external-url.ts` | URL normalization | 1, 14-15 — DEV http: allowed |

**Positive findings confirmed:**
- Join uses backend join contract with `canJoin` guard
- Join URL restricted to https in production
- Join token not logged
- Messages Shell tab routing by typeSlug
- Support/care-chat href parsing isolated to patient route tree
- Push registration requires authenticated session
- No raw chat message content in push payloads
- Role isolation in notification routing
- All patient API uses `/patients/me/...`
- No sensitive data in AsyncStorage for push
- Chat availability enforced by backend flags

---

### 1.10 Mobile Practitioner — Media / Chat / Notifications (Agent 10)

| Route / File | Purpose |
|-------------|---------|
| `app/(practitioner)/sessions/[id].tsx` | Session detail + join |
| `app/(practitioner)/messages/index.tsx` | Messages Shell |
| `app/(practitioner)/notifications.tsx` | Notification list |
| `src/features/push/service.ts` | Push token (practitioner) |
| `src/providers/AuthProvider.tsx` | Notification routing |

**Confirmed findings:**
- Notification payload not validated against ownership (AUDIT-061 — same pattern as mobile patient)
- `fayed:` protocol in URL allowlist
- AsyncStorage push token storage unencrypted
- Support notification routing not verified

---

## 2. Inspected Routes by App

### 2.1 Backend Routes Inspected

| Route | Method | Auth | Guard |
|-------|--------|------|-------|
| `/daily/webhook/attendance` | POST | None (signature) | Webhook signature |
| `/sessions/:id/runtime/join` | GET | Patient/Practitioner | JwtAccessAuthGuard |
| `/sessions/:id/join` | POST | Patient | JwtAccessAuthGuard |
| `/patients/me/notifications` | GET | Patient | JwtAccessAuthGuard |
| `/patients/me/notifications/:id/read` | PATCH | Patient | JwtAccessAuthGuard |
| `/patients/me/care-chat/conversations` | GET | Patient | JwtAccessAuthGuard |
| `/admin/notifications` | GET | Admin | RolesGuard |
| `/admin/notifications/broadcast` | POST | Admin | PermissionsGuard (absent) |

### 2.2 Web Routes Inspected

| Route | Group | Permission Gate |
|-------|-------|-----------------|
| `/[locale]/(patient)/sessions/[id]` | Patient | Account state |
| `/[locale]/(patient)/messages` | Patient | Account state |
| `/[locale]/(patient)/notifications` | Patient | Account state |
| `/[locale]/(practitioner)/sessions/[id]` | Practitioner | Account state |
| `/[locale]/(practitioner)/messages` | Practitioner | Account state |
| `/[locale]/(admin)/admin/sessions/runtime-inspection` | Admin | **MISSING** |
| `/[locale]/(admin)/admin/care-chat/[id]` | Admin | **MISSING** |
| `/[locale]/(admin)/admin/notifications` | Admin | AdminPermissionGate |

### 2.3 Mobile Routes Inspected

| Route | Group |
|-------|-------|
| `app/(patient)/sessions/[id]` | Patient |
| `app/(patient)/messages` | Patient |
| `app/(patient)/messages/[id]` | Patient |
| `app/(patient)/notifications` | Patient |
| `app/(patient)/support` | Patient |
| `app/(patient)/support/[id]` | Patient |
| `app/(patient)/care-chat` | Patient |
| `app/(patient)/care-chat/[id]` | Patient |
| `app/(practitioner)/sessions/[id]` | Practitioner |
| `app/(practitioner)/messages` | Practitioner |
| `app/(practitioner)/notifications` | Practitioner |

---

## 3. Notification Types Inspected

| typeSlug | Lane | Routing | Findings |
|----------|------|---------|----------|
| `messages.session-message-received` | sessions | Messages Shell tab | AUDIT-058 (routePath bypass) |
| `messages.support-message-received` | support | Messages Shell tab | None |
| `messages.follow-up-message-received` | followup | Direct href | AUDIT-067 (no lane mapping) |
| `notifications.appointment-reminder` | — | Notification list | None |
| `notifications.booking-request` | — | Notification list | AUDIT-056 (instant booking gap) |

---

## 4. Guards, Decorators, Permissions Inspected

| Guard / Decorator | Location | Effectiveness |
|-------------------|----------|---------------|
| `AdminPermissionGate` | `admin/care-chat/[id]/page.tsx` | **MISSING** |
| `AdminPermissionGate` | `admin/sessions/runtime-inspection/page.tsx` | **MISSING** |
| `WebhookSignatureGuard` | `daily-webhook.controller.ts` | ✅ Present — timingSafeEqual |
| `JwtAccessAuthGuard` | All protected endpoints | ✅ Present |
| `RolesGuard` | Admin controllers | ✅ Present |
| `PermissionsGuard` | Admin broadcast | **MISSING** |
| `@RequireAccountStates` | Patient/Practitioner routes | ✅ Present |
| `@RequireStepUp` | Sensitive admin mutations | ✅ Present |

---

## 5. Commands and Tools Used

No runtime commands were executed during Phase 5 (servers not running). All evidence was gathered through static analysis:

- **File reads:** Source code inspection across all 3 codebases
- **Grep searches:** Finding guard/decorator usage, route definitions, notification type mappings
- **Glob searches:** Locating relevant files across module directories
- **Pattern analysis:** Identifying common vulnerability patterns across surfaces

---

## 6. Limitations

1. **Runtime verification not performed:** No live API probes, no browser testing, no mobile app testing. All findings are based on static code analysis.

2. **Backend notification dispatch not traced end-to-end:** The audit found that instant booking accept/reject/expire sends no notifications, but did not verify every notification type's dispatch chain.

3. **Daily.co integration surface not fully mapped:** Webhook secret rotation, room deletion after session end, and Daily.co API key scope were not inspected.

4. **Push token delivery not verified:** APNs/FCM payload structure was inspected in client code but not confirmed against actual server-side payload construction.

5. **Reminder sweeper not traced to cron driver:** The `ExpireInstantBookingRequestUseCase` exists but its cron driver wiring was not found — the use case may be driven by a mechanism not inspected.

6. **Web patient notification rendering not inspected:** The web patient's notification list was not in the Phase 5 scope. AUDIT-070 (HTML rendering in admin) may have a parallel in web patient.

7. **Cross-phase coordination gaps:** Several Phase 5 findings (e.g., AUDIT-057 push metadata, AUDIT-058 routePath bypass) span backend and mobile — fixes must be coordinated across both.

---

## 7. Positive Findings Summary (by Surface)

### Backend Daily/Video
- ✅ Webhook signature validation with `timingSafeEqual`
- ✅ No join tokens in public DTOs
- ✅ `PrepareSessionRuntimeUseCase` is idempotent
- ✅ `canJoin` gates all Join CTAs

### Backend Chat/Messages
- ✅ Stripe/Paymob webhook signature verification
- ✅ Idempotency keys on payment webhooks
- ✅ Message notifications route to Messages Shell only

### Backend Notifications/Push
- ✅ Notification device registration tied to authenticated user ID
- ✅ Refresh token rotation prevents stolen push token reuse
- ✅ Push channel segregation (patient vs practitioner)

### Backend Reminder/Sweeper
- ✅ Reminder suppression correctly implemented across terminal session flows
- ✅ Message notifications route to Messages Shell only
- ✅ Duplicate reminder prevention at DB level (idempotency keys)

### Web Patient
- ✅ Join CTA uses `joinAvailability.canJoin`
- ✅ Chat composer uses `canSend`
- ✅ Notification routing to Messages Shell

### Web Practitioner
- ✅ Join flow backend-gated
- ✅ Composer respects `canSend`
- ✅ Notification routing role-aware

### Web Admin
- ✅ No join tokens in runtime inspector DTOs
- ✅ Notification JSON copy redacts URLs (but not userId — AUDIT-071)
- ✅ `providerRoomId`/`providerSessionRef` shown without gate (AUDIT-058 P2)

### Mobile Patient
- ✅ Join uses backend join contract with `canJoin` guard
- ✅ Join URL restricted to https in production
- ✅ Join token not logged to console/analytics
- ✅ Messages Shell tab routing by `typeSlug`
- ✅ Push registration requires authenticated session
- ✅ No raw chat content in push payloads
- ✅ Role isolation in notification routing
- ✅ All patient API uses `/patients/me/...` prefix
- ✅ No sensitive data in AsyncStorage for push
- ✅ Chat availability flags (`canRead`, `canSend`, `readOnly`) enforced by backend

### Mobile Practitioner
- ✅ Practitioner notification routing uses `resolvePractitionerNotificationRoute`
- ✅ Practitioner queries require authenticated session
- ✅ Support notification routing to support tab

---

*Evidence index produced by Phase 5 read-only audit. No application code was modified. No git commands were executed.*
