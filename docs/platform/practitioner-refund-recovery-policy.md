# Practitioner Refund Recovery Policy

## Purpose

Practitioner earnings are session-based and accountant-approved. When a captured refund happens after practitioner earnings have already been approved or paid out, Sawiyaa records the remaining unabsorbed practitioner shortfall as a recovery item instead of mutating old ledger rows.

## Core principles

- `LedgerEntry` remains the source of truth for posted accounting movement.
- `PractitionerWallet` remains a derived projection.
- Payment capture does not create recovery debt by itself.
- Session completion and review approval continue to drive earning recognition.
- Refund shortfalls after practitioner approval or payout create a practitioner recovery record.
- Payout recording may consume open recoveries as an offset against future payable amounts.
- Recovery actions are idempotent and auditable.
- Old ledger rows are never silently rewritten.

## Recovery flow

1. Payment is captured.
2. Session earning review is approved.
3. If a later refund happens and the practitioner payable balance can absorb part of the refund, Sawiyaa posts the absorbable refund reversal to the ledger.
4. Any remaining shortfall is written to `PractitionerRecovery`.
5. Future payouts consume open recoveries in order.
6. Manual collection or waiver can be represented as a recovery action.

## Recovery states

- `OPEN`
- `PARTIALLY_RECOVERED`
- `RECOVERED`
- `WAIVED`

## Recovery reason codes

- `REFUND_AFTER_APPROVAL`
- `REFUND_AFTER_PAYOUT`
- `MANUAL_FINANCE_CORRECTION`
- `ADMIN_EXCEPTION`

## Practitioner visibility

Practitioners should see only the operational balance and the outstanding recovery amount. Internal finance reasons remain internal unless a practitioner-facing note is intentionally supplied.

Suggested Arabic copy:

> استرداد المبالغ الخاصة بالمختص يُسجَّل داخليًا عند وجود فرق بعد الاسترداد أو بعد الصرف.

## Admin/accounting behavior

- Review the recovery record and linked refund.
- Apply recoveries to future payouts when the practitioner still has payable earnings.
- Collect or waive recovery amounts only through an admin-controlled finance action.
- Keep idempotency on recovery creation, payout application, collection, and waiver.

## Currency policy

- Recovery amounts stay in the same currency as the refund.
- No silent currency conversion is allowed.

## Payout policy

- Payouts remain manual/external and are recorded in Sawiyaa.
- Open recoveries reduce future payable amounts before payout recording completes.
- Multiple partial payout offsets are supported.
- Recovery application is idempotent by payout id and recovery action idempotency keys.

## Must-never-happen rules

- Do not mutate old ledger rows to hide a refund shortfall.
- Do not create duplicate recovery actions for the same payout retry.
- Do not expose internal accountant reasons to practitioners unless a practitioner-facing note exists.
- Do not silently convert currencies.
- Do not let a payout create a negative reserved balance.
- Do not lose recovery debt when a payout is recorded.

## Implementation status

- Refund recovery model and actions: implemented in backend schema and services.
- Refund shortfall creation: implemented.
- Future payout recovery consumption: implemented in payout services.
- Admin finance surface for manual recovery collection/waiver: backend service support exists; HTTP/admin surface may be added later if required.
- Frontend/mobile changes: none in this change set.

