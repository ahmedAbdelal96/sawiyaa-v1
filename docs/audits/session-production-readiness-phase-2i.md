# Session production readiness — Phase 2I

**Decision: READY**

## Baseline and worktree safety

Audited on `main` at `28845b55871a629391badccbaf6c03a094e1ee8e`. The initial
worktree contained 73 modified or untracked entries. Those entries were
preserved; no reset, stash, commit, push, or production data access occurred.

## Operational risk map

17 mutation/asynchronous paths were traced from their current entry points.

| Operation | Boundary / idempotency / external risk |
| --- | --- |
| Booking and payment activation | Prisma transaction; lifecycle transition; payment/provider callback keys and payment constraints make replay safe. |
| Join bootstrap | Fresh Session, participant, policy, room-closure and token facts are checked at command time; token issuance is external and intentionally not persisted. |
| Runtime preparation | PostgreSQL advisory transaction lock per Session; fresh re-read; Daily room name is deterministic; conditional runtime write returns existing runtime. |
| Join-available sweep | 60-second in-process cadence, bounded 50 candidates; same runtime lock and deterministic notification keys. |
| Daily attendance webhook | Ingestion key plus provider-event lookup, Session row lock, immutable evidence event, and unique-conflict-as-duplicate handling. |
| Room close | Fresh owner/room facts, transactional close record/event; repeated close is an idempotent state result. |
| Completion / automatic finalization | Lifecycle transition inside transaction; finalizer locks/rechecks and accounting candidate is constrained by Session/source. |
| Patient/practitioner no-show | Command-time ownership and boundary checks; transactional lifecycle and financial effects. |
| Cancellation and reschedule | Transactional authoritative facts, conflict checks, lifecycle transition, notification intents after truth is committed. |
| Replacement / Admin resolution | Per-Session advisory lock, row lock, unique request id and unique replacement Session relation. |
| Earning-review candidate | Informational-only accounting boundary; unique `[sessionId, sourceType]` and financial-operation uniqueness. |
| Completion-confirmation sweep | 60-second cadence; bounded batches; `SKIP LOCKED` claim then conditional transition. |
| Automatic-completion sweep | Feature-gated, bounded 1–100 batch; finalizer owns idempotency. |
| Attendance reconciliation sweep | Periodic, database-backed reconciliation/version records; duplicate observation version is unique. |
| Reminder queue / delivery sweep | Due-queue index and unique intent key; failed delivery leaves a retryable record and does not reverse lifecycle truth. |
| Expiry / unpaid cleanup | Conditional lifecycle transition with authoritative status re-read. |
| Package settlement linkage | Transactional package decision/settlement updates and unique entitlement/review boundaries. |

Database-only facts are transactional where a single business invariant is
required. Daily/provider calls and notification delivery are external and cannot
be made distributed-atomic; the system uses deterministic provider identity,
stored facts, and idempotent notification intents for recovery.

## Hardening completed in this phase

### Runtime provisioning race — HARDENED IN THIS PHASE

`PrepareSessionRuntimeUseCase` and the join-available sweeper previously called
the provider before the conditional `updateRuntimeIfMissing` claim. Concurrent
instances could therefore issue duplicate external create requests, and a
request waiting behind cancellation could use stale eligibility.

`SessionRepository.lockRuntimePreparation` now takes a transaction-scoped
PostgreSQL advisory lock derived from Session ID. Both callers acquire it,
re-read authoritative Session facts, re-evaluate readiness, return an already
persisted runtime, or create and conditionally persist exactly one coherent
runtime. This is intentionally a narrow lock: it serializes only provider-room
provisioning for one Session. Daily itself also uses a deterministic
`fayed-session-{sessionId}` room name and resolves HTTP 409 by reading that
room, covering provider-success/local-write-failure recovery.

Focused regression proves a Session cancelled while waiting for the claim is
not provisioned. PostgreSQL workflow regression continues to exercise
concurrent finalization claims and transactional persistence.

## Idempotency and concurrency result

| Risk | Result |
| --- | --- |
| Duplicate bootstrap / join | Fresh policy revalidation; no lifecycle writer; repeated token requests do not create a room. |
| Concurrent runtime preparation | **Hardened:** advisory claim + re-read + conditional write; one persisted runtime/event. |
| Complete vs no-show | Lifecycle row lock/conditional transition permits one valid terminal outcome; later command skips/rejects. |
| Cancel vs join | Bootstrap/prepare reload facts; cancellation/closed room makes the later command deny. |
| Room close vs join | Readiness checks persisted `videoRoomClosedAt` at command time; no stale credential from revalidated close state. |
| Duplicate Daily webhook | `ingestionKey` unique, provider event check, and locked duplicate recheck: safe no-op. |
| Out-of-order/late webhook | Evidence remains immutable; terminal state is not reopened; weaker/unknown evidence cannot overwrite stronger assessment. |
| Duplicate Admin resolution | Advisory lock + `requestId` unique returns the existing resolution; a reused key for another Session rejects. |
| Concurrent different Admin decisions | First transaction moves case from OPEN; second sees non-open case and rejects. |
| Replacement retry | Unique resolution replacement relation and serialized resolution prevent duplicate replacement chains. |
| Completion/no-show/replacement financial replay | One earning review per Session/source and financial-operation uniqueness; no Wallet/Ledger/payout authority is invoked by lifecycle. |

## Lifecycle write invariant

`SessionLifecycleService.transition` remains the sole production writer of
`Session.status`. The direct `session.update` / `updateMany` occurrences in
`SessionRepository` are the lifecycle service's internal persistence primitive
or runtime-only conditional update; integration fixtures are explicitly test
setup. No bypass writer was found. **UNAUTHORIZED LIFECYCLE WRITE PATHS = 0.**

## Provider, webhook, notification, and restart behavior

- Daily room creation maps transport/non-2xx failure to a recoverable 503,
  records structured endpoint/status metadata without credentials, and handles
  a duplicate create (409) by reading the deterministic existing room.
- A process loss after provider success but before local commit retries the same
  deterministic room identity; a later prepare discovers/persists it rather
  than creating an unrelated room.
- Token issuance failure creates no lifecycle mutation. Room close is
  idempotent at the application state boundary; late room/attendance facts do
  not reactivate terminal Sessions.
- Daily attendance handling uses immutable evidence records, hashes the
  normalized payload identity, detects provider-event duplicates, and treats
  database uniqueness conflicts as successful duplicate delivery.
- Notifications are intent records with unique idempotency keys. A delivery
  failure is observable/retryable and never rolls back valid lifecycle truth.
- No business-critical flow relies only on in-memory state. The `isSweeping`
  flags prevent same-process overlap; database locks, unique keys, and
  conditional transitions protect multi-instance overlap.

## Scheduler inventory and overlap safety

| Job | Cadence / selection | Multi-instance protection |
| --- | --- | --- |
| Join available | 60s; up to 50 join-window candidates | Runtime advisory claim; notification intent unique keys; lifecycle transition validation. |
| Completion confirmation | 60s when enabled; configurable batch/max rows | `FOR UPDATE SKIP LOCKED` claim and `transitionIfCurrentStatus`. |
| Automatic completion | Feature gated; batch 1–100 | Finalizer rechecks and serializes lifecycle transition. |
| Attendance reconciliation | Periodic configured worker | Unique `(sessionId, provider, observationVersion)` reconciliation fact. |
| Reminder delivery | 60s due-queue sweep | Queue/idempotency key and notification intent uniqueness. |

Failed items are isolated and logged; a later sweep safely retries them. There
is no Redis or single-process correctness assumption.

## Database constraints, queries, and read-side audit

Existing constraints already protect the material invariants: Session package
slot uniqueness, resolution `requestId`, one replacement per resolution,
attendance ingestion key, reconciliation observation version, reminder
idempotency key, earning review `[sessionId, sourceType]`, and financial
operation uniqueness. No new migration/index is justified by this phase.

Representative `EXPLAIN ANALYZE` runs against the small isolated integration
database showed sequential scans for an empty Patient list and due-completion
selection (18 fixture rows); that is expected at this cardinality and does not
demonstrate a missing index. The schema already has the relevant composite
indexes: Patient/Practitioner+status+scheduled start, status+scheduled end,
status+join open, and reminder due/sent/cancelled. No speculative index was
added.

Ordinary operational reads remain provider-free: the interpreter, list/detail,
next Session, package, and journey projections derive from persisted facts and
do not call Daily. Provider calls are confined to explicit preparation,
bootstrap token issuance, reconciliation, and room close.

## Observability, retry, and authorization

Critical services emit Session ID, worker run ID, outcome/reason, provider
metadata where applicable, and errors through the existing logger paths; token
and provider-secret redaction is covered by `safe-metadata` tests. Expected
domain rejections stay as 4xx exceptions; provider/DB faults are logged as
infrastructure failures.

Retry classification: provider reads and webhook/reconciliation delivery are
safe with their keys; room creation is safe only with deterministic provider
identity plus the new claim; Admin resolution and financial effects are safe
only with their idempotency keys; arbitrary token issuance and payout are not
blindly retried. Command paths re-check ownership/role and authoritative
Session facts rather than trusting read-model action flags.

Minimum operational signals are existing structured logs for provider/runtime
failure, webhook rejection/duplicate, resolution case ID/request ID,
worker-run failure, and notification delivery status. Slow-request coverage is
provided by the existing HTTP/logging middleware rather than a Session-specific
logging stack.

## Runbook

- **Join failure:** search by `sessionId` and correlation/request ID; inspect
  current persisted status, join window, `videoRoomClosedAt`, runtime fields,
  and the command's policy reason. Never manually mutate status.
- **Provider/runtime failure:** inspect the provider endpoint/error log and
  `PROVIDER_ROOM_CREATED` event. Retry runtime preparation safely; Daily's
  deterministic name reuses an existing room after a partial failure.
- **Stuck unresolved Session:** use the Admin resolution case queue and its
  immutable evidence/reconciliation timeline; submit one idempotency-keyed
  Admin decision through the application command.
- **Scheduler failure:** locate worker-run/session error logs, rerun the safe
  sweep or reconciliation command; claims and keys prevent duplicate effects.
- **Duplicate webhook suspicion:** compare provider event reference and the
  hashed attendance `ingestionKey`; a duplicate returns a handled duplicate
  response and must not be manually replayed into lifecycle state.
- **Replacement issue:** trace resolution request ID, replacement Session ID,
  shared entitlement ID, earning review, and financial-operation records.

## Verification

- Runtime preparation, join-notification sweep, Daily webhook, completion
  sweep, and reminder sweep focused tests: **5 suites, 31 tests passed**.
- Added cancellation-during-runtime-claim regression: passed.
- Backend `npm run typecheck`: passed.
- Phase 2H isolated PostgreSQL rerun: workflow + financial boundary **24
  passed**; manual no-show + replacement entitlement **7 passed**.

## Remaining acceptable risks

Provider calls necessarily occur outside a distributed transaction and the
runtime advisory lock is held while the provider responds. This is bounded to a
single Session and provides correctness over duplicate provisioning; provider
timeouts return a recoverable failure. Notification delivery is at-least-once
at provider level, but intent uniqueness prevents harmful duplicate local
commands. These are **ACCEPTABLE RESIDUAL RISK**, not blockers.

## Production-readiness conclusion

**READY.** No unresolved blocker capable of corrupting Session truth,
duplicating material financial side effects, bypassing authorization, or making
critical recovery impossible was found. The Phase 2I runtime-provisioning race
was hardened with the smallest PostgreSQL-backed serialization mechanism.
