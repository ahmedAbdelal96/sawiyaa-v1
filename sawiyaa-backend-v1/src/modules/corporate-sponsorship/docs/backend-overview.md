# Corporate Sponsorship Backend Overview

## Business Model

Corporate sponsorship allows enrolled companies to sponsor their employees' clinical sessions on Sawiyaa. The system supports two market segments:

- **Egypt sessions** (`EGYPT` market): EGP currency, Paymob payment provider
- **International sessions** (`INTERNATIONAL` market): USD currency, Stripe payment provider

Corporate sponsorship follows the session's existing currency. There is no currency conversion — a session priced in EGP uses EGP sponsorship; a session priced in USD uses USD sponsorship.

---

## Data Hierarchy

```
CorporateOrganization (ACTIVE | SUSPENDED | INACTIVE)
  └── CorporateContract (DRAFT | ACTIVE | EXPIRED | TERMINATED)
        └── CorporateBenefitPlan (ACTIVE | SUSPENDED | EXPIRED)
              └── CorporateBenefitCode (AVAILABLE | RESERVED | USED | REVOKED | EXPIRED)
                    └── CorporateSessionSponsorship (RESERVED | CONSUMED | RELEASED | REFUNDED)

CorporateLedger (CODE_CONSUMED events — audit trail)
```

---

## Core Entities

### CorporateOrganization
A company enrolled in the corporate sponsorship program.

- **Statuses:** `ACTIVE`, `SUSPENDED`, `INACTIVE`
- Key fields: `name`, `companyCode`, `billingEmail`, `countryIsoCode`

### CorporateContract
A contract between a corporate organization and Sawiyaa.

- **Statuses:** `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`
- **Billing modes:** `PREPAID`, `POSTPAID`, `HYBRID` (V1 only supports PREPAID for patient reserve)
- **Markets:** `EGYPT`, `INTERNATIONAL`
- Key fields: `startDate`, `endDate`, `currency`, `market`, `billingMode`

### CorporateBenefitPlan
A benefit package under a contract.

- **Statuses:** `ACTIVE`, `SUSPENDED`, `EXPIRED`
- **Coverage types:** `FREE_SESSION`, `DISCOUNT_PERCENT`, `FIXED_AMOUNT`
- Key fields: `name`, `coverageType`, `coveragePercent`, `maxCoverageAmount`, `maxTotalCoverage`, `currency`, `codeUsageLimit` (V1: must be 1), `codeReservationTtlMinutes` (default 15, range 5-60)

### CorporateBenefitCode
Generated in batches. **The full plain-text benefit code (e.g., `FYD-ABCD-EFGH-IJKL`) is returned only once — in the CSV body of the generate response. It is never stored in the database after generation.**

- **Statuses:** `AVAILABLE`, `RESERVED`, `USED`, `REVOKED`, `EXPIRED`
- DB stores: `codeHash` (HMAC-SHA256 of plain code), `codePrefix`, `codeLast4`
- `exportedAt` timestamp on batch marks that CSV was downloaded (admin should note the timestamp)

### CorporateSessionSponsorship
Created when a patient reserves a benefit code for a session.

- **Statuses:** `RESERVED`, `CONSUMED`, `RELEASED`, `REFUNDED`
- Key financial fields:
  - `originalAmount` — session price before sponsorship
  - `coveredAmount` — amount paid by corporate sponsor
  - `patientPayAmount` — amount patient pays (may be 0)
  - `currency` — follows session currency

### CorporateLedger
Audit log. `CODE_CONSUMED` events written after successful payment consume.

---

## Backend Lifecycle

### 1. Admin Creates Organization
```
POST /admin/corporate/organizations
```
Required fields: `name`, `companyCode`, `billingEmail`

### 2. Admin Creates Contract
```
POST /admin/corporate/organizations/:organizationId/contracts
```
Required fields: `startDate`, `endDate`, `billingMode` (PREPAID), `currency` (EGP/USD), `market` (EGYPT/INTERNATIONAL)

### 3. Admin Creates Benefit Plan
```
POST /admin/corporate/contracts/:contractId/plans
```
Required fields: `name`, `coverageType`, `currency`
Optional: `coveragePercent`, `maxCoverageAmount`, `maxTotalCoverage`, `codeUsageLimit` (must be 1 for V1), `codeReservationTtlMinutes` (default 15), `specialtyIds`, `practitionerIds`

### 4. Admin Generates Code Batch
```
POST /admin/corporate/plans/:planId/code-batches
Body: { "name": "Batch Q1 2025", "totalCodes": 100, "expiresAt": "2025-12-31T23:59:59Z" }
```

**CSV is returned in the HTTP response body** — NOT as a JSON field. The response is `Content-Type: text/csv; charset=utf-8` with headers `Content-Disposition: attachment; filename="batch-{batchId}.csv"` and `X-Batch-Id`, `X-Total-Codes`, `X-Generated-Count`.

The CSV contains: `organizationName, companyCode, batchName, benefitCode, expiresAt, coverageType, currency, maxCoverageAmount, coveragePercent`

**Critical:** Plain-text codes (`benefitCode` column) are only available in this response. The admin must download and securely distribute codes to employees.

### 5. Patient Previews Sponsorship
```
POST /patients/me/sessions/:sessionId/corporate-sponsorship/preview
Body: { "companyCode": "TST", "benefitCode": "FYD-ABCD-EFGH-IJKL" }
```
Returns:
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
Preview does NOT reserve anything — it only checks eligibility.

### 6. Patient Reserves Sponsorship
```
POST /patients/me/sessions/:sessionId/corporate-sponsorship/reserve
Body: { "companyCode": "TST", "benefitCode": "FYD-ABCD-EFGH-IJKL" }
```
Returns:
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
This atomically marks the code as `RESERVED` for the session and creates the sponsorship record.

### 7. Patient Releases Reservation
```
DELETE /patients/me/sessions/:sessionId/corporate-sponsorship/reservation
```
Returns:
```json
{
  "released": true,
  "previousSponsorshipId": "uuid",
  "message": "Corporate sponsorship reservation released. The code is now available again."
}
```
If code is already `USED`, returns `{ released: false, previousSponsorshipId: "uuid", message: "sponsorship.errors.codeAlreadyUsed" }`.

### 8. Payment Initiation
When `POST /patients/me/sessions/:sessionId/payment/initiate` is called with an active `RESERVED` sponsorship:

1. Backend overrides payment amounts:
   - `effectiveAmountTotal = patientPayAmount`
   - `effectiveAmountSubtotal = originalAmount`
   - `effectiveAmountDiscount = coveredAmount`
2. Payment metadata (internal, not patient-visible) includes: `sponsorshipId`, `corporateOrganizationId`, `corporateContractId`, `corporateBenefitPlanId`, `coveredAmount`, `originalAmount`, `patientPayAmount`, `currency`
3. **Payment metadata does NOT include:** `benefitCode`, `codeHash`, `codeId`, `codePrefix`, `codeLast4`
4. If `patientPayAmount === 0`: backend routes payment to `INTERNAL_WALLET` provider automatically — no external payment needed

### 9. Payment Success — Consume
When payment provider confirms success (`MarkPaymentSucceededUseCase`):

1. Detects `sponsorshipId` in payment metadata
2. Calls `CorporateSponsorshipConsumeService.consumeAfterPayment()` within the same DB transaction:
   - Marks code as `USED`
   - Marks sponsorship as `CONSUMED`
   - Writes `CODE_CONSUMED` ledger entry
3. Consume is **idempotent** — re-calling on already-consumed sponsorship returns `{ consumed: false, idempotent: true }` without duplicate writes
4. If ledger write fails, the entire transaction fails (error propagates — payment is not marked as succeeded)

### 10. Corporate Ledger
After successful consume, a `CODE_CONSUMED` ledger entry is written:
- `organizationId`, `contractId`, `sponsorshipId`, `codeId`, `sessionId`, `paymentId`
- `amount = coveredAmount` (corporate portion)
- `currency` (session currency)
- `metadata`: `{ paymentId, originalAmount, coveredAmount, patientPayAmount, source: "PAYMENT_SUCCESS_CONSUME" }`
- **Metadata does NOT include:** `codeHash`, `benefitCode`, `codePrefix`, `codeLast4`

### 11. Idempotent Gap-Fill
If a sponsorship is already `CONSUMED` but no ledger entry exists (data recovery scenario), the next consume call creates the missing ledger entry and returns `{ consumed: false, idempotent: true }`.

---

## Key Implementation Constraints

| Rule | Detail |
|------|--------|
| No codeHash in payment metadata | Consume is triggered by `sponsorshipId` only |
| Plain code only in generate response | Not stored in DB after generation |
| Transaction atomicity | Code update → sponsorship update → ledger write share same `tx` client |
| Idempotent consume | Conditional updates prevent double-consume |
| No currency conversion | Sponsorship uses session's currency |
| Zero-amount routing | `patientPayAmount === 0` → `INTERNAL_WALLET` automatically |
| V1 contract billing mode | Only `PREPAID` supported for patient reserve flow |
| Reservation TTL | Controlled by plan's `codeReservationTtlMinutes` (default 15, range 5-60) |
