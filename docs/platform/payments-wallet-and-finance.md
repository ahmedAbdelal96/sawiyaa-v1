# Payments, Wallet, and Finance

Payments and wallet are high-trust surfaces. They must be explicit, currency-aware, and easy to read.

## What the user should understand quickly

- How much money is available.
- What currency the amount is in.
- Which sessions were paid for.
- Which transactions were refunded.
- Whether a payment is pending, successful, failed, or under review.
- Whether a balance is available or held.

## Wallet vs payments history

- **Wallet** shows balance and wallet activity.
- **Payments history** shows payment transactions and session-related payment records.
- These should be related, but not duplicated in a noisy way.

## Currency rules

- Never mix currencies in one displayed number.
- Never assume everything is EGP.
- Never convert amounts in the UI.
- Always show the currency that comes from the backend data.
- If a screen has more than one currency, show them separately.

## Common states

- paid
- pending
- failed
- refunded
- refund pending
- partially refunded
- in review or processing

These should be shown as human-friendly labels, not raw backend enums.

## Instant booking payments

Accepted instant booking requests use the same payment infrastructure as normal sessions, but they are tracked as a distinct purpose:

- `PaymentPurpose.SESSION_INSTANT_BOOKING`

Rules:

- the payment amount comes from the backend frozen instant quote or backend instant price, not from frontend guessing
- the session is created in `PENDING_PAYMENT` after practitioner acceptance
- join and chat remain locked until the backend confirms payment
- the payment-return screen should refetch backend state before unlocking anything
- provider-side checkout QA can still be deferred if the external provider returns `403 Forbidden` in this environment

## Payment time handling

- Payment initiation, return, callback, and webhook timestamps are UTC instants.
- Same-surface return URLs should be preserved when the caller provides a trusted URL.
- The backend remains the source of truth for payment success, payment failure, and unlock timing.
- The UI must never unlock access just because a local device clock moved forward or a payment page displayed success.
- Payment-return screens should refetch backend state and then show the next action only after confirmation.
- This rule applies equally to scheduled sessions, instant booking sessions, package purchases, and training enrollments.

## Payment and refund lifecycle

The platform treats backend confirmation as the source of truth:

- initiation creates the payment record
- provider checkout is used only as the payment step
- return / callback / webhook handling confirms the final state
- the UI refetches after return before showing unlockable actions

The same rule applies to scheduled sessions, instant booking sessions, package purchases, and training enrollments.

## Money operations

Finance screens and backend flows should keep the following visible:

- payment acceptance
- payment status tracking
- refund decisions
- wallet balance updates
- practitioner payouts
- accounting reconciliation
- exception handling

## Related routes

- `/[locale]/patient/wallet`
- `/[locale]/patient/payments`
- `/[locale]/patient/sessions/[id]` for session-specific payment breakdowns
- `/[locale]/patient/sessions/[id]/payment-return` for payment confirmation after accepted instant-booking sessions
- practitioner wallet and ledger pages for provider-side financial views

## Related financial surfaces

- package purchase payment flows
- training enrollment payment flows
- session payment return flows
- individual practitioner payout tools
- accounting reconciliation

## Money copy guidance

- Use short labels such as "available balance", "held balance", "paid amount", or "refund amount".
- Do not bury the amount in paragraphs.
- Do not repeat the same explanation in multiple cards.
- If a refund is not available, explain why in one short sentence.

## Related docs

- [Finance and payouts](finance-and-payouts.md)
- [Accounting reconciliation](accounting-reconciliation.md)
- [Production rollout](production-rollout.md)
