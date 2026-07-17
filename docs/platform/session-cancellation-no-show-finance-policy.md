# Sawiyaa Session Cancellation and No-Show Finance Policy

## Purpose

This document records the accepted v1 finance policy for session cancellation and no-show handling. It reflects the current backend behavior and the product decision that practitioner earnings are session-based and accountant-approved.

## Core Principles

- `LedgerEntry` is the source of truth for financial accounting.
- `PractitionerWallet` is a derived projection of ledger state.
- Payment capture does not make practitioner earnings payable.
- Session completion is the only path that creates `SessionEarningReview`.
- Accountant approval creates payable practitioner ledger entries.
- Practitioner payouts are performed outside Sawiyaa and recorded inside the system.
- Payouts may be full or partial.
- Review creation, approval, and payout recording must remain idempotent.

## Cancellation Policy

### Before capture

- If a session is cancelled before payment capture, the system releases the reservation or cancels the open payment intent according to the existing payment flow.
- No practitioner earning review is created.
- No practitioner payable entry is created.

### After capture

- In Sawiyaa v1, cancellation refunds captured session payments to `CUSTOMER_WALLET` only.
- Original-method cancellation refunds are out of scope for v1.
- If the cancellation policy allows a refund, the wallet refund path is used.
- Session cancellation does not create a practitioner payout obligation.

### Completion-only earning review rule

- A session must complete before the system creates `SessionEarningReview`.
- Cancellation does not create earning reviews.
- No-show does not create earning reviews.

## No-Show Policy

- No-show is operational/status-only in v1.
- No-show does not trigger refund processing.
- No-show does not mutate the customer wallet.
- No-show does not create practitioner payable ledger entries.
- No-show does not create `SessionEarningReview`.
- No-show should not advance package settlement.
- Duplicate no-show events for the same session/actor path must not be created.

## Package Session Behavior

- Current v1 package cancellation/no-show behavior does not explicitly restore or consume package entitlement.
- Package settlement remains tied to the existing completion flow.
- Cancellation/no-show must not advance package settlement.

## Refund After Approval or Payout

- If a refund is requested after practitioner approval or payout recording, it remains a manual finance exception in v1.
- The platform does not automatically reverse approved practitioner earnings or posted payout records.

## Decision Owner Matrix

| Case | Decision Owner | Financial Outcome |
| --- | --- | --- |
| Patient cancellation before capture | System policy | Release reservation or cancel open payment |
| Patient cancellation after capture | System policy | Wallet-only refund if policy allows |
| Practitioner cancellation | System policy / support / admin based on workflow | No practitioner earning review |
| Patient no-show | System / admin | No automatic financial movement |
| Practitioner no-show | System / admin | No automatic financial movement |
| Manual admin exception | Admin / finance | Follow existing policy and audit trail |

## Must-Never-Happen Rules

- No practitioner earning review from no-show.
- No practitioner payable from a cancelled session.
- No original-method cancellation refund in v1.
- No duplicate no-show audit/event spam.
- No refund without wallet/ledger consistency.
- No package settlement advancement from cancellation or no-show.

## Current Remaining Gaps

- Package entitlement restore/consume policy is still not explicit.
- Refund-after-payout reversal remains a manual finance exception.

## Status

This policy is aligned with the current backend implementation and documents the minimal hardened behavior for cancellation and no-show handling in v1.
