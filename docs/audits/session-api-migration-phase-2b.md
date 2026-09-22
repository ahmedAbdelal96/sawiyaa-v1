# Session API migration — Phase 2B

**Date:** 2026-08-08  
**Scope:** additive backend read-projection migration. Web, mobile, React Query, schema, migrations, seed, database data, command policies, and financial behaviour are unchanged.

## Endpoints migrated

| Endpoint/projection | Change | Deterministic time / performance |
|---|---|---|
| patient list | each mapper item receives `operational` from `SessionOperationalInterpreterService` | one request `now`; existing batched manual-decision and patient-action maps are reused, so no per-row action/review query was added |
| practitioner list | each mapper item receives `operational` | one request `now`; no provider call |
| patient/practitioner detail | detail item receives `operational` | one local `now` is shared by actions, interpreter and mapper |
| patient/practitioner summaries | status-derived count semantics use interpreted states | candidate rows were already loaded in memory; one shared `now`, no provider or financial calls |
| next session | response gains `operational`; selection uses reusable persisted-fact candidate predicate, then interpreter | one `now`; one database query, no provider call |
| admin list | every row receives `operational`; raw lifecycle and delayed compatibility fields remain | one request `now`; existing decision batch reused |

The reusable composition path is `SessionOperationalInterpreterService`; `SessionMapper` only attaches an already-computed object and does not calculate operational state.

## Response evolution and compatibility

Migrated list/detail/admin/next payloads add `operational` without removing `status`, `presentationStatus`, `joinAvailability`, legacy `actions`, or other response fields. Existing fields are compatibility data only; none is used as the new interpretation source.

The shared state is derived from lifecycle, room fact, join policy, supplied attendance/reconciliation facts, outcome assessment, resolution fact, replacement relation and explicit request time. Patient action visibility still comes from `ResolvePatientSessionActionsService`; practitioner/admin command eligibility was not invented or copied into a mapper.

## Next-session correction

`buildOperationalNextSessionCandidateWhere(now)` is a narrow persisted-fact prefilter. It excludes terminal statuses, `AWAITING_ADMIN_RESOLUTION`, cancellation and `videoRoomClosedAt` rows, while retaining schedule/join-close and replacement constraints. It intentionally does not duplicate the interpreter in SQL. The selected row is then interpreted before response construction, so its returned state is identical to the state used by list/detail for the same facts and time.

This fixes the known room-closed unresolved session being selected/displayed as an ordinary next actionable session. Replacement/reschedule constraints are retained. Join bootstrap remains final credential authorization.

## Evidence, disputes and financial boundary

No evidence, claim, evaluator result, manual decision, lifecycle state, cancellation record, or finance record is written during interpretation. Trusted Daily attendance remains fact; a participant assertion remains a claim; evaluator output remains an assessment; admin resolution remains decision. No refunds, earning reviews, entitlements, wallet/ledger entries, payouts, settlements, or accountant decisions are affected.

## Parity classification

| Area | Result |
|---|---|
| normal lifecycle list/detail/admin/next state | PARITY |
| actor actions | ACTOR-SPECIFIC; shared state is constant |
| legacy room-closed active rows | EXPECTED FIX: operational state is `AWAITING_ADMIN_RESOLUTION`, legacy compatibility status remains unchanged |
| summary room-closed counts | EXPECTED FIX: operational counts no longer call them ready/joinable |
| next-session room closure | EXPECTED FIX |
| next replacement query semantics | parity retained; broader replacement policy extraction remains deferred |
| frontend/mobile legacy matrices | unchanged and deferred |

## Tests and verification

- Canonical interpreter fixtures: 16 passed.
- Migrated API/unit suite (detail, practitioner list, summaries, admin list, next session, candidate predicate): 28 passed.
- Backend typecheck: passed.
- The two previously reported join-readiness tests were corrected: they now provide the explicit persisted two-minute join window they asserted, rather than accidentally exercising the policy's 15-minute default window.

## Files changed

- `src/modules/sessions/types/session-operational-interpretation.types.ts`
- `src/modules/sessions/types/sessions.types.ts`
- `src/modules/sessions/services/session-operational-interpreter.service.ts`
- `src/modules/sessions/mappers/session.mapper.ts`
- patient/practitioner list/detail/summary, admin-list and next-session use cases
- `src/modules/sessions/repositories/session.repository.ts`
- `src/modules/sessions/utils/session-operational-candidate-predicates.util.ts`
- `src/modules/sessions/utils/session-operational-summary.util.ts`
- migrated/new focused tests

## Remaining Phase 2C work

1. Update web and mobile contract types to consume `operational`.
2. Replace status/window/action matrices in list, detail, dashboard, next-session and upcoming cards with canonical fields.
3. Centralise React Query invalidation across patient, practitioner, next and admin projections.
4. Add transport-level cross-API fixtures once endpoints expose the same test clock.

## Phase 2E deletion candidates

- `presentationStatus`;
- mapper-owned compatibility `joinAvailability` once all clients use `operational.join`;
- frontend/mobile status/window/action derivation helpers;
- duplicate summary/next presentation predicates after query-policy consolidation;
- temporary compatibility tests/adapters after consumer migration.
