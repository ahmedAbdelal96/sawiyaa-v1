# Propagation Matrix — Cross-Surface Contract Issues

**Phase:** 8
**Created:** 2026-06-17
**Purpose:** Maps which surfaces are affected by each contract-sensitive issue, to ensure fixes propagate to all affected locations

This matrix documents findings where a change in one surface (e.g., backend API, mobile component) must propagate to other surfaces. It is organized by contract domain.

---

## Contract Domain 1: Session Status (`presentationStatus`)

**Contract:** Backend sends `presentationStatus` enum value. All surfaces must render via i18n lookup, not string manipulation or raw display.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Web Patient** | `SessionChatPanel.tsx` | `replaceAll("_", " ")` | AUDIT-085 — Raw enum visible in chat header |
| **Web Patient** | `SessionLaneWorkspace.tsx` | `replaceAll("_", " ")` | AUDIT-104 — Raw enum in session lane |
| **Web Patient** | `sessions.tsx:406-408` | Direct `t()` without fallback | AUDIT-017 — Missing key renders raw |
| **Web Patient** | `mapSessionBadge` missing case | No `UNDER_REVIEW` | AUDIT-014 — Blank badge |
| **Mobile Patient** | `sessions.tsx` | Raw `presentationStatus` | AUDIT-012 — Raw enum in patient session list |
| **Mobile Practitioner** | `sessions/index.tsx` | Raw `presentationStatus` | AUDIT-013 — Raw enum in practitioner session list |
| **Mobile Admin** | `AdminSessionListBadge.tsx` | Missing `presentationStatus` prop | AUDIT-002 — Badge shows wrong status |
| **Web Admin** | `AdminSessionsListScreen.tsx` | Missing prop | AUDIT-002 — Same as mobile admin |

### i18n Keys Required

All 9 `presentationStatus` values must have translations in both locales:
`UPCOMING`, `JOINABLE`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ENDED`, `UNAVAILABLE`, `NO_SHOW`, `UNDER_REVIEW`

Additional keys for web: AUDIT-086 confirms `JOINABLE` and `IN_PROGRESS` are missing.

### Propagation Action
When adding i18n keys, update **all surfaces simultaneously** using the propagation table above. Single-surface fixes will leave other surfaces broken.

---

## Contract Domain 2: Session Join (`joinAvailability`)

**Contract:** Backend sends `joinAvailability.canJoin` boolean. Frontends use this as the sole gate for showing the Join CTA. `roomUrl` and `joinToken` are sensitive and must not appear in blocked responses.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Mobile Patient** | `sessions/[id].tsx` | Correctly gated by `canJoin` | ✅ Correct — no change |
| **Mobile Practitioner** | `sessions/[id].tsx` | Correctly gated by `canJoin` | ✅ Correct — no change |
| **Web Patient** | `SessionLane.tsx` | Correctly gated | ✅ Correct — no change |
| **Backend** | `resolve-session-join-contract.use-case.ts:130-148` | Exposes `roomName`/`roomUrl` in blocked response | AUDIT-053 — Room name leaked in error response |
| **Backend** | `session.service.ts` | `endsAt + 7200s` for room expiry | AUDIT-054 — Premature room expiry |
| **Backend** | Daily room creation | Uses `DISPLAY_NAME_MATCH` fallback | AUDIT-055 — Attendance fraud risk |
| **Web** | Join URL in query parameter | Token in GET URL | AUDIT-072 — Token in referrer log risk |

### Propagation Action
AUDIT-053 fix (room URL removal) must be tested against the mobile and web join flows to confirm blocked responses no longer contain sensitive data.

---

## Contract Domain 3: Chat Availability (`chatAvailability`)

**Contract:** Backend sends `chatAvailability.canSend` and `chatAvailability.readOnly`. These gate whether the chat composer appears and whether messages can be sent.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Mobile** | `MessageThreadScreen.tsx:206-212` | Checks `canSend && readOnly !== true` | ✅ Correct — no change |
| **Web** | `ChatConversationView.tsx` | Must verify same gating | Unknown — not audited |
| **Mobile** | Care-chat notification routing | Bypasses Messages Shell | AUDIT-067 — Care-chat notifications go to wrong lane |
| **Web Admin** | Care-chat admin panel | Missing permission gate | AUDIT-068 — Unauthorized access to care-chat admin |

### Propagation Action
AUDIT-067 fix must be tested for both patient and practitioner care-chat notification routing, and verified against the Messages Shell lane mapping (sessions/support/followup).

---

## Contract Domain 4: Payment State

**Contract:** Backend sends payment status enum. All surfaces must render via i18n. Payment confirmation is the highest-trust moment in the booking flow.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Mobile Patient** | `sessions/success.tsx:87-89` | Raw `PENDING_PAYMENT`/`CONFIRMED` | AUDIT-105 — Users see raw enum on confirmation |
| **Mobile Patient** | `payment-return.tsx` | `pendingStill` key missing | AUDIT-008 — English-only fallback |
| **Mobile Patient** | `cancel-preview.tsx:36-59` | Raw backend values without `formatMoney()` | AUDIT-007 — Incorrect currency formatting |
| **Web Patient** | `AdminSessionListBadge` | `SessionStatusBadge` missing `presentationStatus` | AUDIT-002 — Payment status badge incorrect |
| **Web Admin** | `AdminPaymentOpsScreen.tsx` | Free-text amount, no max | AUDIT-003 — Unlimited refund amount |
| **Web Admin** | `AdminSettlementDetailScreen.tsx` | No confirmation dialog | AUDIT-004 — Irreversible financial state change |
| **Web Admin** | `FinancialReconciliationScreen.tsx` | `toLowerCase()` on enum before key lookup | AUDIT-098 — Status labels wrong in Arabic |

### i18n Keys Required

Payment status keys in `patientSessionsFlow.statuses` namespace must cover all states including `PENDING_PAYMENT`, `CONFIRMED`, `EXPIRED`, `REFUNDED`, `FAILED`.

### Propagation Action
AUDIT-105 fix requires verifying key existence in both `en.json` and `ar.json`. If key exists but renders raw, a different code path is active. See Q-083.

---

## Contract Domain 5: Instant Booking Request State

**Contract:** Backend manages `InstantBookingRequest` state machine. Notifications must fire on state transitions (PENDING → ACCEPTED/REJECTED/EXPIRED).

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Backend** | `accept-instant-booking-request.use-case.ts` | No notifications on accept | AUDIT-024/056 — Patient not notified |
| **Backend** | `reject-instant-booking-request.use-case.ts` | No notifications on reject | AUDIT-024/056 — Patient not notified |
| **Backend** | `ExpireInstantBookingRequestUseCase` | No cron driver | AUDIT-030/061 — Requests never auto-expire |
| **Backend** | Instant booking request creation | No price visibility for patient | AUDIT-020 — Patient doesn't see price |
| **Backend** | Instant booking confirmation | Frozen price stored but not retrieved | AUDIT-018 — Patient charged wrong price |
| **Mobile Patient** | `instant-booking.tsx` | Accept/reject CTAs only | ✅ Correct |
| **Web Patient** | Instant booking flow | No confirmation UI | AUDIT-022 — No acceptance confirmation |
| **Web Admin** | Admin session list | No `flowType` | AUDIT-011 — Can't distinguish instant vs scheduled |
| **Web Admin** | Admin panel | No instant booking oversight surface | AUDIT-026 — No admin controls |

### Propagation Action
AUDIT-024 fix requires notification dispatch on all three state transitions (accept, reject, expire) to the patient device. Push payload must not include `threadId` or `relatedEntityType` (AUDIT-057). See notification payload contract below.

---

## Contract Domain 6: Notification Type (`typeSlug`)

**Contract:** Backend sends `typeSlug` string. Mobile uses `typeSlug` to determine which Messages Shell lane to navigate to. i18n keys must exist for all `typeSlug` values.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Mobile Patient** | `profile-notifications.tsx:162` | `formatNotificationType()` bypasses i18n | AUDIT-107 — English-only type labels in Arabic |
| **Mobile Patient** | Notification inbox | `typeSlug` lane routing | AUDIT-109 — Non-message notifications may route incorrectly |
| **Mobile Patient** | `support/new.tsx:109` | Raw `SupportTicketType` enum | AUDIT-106 — Raw enum in category selector |
| **Mobile** | `handleResponse` notification tap | Uses `sessionRef.current` | AUDIT-110 — Race condition on role switch |
| **Mobile** | `extractNotificationHref` | Priority: routePath → href → action.href | AUDIT-058 — routePath bypasses Messages Shell |

### Propagation Action
AUDIT-107 fix (`formatNotificationType`) must use `t()` lookup with a notification-type namespace. All `typeSlug` values must have entries in `en.json`/`ar.json`.

---

## Contract Domain 7: Messages Shell Lane Mapping

**Contract:** `typeSlug` values map to specific inbox lanes: `session-message-received` → sessions, `support-message-received` → support, `follow-up-message-received` → followup. Notifications for `/messages/{threadId}` must go through the shell.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Mobile** | `routes.ts` patient resolver | `typeSlug` resolved before href | ✅ Correct |
| **Mobile** | `utils.ts` practitioner resolver | `typeSlug` resolved before href | ✅ Correct |
| **Mobile** | `extractNotificationHref` | routePath for `/messages/{threadId}` | AUDIT-058 — Bypasses shell lane |
| **Mobile** | Care-chat notifications | routePath bypasses shell | AUDIT-067 — Care-chat goes to wrong lane |

### Propagation Action
AUDIT-058 fix: notifications with `routePath` pointing to `/messages/{threadId}` must be intercepted and routed through the Messages Shell. This requires coordination between the notification routing resolver and the Messages Shell component.

---

## Contract Domain 8: Practitioner OTP and Account State

**Contract:** Certain practitioner operations require `PRACTITIONER_OTP_VERIFIED` claim. Web layouts must verify `account-state`. Non-approved practitioners must not access practitioner features.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Backend** | Practitioner support ticket creation | No OTP verification | AUDIT-034 — Bypasses security step |
| **Backend** | Practitioner wallet payout | No OTP verification | AUDIT-035 — Bypasses security step |
| **Backend** | Practitioner login | No `deviceId` binding | AUDIT-041 — No device traceability |
| **Web Patient** | Patient layout | No `account-state` check | AUDIT-046 — Account-state ignored |
| **Web Practitioner** | Practitioner layout | No `account-state` check | AUDIT-046 — Account-state ignored |
| **Mobile** | `onboarding.tsx` | Accessible via direct navigation | AUDIT-114 — Hidden route exposed |
| **Mobile** | Practitioner `_layout.tsx` | APPROVED gate present | ✅ Correct |
| **Backend** | `APP_GUARD` global guard | May not exist | AUDIT-031, AUDIT-040 — Unknown protection level |

### Propagation Action
AUDIT-034/035 fix requires applying the `PRACTITIONER_OTP_VERIFIED` guard to the ticket creation and payout endpoints. AUDIT-046 fix requires adding `account-state` checks to the patient and practitioner web layouts.

---

## Contract Domain 9: Admin Permission Keys

**Contract:** All admin routes must have `AdminPermissionGate` checking specific permission keys. Gate shows loading state with i18n.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Web Admin** | `admin/care-chat/[id]` | No gate | AUDIT-068 — Unauthorized access |
| **Web Admin** | `admin/sessions/runtime-inspection` | No gate | AUDIT-069 — Unauthorized access |
| **Web Admin** | `admin/refund-policies` | No gate | AUDIT-102 — Unauthorized access |
| **Web Admin** | `admin/notifications/[id]` | No gate | AUDIT-103 — Unauthorized access |
| **Web Admin** | `AdminPermissionGate` component | Shows raw "Loading..." | AUDIT-093 — Not i18n'd |
| **Web** | `AdminPermissionGate` | Not auto-applied | AUDIT-045 — Systematic gap |

### Propagation Action
AUDIT-045 fix requires auditing every admin route and applying `AdminPermissionGate` with appropriate permission keys. Consider an ESLint rule or codemod to enforce gate presence on all `/admin/` routes.

---

## Contract Domain 10: Step-Up / MFA

**Contract:** High-impact financial operations (manual payout, refund above threshold) require MFA/step-up authentication.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Web Admin** | `AdminPractitionerPayoutDrawer.tsx:153` | No MFA/step-up | AUDIT-006 — Manual payout without step-up |
| **Web Admin** | Refund panel | No MFA on large refunds | AUDIT-003 — Refund without step-up |

### Propagation Action
AUDIT-006 fix requires integrating MFA/step-up challenge into the manual payout flow. AUDIT-003 requires threshold-based MFA on refund panel (e.g., refunds above 1000 EGP require step-up).

---

## Contract Domain 11: Daily Join Contract

**Contract:** When a session join is blocked (contract violated), the error response must not include `roomName`, `roomUrl`, `roomPin`, or any join token.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Backend** | `resolve-session-join-contract.use-case.ts:130-148` | Room data in blocked response | AUDIT-053 — Room URL leaked |
| **Web Admin** | Runtime inspector timeline | `providerRoomRef` visible | AUDIT-095 — Token exposed in inspector |

### Propagation Action
AUDIT-053 fix must strip all room-related fields from the blocked contract response. AUDIT-095 fix: if `providerRoomRef` is a secrets-bearing token, it must not appear in the runtime inspector timeline. If it is an opaque room name, it may remain but should be reviewed.

---

## Contract Domain 12: Push Notification Payload

**Contract:** Push payloads must not include PHI fields (`threadId`, `userId`, `relatedEntityType`). `targetRole` must be always populated.

### Affected Surfaces

| Surface | File(s) | Current Behavior | Risk if Not Fixed |
|---------|---------|-----------------|------------------|
| **Backend** | Notification dispatch | `threadId`, `relatedEntityType` in payload | AUDIT-057 — PHI risk |
| **Backend** | Notification dispatch | `targetRole` may be absent | AUDIT-065/074 — Role fallback risk |
| **Mobile** | `extractNotificationHref` | `routePath` used as fallback | AUDIT-058 — Shell bypass |
| **Mobile** | `handleResponse` | `sessionRef.current` used for role | AUDIT-110 — Race condition |
| **Mobile** | `syncPushRegistration` | No timestamp on registration | AUDIT-082 — Stale registration |
| **Mobile** | Push registration | No EAS project ID in some configs | AUDIT-064 — Token delivery issues |

### Propagation Action
AUDIT-057 fix requires backend confirmation of which fields are actually populated in the push payload. AUDIT-065 fix requires ensuring `targetRole` is always set by the backend on notification creation.

---

## Cross-Surface Propagation Summary

| Contract Domain | Surfaces Affected | Fix Propagation Risk |
|----------------|------------------|-------------------|
| presentationStatus | Web (3), Mobile (3), Admin (2) | Multiple surfaces must be updated together |
| joinAvailability | Mobile (2), Web (1), Backend (3) | Backend fix must not break mobile/web gating |
| chatAvailability | Mobile (1), Web (1) | Verify web gating matches mobile |
| Payment state | Mobile (3), Web Admin (4) | Currency formatting, i18n keys must propagate |
| Instant booking state | Backend (6), Mobile (1), Web Admin (2) | State machine change affects all surfaces |
| Notification typeSlug | Mobile (4) | typeSlug namespace must cover all values |
| Messages Shell lane | Mobile (2) | Lane routing must be consistent |
| Practitioner OTP/state | Backend (3), Web (2), Mobile (1) | Guard changes affect backend + web + mobile |
| Admin permission keys | Web Admin (5) | All admin routes must have gates |
| MFA/step-up | Web Admin (2) | Step-up UI must not break existing flows |
| Daily join contract | Backend (1), Web Admin (1) | Backend fix is source of truth |
| Push payload | Backend (2), Mobile (4) | Backend payload changes must be coordinated |

---

*Propagation matrix produced by Phase 8 read-only triage. No application code was modified.*
