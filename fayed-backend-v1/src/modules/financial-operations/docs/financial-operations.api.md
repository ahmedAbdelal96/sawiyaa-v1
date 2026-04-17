# Financial Operations API

## Canonical Freeze Reference
- Use `financial-operations-rollout-reference.md` as the canonical contract-freeze reference for:
  - route access matrix
  - filter/sort/pagination defaults
  - machine-readable error keys
  - enum usage
  - operational field semantics

## Purpose
Financial Operations Module is the internal accounting layer that comes after payment collection and after financial rules resolution.

It owns:
- ledger posting
- wallet read projection
  - settlement batch orchestration
  - bounded practitioner payout exception recording

It does not own:
- payment collection
- commission rule resolution
- coupon validation logic
- external payout provider integrations
- finance analytics dashboards

## Rollout Depth (Slice 1) Contract Baseline
This module now also freezes financial operations rollout ownership and route contracts for:
- admin/operator finance operation event inspection contract (`/admin/finance/operations/events`)
- practitioner self-scope finance read families (`/practitioners/me/*`)
- admin/operator settlement route family (`/admin/settlements/*`)

Slice 1 is contract-first and read-first. It does **not** redesign payment/refund runtime architecture.

## Principles
- `LedgerEntry` is the source of truth.
- `PractitionerWallet` is a derived balance view only.
- `PractitionerSettlement` and `SettlementBatch` orchestrate payouts but do not replace ledger traceability.
- Payment snapshots are consumed as-is; commission/coupon rules are not recomputed here.

## Practitioner Endpoints
- `GET /api/v1/practitioners/me/wallet`
- `GET /api/v1/practitioners/me/ledger`
- `GET /api/v1/practitioners/me/settlements`

## Slice 3 - Practitioner Read Rollout Depth
- Practitioner finance routes are strictly self-scoped through `practitioners/me`.
- Wallet contract includes grounded model fields:
  - `currency`
  - `pendingBalance`
  - `availableBalance`
  - `reservedBalance`
  - `totalEarned`
  - `lifetimePaidOut`
  - `lastLedgerEntryAt`
  - `updatedAt`
- Explicit wallet default state is returned when no wallet rows exist:
  - balances as `0.00`
  - `lastLedgerEntryAt` and `updatedAt` as `null`
- Ledger query semantics include deterministic filtering:
  - `entryType`, `balanceBucket`, `currencyCode`
  - `referenceType`, `paymentId`, `settlementId`
  - `effectiveFrom`, `effectiveTo`
  - `page`, `limit`
- Ledger ordering is deterministic:
  - `effectiveAt desc`
  - `createdAt desc`
  - `id asc`
- Settlements query semantics include deterministic filtering:
  - `status`, `currencyCode`
  - `createdFrom`, `createdTo`
  - `page`, `limit`
- Settlements ordering is deterministic:
  - `createdAt desc`
  - `id asc`
- Invalid practitioner date-range filters return machine-readable invalid-filter error.

## Admin Endpoints
- `POST /api/v1/admin/settlements/generate`
- `GET /api/v1/admin/settlements`
- `GET /api/v1/admin/settlements/:id`
- `GET /api/v1/admin/settlements/practitioners/:practitionerId/settlements`
- `GET /api/v1/admin/settlements/practitioners/:practitionerId/payouts`
- `POST /api/v1/admin/settlements/:id/mark-paid`
- `POST /api/v1/admin/settlements/:id/mark-failed`
- `POST /api/v1/admin/settlements/practitioners/:practitionerId/payouts/:settlementId`
- `GET /api/v1/admin/finance/operations/events`
- `GET /api/v1/admin/finance/operations/events/:id`

## Slice 4 - Payment/Refund Event Inspection Reads
- Event inspection routes are now repository-backed from existing `PaymentEvent` and `Refund` models.
- Access scope:
  - `GET /admin/finance/operations/events` and `GET /admin/finance/operations/events/:id` -> `ADMIN` or `SUPPORT_AGENT`
- Deterministic event list filtering supports grounded fields:
  - `operationType`, `provider`, `paymentPurpose`
  - `paymentStatus`, `refundStatus`
  - `paymentId`, `refundId`
  - `occurredFrom`, `occurredTo`
  - `query`
  - `sortBy`, `sortOrder`
  - `page`, `limit`
- Unsupported combination behavior:
  - `operationType=PAYMENT` with `refundStatus` or `refundId` is rejected as `FINANCIAL_OPS_INVALID_FILTER`
- Deterministic ordering remains stable by selected sort field with operation-type and id tie-breakers.
- Event detail payload includes safe operational fields and linked references:
  - `id`, `operationType`, payment/refund/provider/status context
  - `externalRef`, `summary`
  - `linkedSessionId`, `linkedPractitionerId`
  - `occurredAt`, `createdAt`
- Provider-debug raw dumps are intentionally out of scope in this rollout depth pass.

## Slice 2 - Admin Settlements Visibility
- Settlement batch list and detail are operator-facing read surfaces.
- Access scope:
  - `GET /admin/settlements` and `GET /admin/settlements/:id` -> `ADMIN` or `SUPPORT_AGENT`
  - settlement mutations (`generate`, `mark-paid`, `mark-failed`) remain `ADMIN` only
- List filter baseline:
  - `status`
  - `currencyCode`
  - `periodYear`
  - `periodMonth`
  - `createdFrom`, `createdTo`
  - `page`, `limit`
- Ordering baseline:
  - `periodYear desc`
  - `periodMonth desc`
  - `createdAt desc`
  - `id asc` (tie-breaker)
- Invalid filter behavior:
  - `createdFrom > createdTo` -> `FINANCIAL_OPS_INVALID_FILTER`
- Detail payload includes:
  - batch identity/status/timestamps
  - practitioner settlement child rows
  - deterministic summary block (`settlementItemsCount`, `totalAmountNet`, `statusCounts`)

## Ownership/Scope Matrix
- Admin/operator only:
  - settlement orchestration and settlement ops visibility routes
  - finance operation event inspection routes
- Practitioner self-only:
  - wallet summary
  - ledger list
  - settlements list
- Explicitly out of scope in rollout depth slice 1:
  - payment provider architecture changes
  - refund engine redesign
  - ledger/accounting engine redesign
  - BI/reporting/dashboard programs

## Filter/Sort/Pagination Semantics Baseline (Slice 1)
- Every list endpoint must remain deterministic and pagination-safe.
- Finance operation events support baseline query semantics:
  - `operationType`, `provider`, `paymentPurpose`, `paymentStatus`, `refundStatus`
  - `paymentId`, `refundId`
  - `occurredFrom`, `occurredTo`
  - `sortBy`, `sortOrder`
  - `page`, `limit`
- Invalid date range filters (`occurredFrom > occurredTo`) are rejected as machine-readable invalid-filter errors.

## Machine-Readable Error Baseline (Slice 1)
- `FINANCIAL_OPS_INVALID_FILTER`
- `FINANCIAL_OPS_FORBIDDEN_SCOPE`
- `FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE`

## Posting Rules
- Ledger posting is idempotent by payment id.
- Only captured payments can generate ledger entries.
- Practitioner earnings are posted as `PRACTITIONER_EARNING`.
- Platform share is posted as `PLATFORM_COMMISSION`.

## Wallet Rules
- Wallet is rebuilt from ledger aggregates.
- Current phase treats posted practitioner earnings as `AVAILABLE`.
- Settlement generation moves linked earning entries from `AVAILABLE` to `RESERVED`.
- Settlement failure releases them back to `AVAILABLE`.
- Settlement paid posts `SETTLEMENT_PAYOUT` debits against `RESERVED`.

## Settlement Notes
- Settlement generation is grouped by period and currency.
- Only `AVAILABLE`, unsettled practitioner-earning credits are selected.
- External bank/provider payout integration is deferred.
- Batch closeout still remains the default settlement model.
- A bounded practitioner payout exception route now records a structured payout history row for one settlement item when operations need flexibility.
- Payout history records store:
  - payout method
  - payout source
  - amount
  - currency
  - external payout reference
  - notes
  - effective timestamp
  - processed-by operator context

## Refund Posting Baseline
- Refund reversal ledger posting is available through dedicated refund posting use case.
- Posting is idempotent by `refundId` using `referenceType=refund` and `referenceId`.
- Refund reversals write:
  - `REFUND_PRACTITIONER_REVERSAL` (DEBIT)
  - `REFUND_PLATFORM_REVERSAL` (DEBIT)
