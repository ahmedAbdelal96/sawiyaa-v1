# Phase 1 Evidence Index — Sessions / Join / Chat / Support

**Phase:** 1
**Created:** 2026-06-16

This index maps every finding to its evidence sources and lists all files inspected during the audit.

---

## Files Inspected (with specific line references)

### Backend

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/sessions/dto/session-response.dto.ts` | Full file | `SessionItemResponseDto`, `SessionDetailsResponseDto` with `presentationStatus`, `joinAvailability`, `chatAvailability` |
| `fayed-backend-v1/src/modules/sessions/utils/session-join-policy.util.ts` | Full file | `resolveSessionJoinPolicy()`, `resolveSessionPresentationStatus()`, `buildSessionJoinAvailabilityViewModel()`, manual decision override logic |
| `fayed-backend-v1/src/modules/sessions/utils/session-chat-policy.util.ts` | Full file | `resolveSessionChatReason()`, `resolveSessionChatAvailability()`, NO_SHOW/UNDER_REVIEW chat policy |
| `fayed-backend-v1/src/modules/sessions/types/session-video.types.ts` | Full file | `SessionJoinBlockedReason` (5 values), `SessionPresentationStatus` (9 values), `SessionRuntimeViewModel` |
| `fayed-backend-v1/src/modules/sessions/dto/create-admin-session-manual-decision.dto.ts` | Full file | `confirmEvidenceReviewed`, `confirmNoAutomaticRefund`, `confirmNoAutomaticPayout` all require `Equals(true)` |
| `fayed-backend-v1/src/modules/sessions/use-cases/resolve-session-join-contract.use-case.ts` | Full file | Auto-promotion `CONFIRMED`/`UPCOMING` → `READY_TO_JOIN`, Daily token creation, `JOIN_ATTEMPTED`/`JOIN_BLOCKED`/`JOIN_TOKEN_ISSUED`/`JOIN_ALLOWED` events |

### Frontend

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/sessions/hooks/use-sessions.ts` | Full file | Explicit `useQuery<SessionItem>` generic (Phase 5A fix), `canJoinNow = session.joinAvailability?.canJoin === true` |
| `fayed-frontend-v1/src/features/sessions/lib/session-presentation.ts` | Full file | `SESSION_CHAT_OPEN_PRESENTATION_STATUSES`, `canOpenSessionChatFromPresentationStatus()`, `getSessionPresentationKey()` |
| `fayed-frontend-v1/src/features/sessions/components/SessionStatusBadge.tsx` | Full file | Uses `sessions.presentationStatus.${displayStatus}` i18n key for patient path, `sessions.practitioner.status.${displayStatus}` for practitioner fallback |
| `fayed-frontend-v1/src/features/sessions/types/sessions.types.ts` | Full file | `SessionItem`, `SessionListItem`, `SessionJoinAvailability`, `SessionChatAvailability` types |
| `fayed-frontend-v1/src/features/sessions/components/PatientSessionDetailPanel.tsx` | Full file | `canJoinNow = session.joinAvailability?.canJoin === true`, `SessionStatusBadge` with both `status` and `presentationStatus` props, `canOpenSessionChatFromPresentationStatus()`, all i18n keys from `sessions.detail.presentation.${status}` |
| `fayed-frontend-v1/src/features/sessions/components/PatientSessionsPanel.tsx` | Full file | `SessionStatusBadge` with `presentationStatus` prop (line 679), `list.presentationHints.${session.presentationStatus}` for secondary hint (line 688), no raw enum visible |
| `fayed-frontend-v1/src/features/sessions/components/PractitionerSessionDetailPanel.tsx` | Full file | Same Join CTA pattern, `canMarkCompleted`/`canMarkNoShow` driven by `presentationStatus` array, `dispatchOpenSessionChatInShell()` |
| `fayed-frontend-v1/src/features/sessions/components/PractitionerSessionsPanel.tsx` | Full file | `presentationStatus` filter dropdown (5 values: joinable/live/upcoming/finished/unavailable), `SessionStatusBadge` with `presentationStatus` prop |
| `fayed-frontend-v1/src/features/chat/components/SessionChatPanel.tsx` | Full file | `chatAllowed = session?.chatAvailability?.canRead ?? false`, `showComposer` on `canSend`, read-only notice, **AUDIT-001** at line 354–356 |
| `fayed-frontend-v1/src/features/messages-shell/components/PatientMessagesScreen.tsx` | Full file | Thin wrapper around `MessagesWorkspace` with `role="patient"` |
| `fayed-frontend-v1/src/features/messages-shell/components/PractitionerMessagesScreen.tsx` | Full file | Same pattern with `role="practitioner"` |
| `fayed-frontend-v1/src/features/messages-shell/components/SessionLaneThread.tsx` | Full file | Session-context thread routing |
| `fayed-frontend-v1/src/features/messages-shell/components/SupportLaneThread.tsx` | Full file | Support ticket routing |
| `fayed-frontend-v1/src/features/support/components/PatientSupportHomeScreen.tsx` | Full file | Separate from care chat |
| `fayed-frontend-v1/src/features/support/components/PractitionerSupportHomeScreen.tsx` | Full file | Separate from care chat |
| `fayed-frontend-v1/src/features/care-chat/components/PatientCareChatHomeScreen.tsx` | Full file | Separate from support |
| `fayed-frontend-v1/src/features/care-chat/components/PractitionerCareChatHomeScreen.tsx` | Full file | Separate from support |
| `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx` | Full file | **AUDIT-002** at line 748: `SessionStatusBadge` without `presentationStatus` prop; `getStatusLabel()` hard-coded Arabic/English map for admin display |
| `fayed-frontend-v1/src/features/admin/session-runtime/components/AdminSessionRuntimeInspectionScreen.tsx` | Full file | `t("statuses.${item.status}")` via `admin-session-runtime` namespace, `statuses` block in i18n verified complete |
| `fayed-frontend-v1/src/features/admin/session-runtime/components/AdminSessionAttendanceSection.tsx` | Selected sections | Attendance timeline display |
| `fayed-frontend-v1/src/features/admin/session-runtime/components/AdminSessionInspectorCaseSummary.tsx` | Selected sections | Case summary with evidence flags |
| `fayed-frontend-v1/src/features/admin/session-runtime/components/AdminSessionInspectorRawEvidence.tsx` | Selected sections | Raw evidence display |

### Frontend i18n Files

| File | Key Content Inspected |
|------|----------------------|
| `fayed-frontend-v1/messages/en/sessions.json` | `presentationStatus` block (all 9 values), `sessions.detail.presentation` block, `sessions.practitioner.detail.presentation` block, `sessions.list.presentationHints` block |
| `fayed-frontend-v1/messages/en/admin-session-runtime.json` | `statuses` block (13 session statuses), `modes`, `providers`, `blockedReasons`, `labels` blocks |

### Mobile

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-mobile/app/(patient)/sessions/[id].tsx` | Full file | `canAttemptJoin = sessionQuery.data?.joinAvailability?.canJoin === true`, `formatPresentationStatusLabel()` using i18n `patientSessionsFlow.presentationStatus.${status}`, status pill with translated text |
| `fayed-mobile/app/(practitioner)/sessions/index.tsx` | Full file | `isJoinable = isSessionJoinableNow(session)` using `joinAvailability?.canJoin === true`, `StatusChip` with `t(\`practitioner.presentationStatus.${session.presentationStatus}\`)`, auto-prepare logic |
| `fayed-mobile/src/features/patient/sessions/types.ts` | Selected sections | `SessionPresentationStatus` type |
| `fayed-mobile/src/features/practitioner/sessions/types.ts` | Selected sections | `SessionPresentationStatus` type |
| `fayed-mobile/src/i18n/locales/en.json` | `presentationStatus` sections | Three `presentationStatus` blocks verified: patient sessions, package purchases, practitioner sessions |

---

## Finding Evidence

### AUDIT-001

**File:** `fayed-frontend-v1/src/features/chat/components/SessionChatPanel.tsx`
**Lines:** 354–356
**Snippet:**
```tsx
actions={
  <div className="flex items-center gap-2">
    <span className="rounded-full bg-teal-50/70 border border-teal-100/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
      {session?.presentationStatus.replaceAll("_", " ")}
    </span>
  </div>
}
```
**Description:** Raw `presentationStatus` string is displayed directly in the embedded chat header without i18n translation.

### AUDIT-002

**File:** `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx`
**Lines:** 747–748
**Snippet:**
```tsx
<td className="px-4 py-4 sm:px-6">
  <div className="flex flex-wrap items-center gap-2">
    <SessionStatusBadge status={row.status} />
    {row.isDelayed ? (
      <AdminStatusBadge tone="danger">
        {locale === "ar" ? "متأخرة" : "Delayed"}
      </AdminStatusBadge>
    ) : null}
  </div>
</td>
```
**Description:** `SessionStatusBadge` is called without `presentationStatus` prop. Compare with `PatientSessionsPanel.tsx` line 679 which correctly passes both props.