# Sawiyaa session lifecycle integrity — current-state audit

**Audit date:** 2026-08-08 (Africa/Cairo)  
**Scope:** development database; `sawiyaa-backend-v1`, `sawiyaa-frontend-v1`, and a focused mobile contract check.  
**Inspected Git state:** branch `main`, HEAD `7b87aab56e773ad051c09f913dfb4eedae558063`. The worktree was already dirty when the audit began; no application, schema, migration, seed, generated-client, or DB data was changed by this audit.

## Executive conclusion

The system has a canonical persisted lifecycle field (`Session.status`) and one central lifecycle writer (`SessionLifecycleService`), but it does **not** yet have one authoritative *operational session read model*. Room closure, lifecycle, provider attendance, join authorisation, no-show, admin presentation, and financial outcomes are separate facts which clients and services compose differently.

The reproduced session did **not** actually become `CANCELLED` or `PATIENT_NO_SHOW`. The practitioner executed the distinct “close video room” action with reason `المريض مجاش` (“the patient did not come”). That use case calls Daily, records room-close fields and a `PROVIDER_ROOM_ENDED` event, but intentionally leaves `Session.status` unchanged. Its persisted status therefore remains `READY_TO_JOIN`; that is why a hard reload continues to show “Ready to join.” The server-side join endpoint nevertheless sees `videoRoomClosedAt` and blocks new bootstrap tokens. Thus the visible lifecycle is false while the separate join-authorisation fact is safe for this concrete room-close case.

This is **BLOCKER** severity for lifecycle integrity and operations: a human-readable “no-show” reason can be stored without a no-show decision, terminal lifecycle transition, attendance validation, cancellation record, notification, or financial outcome. Separately, the practitioner no-show endpoint can transition an attended/in-progress session to `PATIENT_NO_SHOW` without reading attendance evidence or checking the no-show grace period. That is also **BLOCKER** severity.

## Forensic reconstruction: `S-260808-0026`

The session exists in the development DB: `Session.id = 1db5ae22-a600-49ae-93a0-9b215a7d3dbd`.

| UTC time | Persisted evidence | Meaning |
|---|---|---|
| 12:31:25.485 | Session created as video, 60 minutes, direct payment; scheduled 12:36:24–13:36:24 | `status` subsequently appears as `READY_TO_JOIN`; `joinOpenAt` 12:21:24 and `joinCloseAt` 13:46:24. |
| 12:31:25.554 | Payment `0cfe…f22` is `CAPTURED` for 650 EGP | Payment is separate from lifecycle. No refund exists. |
| 12:31:26.854 | `PROVIDER_ROOM_CREATED` | Daily room `fayed-session-1db5…3dbd` persisted. |
| 12:31:26.866 | `SESSION_READY_TO_JOIN`, `UPCOMING → READY_TO_JOIN` | Lifecycle event. |
| 12:33:31–12:33:32 | Practitioner `JOIN_ATTEMPTED`, `JOIN_TOKEN_ISSUED`, `JOIN_ALLOWED` | Authorisation/token evidence, not proof of Daily entry. |
| 12:41:29–12:41:30 | Practitioner repeats the same three events | Rejoin/token evidence. |
| 12:42:23–12:42:24 | Patient `JOIN_ATTEMPTED`, `JOIN_TOKEN_ISSUED`, `JOIN_ALLOWED` | Patient authorisation/token evidence. |
| 12:50:55.305 | Practitioner `PROVIDER_ROOM_ENDED`, reason `المريض مجاش`; `videoRoomClosedAt` set | Daily room was closed **before** scheduled end. `Session.status` was not changed. |

At inspection, the row is `status=READY_TO_JOIN`, `cancelledAt=null`, `cancelledByUserId=null`, `cancellationReason=null`, `completedAt=null`, and `videoRoomClosedAt=12:50:55.305Z`. There are **zero** `SessionAttendanceEvent` rows, zero reconciliation rows, zero refunds, zero cancellation records, zero earning reviews, zero resolution records, and no replacement/original relation.

**Exact contradiction:** at 12:50:55 the room-close use case persisted a terminal room fact and a reason semantically asserting patient absence, but did not create a terminal lifecycle/outcome fact. Therefore the list/detail DTO status remains `READY_TO_JOIN`; however the join policy resolves the same row as `canJoin=false`, `blockedReason=SESSION_ROOM_CLOSED`.

The observed claim “both joined VIDEO” is supported only as far as the application issued both identities tokens/authorisation. The development DB has no trusted Daily `participant.joined` webhooks, attendance rows, or reconciliation that prove an actual provider entry. The audit cannot elevate token issuance to actual attendance.

## Current sources of truth and competing logic

| Domain | Current source of truth | Duplicate / competing logic |
|---|---|---|
| Lifecycle | `Session.status`, written through `SessionLifecycleService` | Room close writes only runtime fields; no-show and cancellation are separate commands; admin final decisions can independently affect read/decision state. |
| Join eligibility | `resolveSessionJoinPolicy` / `ResolveSessionJoinReadinessService`, evaluated at bootstrap | List/detail mapper precomputes `joinAvailability`; frontend additionally gates by status/action flags and cached join result. |
| Attendance | Trusted Daily webhook-normalised `SessionAttendanceEvent`; reconciliation is a later evidence snapshot | `SessionEvent` join attempts/tokens/allowed are used as non-attendance platform evidence and for reconnect grace; no-show command ignores both stores. |
| Room state | `provider*` fields plus `videoRoomClosedAt` on `Session`; Daily adapter effect | Lifecycle remains joinable-looking; a closed room is neither a lifecycle state nor an outcome. Existing token revocation is delegated to provider room closure. |
| Payment | `Payment.status`, refunds, wallet/ledger rows | Cancellation/no-show/outcome effects consume lifecycle independently; captured payment does not imply completion or attendance. |
| Participant identity | Session reads use `PatientProfile.user.displayName` / practitioner user name | Finance/settlement reads prefer `PatientProfile.displayName`; seed data has different values. |
| Admin display state | `GET /admin/sessions` list mapper (`Session.status`) | Runtime inspector/attendance endpoints expose distinct room/evidence data; main list does not surface it. |
| Upcoming / next | Status filters plus scheduled window in repository/`GetMyNextSessionUseCase` | Dashboard and frontend cards use their own query/cached list and join predicates; room close does not remove a still-`READY_TO_JOIN` record. |

## Findings

### F1 — Room closure is mislabeled/used as a no-show or cancellation without a lifecycle outcome — BLOCKER

1. **Observed behaviour:** the practitioner action succeeded with “patient did not attend,” while both party screens continued to say “Ready to join.”
2. **Actual behaviour:** `CloseSessionVideoRoomByPractitionerUseCase` allows `UPCOMING`, `READY_TO_JOIN`, and `IN_PROGRESS` after scheduled start. It calls `adapter.closeRoom`, persists `videoRoomClosedAt`, close actor/reason/note, and emits `PROVIDER_ROOM_ENDED`. It has no `SessionLifecycleService`, cancellation policy, attendance evaluator, notification, or financial-effects dependency. The concrete row proves this path.
3. **Root cause:** room state and business outcome are independently mutable, while the UI accepts a free-text close reason that can convey an outcome. “Close room” is not modelled as a lifecycle command with an explicit allowed disposition.
4. **Files/services:** `src/modules/sessions/use-cases/close-session-video-room-by-practitioner.use-case.ts`; `controllers/practitioner-sessions.controller.ts`; `Session` runtime fields in `prisma/schema.prisma`.
5. **Risk:** BLOCKER — contradicting participant/admin views, unsupported no-show claims, improper operational follow-up, and an open captured-payment case.
6. **Architectural direction:** make a single transactional session command/orchestrator own `status`, room close/revoke, outcome eligibility/evidence snapshot, notifications, and financial handoff. A room close may be a technical subaction, but an absence claim must be an explicit adjudicated outcome, not arbitrary close text.
7. **Missing regression test:** both users obtain tokens; practitioner closes room with absence text; assert a deliberately selected outcome (or rejection), consistent DTO/read model, token policy, notifications, and financial state.

### F2 — A genuine cancelled/terminal session is blocked at bootstrap; this session is not terminal — HIGH

1. **Observed behaviour:** a user can perceive terminal “closure” while status remains `READY_TO_JOIN`.
2. **Actual behaviour:** `POST /sessions/:sessionId/join-bootstrap` delegates to `ResolveSessionJoinContractUseCase`. `resolveSessionJoinPolicy` admits only `UPCOMING`, `READY_TO_JOIN`, `IN_PROGRESS`; it rejects `CANCELLED`, no-show, completed, expired and other terminal statuses with `SESSION_NOT_JOINABLE_STATUS`. It independently rejects `videoRoomClosedAt` with `SESSION_ROOM_CLOSED`; no token is created on either branch. The close-room unit tests pass and cover the room-closed block. Existing issued Daily tokens may remain valid only according to Daily’s room-close semantics; Sawiyaa has no persisted per-token revocation list.
3. **Root cause:** backend authorisation is sound for status/room facts, but the status does not represent the user’s claimed end outcome and the client renders it as the presentation label.
4. **Files/services:** `resolve-session-join-contract.use-case.ts`, `resolve-session-join-readiness.service.ts`, `utils/session-join-policy.util.ts`, `session-join-bootstrap.controller.ts`.
5. **Risk:** HIGH — UI status is materially false; a future provider integration that does not reliably invalidate existing tokens would widen this to unauthorised re-entry.
6. **Architectural direction:** retain bootstrap as the final enforcement point; add provider-close/token-revocation confirmation to the outcome transaction and expose a single server-derived operational state/reason.
7. **Missing regression test:** cancelled and each terminal/no-show state cannot receive a bootstrap token; a room-closed still-`READY_TO_JOIN` row returns `SESSION_ROOM_CLOSED`; pre-issued token/connection behaviour is tested against the Daily adapter contract.

### F3 — Practitioner no-show command ignores attendance, schedule, room presence, and financial policy — BLOCKER

1. **Observed behaviour:** an absence claim can contradict existing patient join evidence.
2. **Actual behaviour:** `MarkSessionNoShowByPractitionerUseCase` checks only practitioner ownership and whether status already equals `PATIENT_NO_SHOW`, then transitions directly to `PATIENT_NO_SHOW`. The state machine permits this from `UPCOMING`, `READY_TO_JOIN`, `IN_PROGRESS`, and `AWAITING_COMPLETION_CONFIRMATION`. It reads no `SessionAttendanceEvent`, `SessionEvent`, reconciliation, session start/end, grace threshold, Daily room state, or active participant presence. It merely cancels reminders afterward.
3. **Root cause:** manual no-show is treated as a participant-owned lifecycle write rather than an evidence-based adjudication. The more sophisticated attendance-summary/outcome evaluator is not on this command path.
4. **Files/services:** `mark-session-no-show-by-practitioner.use-case.ts`; `validate-session-status-transition.service.ts`; `attendance-summary.engine.ts`; `session-outcome-evaluator.service.ts`; `normalize-daily-attendance-evidence.service.ts`.
5. **Risk:** BLOCKER — false no-show, wrong patient entitlement/refund/earning treatment, and dispute evidence corruption.
6. **Architectural direction:** remove direct participant authority to set a business no-show outcome, or route it through a single evidence policy that rejects confirmed patient attendance, enforces grace/end boundaries, accounts for reconciliation confidence, and produces a review case where evidence is uncertain.
7. **Missing regression test:** patient has trusted Daily `JOINED` (and separately only `JOIN_ALLOWED`); practitioner mark-no-show must reject or create an evidence-review request, never transition directly.

### F4 — Attendance has two evidence grades but no canonical decision contract consumed everywhere — HIGH

1. **Observed behaviour:** join events exist but no persisted attendance exists for this session.
2. **Actual behaviour:** `JOIN_ATTEMPTED`, `JOIN_TOKEN_ISSUED`, and `JOIN_ALLOWED` are `SessionEvent` platform evidence; they show attempted/authorised join and are used for post-end reconnect grace. Actual attendance is `SessionAttendanceEvent` created from Daily webhooks after normalisation. Trusted webhook evidence can transition an `UPCOMING`/`READY_TO_JOIN` session to `IN_PROGRESS`. Reconciliation rows are later provider observations and outcome evaluators produce recommendations; webhook meeting events explicitly do not complete, no-show, or refund. No-show command bypasses all of this.
3. **Root cause:** “attendance” is used colloquially for token evidence, provider presence, and outcome recommendations, but the command boundary does not require a named evidence grade or evaluator result.
4. **Files/services:** `handle-daily-attendance-webhook.use-case.ts`; `normalize-daily-attendance-evidence.service.ts`; `mark-session-in-progress-from-attendance.service.ts`; `attendance-summary.engine.ts`; `session-outcome-evaluator.service.ts`; repository `hasJoinAllowanceOrAttendanceBefore`.
5. **Risk:** HIGH — operations may decide no-show from a different source than lifecycle/finance uses.
6. **Architectural direction:** publish one immutable attendance aggregate/read model with per-party `authorised`, `providerPresence`, `duration`, reconciliation confidence, and outcome eligibility. Only trusted/provider evidence may prove presence; authorisation stays supporting evidence.
7. **Missing regression test:** repeated leave/rejoin with out-of-order/duplicate Daily webhooks; duration/identity reconciliation; no-show candidates versus confirmed attendance; late evidence after a provisional outcome.

### F5 — Frontend status rendering is server-derived but cache invalidation cannot correct a server contradiction — HIGH

1. **Observed behaviour:** “Ready to join” survives refresh/new login for the concrete session.
2. **Actual behaviour:** `SessionMapper.toListItem` returns `status` and `presentationStatus: session.status`; it calculates `joinAvailability` separately from runtime fields. The web panels label status/presentation as `READY_TO_JOIN`, then use `joinAvailability`/join-bootstrap to discover `SESSION_ROOM_CLOSED`. Close-room mutation invalidates practitioner detail/list; patient has no cross-user invalidation. Regardless, hard reload calls the same backend DTO whose stored status is still `READY_TO_JOIN`. React Query has 30s session stale times; next-session has 15s stale and 60s polling, so cache can add delay but is not the root cause.
3. **Root cause:** UI status is correctly displaying the persisted lifecycle, but that lifecycle was never transitioned. The client also carries duplicate status/action/window gates, increasing drift risk.
4. **Files/services:** `mappers/session.mapper.ts`; web `features/sessions/lib/session-runtime.ts`; patient/practitioner detail panels; `features/sessions/hooks/use-sessions.ts`; `get-my-next-session.use-case.ts`.
5. **Risk:** HIGH — split-brain visual versus authorisation experience; stale views amplify it.
6. **Architectural direction:** expose an authoritative `operationalState` plus reason and allowed actions from one backend resolver. Clients render it, use bootstrap only to acquire credentials, and invalidate/broadcast all participant/admin views after a lifecycle command.
7. **Missing regression test:** close/cancel/no-show → participant list/detail/dashboard/next card → refetch/hard reload/new-login parity; assert no terminal or room-closed session is advertised as ready.

### F6 — Admin Session Management finds the session by code but hides the decisive room/outcome contradiction — HIGH

1. **Observed behaviour:** the affected session was difficult to identify/understand operationally.
2. **Actual behaviour:** admin API supports exact/partial session-code query, so `S-260808-0026` is findable. Default sort is scheduled start descending; the list surface renders `status`, patient/practitioner, mode and a delayed badge. It neither displays `videoRoomClosedAt`, close reason, cancellation reason, attendance evidence grade, nor a derived operational contradiction. `missingAttendance` filters only `SessionAttendanceEvent`, so this case is flagged as missing despite platform join evidence. More information is available only by manually opening runtime inspection/inspector.
3. **Root cause:** the admin list consumes the general session mapper and not the runtime/attendance/outcome aggregate; operational facts are distributed across endpoints.
4. **Files/services:** `get-admin-sessions.use-case.ts`; `session.repository.ts:listAdminSessions`; `AdminSessionsListScreen.tsx`; admin runtime inspection/attendance endpoints.
5. **Risk:** HIGH — support/finance cannot reliably triage anomalous, closed, disputed or no-show sessions at list level.
6. **Architectural direction:** make the list searchable/filterable by code, both stable identity keys, lifecycle, room state, outcome/resolution, evidence health and close/cancellation reason; show a durable “room closed / lifecycle still active” exception badge with a direct inspector link.
7. **Missing regression test:** search `S-260808-0026`; assert row reports Ready lifecycle + room closed + no attendance records + reason; filters locate this exact anomaly.

### F7 — Participant identity has two conflicting source fields — HIGH

1. **Observed behaviour:** `Patient One` and `أحمد محمود` are shown for the same patient depending on surface.
2. **Actual behaviour:** this DB row has `PatientProfile.displayName = "Patient One"` and `User.displayName = "أحمد محمود"`. Session list/detail mapper and join-token display name use `patient.user.displayName`; the admin participant identity utility also uses `user.displayName`. Finance earning-review presenter instead prefers `patient.displayName ?? patient.user.displayName`, and several finance repositories search/select both. The strings are not encoding corruption; they are distinct stored values. The mojibake in the original observation is an external display/encoding rendering of Arabic, not evidence that the DB value is malformed.
3. **Root cause:** no explicit domain rule identifies the canonical participant display identity by audience; profile and account names are both exposed and some presenters choose different precedence.
4. **Files/services:** `prisma/schema.prisma` (`PatientProfile.displayName`, `User.displayName`); `SessionMapper`; `session-participant-identity.util.ts`; financial-operation repositories; `session-earning-review.presenter.ts`.
5. **Risk:** HIGH — support, finance and clinical/operator views can misidentify a participant or fail to search a known name.
6. **Architectural direction:** define one immutable/session-time participant identity projection (with profile ID and user ID retained for disambiguation), specify audience-specific display policy, and eliminate ad-hoc precedence.
7. **Missing regression test:** seeded different profile/user names appear consistently in patient, practitioner, admin list/inspector, notifications and finance surfaces; search supports both sanctioned identifiers.

### F8 — Financial safety is dependent on lifecycle/outcome commands, so inconsistent commands can create mismatch — HIGH

1. **Observed behaviour:** the concrete session has a captured 650 EGP payment but no cancellation/refund/earning outcome after room closure.
2. **Actual behaviour:** cancellation has a policy-driven financial-effects service and cancellation record; admin/manual no-show flows have separate financial/entitlement services; earning reviews are keyed by `(sessionId, sourceType)` and use `earningEntitlementId`. Room close invokes none of those flows. Direct practitioner no-show changes lifecycle/reminders but itself does not validate evidence before downstream outcomes/operations see the status. The concrete record currently has no earning review, refund, ledger, or wallet movement.
3. **Root cause:** financial effects are command-specific instead of derived from one adjudicated terminal outcome/evidence snapshot; room closure is an unaccounted operational fact.
4. **Files/services:** `apply-session-cancellation-financial-effects.service.ts`; `apply-manual-no-show-financial-effects.service.ts`; admin resolution/manual-decision use cases; `SessionEarningReview` schema/model; close/no-show use cases.
5. **Risk:** HIGH — missed refund/earning review after room close; false no-show can make an incorrect entitlement, payout candidate, wallet movement or later recovery/reversal. Duplicate review risk is constrained by the DB uniqueness shown above, but semantic misclassification remains.
6. **Architectural direction:** financial eligibility must consume an immutable adjudicated outcome/event version, never a free-text room close or an unvalidated participant mutation. Require idempotent outcome-to-finance orchestration and reconciliation checks.
7. **Missing regression test:** capture → room close/no-show/cancel/replace → verify exactly one expected entitlement/review/refund/ledger package and no payout eligibility for unresolved cases.

## Current lifecycle/state mechanics

`SessionStatus` includes draft/payment/confirmation, `UPCOMING`, `READY_TO_JOIN`, `IN_PROGRESS`, awaiting states, `COMPLETED`, `CANCELLED`, three no-show states and `EXPIRED`. `SessionLifecycleService` performs status writes/events and `ValidateSessionStatusTransitionService` permits cancellation/no-show even from `IN_PROGRESS` and awaiting-completion. Consequently the state machine itself does not enforce the business invariant “after participant attendance, no cancellation/no-show without adjudication.”

Payment (`Payment.status`), refund/cancellation record, Daily room fields, provider attendance events, reconciliation snapshot, admin decision/resolution, replacement linkage, and earning review each persist independently. Rescheduling/replacement is represented by `originalSessionId`/replacement rows; next-session explicitly filters some replacement relationships, but outcomes do not create a replacement automatically unless an admin remedy does.

## Tests inspected/run

Existing unit coverage confirms important fragments: room close persists the closed fact and join policy blocks a closed room; join tests describe terminal/no-token scenarios; no-show tests exercise ownership/idempotence. It lacks the cross-domain regressions listed in each finding.

Targeted test run:

```text
npm test -- --runInBand resolve-session-join-contract.use-case.spec.ts \
  close-session-video-room-by-practitioner.use-case.spec.ts \
  mark-session-no-show-by-practitioner.use-case.spec.ts
```

Result: close-room and no-show suites passed (9 tests); join-contract suite failed (11 tests) before assertions because its test constructor does not supply the newly-required `SessionSchedulePolicyService` (`parseSnapshot` undefined). This is an additional regression-test maintenance failure, not evidence that terminal bootstrap is allowed. The source policy explicitly blocks it.

## Prioritised remediation plan (do not implement in this audit)

1. **Blocker — define and enforce a session outcome command boundary.** Replace direct participant no-show transitions with evidence-backed adjudication; prohibit cancellation/no-show from attended/in-progress sessions except an explicit, policy-approved resolution path. Add transaction locking and outcome/evidence snapshots.
2. **Blocker — integrate room closure with the outcome contract.** Separate “technical room close” from “patient absent”; require explicit disposition, atomically close/revoke room and produce the appropriate lifecycle/resolution state, notifications and deferred financial work.
3. **High — introduce a server-owned operational session read model.** Return lifecycle, room state, attendance grade, outcome/resolution state, join eligibility/reason and actions consistently to patient/practitioner/admin/next-session views. Remove client lifecycle derivations.
4. **High — harden provider attendance/token lifecycle.** Record provider evidence reliably, reconcile Daily presence/duration, and verify actual room-close invalidation of already-issued credentials/connections.
5. **High — make admin triage operationally complete.** Add anomaly flags/filtering and list-level reasons/evidence summaries, with session-code and identity search.
6. **High — establish identity policy.** Choose canonical session participant display projections and repair only through a planned data/application migration after stakeholder approval.
7. **High — attach finance to adjudicated outcomes.** Add idempotent outcome-to-finance integration tests and reconciliation alarms for captured-but-unresolved closed rooms.
8. **Medium — repair and broaden tests.** Update the join-contract test fixture dependency, then add the required end-to-end regression matrix across backend, web, and mobile.

