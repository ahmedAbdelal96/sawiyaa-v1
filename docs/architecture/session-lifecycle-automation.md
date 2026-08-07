# Session Lifecycle Automation

`SessionLifecycleService` is the sole writer of `Session.status`. Provider
attendance is evidence only; no provider event, worker, or scheduler can
finalize a no-show in the current phase.

## Manual no-show policy

Admin decisions map exactly as follows:

```text
MARK_PATIENT_NO_SHOW       -> PATIENT_NO_SHOW
MARK_PRACTITIONER_NO_SHOW  -> PRACTITIONER_NO_SHOW
MARK_BOTH_NO_SHOW          -> BOTH_NO_SHOW
```

The manual transaction locks the session, validates its current status,
applies the status through `SessionLifecycleService`, applies the approved
financial/package effect, and records the lifecycle and Admin audit events
atomically. The policy is:

- `PATIENT_NO_SHOW`: package `COUNT_AS_USED`; direct payment has no refund;
  the normal practitioner earning review is created once, with no immediate
  payout or settlement release.
- `PRACTITIONER_NO_SHOW`: package `RESTORE_TO_PACKAGE`; direct payment is
  credited to the patient's Sawiyaa Wallet only; no practitioner earning or
  payout is created.
- `BOTH_NO_SHOW`: status only; package and direct-payment decisions remain
  separate Admin decisions and no automatic earning, wallet, or package effect
  is applied.

Retries use stable idempotency keys and existing unique package, wallet/refund,
and earning-review boundaries. Identical terminal Admin actions are no-ops;
conflicting terminal actions return typed conflicts. Transaction rollback
removes the status, financial/package writes, and audit records together.

The practitioner-owned no-show endpoint is a report that the patient was
absent, hence its `PATIENT_NO_SHOW` result. It is distinct from the Admin
`MARK_PRACTITIONER_NO_SHOW` action, which means practitioner absence.

## Phase 3B.2

Automatic no-show remains out of scope. Any later automation requires approved
Daily identity/reconciliation runtime proof and must call the same locked
policy boundary without introducing automatic refunds or payouts by inference.
