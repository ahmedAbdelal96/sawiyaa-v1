# Session outcome integrity - Phase 1

## Scope

Phase 1 implements the backend boundary for practitioner-initiated patient no-show and technical room-close actions. It intentionally does not change frontend presentation, admin UI, identity mapping, schema, migrations, seeds, or financial settlement behavior.

## Previous root cause

`MarkSessionNoShowByPractitionerUseCase` moved any practitioner-owned session directly to `PATIENT_NO_SHOW` without reading provider attendance, time policy, reconciliation, or conflicting evidence. `CloseSessionVideoRoomByPractitionerUseCase` closed Daily and recorded an absence-like free-text reason but retained `READY_TO_JOIN`/`IN_PROGRESS` lifecycle state.

## Implemented boundary

`ParticipantSessionOutcomeBoundaryService` is the decision boundary. It is deliberately not another lifecycle engine: it returns `ALLOW`, `REJECT`, or `REQUIRES_ADMIN_RESOLUTION`; callers hold a database row lock and use the existing `SessionLifecycleService` for every status write.

### Patient no-show decision rules

1. Terminal session: reject. A repeated `PATIENT_NO_SHOW` returns the existing `SESSION_ALREADY_NO_SHOW` error.
2. Session already awaiting admin resolution: do not make a participant decision.
3. Missing scheduled start or immutable outcome policy snapshot: require admin resolution.
4. Before `scheduledStartAt + patientNoShowGraceMinutes`: reject with `SESSION_NO_SHOW_GRACE_NOT_ELAPSED`.
5. Trusted provider `JOINED` evidence for the patient, or a non-stale confirmed reconciliation saying the patient joined: reject with `SESSION_PATIENT_ATTENDANCE_CONFIRMED`.
6. Allow `PATIENT_NO_SHOW` only when the non-stale reconciliation is confirmed, identities are confirmed, it says patient absent/practitioner present, there are no unknown participants, and a trusted practitioner `JOINED` event exists.
7. Every other case is insufficient/conflicting evidence and transitions to `AWAITING_ADMIN_RESOLUTION`, with a lifecycle event that records the requested outcome and boundary reason. It does not create a no-show, refund, earning review, entitlement decision, wallet movement, or payout.

`JOIN_ATTEMPTED`, `JOIN_TOKEN_ISSUED`, and `JOIN_ALLOWED` are not read by this boundary. They remain supporting authorisation evidence only, never proof of patient attendance or absence.

### Room-close semantics

A practitioner technical room close remains a technical operation; it is not completion, cancellation, or no-show. Once Daily accepts the close, the same transaction locks the latest session row, preserves room-close fields/event, and moves any active lifecycle (`UPCOMING`, `READY_TO_JOIN`, `IN_PROGRESS`) to `AWAITING_ADMIN_RESOLUTION`. This makes it non-joinable and non-actionable by the ordinary join path until an existing admin decision resolves it. Already closed calls remain idempotent and do not call Daily again.

This structurally prevents the `S-260808-0026` contradiction: an irreversibly closed room can no longer remain `READY_TO_JOIN`/`IN_PROGRESS`. Join bootstrap was already server-enforced for `videoRoomClosedAt` and terminal statuses; this phase preserves that check.

## Concurrency and idempotency

Both commands take the existing `SessionRepository.findByIdForUpdate` lock inside the transaction before requesting a decision or lifecycle mutation. Stale/concurrent no-show, cancel, webhook, and room-close outcomes are re-evaluated from the locked row. The close use case records its provider close audit fact even if a concurrent operation has already reached a terminal lifecycle; it does not overwrite a terminal lifecycle. Repeated no-show is rejected safely; repeated room close returns the already-closed result.

## Financial safety

The boundary has no dependency on cancellation financial effects, manual no-show financial effects, wallets, settlements, or accounting. `AWAITING_ADMIN_RESOLUTION` is only an informational operational handoff to the established admin-decision path. No automatic financial side effect was added.

## Files changed

- `sawiyaa-backend-v1/src/modules/sessions/services/participant-session-outcome-boundary.service.ts`
- `sawiyaa-backend-v1/src/modules/sessions/use-cases/mark-session-no-show-by-practitioner.use-case.ts`
- `sawiyaa-backend-v1/src/modules/sessions/use-cases/close-session-video-room-by-practitioner.use-case.ts`
- `sawiyaa-backend-v1/src/modules/sessions/sessions.module.ts`
- Focused specs for the boundary, no-show use case, room-close use case, and repaired join-contract fixture.

The join-contract fixture now supplies `SessionSchedulePolicyService`; production code was not weakened. The join-contract use case also consistently passes the persisted schedule-policy join values when forming its final returned policy.

## Verification

Passed:

```text
npm test -- --runInBand \
  src/modules/sessions/services/participant-session-outcome-boundary.service.spec.ts \
  src/modules/sessions/use-cases/mark-session-no-show-by-practitioner.use-case.spec.ts \
  src/modules/sessions/use-cases/close-session-video-room-by-practitioner.use-case.spec.ts \
  src/modules/sessions/use-cases/resolve-session-join-contract.use-case.spec.ts

4 suites passed; 26 tests passed.

npm run typecheck
Passed.
```

`npm test -- --runInBand src/modules/sessions` ran 60 suites: 56 passed, 4 pre-existing failures (repository join-notification expectation, two join-readiness expectations, four Daily-normalisation expectations) plus one integration suite refusing the non-test development database `fayed_db`. The focused Phase 1 suites pass. A combined `typecheck; build` command timed out after typecheck completed; the independent typecheck passed.

## Remaining Phase 2 work

- Publish a unified operational read model for participant/admin screens.
- Improve admin list triage and identity policy.
- Define provider-side confirmation/revocation behavior for already-issued Daily credentials/connections.
- Expand database integration tests for simultaneous webhooks/outcome commands and admin resolution/replacement/financial flows.
