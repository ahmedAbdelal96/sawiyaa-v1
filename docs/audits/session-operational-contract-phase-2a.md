# Session operational contract — Phase 2A

**Date:** 2026-08-08  
**Scope:** backend canonical read contract only. No schema, migration, seed, data, API response, web, or mobile migration was made.

## Contract introduced

`SessionOperationalInterpreterService.interpret({ session, actor, now, finalManualDecision, attendance, outcomeEvaluation })` returns a read-only `SessionOperationalInterpretation`:

| Field | Authoritative source | Meaning |
|---|---|---|
| `state` / `reasonCode` | `Session.status`; `videoRoomClosedAt`; replacement relation | one shared operational meaning for the same facts and time |
| `join` | `ResolveSessionJoinReadinessService` → `resolveSessionJoinPolicy` | display/runtime eligibility only; bootstrap remains credential authority |
| `actions` | `ResolvePatientSessionActionsService` for patient; existing join policy for practitioner runtime | actor-specific policy result; no practitioner/admin command rule is reimplemented |
| `attendance` | trusted-attendance and reconciliation facts supplied by callers; existing `SessionOutcomeEvaluator` result supplied by its owner | evidence/assessment projection, never an evidence store |
| `room` | mode, provider runtime identifiers, `videoRoomClosedAt` | provider operational fact |
| `resolution` | canonical interpreted state plus persisted final manual decision | whether adjudication is required; decision does not override lifecycle |
| `replacement` | `originalSessionId` | relation only; no schedule/status is inferred |

`now` is mandatory and cloned once at the read boundary. The interpreter is registered in `SessionsModule` but is not wired into any HTTP response in this phase.

## Fact, claim, assessment, decision

| Category | Kept as | Explicitly not treated as |
|---|---|---|
| Daily trusted attendance / reconciliation | provider evidence fact | participant claim or terminal outcome |
| Practitioner no-show assertion / patient complaint | claim, governed by Phase 1 boundary and admin workflow | proof of absence |
| `SessionOutcomeEvaluator` result | recommendation/assessment | lifecycle writer or financial decision |
| Admin resolution/manual decision | adjudicated decision | replacement for raw evidence |

The interpreter neither persists nor overwrites any of these. It has no lifecycle, repository, payment, refund, wallet, settlement, or accounting dependency. In particular, a room-closed active legacy row is displayed as `AWAITING_ADMIN_RESOLUTION` with `ROOM_CLOSED_OUTCOME_UNRESOLVED`; it is not silently converted to a no-show, cancellation, completion, fact, claim, or financial result.

## Shared truth versus actor permissions

State, join, room, attendance, resolution and replacement are derived before actor actions. Therefore Patient, Practitioner and Admin receive the same `state` for the same `Session` and `now`.

Patient cancellation, payment, review, room-preparation and join fields preserve `ResolvePatientSessionActionsService` output, including its canonical cancellation-policy call. Practitioner can receive only existing join/runtime preparation capability. Admin receives no participant command capability. Completion, no-show, room close and resolution permissions intentionally remain enforced by their existing commands until a later phase extracts their policy rather than duplicating it here.

## Operational rules preserved

- Terminal lifecycle statuses are never joinable because join eligibility remains owned by the existing join policy.
- A room-closed active session is never joinable and is interpreted as requiring admin resolution. Phase 1 already writes that lifecycle state for new room-close commands; this read guard makes historical inconsistent rows safe to present without mutation.
- Trusted patient attendance remains visible as evidence and is not replaced by a practitioner claim. Phase 1 continues to reject a patient no-show claim when that fact exists; uncertain evidence remains an admin-resolution case.
- Cancellation is not recomputed. The interpreter delegates patient cancellation visibility to the established cancellation-policy-backed action service.
- Replacement/reschedule remains a persisted relationship/schedule concern; the interpreter exposes only the relationship and does not alter next-session selection.
- Final manual decisions are surfaced as decisions and do not override lifecycle state.

## Shadow/parity findings

| Comparison | Finding | Classification | Phase 2A action |
|---|---|---|---|
| `SessionMapper.presentationStatus` | equals persisted `status`; legacy room-closed active rows remain visually active | EXPECTED FIX | interpreter reports admin resolution; mapper unchanged |
| mapper `joinAvailability` / join bootstrap | both rely on join policy, but mapper is a separate projection | INTENTIONAL ACTOR DIFFERENCE | retain both until API migration |
| patient action resolver | preserved by direct composition for patient | parity | no semantic change |
| next-session filters | bespoke status/window/replacement query may select a different card set | EXISTING BUG / deferred | no query migration in 2A |
| admin runtime inspector | forensic evidence can explain a state but does not change it | INTENTIONAL ACTOR DIFFERENCE | retain forensic fields |
| actor permissions | patient action policy is complete; practitioner/admin command eligibility has no extracted read policy | BUSINESS-RULE CHANGE — DO NOT APPLY | do not invent a new permission matrix |

## Tests

`session-operational-interpreter.service.spec.ts` adds deterministic fixtures for: upcoming outside window, ready, in-progress, completed, cancelled, both participant no-show directions, awaiting resolution, room closed unresolved, trusted patient attendance with conflicting claim, uncertain evidence, replacement, reschedule, and expired session. It asserts shared state for all three actors, actor-specific actions, cancellation policy preservation, room closure non-joinability, and absence of lifecycle/financial dependencies.

Validation executed:

- `npm test -- --runInBand modules/sessions/services/session-operational-interpreter.service.spec.ts` — **16 passed**.
- `npm run typecheck` — **passed**.
- `npm run build` — exceeded the 120-second command timeout without compiler output; `typecheck` completed successfully.
- Focused joined run — **54 passed, 2 failed**. The failures are existing `resolve-session-join-readiness.service.spec.ts` cases that expect an unconfigured join window to be closed; current policy correctly derives a schedule-based default when explicit `joinOpenAt`/`joinCloseAt` values are absent. No production rule or existing test was changed to conceal this; repair belongs to the pre-existing test/policy-parity work.

## Files changed

- `sawiyaa-backend-v1/src/modules/sessions/types/session-operational-interpretation.types.ts`
- `sawiyaa-backend-v1/src/modules/sessions/services/session-operational-interpreter.service.ts`
- `sawiyaa-backend-v1/src/modules/sessions/services/session-operational-interpreter.service.spec.ts`
- `sawiyaa-backend-v1/src/modules/sessions/sessions.module.ts`
- this document

## Phase 2B migration plan

1. Add the contract to patient/practitioner list and detail response projections behind parity assertions; retain all current fields.
2. Migrate next-session, summaries and admin list to the same shared-state input, leaving inspector evidence forensic and additive.
3. Migrate web and mobile to render `operational.state`, `reasonCode`, `join` and actor actions; centralise mutation cache invalidation.
4. Extract practitioner/admin command eligibility only by composing their existing command policies, then include those read permissions.
5. Compare production shadow telemetry/contract fixtures before selecting the operational field as the UI source.

## Later deletion list (Phase 2E, only after every consumer migrates)

- `presentationStatus` compatibility field;
- mapper-owned duplicate `joinAvailability` display projection;
- web/mobile status/window/action matrices;
- duplicated summary and next-session status filters;
- any temporary parity adapters introduced in Phase 2B;
- superseded admin outcome orchestration after specialised finance policy is retained.
