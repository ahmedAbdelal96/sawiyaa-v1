# Automatic Completion Readiness

## Current operating posture

Keep `SESSION_AUTOMATIC_COMPLETION_ENABLED=false` in local, staging, and
production until the Phase 3A release gates are independently proven. The
worker is not a replacement for Admin review and has no automatic no-show path.

## Safe rollout checklist

- Confirm the canonical policy snapshot exists for every candidate session.
- Confirm reconciliation is complete, fresh, high confidence, and has no late
  evidence or identity/room conflict.
- Confirm the finalizer is the only completion entry point for the worker.
- Confirm `SESSION_COMPLETED` audit metadata includes worker run and evidence
  versions.
- Confirm package ledger and earning review are idempotent under replay.
- Confirm a failed transaction rolls back status, ledger, earning, and audit
  writes together.
- Confirm a single controlled worker instance before increasing batch size.
- Monitor completion, skipped/stale, transaction-error, and duplicate-effect
  metrics before widening rollout.

## Required pre-enable proof

The disposable PostgreSQL suite must cover exact 30- and 60-minute sessions,
below-threshold sessions, all three no-show classifications, duplicate and
concurrent finalizers, Admin/practitioner/cancellation races, stale and late
evidence, provider failure/room absence, package and direct-payment sessions,
rollback injection, and absence of duplicated financial effects.

The current local proof covers exact threshold boundaries, real package
settlement progress, real earning-review uniqueness, concurrent finalizers,
and rollback after package/review writes. Phase 3A.2 additionally proves the
cancellation, Admin, and practitioner completion races, late trusted-event
staleness, duplicate old trusted-event control, and direct-payment completion
and replay financial assertions in the same disposable PostgreSQL database.
Each race has one terminal winner, no duplicate package/earning effects, and
no stale-evidence completion. Direct payment remains captured with no refund,
wallet, payout, or settlement side effect.

The Phase 3A automatic-completion proof is complete for the supported local
contract. Keep the worker disabled until the separate Phase 3B provider and
scheduler runtime gate is approved; this does not enable automatic no-show.

Phase 3B Daily runtime is currently blocked by the inability to prove that the
available local Daily credential is non-production and isolated. No provider
call was made. Automatic patient, practitioner, and both-party no-show remain
disabled and Admin-managed until provider proof and owner-approved financial
policies exist.

No production or staging database is used by the focused proof. No Daily API
call is required for deterministic fixture tests. Real provider and scheduler
runtime verification is a separate gate.

## Rollback

Disable the worker flag and stop the scheduler. Do not manually reverse a
completed financial effect through this feature. Investigate the audit event,
transaction outcome, and package/earning records, then use the existing Admin
correction policy if a business correction is approved.
