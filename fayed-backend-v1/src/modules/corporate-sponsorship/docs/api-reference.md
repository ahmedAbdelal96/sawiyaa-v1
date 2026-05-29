# Corporate Sponsorship API Reference

All routes require JWT Bearer authentication (`Authorization: Bearer <token>`).

All admin routes require `ADMIN` or `SUPER_ADMIN` role plus specific `PermissionKey` checks.
All patient routes require `PATIENT` role plus active account (`ACTIVE_ACCOUNT` state).

All response envelopes use `{ success: true, data: ... }` shape for non-streaming responses.

---

## Admin — Corporate Organizations

### List Organizations
```
GET /admin/corporate/organizations
```
**Permissions:** `CORPORATE_ORGANIZATIONS_READ`

**Query params:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search by name or companyCode |
| `status` | `ACTIVE \| SUSPENDED \| INACTIVE` | — | Filter by status |
| `sortBy` | string | `createdAt` | Sort field |
| `sortDirection` | `asc \| desc` | `desc` | Sort direction |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Test Corp",
        "companyCode": "TST",
        "countryIsoCode": "EGY",
        "status": "ACTIVE",
        "billingEmail": "billing@test.com",
        "contactName": "John Doe",
        "contactPhone": "+201234567890",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z",
        "contractCount": 2,
        "activeContractCount": 1
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Get Organization Detail
```
GET /admin/corporate/organizations/:id
```
**Permissions:** `CORPORATE_ORGANIZATIONS_READ`

**Response `200`:**
```json
{
  "success": true,
  "data": { /* OrganizationResponseDto — same shape as list item */ }
}
```

---

### Create Organization
```
POST /admin/corporate/organizations
```
**Permissions:** `CORPORATE_ORGANIZATIONS_MANAGE`

**Request body:**
```json
{
  "name": "Test Corp",
  "companyCode": "TST",
  "countryIsoCode": "EGY",
  "billingEmail": "billing@test.com",
  "contactName": "John Doe",
  "contactPhone": "+201234567890",
  "status": "ACTIVE"
}
```
All fields except `countryIsoCode`, `contactName`, `contactPhone`, `status` are required.

**Response `201`:** Created organization (same shape as list item).

---

### Update Organization
```
PATCH /admin/corporate/organizations/:id
```
**Permissions:** `CORPORATE_ORGANIZATIONS_MANAGE`

**Request body:** Partial — any subset of: `name`, `countryIsoCode`, `billingEmail`, `contactName`, `contactPhone`

**Response `200`:** Updated organization.

---

### Update Organization Status
```
PATCH /admin/corporate/organizations/:id/status
```
**Permissions:** `CORPORATE_ORGANIZATIONS_MANAGE`

**Request body:**
```json
{ "status": "ACTIVE" | "SUSPENDED" | "INACTIVE" }
```

**Response `200`:** Updated organization.

---

## Admin — Corporate Contracts

### List Contracts by Organization
```
GET /admin/corporate/organizations/:organizationId/contracts
```
**Permissions:** `CORPORATE_ORGANIZATIONS_READ`

**Query params:** `page`, `limit`, `status` (`DRAFT | ACTIVE | EXPIRED | TERMINATED`), `sortBy`, `sortDirection`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "organizationId": "uuid",
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z",
        "status": "ACTIVE",
        "billingMode": "PREPAID",
        "currency": "EGP",
        "market": "EGYPT",
        "notes": null,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z",
        "planCount": 3,
        "activePlanCount": 2
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Get Contract Detail
```
GET /admin/corporate/contracts/:id
```
**Permissions:** `CORPORATE_ORGANIZATIONS_READ`

**Response `200`:** `{ success: true, data: ContractResponseDto }`

---

### Create Contract
```
POST /admin/corporate/organizations/:organizationId/contracts
```
**Permissions:** `CORPORATE_CONTRACTS_MANAGE`

**Request body:**
```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "billingMode": "PREPAID",
  "currency": "EGP",
  "market": "EGYPT",
  "notes": {},
  "status": "DRAFT"
}
```
Required: `startDate`, `endDate`, `billingMode`, `currency`, `market`. Optional: `notes`, `status`.

**Response `201`:** Created contract.

---

### Update Contract
```
PATCH /admin/corporate/contracts/:id
```
**Permissions:** `CORPORATE_CONTRACTS_MANAGE`

**Request body:** Partial — any of: `startDate`, `endDate`, `billingMode`, `currency`, `market`, `notes`

**Response `200`:** Updated contract.

---

### Update Contract Status
```
PATCH /admin/corporate/contracts/:id/status
```
**Permissions:** `CORPORATE_CONTRACTS_MANAGE`

**Request body:**
```json
{ "status": "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED" }
```

**Response `200`:** Updated contract.

---

## Admin — Corporate Benefit Plans

### List Plans by Contract
```
GET /admin/corporate/contracts/:contractId/plans
```
**Permissions:** `CORPORATE_PLANS_MANAGE`

**Query params:** `page`, `limit`, `status` (`ACTIVE | SUSPENDED | EXPIRED`), `sortBy`, `sortDirection`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "contractId": "uuid",
        "name": "Free Session Plan",
        "coverageType": "FREE_SESSION",
        "coveragePercent": null,
        "maxCoverageAmount": null,
        "maxTotalCoverage": null,
        "currency": "EGP",
        "codeUsageLimit": 1,
        "codeReservationTtlMinutes": 15,
        "status": "ACTIVE",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z",
        "specialtyCount": 0,
        "practitionerCount": 0
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Get Plan Detail
```
GET /admin/corporate/plans/:id
```
**Permissions:** `CORPORATE_PLANS_MANAGE`

**Response `200`:** `{ success: true, data: BenefitPlanResponseDto }`

---

### Create Plan
```
POST /admin/corporate/contracts/:contractId/plans
```
**Permissions:** `CORPORATE_PLANS_MANAGE`

**Request body:**
```json
{
  "name": "Free Session Plan",
  "coverageType": "FREE_SESSION",
  "coveragePercent": 80,
  "maxCoverageAmount": 500,
  "maxTotalCoverage": 5000,
  "currency": "EGP",
  "codeUsageLimit": 1,
  "codeReservationTtlMinutes": 15,
  "status": "ACTIVE",
  "specialtyIds": [],
  "practitionerIds": []
}
```
Required: `name`, `coverageType`, `currency`. Optional: `coveragePercent`, `maxCoverageAmount`, `maxTotalCoverage`, `codeUsageLimit` (must be 1 for V1), `codeReservationTtlMinutes` (5-60, default 15), `status`, `specialtyIds`, `practitionerIds`.

**Coverage types:** `FREE_SESSION | DISCOUNT_PERCENT | FIXED_AMOUNT`

**Response `201`:** Created plan.

---

### Update Plan
```
PATCH /admin/corporate/plans/:id
```
**Permissions:** `CORPORATE_PLANS_MANAGE`

**Request body:** Partial — any of: `name`, `coverageType`, `coveragePercent`, `maxCoverageAmount`, `maxTotalCoverage`, `codeUsageLimit`, `codeReservationTtlMinutes`, `specialtyIds`, `practitionerIds`

**Response `200`:** Updated plan.

---

### Update Plan Status
```
PATCH /admin/corporate/plans/:id/status
```
**Permissions:** `CORPORATE_PLANS_MANAGE`

**Request body:**
```json
{ "status": "ACTIVE" | "SUSPENDED" | "EXPIRED" }
```

**Response `200`:** Updated plan.

---

## Admin — Corporate Code Batches

### Generate Code Batch
```
POST /admin/corporate/plans/:planId/code-batches
```
**Permissions:** `CORPORATE_CODES_GENERATE`

**Request body:**
```json
{
  "name": "Batch Q1 2025",
  "totalCodes": 100,
  "expiresAt": "2025-12-31T23:59:59Z",
  "exportMode": "DIRECT_STREAM"
}
```
Required: `name`, `totalCodes` (1-100000). Optional: `expiresAt` (ISO 8601), `exportMode` (currently only `"DIRECT_STREAM"`).

**Response:** HTTP `200` (not `201`), Content-Type `text/csv; charset=utf-8`, with headers:
- `Content-Disposition: attachment; filename="batch-{batchId}.csv"`
- `X-Batch-Id: {batchId}`
- `X-Total-Codes: {totalCodes}`
- `X-Generated-Count: {generatedCount}`

**CSV columns:** `organizationName, companyCode, batchName, benefitCode, expiresAt, coverageType, currency, maxCoverageAmount, coveragePercent`

The CSV body contains the plain-text `benefitCode` values (e.g., `FYD-ABCD-EFGH-IJKL`). **This is the only time these codes are exposed — they are not stored in the DB and cannot be re-exported.**

**No JSON response body** — the CSV is the entire response.

---

### List Code Batches by Plan
```
GET /admin/corporate/plans/:planId/code-batches
```
**Permissions:** `CORPORATE_ORGANIZATIONS_READ`

**Query params:** `page`, `limit`, `status` (`GENERATING | ACTIVE | EXPIRED | REVOKED | FAILED`), `sortBy`, `sortDirection`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "batch-uuid",
        "organizationId": "org-uuid",
        "organizationName": "Test Corp",
        "companyCode": "TST",
        "contractId": "contract-uuid",
        "benefitPlanId": "plan-uuid",
        "name": "Batch Q1 2025",
        "totalCodes": 100,
        "generatedCount": 100,
        "expiresAt": "2025-12-31T23:59:59Z",
        "status": "ACTIVE",
        "exportedAt": "2025-01-15T10:00:00Z",
        "createdAt": "2025-01-15T09:00:00Z",
        "updatedAt": "2025-01-15T09:00:00Z",
        "revokedAt": null,
        "revokeReason": null,
        "statusCounts": {
          "available": 80,
          "reserved": 10,
          "used": 5,
          "revoked": 3,
          "expired": 2
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Note on `exportedAt`:** This field is set when the CSV was downloaded. It marks the timestamp of export but does not block re-download (the CSV content itself is not stored — only the timestamp is persisted). Backend team should be consulted if CSV re-download is needed.

---

### Get Code Batch Detail
```
GET /admin/corporate/code-batches/:id
```
**Permissions:** `CORPORATE_ORGANIZATIONS_READ`

**Response `200`:** `{ success: true, data: CodeBatchItemResponseDto }`

Note: Full plain-text codes are NOT returned by this endpoint — only batch metadata and status counts.

---

### Revoke Code Batch
```
POST /admin/corporate/code-batches/:id/revoke
```
**Permissions:** `CORPORATE_CODES_REVOKE`

**Request body:**
```json
{ "revokeReason": "Contract cancelled" }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "batch-uuid",
    "status": "REVOKED",
    "revokedAt": "2025-01-20T10:00:00Z",
    "revokeReason": "Contract cancelled",
    "statusCounts": {
      "available": 0,
      "reserved": 0,
      "used": 5,
      "revoked": 95,
      "expired": 0
    }
  }
}
```

**Behavior:** Only `AVAILABLE` codes are revoked. Already `USED` codes remain `USED`.

---

## Patient — Corporate Sponsorship

All patient endpoints are under `/patients/me/sessions/:sessionId/corporate-sponsorship`.

**Auth:** PATIENT role + active account.

### Preview Sponsorship Eligibility
```
POST /patients/me/sessions/:sessionId/corporate-sponsorship/preview
```

**Request body:**
```json
{
  "companyCode": "TST",
  "benefitCode": "FYD-ABCD-EFGH-IJKL"
}
```

**Response `200` (eligible):**
```json
{
  "eligible": true,
  "organizationName": "Test Corp",
  "planName": "Free Session",
  "coverageType": "FREE_SESSION",
  "originalAmount": "500.00",
  "coveredAmount": "500.00",
  "patientPayAmount": "0.00",
  "currency": "EGP",
  "reservationTtlMinutes": 15,
  "message": "Your session is fully covered by Test Corp."
}
```

**Response `200` (not eligible):**
```json
{
  "eligible": false,
  "organizationName": null,
  "planName": null,
  "coverageType": null,
  "originalAmount": null,
  "coveredAmount": null,
  "patientPayAmount": null,
  "currency": null,
  "reservationTtlMinutes": null,
  "message": "This code is not valid for this session."
}
```

**Error states:**
- `400` — Invalid code format or missing fields
- `404` — Session not found or patient doesn't own the session
- `422` — Code valid but session not eligible (wrong market, plan expired, etc.)

**Note:** Preview does not mutate any state. It is read-only.

---

### Reserve Sponsorship
```
POST /patients/me/sessions/:sessionId/corporate-sponsorship/reserve
```

**Request body:**
```json
{
  "companyCode": "TST",
  "benefitCode": "FYD-ABCD-EFGH-IJKL"
}
```

**Response `201`:**
```json
{
  "sponsorshipId": "uuid",
  "reservedUntil": "2025-01-01T12:30:00Z",
  "originalAmount": "500.00",
  "coveredAmount": "500.00",
  "patientPayAmount": "0.00",
  "currency": "EGP",
  "coverageType": "FREE_SESSION",
  "planName": "Free Session",
  "organizationName": "Test Corp",
  "message": "Corporate sponsorship reserved. Proceed to payment."
}
```

**Error states:**
- `409` — Code already reserved for a different session
- `409` — Sponsorship already exists for this session (already reserved)
- `410` — Code expired or revoked
- `422` — Not eligible (plan limits, market, etc.)
- `404` — Session not found

**Important:** After successful reserve, immediately navigate to payment. If `patientPayAmount === "0.00"`, the payment initiation will route to `INTERNAL_WALLET` automatically — no external payment form is needed.

---

### Release Reservation
```
DELETE /patients/me/sessions/:sessionId/corporate-sponsorship/reservation
```

**Response `200` (success):**
```json
{
  "released": true,
  "previousSponsorshipId": "uuid",
  "message": "Corporate sponsorship reservation released. The code is now available again."
}
```

**Response `200` (failed — code already used):**
```json
{
  "released": false,
  "previousSponsorshipId": "uuid",
  "message": "sponsorship.errors.codeAlreadyUsed"
}
```

**Response `200` (no reservation):**
```json
{
  "released": true,
  "previousSponsorshipId": "",
  "message": "sponsorship.messages.noReservationFound"
}
```

**Note:** Releasing a CONSUMED sponsorship (after payment) returns `released: false`. Only RESERVED sponsorships can be successfully released.

---

## Payment Integration (Backend-Internal)

These are NOT public endpoints. They describe internal integration points.

### Payment Initiation with Sponsorship

When `POST /patients/me/sessions/:sessionId/payment/initiate` is called with an active `RESERVED` sponsorship:

1. `EffectiveAmountTotal` = `patientPayAmount` — final amount charged to the patient (may be 0 if fully sponsored)
2. `EffectiveAmountSubtotal` = `originalAmount` — original session price before sponsorship
3. `EffectiveAmountDiscount` = `coveredAmount` — amount paid by the corporate sponsor
4. Payment metadata includes (internal only):
   ```json
   {
     "sponsorshipId": "uuid",
     "corporateOrganizationId": "uuid",
     "corporateContractId": "uuid",
     "corporateBenefitPlanId": "uuid",
     "coveredAmount": "500.00",
     "originalAmount": "500.00",
     "patientPayAmount": "0.00",
     "currency": "EGP"
   }
   ```
5. **These fields are NEVER in payment metadata:** `benefitCode`, `codeHash`, `codeId`, `codePrefix`, `codeLast4`

### Payment Success Consume

When payment webhook confirms success:
- `MarkPaymentSucceededUseCase` detects `sponsorshipId` in metadata
- Calls `CorporateSponsorshipConsumeService.consumeAfterPayment({ sponsorshipId, sessionId, paymentId, paidAmount, currency })`
- If `paidAmount !== patientPayAmount` → consume rejects
- On success: code → USED, sponsorship → CONSUMED, ledger CODE_CONSUMED written

### Zero-Amount Flow

If `patientPayAmount === "0.00"`:
- Payment initiation still occurs (creates payment record with status PENDING)
- Backend routes to `INTERNAL_WALLET` provider
- Wallet captures the "payment" at zero amount
- Payment success webhook triggers consume

---

## Error Response Format

All errors follow NestJS exception format. Corporate errors use:
```json
{
  "message": "Human-readable message (locale-aware)",
  "error": "MACHINE_CODE",
  "statusCode": 400
}
```

Key error codes:
| Error Code | Meaning |
|------------|---------|
| `CORPORATE_NOT_ELIGIBLE` | Code valid but session not eligible |
| `CORPORATE_CODE_NOT_AVAILABLE` | Code already used, revoked, or expired |
| `CORPORATE_SESSION_MISMATCH` | Code reserved for a different session |
| `CORPORATE_SPONSORSHIP_EXISTS` | Sponsorship already active for this session |
| `SPONSORSHIP_NOT_FOUND` | No RESERVED sponsorship found for session |
| `PAYMENT_AMOUNT_MISMATCH` | Paid amount doesn't match patientPayAmount |

---

## Internationalization

All patient-facing messages support `en` (English) and `ar` (Arabic). Use the `Accept-Language` header or `CurrentLocale` decorator to set locale. Backend returns messages in the requested locale.

---

## Multi-Currency

- `EGP` — Egypt market, Paymob provider
- `USD` — International market, Stripe provider

Display the `currency` field from all responses to the patient. Amounts are decimal strings (e.g., `"500.00"`). Never assume only EGP.

---

## Status Enums Reference

| Entity | Statuses |
|--------|----------|
| `CorporateOrganizationStatus` | `ACTIVE`, `SUSPENDED`, `INACTIVE` |
| `CorporateContractStatus` | `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED` |
| `CorporateBenefitPlanStatus` | `ACTIVE`, `SUSPENDED`, `EXPIRED` |
| `CorporateBatchStatus` | `GENERATING`, `ACTIVE`, `EXPIRED`, `REVOKED`, `FAILED` |
| `CorporateCodeStatus` | `AVAILABLE`, `RESERVED`, `USED`, `REVOKED`, `EXPIRED` |
| `CorporateSponsorshipStatus` | `RESERVED`, `CONSUMED`, `RELEASED`, `REFUNDED` |
| `CorporateCoverageType` | `FREE_SESSION`, `DISCOUNT_PERCENT`, `FIXED_AMOUNT` |
| `CorporateBillingMode` | `PREPAID`, `POSTPAID`, `HYBRID` |
| `CorporateMarket` | `EGYPT`, `INTERNATIONAL` |