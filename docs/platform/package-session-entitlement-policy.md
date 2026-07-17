# Package Session Entitlement Policy

## Purpose

Package-covered sessions need a safe, auditable decision when the session is cancelled or marked as no-show.
The decision determines whether the session should be restored back to the package entitlement or counted as used.

## Core rules

- The decision is **audit-only**.
- It does **not** create a refund.
- It does **not** create a payout.
- It does **not** change practitioner earnings.
- It does **not** advance any finance workflow automatically.
- It is recorded once per session and is idempotent.

## Supported decision outcomes

- `RESTORE_TO_PACKAGE`
- `COUNT_AS_USED`

## Supported reason codes

- `PATIENT_FAULT`
- `PATIENT_NO_SHOW`
- `PRACTITIONER_FAULT`
- `ADMIN_EXCEPTION`

## Allowed session states

The decision is only accepted for package-covered sessions in:

- `CANCELLED`
- `NO_SHOW`

## Business intent

- `RESTORE_TO_PACKAGE` means the package entitlement should be restored for later use.
- `COUNT_AS_USED` means the package session is consumed and remains used.
- `PRACTITIONER_FAULT` cannot be paired with `COUNT_AS_USED`.

## Idempotency and audit trail

- Every decision requires an idempotency key.
- Replaying the same idempotency key returns the same decision.
- A different idempotency key for an already decided session is rejected.
- Each successful decision writes an admin session event for audit traceability.

## UI status

The admin runtime inspector and session list now expose a package entitlement panel for package-covered sessions.
The panel is read-only when the admin does not have the required write permission.

## Known non-goals

- No automatic refund or payout is triggered.
- No patient-facing financial messaging is added.
- No package settlement mutation happens outside the explicit decision record.

## Validation status

This policy is backed by the new backend decision use case, controller access checks, frontend runtime inspection panel, and localized admin labels.
