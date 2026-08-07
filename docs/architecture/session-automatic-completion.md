# Session Automatic Completion

## Phase 3A boundary

Phase 3A automates one transition only: a session in
`AWAITING_COMPLETION_CONFIRMATION` may move to `COMPLETED` when the canonical
outcome evaluator returns `AUTO_COMPLETABLE`. It never turns an absence into a
patient, practitioner, or both-party no-show. Those outcomes remain Admin
decisions.

The finalizer locks the session row, re-reads attendance and reconciliation
evidence inside the same transaction, rejects stale or non-eligible evidence,
and calls `CompleteSessionTransactionService`. That boundary performs the
lifecycle transition, package ledger effect, and session earning review in one
transaction. No direct payout or refund is performed by automatic completion.

The lifecycle `SESSION_COMPLETED` event carries safe metadata identifying
`completionMode: AUTOMATIC_COMPLETION`, worker run, policy and reconciliation
versions, evaluation time, reason codes, and overlap percentage. The locked
status check makes repeated finalization idempotent; a completed session
returns `ALREADY_COMPLETED` without repeating financial effects.

For package-covered sessions, the same transaction updates canonical package
settlement progress and upserts the session earning review using existing
unique scopes. Settlement release and payout remain outside this automatic
path. If either persistence step fails, lifecycle status, audit, settlement,
and earning-review writes roll back together; a later retry can complete once.

## Worker safety

`SessionAutomaticCompletionSweeperService` is disabled unless:

```text
SESSION_AUTOMATIC_COMPLETION_ENABLED=true
```

The default is false. `SESSION_AUTOMATIC_COMPLETION_BATCH_SIZE` defaults to 25
and is capped at 100. Candidate discovery is limited to ended sessions in the
awaiting-confirmation state; each candidate is finalized through the row-locking
transaction boundary. A failed candidate is logged and isolated.

Phase 3A does not call Daily, expose a new API, run no-show automation, or
change UTC/session scheduling semantics. A production scheduler, provider
health proof, and operational rollout are Phase 3B concerns.

## Required evidence

Automatic completion requires the persisted policy snapshot and a fresh,
high-confidence, complete reconciliation. The evaluator applies inclusive
thresholds and the effective overlap rule `max(percentage threshold, minimum
duration)`. Missing, stale, late, partial, unknown-participant, or conflicting
evidence remains non-automatic.

## Verification status

Focused unit coverage proves the completion-only gate, all three no-show
classifications are skipped, stale evidence is skipped, completed sessions are
idempotent, and the disabled worker isolates candidate failures. PostgreSQL
proof uses a disposable database and proves one exact 30-minute completion,
replay idempotency, package/earning boundary invocation, and a confirmed
both-absent reconciliation remaining non-terminal.

Phase 3A.1 also proves exact 60-minute and below-threshold boundaries, two
concurrent finalizers, real package settlement progress, real earning-review
uniqueness, and rollback after package/review writes.

Phase 3A.2 closes the four remaining PostgreSQL race gates. A cancellation
transaction wins over a waiting automatic finalizer without a completion
event; Admin and practitioner completion races produce one terminal completion
and one set of package/earning effects; and a genuinely new trusted attendance
event, inserted after the reconciled evidence and observed cutoff, marks the
evaluation stale while the waiting finalizer returns without completing. A
duplicate of an already-ingested trusted event is rejected by the existing
ingestion-key uniqueness boundary and does not falsely block completion.

The same isolated proof covers direct payment completion and replay. The
payment remains captured, no payment event/refund/wallet/payout/settlement is
created by automatic completion, and the session earning review is written
once. The shared completion transaction boundary is also used by manual Admin
and practitioner contenders, so the race result is not specific to the
automatic worker.

Phase 3A is complete for automatic completion in the isolated PostgreSQL
proof. The worker remains disabled by default, automatic no-show is not
implemented, and real Daily/provider runtime remains a Phase 3B concern.

Phase 3B has not started provider execution: the local Daily credential is not
provably isolated to a non-production account and no webhook secret is
configured. Automatic no-show therefore remains Admin-managed and no-show
financial behavior remains outside the completion transaction.
