# Phase 1 Audit Report — Sessions / Join / Daily / Session Chat / Messages / Support

**Phase:** 1
**Scope:** Sessions, Join Flow, Daily Video Integration, Session Chat, Messages Shell, Support/Care Chat
**Started:** 2026-06-16
**Status:** Complete
**Auditor:** Claude Code (AI-assisted audit)

---

## Executive Summary

Phase 1 audited the Sessions module and adjacent surfaces (Join, Session Chat, Messages Shell, Support/Care Chat) across backend, web frontend, and mobile. The session state contract (`presentationStatus`, `joinAvailability`, `chatAvailability`) is well-structured and consistently applied across all surfaces. Two findings were registered, both P2 (UX degradation, not blocking). No P0 or P1 issues were found. The Phase 5A/5B fixes (explicit TypeScript generics on `usePatientSession`/`usePractitionerSession`, i18n coverage for `NO_SHOW`/`UNDER_REVIEW`) were verified as correctly implemented.

---

## Modules Audited

| Module | Location | Risk Tier |
|--------|----------|-----------|
| Sessions | `fayed-backend-v1/src/modules/sessions/` | P0 |
| Notifications | `fayed-backend-v1/src/modules/notifications/` | P1 |
| Chat | `fayed-frontend-v1/src/features/chat/` | P1 |
| Messages Shell | `fayed-frontend-v1/src/features/messages-shell/` | P1 |
| Support | `fayed-frontend-v1/src/features/support/` | P1 |
| Care Chat | `fayed-frontend-v1/src/features/care-chat/` | P1 |
| Admin Sessions | `fayed-frontend-v1/src/features/admin/sessions/` | P1 |
| Admin Session Runtime | `fayed-frontend-v1/src/features/admin/session-runtime/` | P1 |
| Mobile Sessions | `fayed-mobile/app/(patient)/sessions/`, `fayed-mobile/app/(practitioner)/sessions/` | P1 |

---

## What Was Audited

### Backend Contract Layer

- **Session response DTOs** — `SessionItemResponseDto`, `SessionDetailsResponseDto` with `presentationStatus`, `joinAvailability`, `chatAvailability`
- **Join policy** — `resolveSessionJoinPolicy()` pure function computing `canJoin`, `blockedReason`, `joinOpensAt`, `joinClosesAt`
- **Presentation status** — `resolveSessionPresentationStatus()` mapping session state to 9-value enum with manual decision override
- **Chat policy** — `resolveSessionChatAvailability()` deriving `canSend`, `canRead`, `readOnly` from presentation status
- **Manual decisions** — `CreateAdminSessionManualDecisionDto` requiring `confirmEvidenceReviewed`, `confirmNoAutomaticRefund`, `confirmNoAutomaticPayout`
- **Join contract use case** — `ResolveSessionJoinContractUseCase` with auto-promotion of `CONFIRMED`/`UPCOMING` to `READY_TO_JOIN` and Daily token generation
- **Session video types** — `SessionJoinBlockedReason` (5 values), `SessionPresentationStatus` (9 values), `SessionRuntimeViewModel`

### Web Patient Surfaces

- **Session detail panel** (`PatientSessionDetailPanel.tsx`) — verified Join CTA uses `joinAvailability.canJoin === true`, status badge uses `SessionStatusBadge` with i18n, chat availability gated on `canOpenSessionChatFromPresentationStatus()`, presentation status i18n uses `sessions.detail.presentation.${status}` namespace
- **Sessions list panel** (`PatientSessionsPanel.tsx`) — verified `SessionStatusBadge` with `presentationStatus` prop, `list.presentationHints.${status}` for secondary hint text, no raw enum visible, proper status filtering by `presentationStatus`
- **Join flow** — `useResolvePatientSessionJoinContract` hook, `canJoinNow = session.joinAvailability?.canJoin === true`, auto-prepare runtime logic, blocked reason display

### Web Practitioner Surfaces

- **Session detail panel** (`PractitionerSessionDetailPanel.tsx`) — verified same Join CTA pattern, `canMarkCompleted`/`canMarkNoShow` driven by `presentationStatus` array checks, chat dispatch via `dispatchOpenSessionChatInShell()`
- **Sessions list panel** (`PractitionerSessionsPanel.tsx`) — verified `presentationStatus` filter dropdown with 5 filter values, `SessionStatusBadge` in table column, timezone-aware scheduling display

### Session Chat

- **SessionChatPanel** — verified `chatAllowed = session?.chatAvailability?.canRead ?? false`, `showComposer` gated on `sessionChatAvailability?.canSend === true && sessionChatAvailability?.readOnly !== true`, read-only notice displayed when appropriate, `useSessionChatRealtime` for real-time updates

### Messages Shell

- **PatientMessagesScreen** — thin wrapper around `MessagesWorkspace` with `role="patient"`
- **PractitionerMessagesScreen** — same pattern with `role="practitioner"`
- **SessionLaneThread** — session-context message thread routing
- **SupportLaneThread** — support ticket routing
- **Messages routes utility** — correct thread routing logic

### Support / Care Chat

- **Support surfaces** — `PatientSupportHomeScreen`, `PractitionerSupportHomeScreen`, `AdminSupportListScreen`, `AdminSupportTicketScreen` — all separate navigation stacks, distinct from care chat
- **Care chat surfaces** — `PatientCareChatHomeScreen`, `PractitionerCareChatHomeScreen`, `AdminCareChatRequestsScreen` — separate from support
- **Routing distinction** — `/patient/support` vs `/patient/care-chat` are separate entry points with distinct UX purposes

### Admin Surfaces

- **Admin sessions list** (`AdminSessionsListScreen.tsx`) — verified status tab filter includes all session statuses, `SessionStatusBadge` used for display, runtime inspection drawer, attendance data display
- **Runtime inspector** (`AdminSessionRuntimeInspectionScreen.tsx`) — verified reads from `admin-session-runtime` i18n namespace, `t("statuses.${item.status}")` for status display, readiness section showing `canJoin`/`canPrepareRuntime`/`blockedReason`, provider summary section, attendance section
- **i18n coverage** — `admin-session-runtime.json` has full `statuses` block covering all session statuses, `modes` block, `providers` block, `blockedReasons` block, `labels` block

### Mobile Surfaces

- **Patient session detail** (`app/(patient)/sessions/[id].tsx`) — verified `canAttemptJoin = sessionQuery.data?.joinAvailability?.canJoin === true`, `formatPresentationStatusLabel()` uses i18n with `patientSessionsFlow.presentationStatus.${status}` namespace, status pill shows translated text, chat availability gate on `chatAvailability?.canRead`, correct routing to messages
- **Practitioner sessions list** (`app/(practitioner)/sessions/index.tsx`) — verified `isJoinable = isSessionJoinableNow(session)` using `joinAvailability?.canJoin === true`, `StatusChip` with i18n key `practitioner.presentationStatus.${session.presentationStatus}`, auto-prepare runtime logic, correct Daily join URL construction

---

## Phase 5A/5B Fix Verification

Phase 5A fixed TypeScript build errors by adding explicit `SessionItem` generics to `usePatientSession` and `usePractitionerSession`. Both hooks were verified:

```typescript
// use-sessions.ts line ~50
export function usePatientSession(sessionId: string | null, extraOptions?: PatientSessionExtraOptions) {
  return useQuery<SessionItem>({  // ← explicit generic, Phase 5A fix
    queryKey: patientSessionQueryKeys.detail(sessionId ?? ""),
    queryFn: () => getPatientSession(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
    ...extraOptions,
  });
}
```

Phase 5B added missing i18n keys for `NO_SHOW` and `UNDER_REVIEW` in `sessions.json` under the `presentationStatus`, `sessions.detail.presentation`, and `sessions.practitioner.detail.presentation` namespaces. Both were verified present in `messages/en/sessions.json`.

---

## Findings Summary

| ID | Title | Severity |
|----|-------|----------|
| AUDIT-001 | Embedded session chat header shows raw `presentationStatus` text | P2 |
| AUDIT-002 | Admin sessions list `SessionStatusBadge` missing `presentationStatus` prop | P2 |

**Total: 2 findings — both P2, both require i18n fix**

---

## What Was NOT Audited (deferred to later phases)

- Actual runtime checks against live servers — requires servers running at localhost:7000 (backend), localhost:3000 (web), localhost:8081 (mobile)
- Admin manual decision flow end-to-end
- Daily.co video call quality and reconnection behavior
- Care chat request approval workflow
- Payment-return deep link routing on mobile
- Presence module and instant-booking surfaces
- Full i18n sweep for all 9 `presentationStatus` values across all namespaces

---

## Risk Posture

The Sessions module is in **good shape** for a Phase 1 audit. The contract layer is well-designed with clear separation between raw session status, presentation status, join availability, and chat availability. The Phase 5A/5B fixes are correctly applied. The two findings are UX-level (raw enum appearing in secondary location, badge missing a prop) and do not represent financial, security, or blocking issues.

**Recommended next phase:** Phase 2 — Payments / Wallets / Refunds (per the audit master plan's recommended sequence).