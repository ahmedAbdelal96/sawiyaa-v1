# Session Lifecycle State Machine

`Session.status` is Sawiyaa's single canonical lifecycle state. Presentation,
payment, refunds, room runtime, reviews, earnings, and admin decisions must not
create a second lifecycle state.

## Canonical states

`DRAFT` -> `PENDING_PAYMENT` or `PENDING_PRACTITIONER_CONFIRMATION` ->
`UPCOMING` -> `READY_TO_JOIN` -> `IN_PROGRESS` ->
`AWAITING_COMPLETION_CONFIRMATION` -> a final outcome.

Final outcomes are `COMPLETED`, `CANCELLED`, `PATIENT_NO_SHOW`,
`PRACTITIONER_NO_SHOW`, `BOTH_NO_SHOW`, and `EXPIRED`.

`AWAITING_COMPLETION_CONFIRMATION` means the scheduled window elapsed without
evidence that the consultation was completed. It is never reviewable and never
creates practitioner earnings. Elapsed time and room closure never mean
`COMPLETED`.

## State transitions

| From | To | Authority |
| --- | --- | --- |
| PENDING_PAYMENT | UPCOMING | captured session payment |
| PENDING_PAYMENT | EXPIRED/CANCELLED | expiry or cancellation policy |
| UPCOMING | READY_TO_JOIN/IN_PROGRESS | runtime/join lifecycle |
| UPCOMING, READY_TO_JOIN, IN_PROGRESS | AWAITING_COMPLETION_CONFIRMATION | elapsed-window worker |
| IN_PROGRESS, AWAITING_COMPLETION_CONFIRMATION | COMPLETED | practitioner or authorized admin decision |
| UPCOMING, READY_TO_JOIN, IN_PROGRESS, AWAITING_COMPLETION_CONFIRMATION | cancellation or no-show outcome | authorized actor/policy |

All writes use `SessionLifecycleService` in the same database transaction as
their event and lifecycle timestamps. `completedAt`, `cancelledAt`, and
`expiredAt` are owned by the matching transition.

## Terminal outcomes and corrections

Terminal outcomes are immutable in v1. Ordinary flows and admin final-decision
flows reject attempts to replace a terminal outcome with
`SESSION_FINAL_OUTCOME_CORRECTION_NOT_SUPPORTED`. Historical corrections need a
future reconciliation workflow because reviews, package entitlement decisions,
refunds, and ledger records are append-only.

`BOTH_NO_SHOW` is an admin-only final outcome: neither participant attended.
It has no automatic refund, earning, review, or package-entitlement effect.
Package handling requires a separate admin decision.

## Safe background transitions

`transitionIfCurrentStatus` locks and re-reads a session inside its transaction
before writing. A stale candidate is skipped without an event. Pending-payment
expiry uses one transaction per candidate so one failed candidate does not roll
back unrelated expirations.

The completion-confirmation sweeper is disabled unless
`SESSION_COMPLETION_CONFIRMATION_SWEEPER_ENABLED=true`. It processes ordered
`UPCOMING` and `READY_TO_JOIN` rows in batches after a configurable grace period
(default 15 minutes). `SESSION_COMPLETION_CONFIRMATION_SWEEPER_BATCH_SIZE`
controls the batch size and `SESSION_COMPLETION_CONFIRMATION_SWEEPER_MAX_ROWS`
provides a per-run safety limit. Each candidate is re-read under a row lock and
the worker takes a PostgreSQL advisory transaction lock, so concurrent backend
instances cannot create duplicate transitions. Results are structured as
`scanned`, `transitioned`, `skipped`, `failed`, and `batches`; a failed row is
logged and does not abort unrelated rows. `IN_PROGRESS` is never automatically
swept in v1.

## Action contract

Backend list and detail responses use the same resolver and provide
`canCancel`, `canPrepareRoom`, `canJoin`, `canPay`, and `canReview`. Clients
must deny an action when the contract is absent. Clients do not infer actions
from dates, room closure, or display labels.

## Separation of concerns

- Payment/refund states remain on Payment/Refund records.
- Room runtime is independent from the lifecycle and cannot complete a session.
- Reviews require canonical `COMPLETED`, no existing review, and a valid source
  policy (direct captured payment, wallet/package coverage, free/full-discount,
  or an explicitly approved/manual source). A direct captured Payment row is
  not mandatory when the source record itself proves eligibility. Reviews
  cannot be created from elapsed/awaiting/no-show/cancelled sessions.
- Session earning reviews are created only by real completion or a separately
  authorized package-entitlement decision.
- Admin decisions are immutable audit history. A final outcome must also update
  `Session.status` in its transaction.

## Migration and backfill

Migration `20260715130000_canonical_session_lifecycle` replaces the old enum.
It runs an ambiguity precondition first, maps legacy confirmations to
`UPCOMING`, maps the latest valid final admin decision (including
`MARK_COMPLETED`) and backfills `completedAt` from that decision timestamp, and
maps elapsed active sessions to `AWAITING_COMPLETION_CONFIRMATION`. Legacy
`REFUND_PENDING`/`REFUNDED` values become `CANCELLED` only when cancellation
evidence exists; ambiguous refund rows abort the migration before enum/data
conversion. Refund/payment state remains separate after deployment.

Before deploy, run a conflict report for raw state/final-decision mismatch,
`COMPLETED` without `completedAt`, terminal rows with contradictory timestamps,
and legacy refund/no-show records. Investigate exceptional rows before release.

```sql
SELECT s."id", s."status", s."completedAt", s."cancelledAt", d."decisionType"
FROM "Session" s
LEFT JOIN LATERAL (
  SELECT "decisionType"
  FROM "SessionAdminDecision"
  WHERE "sessionId" = s."id" AND "isFinal" = true
  ORDER BY "createdAt" DESC
  LIMIT 1
) d ON true
WHERE (s."status" = 'COMPLETED' AND s."completedAt" IS NULL)
   OR (s."status" IN ('CANCELLED', 'EXPIRED') AND s."completedAt" IS NOT NULL)
   OR (s."status" = 'NO_SHOW')
   OR (s."status" IN ('REFUND_PENDING', 'REFUNDED'));
```

Run this report against the pre-migration schema. Its legacy enum predicates are
intentional and must not be run after the canonical migration has deployed.

## Invariants

- A display state cannot disagree with `Session.status`.
- A final decision cannot override status without updating it.
- Time elapsed and room closure never imply completion.
- No-show never displays as completed.
- Completed sessions do not expose cancel, prepare, or join actions.
- Awaiting-confirmation sessions cannot be reviewed.
