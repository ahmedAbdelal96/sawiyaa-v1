# Financial Operations Rollout Reference (Freeze)

This document is the frozen operational contract for Financial Operations rollout depth.

## Scope and Boundaries
- This module is a read/ops maturity layer over existing payments/refunds/settlements runtime.
- In scope:
  - admin/operator settlement visibility
  - bounded practitioner payout exception recording
  - practitioner self-scoped wallet/ledger/settlements reads
  - admin/operator payment/refund event inspection reads
- Out of scope:
  - payment/refund architecture redesign
  - settlement/ledger engine redesign
  - BI/reporting platform work
  - provider-debug raw payload dumps

## Route Access Matrix
- Admin or Support Agent:
  - `GET /api/v1/admin/settlements`
  - `GET /api/v1/admin/settlements/:id`
  - `GET /api/v1/admin/settlements/practitioners/:practitionerId/settlements`
  - `GET /api/v1/admin/settlements/practitioners/:practitionerId/payouts`
  - `GET /api/v1/admin/finance/operations/events`
  - `GET /api/v1/admin/finance/operations/events/:id`
- Admin only:
  - `POST /api/v1/admin/settlements/generate`
  - `POST /api/v1/admin/settlements/:id/mark-paid`
  - `POST /api/v1/admin/settlements/:id/mark-failed`
  - `POST /api/v1/admin/settlements/practitioners/:practitionerId/payouts/:settlementId`
- Practitioner self-only:
  - `GET /api/v1/practitioners/me/wallet`
  - `GET /api/v1/practitioners/me/ledger`
  - `GET /api/v1/practitioners/me/settlements`

## Response Envelope
- Success envelope: `{ success: true, data: ... }`
- Pagination envelope: `{ page, limit, totalItems, totalPages }`
- Empty-state behavior is deterministic:
  - list endpoints return `items: []` with valid pagination
  - wallet returns zeroed balances if no wallet row exists

## Frozen Filter/Sort/Pagination Semantics

### Admin Settlement Batches
- Filters:
  - `status`, `currencyCode`, `periodYear`, `periodMonth`, `createdFrom`, `createdTo`
- Ordering:
  - `periodYear desc`, `periodMonth desc`, `createdAt desc`, `id asc`
- Pagination:
  - `page` default `1`
  - `limit` default `20`, max `100`
- Invalid filter:
  - `createdFrom > createdTo` => invalid-filter error

### Practitioner Ledger
- Filters:
  - `entryType`, `balanceBucket`, `currencyCode`, `referenceType`, `paymentId`, `settlementId`, `effectiveFrom`, `effectiveTo`
- Ordering:
  - `effectiveAt desc`, `createdAt desc`, `id asc`
- Pagination:
  - `page` default `1`
  - `limit` default `20`, max `100`
- Invalid filter:
  - `effectiveFrom > effectiveTo` => invalid-filter error

### Practitioner Settlements
- Filters:
  - `status`, `currencyCode`, `createdFrom`, `createdTo`
- Ordering:
  - `createdAt desc`, `id asc`
- Pagination:
  - `page` default `1`
  - `limit` default `20`, max `100`
- Invalid filter:
  - `createdFrom > createdTo` => invalid-filter error

### Finance Operation Events
- Filters:
  - `operationType`, `provider`, `paymentPurpose`, `paymentStatus`, `refundStatus`, `paymentId`, `refundId`, `occurredFrom`, `occurredTo`, `query`
- Sorting:
  - `sortBy`: `OCCURRED_AT` (default) or `CREATED_AT`
  - `sortOrder`: `DESC` (default) or `ASC`
  - tie-breakers are deterministic by operation type then id
- Pagination:
  - `page` default `1`
  - `limit` default `20`, max `100`
- Invalid filter:
  - `occurredFrom > occurredTo` => invalid-filter error
  - `operationType=PAYMENT` with `refundStatus` or `refundId` => invalid-filter error

## Machine-Readable Error Keys
- Frozen finance ops baseline:
  - `FINANCIAL_OPS_INVALID_FILTER`
  - `FINANCIAL_OPS_FORBIDDEN_SCOPE`
  - `FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE`
- Route-specific operational errors (already used by rollout routes):
  - `FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND`
  - `FINANCIAL_OPERATIONS_SETTLEMENT_ITEM_NOT_FOUND`
  - `FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_NOT_FOUND`
  - `FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_EXISTS`
  - `FINANCIAL_OPERATIONS_INVALID_SETTLEMENT_STATE`
  - `FINANCIAL_OPERATIONS_SETTLEMENT_PAYOUT_ALREADY_RECORDED`
  - `FINANCIAL_OPERATIONS_INVALID_SETTLEMENT_PAYOUT_STATE`
  - `FINANCIAL_OPERATIONS_PAYMENT_NOT_FOUND`
  - `FINANCIAL_OPERATIONS_REFUND_NOT_FOUND`
  - `FINANCIAL_OPERATIONS_PAYMENT_NOT_CAPTURED`
  - `FINANCIAL_OPERATIONS_REFUND_NOT_SUCCEEDED`
  - `FINANCIAL_OPERATIONS_PAYMENT_SNAPSHOTS_INCOMPLETE`

## Enums Used By Finance Ops Reads
- Settlement status: `SettlementBatchStatus`, `PractitionerSettlementStatus`
- Ledger enums: `LedgerEntryType`, `LedgerDirection`, `WalletBalanceBucket`
- Event enums: `FinanceOperationTypeDto`, `FinanceOperationSortByDto`, `FinanceOperationSortOrderDto`
- Payment/refund context enums: `PaymentProvider`, `PaymentPurpose`, `PaymentStatus`, `RefundStatus`
- Settlement payout enums:
  - `SettlementPayoutMethod`
  - `SettlementPayoutSource`

## Operational Field Semantics
- Amount fields:
  - `totalAmount`: settlement batch computed total from child settlement net amounts
  - `totalAmountNet`: detailed settlement summary net total
  - wallet balances are projection values, not ledger source-of-truth replacements
- Timestamp fields:
  - `occurredAt`: domain event occurrence time used for ops timeline inspection
  - `createdAt`: record persistence creation timestamp
  - `updatedAt`: last wallet projection refresh timestamp
  - `lastLedgerEntryAt`: latest ledger entry timestamp in practitioner scope
- Linked refs:
  - `paymentId`, `refundId`: direct finance linkage
  - `linkedSessionId`, `linkedPractitionerId`: safe operational references for debugging and support context
  - ledger refs (`settlementId`, `referenceType`, `referenceId`) preserve traceability across flows
- Payout truth:
  - batch closeout remains the default operational path
  - single-practitioner payout exceptions are recorded as structured payout rows
  - each payout row captures method, source, reference, notes, timestamp, and operator context
