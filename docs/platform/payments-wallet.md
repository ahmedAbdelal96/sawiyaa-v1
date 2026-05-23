# Payments and Wallet

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

## Typical UI patterns

- summary cards for balances or totals
- filters for history pages
- a clean table or compact list for transactions
- clear status badges
- concise empty states

## Related routes

- `/[locale]/patient/wallet`
- `/[locale]/patient/payments`
- `/[locale]/patient/sessions/[id]` for session-specific payment breakdowns
- practitioner wallet and ledger pages for provider-side financial views

## Money copy guidance

- Use short labels such as "available balance", "held balance", "paid amount", or "refund amount".
- Do not bury the amount in paragraphs.
- Do not repeat the same explanation in multiple cards.
- If a refund is not available, explain why in one short sentence.

