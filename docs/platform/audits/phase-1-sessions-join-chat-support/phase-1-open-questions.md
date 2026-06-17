# Phase 1 Open Questions — Sessions / Join / Chat / Support

**Phase:** 1
**Created:** 2026-06-16

Open questions discovered during Phase 1 that warrant investigation in later phases or before Phase 2 begins.

---

## Questions from Phase 0 (Carried Forward)

These were identified in Phase 0 and remained unanswered at Phase 1 close:

### Q-001: Mobile payment-return routing
**Asked in:** Phase 0
**Question:** The mobile `app/(patient)/` structure does not show an explicit `payment-return` route. Does the mobile app handle payment-return via deep link interception or a shared web view? How does the deep link route to the correct session detail after payment?
**Why it matters:** If deep links are broken, patients cannot return to their session after completing payment, blocking the instant-booking flow.
**Phase:** Phase 7 (Mobile)
**Status:** Not resolved

### Q-002: Mobile instant-booking surfaces
**Asked in:** Phase 0
**Question:** No `instant-booking` route group is visible in the mobile app directory. Does the mobile patient/practitioner instant-booking flow use a different route pattern or a web view wrapper?
**Why it matters:** Instant booking is a core revenue path; if mobile doesn't support it natively, patients must use web.
**Phase:** Phase 7 (Mobile)
**Status:** Not resolved

### Q-003: Care chat vs. support routing distinction on mobile
**Asked in:** Phase 0
**Question:** Are the `/care-chat` and `/support` routes on mobile separate navigation stacks or the same surface with different entry points?
**Why it matters:** The design spec says these are distinct experiences. If they share a surface, the UX distinction may be broken.
**Phase:** Phase 7 (Mobile)
**Status:** Not resolved

### Q-004: `presence` module UI
**Asked in:** Phase 0
**Question:** Is there a corresponding presence indicator UI in the web frontend's practitioner discovery or patient instant booking surfaces?
**Why it matters:** Presence drives online/away state for instant booking eligibility. If the UI is missing, patients may attempt to book unavailable practitioners.
**Phase:** Phase 6 (Web UX)
**Status:** Not resolved

### Q-005: `care-experience-intelligence` module scope
**Asked in:** Phase 0
**Question:** Is the `modules/care-experience-intelligence` module active product logic or experimental/placeholder? Does it touch any user-facing surfaces?
**Why it matters:** Undocumented modules may represent dead code or future product work with unclear scope.
**Phase:** Phase 2 (Payments) or Phase 3
**Status:** Not resolved

### Q-006: `fayed-frontend-v3` relationship
**Asked in:** Phase 0
**Question:** What is the relationship between `fayed-frontend-v1` and `fayed-frontend-v3`? Are they separate deployments, a migration target, or an abandoned experiment?
**Why it matters:** If v3 is the migration target, auditing v1 deeply may be wasted effort.
**Phase:** Phase 6 (Web UX)
**Status:** Not resolved

### Q-007: Mobile artifacts directory intent
**Asked in:** Phase 0
**Question:** The mobile `artifacts/` directory contains many named QA artifact folders. Are these intended to remain in the repo?
**Why it matters:** P3 hygiene; may bloat repo and confuse future audits.
**Phase:** Phase 7 (Mobile)
**Status:** Not resolved

---

## New Questions from Phase 1

### Q-008: AUDIT-001 — How long has the raw enum been in the chat header?
**Found during:** Phase 1
**Question:** The raw `presentationStatus` displayed in `SessionChatPanel` line 354 (AUDIT-001) has likely been there since the embedded chat was first implemented. Was this a known debug artifact that was never cleaned up, or was the i18n key intentionally omitted because the developer was unsure which namespace to use?
**Why it matters:** The answer determines whether the fix is a one-line i18n call or whether the entire status display pattern needs rethinking.
**Phase:** Any phase assigned to fix AUDIT-001
**Status:** Not resolved

### Q-009: AUDIT-002 — Was `presentationStatus` added to admin list items after initial build?
**Found during:** Phase 1
**Question:** The `AdminSessionsListScreen` at line 748 calls `SessionStatusBadge` without `presentationStatus`. Was `presentationStatus` added to the admin list item type after the initial build? Is there a data pipeline issue preventing `presentationStatus` from being available on the admin list row, or is it available and the prop was simply not passed?
**Why it matters:** If `presentationStatus` is not in the admin list query response, the fix requires a backend change. If it is available, the fix is a one-prop addition.
**Phase:** Any phase assigned to fix AUDIT-002
**Status:** Not resolved — requires checking the admin session list API response type

### Q-010: Session chat header design intent
**Found during:** Phase 1
**Question:** The embedded `SessionChatPanel` shows a session status pill in the `actions` slot of the header panel. What was the original design intent for this pill? Was it intended to show real-time session state (e.g., to remind the user the session is "In Progress" while they're chatting), or was it informational only? If real-time, does it update when `presentationStatus` changes mid-session?
**Why it matters:** If it should be real-time, the current implementation (reading once from the session prop at mount) may not update. If it's informational, the current static display is acceptable but the i18n fix still applies.
**Phase:** Phase 6 (Web UX)
**Status:** Not resolved

### Q-011: i18n completeness for all `presentationStatus` values across all namespaces
**Noted in:** Phase 1
**Question:** Phase 5B added missing i18n keys for `NO_SHOW` and `UNDER_REVIEW` in three namespace trees. Are the other 7 `presentationStatus` values (`UPCOMING`, `JOINABLE`, `IN_PROGRESS`, `COMPLETED`, `ENDED`, `CANCELLED`, `NO_SHOW`, `UNDER_REVIEW`) fully covered across all namespaces that use them? Specifically: `sessions.list.presentationHints`, `sessions.detail.presentation`, `sessions.practitioner.detail.presentation`, `sessions.practitioner.list.presentationHints`, `admin-session-runtime.statuses`, and all mobile namespaces.
**Why it matters:** Phase 9 is the full i18n sweep, but if there are gaps in the `presentationStatus` coverage, they will generate findings in Phase 9. This question is to flag it as a known risk.
**Phase:** Phase 9
**Status:** Not resolved

### Q-012: Daily.co reconnection and call quality handling
**Noted in:** Phase 1
**Question:** The audit verified that the join URL is correctly constructed with a Daily token and that the join CTA is gated on `joinAvailability.canJoin`. However, the actual Daily.co video call behavior (reconnection on network drop, call quality indicators, what happens if the call disconnects mid-session) was not tested. What is the expected behavior when a call drops?
**Why it matters:** This is a user experience risk for clinical sessions where continuity matters.
**Phase:** Phase 1 (not deep audited)
**Status:** Not resolved — requires live testing

### Q-013: Admin manual decision flow end-to-end
**Noted in:** Phase 1
**Question:** The `CreateAdminSessionManualDecisionDto` requires three explicit boolean confirmations (`confirmEvidenceReviewed`, `confirmNoAutomaticRefund`, `confirmNoAutomaticPayout`). The audit verified these exist in the DTO. However, the end-to-end flow (how the admin reaches this decision, what evidence is surfaced, what the payout/refund side effects are) was not audited. What happens after an admin marks a session as NO_SHOW? Are refunds triggered automatically? Are payouts blocked?
**Why it matters:** Financial and trust risk — incorrect manual decisions could trigger incorrect refunds or payouts.
**Phase:** Phase 2 (Payments)
**Status:** Not resolved

### Q-014: Chat message persistence for `UNDER_REVIEW` sessions
**Noted in:** Phase 1
**Question:** Sessions with `presentationStatus: UNDER_REVIEW` have `chatAvailability.readOnly = true` (per `session-chat-policy.util.ts`), meaning patients can read but not send. What happens to messages sent during an `UNDER_REVIEW` session after the session exits `UNDER_REVIEW` state? Are they preserved? Are they visible to the admin reviewing the case?
**Why it matters:** Clinical context could be lost if the chat history is not preserved or accessible to the reviewing admin.
**Phase:** Phase 3 (Admin surfaces)
**Status:** Not resolved

### Q-015: Mobile session detail `formatPresentationStatusLabel()` completeness
**Found during:** Phase 1
**Question:** The patient mobile session detail at `app/(patient)/sessions/[id].tsx` line 433 uses `formatPresentationStatusLabel()` which wraps `t("patientSessionsFlow.presentationStatus.${status}")`. The mobile `en.json` has a `presentationStatus` block at line 792 with 9 values. However, the audit did not verify whether the `patientSessionsFlow.presentationStatus` namespace covers all 9 values or just a subset. The same applies to the practitioner `practitioner.presentationStatus` namespace at line 2319.
**Why it matters:** If any `presentationStatus` value is missing from the mobile i18n files, the status label will fall back to the raw enum or show a missing key error.
**Phase:** Phase 7 (Mobile)
**Status:** Not resolved — requires checking mobile i18n files for all 9 values in both namespaces

---

## Resolved Questions

These questions were raised during Phase 1 and resolved before phase close:

### RQ-001: i18n namespace for `SessionStatusBadge`
**Question:** Does `SessionStatusBadge` use `sessions.presentationStatus.${status}` or `sessions.detail.presentation.${status}`? Was there a namespace mismatch with Phase 5B?
**Answer:** Both namespaces exist and serve different purposes. `sessions.presentationStatus.${status}` is used by `SessionStatusBadge` directly. `sessions.detail.presentation.${status}` is used by the detail panel for the title/note/closeout section. Phase 5B correctly added `NO_SHOW` and `UNDER_REVIEW` to both namespaces. No mismatch.
**Resolved by:** Reading `messages/en/sessions.json` lines 66–90

### RQ-002: Phase 5A — Were explicit generics actually added?
**Question:** Did Phase 5A actually add explicit `useQuery<SessionItem>` generics to prevent TypeScript type degradation, or is the hook still using inference-only typing?
**Answer:** Confirmed. `usePatientSession` and `usePractitionerSession` both use `useQuery<SessionItem>` (explicit generic). Phase 5A fix verified in `fayed-frontend-v1/src/features/sessions/hooks/use-sessions.ts`.
**Resolved by:** Reading `use-sessions.ts` in full

### RQ-003: Chat composer visibility for `JOINABLE` vs `IN_PROGRESS`
**Question:** Is the chat composer shown for sessions that are `JOINABLE` but not yet `IN_PROGRESS`?
**Answer:** Yes. `showComposer = Boolean(conversationId) && sessionChatAvailability?.canSend === true && sessionChatAvailability?.readOnly !== true`. The `canSend` signal is `true` for both `JOINABLE` and `IN_PROGRESS` (per `session-chat-policy.util.ts`). The composer appears as soon as a conversation exists and the session is in a sendable state.
**Resolved by:** Reading `SessionChatPanel.tsx` lines 182–185 and `session-chat-policy.util.ts`