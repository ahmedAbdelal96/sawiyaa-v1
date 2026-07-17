# Practitioner Session Earning Accounting

## Purpose

Practitioner earnings are session-based and accountant-approved.

The platform treats earnings as a financial accounting flow, not as an automatic payout shortcut. A completed session may create an earning review, but the final payable amount only becomes authoritative after accountant approval.

## Core Principles

- `LedgerEntry` is the source of truth for financial accounting.
- `PractitionerWallet` is a derived projection / convenience summary.
- Payment capture does not make practitioner earnings payable.
- Session completion creates a `SessionEarningReview`.
- Accountant approval creates payable practitioner earning ledger entries.
- Payout happens outside Sawiyaa and is recorded inside Sawiyaa afterward.
- Payouts can be full or partial.
- Idempotency is required for review creation, approval, and payout recording.

## Unified Session Policy

This policy applies to:

- direct sessions
- package sessions

Canonical flow:

```text
Payment captured
→ platform held
→ session completed
→ SessionEarningReview
→ accountant approval
→ practitioner earning ledger entry
→ wallet / payable update
→ manual external payout
→ payout recorded internally
```

## Practitioner Visibility

Before accountant approval:

- no final payable amount should be shown.

After approval:

- practitioner can see the final approved amount, currency, and status.

Suggested Arabic copy for the practitioner-facing waiting state:

> مستحقات الجلسات المكتملة تتم مراجعتها خلال 1 إلى 2 يوم عمل.

## Admin / Accountant Flow

The admin finance surface supports the following operational steps:

- list pending and finalized reviews
- open review detail
- approve as-is
- edit and approve with a reason
- reject or exclude when supported
- record payout with minimal fields, usually amount only
- allow partial payouts

## Currency Policy

- Approved earnings use the practitioner payout currency.
- Old balances are not silently converted.
- FX / conversion must be explicit if it is implemented.

## Payout Policy

- The external transfer happens outside the platform.
- Admin records the payout inside Sawiyaa.
- Multiple partial payouts are supported.
- Idempotency uses `externalPayoutRef` or `idempotencyKey`.
- Overpayment must be blocked.
- The normal payout path must not create negative reserved balances.

## Refund / Cancellation / No-Show Notes

Current behavior:

- earnings stay tied to completed sessions and accountant approval.
- cancelled, unpaid, or unresolved sessions should not produce payable practitioner earnings.
- refund-related reversal and settlement handling remain ledger-driven when supported by the backend accounting flow.

Known gaps / reminders:

- practitioner-facing payout visibility remains read-only until the approved earning exists.
- refund behavior must continue to be accounted for by the ledger and reconciliation layer, not by ad hoc wallet mutation.

## QA Status

Accepted validation:

- backend typecheck passed
- backend build passed
- `npx prisma validate --schema prisma/schema.prisma` passed
- targeted finance tests passed
- payout multi-installment / idempotency path passed
- direct-session and package-session review orchestration verified
- admin API smoke passed
- admin browser list/detail smoke passed
- wallet reconciliation passed
- frontend i18n check passed
- frontend typecheck passed
- frontend build passed

## Known Limitations

- browser approve/edit action was not exercised because no safe pending review row was available
- practitioner OTP browser login was not exercised in this smoke
- payout browser mutation was intentionally skipped
- local legacy reserved `-100` artifact still exists in the test data, but reconciliation is clean

## Must-Never-Happen Rules

- do not post practitioner `AVAILABLE` earnings on payment capture
- do not show the final amount before accountant approval
- do not mutate old ledger entries silently
- do not silently convert currencies
- do not allow duplicate payout on retry
- do not allow overpayment
- do not expose internal accountant reasons to the practitioner unless `practitionerFacingNote` exists

## Final Implementation Status

The accounting flow is implemented and smoke-verified for:

- session completion review creation
- accountant approval
- ledger posting
- practitioner wallet projection refresh
- payout recording
- reconciliation visibility

The file is intentionally documentation only. It does not change backend logic, frontend behavior, mobile behavior, migrations, or data.
