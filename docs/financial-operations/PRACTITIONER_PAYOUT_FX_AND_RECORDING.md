# Practitioner Payout FX and Recording

## Scope

This document describes the canonical Admin operation for recording an external practitioner transfer. It does not send money to a bank and it does not create an alternative payout path.

The canonical endpoint is:

`POST /api/v1/admin/settlements/:id/payout`

The settlement must already be approved and have an outstanding amount. The server derives the source amount and source currency from the approved settlement; the client cannot choose the accounting amount to debit.

## Currency and calculation rules

The supported rate convention is:

`1 USD = X EGP`

- Same-currency payout: no rate is stored or required, and calculated amount equals the source amount.
- USD to EGP: `source USD × rate = calculated EGP`.
- EGP to USD: `source EGP ÷ rate = calculated USD`.
- The calculated target amount is rounded to two decimal places by the backend using `Prisma.Decimal`.
- The default material-difference tolerance is `0.01` in the target currency.
- An actual amount outside that tolerance requires a non-empty override reason.

The browser may show a preview for usability, but the backend calculation is authoritative and is repeated before persistence.

## Immutable payout snapshot

Each new canonical payout records the FX and transfer decision in `PractitionerSettlementPayout`:

- source amount and source currency
- payout currency
- exchange rate, when cross-currency
- calculated payout amount
- actual payout amount
- difference amount
- override reason, when required
- external reference, effective timestamp, actor, and existing payout metadata

These fields are additive and nullable so historical payout rows remain readable. A historical row without these fields is presented as legacy FX data; the API and UI do not invent a rate of `1`.

## Accounting convention

The existing wallet and ledger architecture remains the source of truth. The settlement source amount and source currency continue to drive the single wallet/ledger application exactly once. The payout snapshot separately records the external transfer currency and actual amount. This preserves the existing accounting currency behavior while making the external transfer decision auditable.

The implementation does not directly update a wallet and does not create a second practitioner-earning ledger entry.

## Safety and idempotency

The existing settlement advisory lock, serializable transaction, status checks, external-reference checks, and idempotency checks remain in force. A repeated request for the same settlement cannot create a second payout or apply the wallet/ledger operation twice.

The operation rejects invalid currencies, missing cross-currency rates, non-positive or unreasonable rates, zero/negative amounts, and material actual-amount differences without a reason.

## Read-model refresh

After a successful payout, the Admin frontend invalidates the settlement detail and all known financial read-model prefixes, including practitioner balances/transfers, payouts, ledger, accounting, reconciliation, and finance dashboard queries. The next read therefore comes from the backend rather than stale cached data.

## Operational limitations

This flow records an external transfer that has already happened; it does not integrate with a bank or payment provider. No real-money transfer should be performed during QA. Existing legacy payout rows remain queryable, but their unavailable FX snapshot is explicitly labeled rather than reconstructed.
