# Practitioner wallet credit and external payout

## Canonical lifecycle

Patient payment is recorded in its payment currency. After a completed session, the practitioner entitlement is reviewed in its source currency. Accountant approval is the only operation that may convert that entitlement into the canonical practitioner wallet currency and create the `PRACTITIONER_EARNING` credit.

External payout recording is a later, separate operation. It records a transfer already completed outside Sawiyaa and debits the wallet in the wallet currency. It never converts currency and never creates an earning credit.

## Settlement approval

The approval snapshot is stored on `PractitionerSettlement`:

- `originalAmount` / `originalCurrencyCode`: source entitlement/payment snapshot.
- `walletCurrencyCode`: currency of the canonical wallet used for the credit.
- `exchangeRate`: `1 USD = X EGP`, only for cross-currency approval; same-currency approvals store `null`.
- `convertedAmount`: calculated wallet amount before the accountant's final credit override.
- `finalWalletCredit`: approved amount credited to the wallet.
- `walletCreditDifferenceAmount` and `walletCreditOverrideReason`: immutable override evidence.
- `approvedByUserId` / `approvedAt`: approval provenance.

The backend uses `Prisma.Decimal`. USD to EGP multiplies by the rate; EGP to USD divides by the rate. The approved wallet amount and wallet currency are the authority for the wallet projection and the single `PRACTITIONER_EARNING` ledger entry.

## External payout

`PractitionerSettlementPayout` records:

- wallet debit (`amountPaid`) and wallet currency;
- transfer fee and `transferFeeCurrencyCode`;
- fee bearer (`PLATFORM_EXPENSE` or `DEDUCT_FROM_PRACTITIONER`);
- `netAmountReceived` and `totalPlatformOutflow`;
- external reference, transfer time, actor, and notes.

For a practitioner-borne fee, net received is wallet debit minus fee and platform outflow equals wallet debit. For a platform-borne fee, net received equals wallet debit and platform outflow equals wallet debit plus fee. The practitioner's wallet is never debited for the platform fee itself.

The payout currency is locked to the settlement wallet currency. Legacy Phase 4B.6 FX fields remain nullable/readable for historical records but are not used by the new payout workflow.

## Safety and refresh

Approval and payout run in serializable transactions with idempotency/duplicate checks. Approval creates one earning credit; payout creates one wallet debit for the requested withdrawal. Admin mutations invalidate the settlement detail and queue plus wallet, transfer, ledger, accounting, reconciliation, and finance query groups.

## QA and support

Development fixtures must be explicitly enabled and use the application lifecycle services. They must not write wallet, ledger, settlement, or payout rows directly. The known inconsistent development settlement `f6f11573-484d-4b08-82e2-cf2fb8eb8bc4` is legacy QA data and must not be used as a correctness reference.

Support should explain that approval adds money to the Sawiyaa wallet; it does not send a bank transfer. Recording a transfer documents a transfer that already happened and includes the fee policy and resulting net amount.

## Practitioner wallet currency hard invariant

The persisted `PractitionerWallet` row with `status = ACTIVE` is the only runtime
source of truth for a practitioner's wallet currency. The practitioner's profile
country is used when a wallet lifecycle operation resolves a target currency; it
is not consulted to reinterpret an existing wallet during a credit, ledger write,
debit, payout, fee, net-received, or platform-outflow operation.

Every wallet-facing financial write must therefore use the active wallet currency:

- approval credit and `PRACTITIONER_EARNING` ledger entry;
- payout debit and `SETTLEMENT_PAYOUT` ledger entry;
- transfer fee, net received, and platform outflow snapshots.

The backend reloads the active wallet inside the financial transaction and rejects
malformed or stale currency combinations with typed errors such as
`PRACTITIONER_WALLET_CURRENCY_MISMATCH`, `LEDGER_WALLET_CURRENCY_MISMATCH`, or
`PAYOUT_WALLET_CURRENCY_MISMATCH`. The transaction is rolled back, so a rejected
operation cannot leave a partial wallet, ledger, or payout update. The admin UI
shows the wallet currency as read-only, disables financial actions when the API
returns an integrity mismatch, displays the translated error, and refetches the
settlement detail.

The database additionally enforces one active wallet per practitioner with the
partial unique index `uq_practitioner_wallet_one_active`. Closed wallets are not
deleted, so historical balances and ledger references remain traceable. A country
change with non-zero available, pending, or reserved balance is blocked until the
old currency is settled; only then may the old wallet be closed and a new active
wallet be created.

### Operational audit queries

Before release, verify that every active practitioner has exactly one active
wallet, that practitioner earning and payout ledger entries match the wallet
currency recorded by their settlement, and that payout currency, transfer-fee
currency, net-received currency, and platform-outflow currency all match the
active wallet. Any mismatch is a production blocker and must be corrected through
an audited financial remediation process; it must not be silently converted.
