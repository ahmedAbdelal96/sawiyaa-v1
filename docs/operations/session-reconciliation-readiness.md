# Session Reconciliation Readiness

## Worker contract

The existing completion-confirmation sweeper runs every 60 seconds when
`SESSION_COMPLETION_CONFIRMATION_SWEEPER_ENABLED=true`, with a default batch of
50 and a default maximum of 5,000 rows per run. It claims candidates with a
row lock and `SKIP LOCKED`, and moves ended `UPCOMING`, `READY_TO_JOIN`, and
`IN_PROGRESS` sessions only to `AWAITING_COMPLETION_CONFIRMATION`.

The configured `SESSION_COMPLETION_CONFIRMATION_SWEEPER_GRACE_MINUTES` is the
business finalization grace. The policy snapshot also records an explicit late
evidence wait; it is currently `0` because the existing grace already includes
that hold. The evaluation due formula is:

```text
scheduledEndAt + finalizationGraceMinutes + lateEvidenceWaitingMinutes
```

All values are Backend UTC instants. No frontend clock is authoritative.

## Operational safety

This phase does not install a production reconciliation scheduler. The
`ReconcileSessionAttendanceUseCase` is retry-safe for an observation version,
bounded by the provider adapter timeout, and writes only sanitized evidence.
Deployment must provide a multi-instance worker with bounded retries,
backoff, metrics, provider failure classification, and an explicit readiness
signal when disabled before Phase 3 enables automatic finalization.

Required checks before Phase 3:

- Daily credentials and webhook authentication are configured separately;
- provider room references exist for due sessions;
- reconciliation request timeout and retry budgets are configured;
- provider health and observation coverage are observable;
- late trusted events mark evaluations stale;
- no terminal or financial writer is invoked by reconciliation.

No real Daily call or normal development database mutation was performed during
local verification.
