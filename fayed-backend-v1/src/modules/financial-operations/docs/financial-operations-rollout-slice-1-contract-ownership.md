# Financial Operations Rollout Depth - Slice 1

## Scope
- Contract-first and ownership-first baseline for financial operations rollout depth.
- Freezes admin/operator vs practitioner self-service route families.
- Defines finance operation event inspection contract shape without full read-model wiring.

## Ownership Boundaries
- Financial Operations owns:
  - finance ops route contracts
  - operator/practitioner scope semantics
  - read/ops maturity wiring
- Financial Operations does not own:
  - payment collection runtime architecture
  - refund runtime architecture
  - ledger/settlement engine redesign
  - BI/reporting platform concerns

## Route Families
- Admin/operator scope:
  - `GET /api/v1/admin/settlements`
  - `GET /api/v1/admin/settlements/:id`
  - `GET /api/v1/admin/finance/operations/events`
  - `GET /api/v1/admin/finance/operations/events/:id`
- Practitioner self scope:
  - `GET /api/v1/practitioners/me/wallet`
  - `GET /api/v1/practitioners/me/ledger`
  - `GET /api/v1/practitioners/me/settlements`

## Baseline Query Semantics
- Pagination baseline:
  - `page` minimum 1
  - `limit` minimum 1, maximum 100
- Event inspection baseline supports:
  - `operationType`, `provider`, `paymentPurpose`, `paymentStatus`, `refundStatus`
  - `paymentId`, `refundId`
  - `occurredFrom`, `occurredTo`
  - `sortBy`, `sortOrder`
  - `query`
- Invalid date range (`occurredFrom > occurredTo`) is rejected deterministically.

## Machine-Readable Errors
- `FINANCIAL_OPS_INVALID_FILTER`
- `FINANCIAL_OPS_FORBIDDEN_SCOPE`
- `FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE`

## Deferred to Later Rollout Slices
- Admin settlements visibility depth refinements
- Repository-backed finance operation event inspection read model
- Additional operator diagnostics over payment/refund event chains
