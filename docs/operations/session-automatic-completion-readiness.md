# Superseded: Session completion readiness

Automatic completion is retired. Do not configure or enable an automatic
completion worker. The expiry sweeper only moves active sessions to
`AWAITING_COMPLETION_CONFIRMATION`; an Admin manual decision is the sole
completion authority. Keep attendance reconciliation, stale-evidence checks,
and financial idempotency monitoring in place for Admin review.
