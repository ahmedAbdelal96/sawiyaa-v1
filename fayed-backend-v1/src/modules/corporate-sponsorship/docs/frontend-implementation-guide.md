# Corporate Sponsorship — Frontend Implementation Guide

> **Prerequisite:** Before any UI/UX work, the frontend team must read and follow `DESIGN.md` and the Fayed Clinical Warmth design system. All components must follow the warm, empathetic clinical aesthetic defined there.

---

## Overview

Corporate sponsorship allows patients to use a company-provided benefit code to cover session fees. The company gives employees a `companyCode` (e.g., `TST`) and a `benefitCode` (e.g., `FYD-ABCD-EFGH-IJKL`).

**Key user flow:**
1. Patient enters session → sees "I have a company code" option
2. Patient enters `companyCode` + `benefitCode`
3. Patient previews coverage → sees breakdown (no state change)
4. Patient reserves code → code is locked for this session
5. Patient pays (or skips payment if fully covered)
6. Payment succeeds → code consumed, ledger entry written

---

## Admin UI Implementation

### Organizations
```
GET    /admin/corporate/organizations
GET    /admin/corporate/organizations/:id
POST   /admin/corporate/organizations
PATCH  /admin/corporate/organizations/:id
PATCH  /admin/corporate/organizations/:id/status
```

**Status values:** `ACTIVE | SUSPENDED | INACTIVE`

**Create fields:** `name` (required), `companyCode` (required), `billingEmail` (required), `countryIsoCode`, `contactName`, `contactPhone`, `status`

**UI:** Company list table, create/edit modal, status toggle with confirmation.

### Contracts
```
GET    /admin/corporate/organizations/:organizationId/contracts
GET    /admin/corporate/contracts/:id
POST   /admin/corporate/organizations/:organizationId/contracts
PATCH  /admin/corporate/contracts/:id
PATCH  /admin/corporate/contracts/:id/status
```

**Status values:** `DRAFT | ACTIVE | EXPIRED | TERMINATED`

**Create fields:** `startDate`, `endDate`, `billingMode` (must be `PREPAID` for V1), `currency`, `market` (`EGYPT | INTERNATIONAL`), `notes`, `status`

**Note:** Only `PREPAID` contracts are supported in V1. Patient reserve flow checks this.

**UI:** Contract list per organization, create/edit form, status toggle.

### Benefit Plans
```
GET    /admin/corporate/contracts/:contractId/plans
GET    /admin/corporate/plans/:id
POST   /admin/corporate/contracts/:contractId/plans
PATCH  /admin/corporate/plans/:id
PATCH  /admin/corporate/plans/:id/status
```

**Status values:** `ACTIVE | SUSPENDED | EXPIRED`

**Create fields:**
- Required: `name`, `coverageType`, `currency`
- Optional: `coveragePercent` (1-100), `maxCoverageAmount`, `maxTotalCoverage`, `codeUsageLimit` (must be `1` in V1), `codeReservationTtlMinutes` (5-60, default 15), `status`, `specialtyIds`, `practitionerIds`

**Coverage types:** `FREE_SESSION | DISCOUNT_PERCENT | FIXED_AMOUNT`

**UI:** Plan list per contract, create/edit form, status toggle.

### Code Batches

**Generate:**
```
POST /admin/corporate/plans/:planId/code-batches
```
**Request body:**
```json
{
  "name": "Batch Q1 2025",
  "totalCodes": 100,
  "expiresAt": "2025-12-31T23:59:59Z"
}
```
Required: `name`, `totalCodes` (1-100000). Optional: `expiresAt`.

**Response is CSV (not JSON)** — Content-Type `text/csv; charset=utf-8` with headers:
- `Content-Disposition: attachment; filename="batch-{batchId}.csv"`
- `X-Batch-Id: {batchId}`
- `X-Total-Codes: {totalCodes}`
- `X-Generated-Count: {generatedCount}`

**The CSV is the entire HTTP body** — no JSON wrapper. The admin UI must handle a CSV file download.

**CSV columns:** `organizationName, companyCode, batchName, benefitCode, expiresAt, coverageType, currency, maxCoverageAmount, coveragePercent`

The `benefitCode` column contains the plain-text codes (e.g., `FYD-ABCD-EFGH-IJKL`). These are only available at generation time — they are not stored in the DB.

**Important:** Prompt the admin to immediately download the CSV after generation. The `exportedAt` timestamp is recorded when downloaded, but the CSV content itself is not re-retrievable from the backend.

**List batches:**
```
GET /admin/corporate/plans/:planId/code-batches
```
Response includes `exportedAt` (timestamp) — if set, CSV was already downloaded. Use this to show/hide the download button.

**Revoke batch:**
```
POST /admin/corporate/code-batches/:id/revoke
```
Body: `{ "revokeReason": "Contract cancelled" }`
Only `AVAILABLE` codes are revoked. Already-used codes remain `USED`.

---

## Patient UI — "I Have a Company Code" Flow

### Entry Point
In the session booking/reservation flow, show an expandable section:
- English: "I have a company code"
- Arabic: "لدي رمز شركة"

### Input Form
```
Company Code: [________]    e.g., "TST"
Benefit Code: [__________]   e.g., "FYD-ABCD-EFGH-IJKL"

[Preview My Coverage]
```

### Preview Action
```
POST /patients/me/sessions/:sessionId/corporate-sponsorship/preview
Body: { "companyCode": "TST", "benefitCode": "FYD-ABCD-EFGH-IJKL" }
```

**Response when eligible:**
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

**Coverage type values:** `FREE_SESSION | DISCOUNT_PERCENT | FIXED_AMOUNT`

**Display for eligible (FREE_SESSION, patientPayAmount = 0):**
```
✅ Your company is sponsoring this session

Test Corp — Free Session Plan

Session price:       EGP 500.00
Covered by sponsor:   EGP 500.00
You pay:              EGP 0.00

Currency: EGP
```

**Display for eligible (DISCOUNT_PERCENT, patientPayAmount > 0):**
```
✅ Your company is sponsoring this session

Test Corp — 80% Coverage Plan

Session price:       EGP 500.00
Covered by sponsor:   EGP 400.00
You pay:              EGP 100.00

Currency: EGP
```

**Display when not eligible:**
```
Your company code could not be applied to this session.
This may be because the code is invalid, expired, or not
valid for this type of session.

[message from response]
```
Do NOT show internal error codes to patients. Use the `message` field.

**Error handling:**
- `400` → "Invalid code format. Please check your company code and benefit code."
- `404` → "No company found with that code. Please check with your HR department."
- `422` → Show the `message` from the response.

### Reserve Action
If `eligible === true`, show `[Reserve & Continue to Payment]` button.

```
POST /patients/me/sessions/:sessionId/corporate-sponsorship/reserve
Body: { "companyCode": "TST", "benefitCode": "FYD-ABCD-EFGH-IJKL" }
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

**On success:**
- Navigate to payment screen
- Show the sponsorship breakdown (same fields as preview)
- If `patientPayAmount === "0.00"`: see Zero-Amount Flow below

**On error:**
- `409` (code for different session) → "This code is already reserved for another session."
- `409` (sponsorship exists) → "A sponsorship is already active for this session."
- `410` → "This code is no longer valid. Please contact HR for a new code."
- `422` → Show the `message`

**Important:** Do NOT store `benefitCode` in `localStorage`, cookies, or URL params. It should only exist in component state during the flow and be cleared on navigation.

### Release Reservation
```
DELETE /patients/me/sessions/:sessionId/corporate-sponsorship/reservation
```

**Response `200`:**
```json
{
  "released": true,
  "previousSponsorshipId": "uuid",
  "message": "Corporate sponsorship reservation released. The code is now available again."
}
```

**If `released === false`:** The code was already used (payment succeeded) — show "This code has already been used and cannot be released."

Show a confirmation dialog: "Remove corporate sponsorship? You may need to pay the full session price."

---

## Patient UI — Payment Screen Additions

### Sponsorship Active — Amount Breakdown

When a reserved sponsorship is active for the session, show:
```
Corporate Sponsorship Active
Organization: Test Corp
Plan: Free Session

Session price:       EGP 500.00
Covered by sponsor:   EGP 500.00
You pay:              EGP 0.00
```

### Zero-Amount Flow

If `patientPayAmount === "0.00"`:
- Show banner: "Fully sponsored by [OrganizationName]"
- **Do NOT show a payment form** (no card input, no wallet selection)
- Instead, show `[Confirm & Book]` button
- When clicked, trigger payment initiation as normal:
  ```
  POST /patients/me/sessions/:sessionId/payment/initiate
  ```
- Backend will route to `INTERNAL_WALLET` automatically
- No external payment needed
- Payment success webhook triggers consume

**Critical:** Even for zero-amount, the full payment initiation flow must run through the backend. Do not bypass payment initiation or mark the session as confirmed manually.

### Partial Coverage Flow

If `patientPayAmount > 0`:
- Show the reduced amount prominently
- Payment form shows `patientPayAmount`, not original price
- Currency must match the `currency` field (EGP or USD)
- Patient can use wallet, card, or any available payment method

---

## TypeScript Types for Frontend

```typescript
// Request
interface PreviewCorporateSponsorshipDto {
  companyCode: string;
  benefitCode: string;
}

interface ReserveCorporateSponsorshipDto {
  companyCode: string;
  benefitCode: string;
}

// Response — Preview
interface CorporateSponsorshipPreviewResponse {
  eligible: boolean;
  organizationName: string;
  planName: string;
  coverageType: 'FREE_SESSION' | 'DISCOUNT_PERCENT' | 'FIXED_AMOUNT';
  originalAmount: string;
  coveredAmount: string;
  patientPayAmount: string;
  currency: 'EGP' | 'USD';
  reservationTtlMinutes: number;
  message?: string;
}

// Response — Reserve
interface CorporateSponsorshipReserveResponse {
  sponsorshipId: string;
  reservedUntil: string; // ISO date
  originalAmount: string;
  coveredAmount: string;
  patientPayAmount: string;
  currency: 'EGP' | 'USD';
  coverageType: 'FREE_SESSION' | 'DISCOUNT_PERCENT' | 'FIXED_AMOUNT';
  planName: string;
  organizationName: string;
  message?: string;
}

// Response — Release
interface CorporateSponsorshipReleaseResponse {
  released: boolean;
  previousSponsorshipId: string;
  message?: string;
}
```

---

## Translation Requirements

All patient-facing text must support English (`en`) and Arabic (`ar`).

**Key strings to translate:**

| English | Arabic |
|---------|--------|
| "I have a company code" | "لدي رمز شركة" |
| "Preview My Coverage" | "معاينة التغطية" |
| "Reserve & Continue to Payment" | "حجز والمتابعة للدفع" |
| "Your company is sponsoring this session" | "شركتك يغطي هذه الجلسة" |
| "You pay" | "أنت تدفع" |
| "Fully sponsored" | "مشمول بالكامل" |
| "Invalid code format" | "صيغة الرمز غير صحيحة" |
| "Code is already in use" | "الرمز مستخدم بالفعل" |
| "This code is no longer valid" | "هذا الرمز لم يعد صالحًا" |
| "Corporate Sponsorship Active" | "الرعاية corporate نشطة" |
| "Remove corporate sponsorship?" | "إزالة رعاية الشركة؟" |
| "sponsorship.errors.codeAlreadyUsed" | (backend returns locale-aware message) |
| "sponsorship.messages.noReservationFound" | (backend returns locale-aware message) |

---

## Implementation Checklist

### Patient Flow
- [ ] "I have a company code" expandable toggle in booking flow
- [ ] Preview form with `companyCode` + `benefitCode` inputs
- [ ] Preview response handling — eligible vs. not eligible UI states
- [ ] Reserve button and API call
- [ ] Reserve success → redirect to payment
- [ ] Payment screen: show sponsorship financial breakdown
- [ ] Payment screen: if `patientPayAmount === 0`, bypass external payment form, show confirm button
- [ ] Zero-amount: still call payment initiation API (backend handles INTERNAL_WALLET routing)
- [ ] Release reservation button and API call
- [ ] Release success → restore full session price display
- [ ] Error handling for all 4xx cases with user-friendly messages
- [ ] Arabic translations for all patient-facing strings
- [ ] EGP + USD currency display with correct symbol
- [ ] Clear `benefitCode` from component state on navigation/unmount
- [ ] Do NOT log `benefitCode` to console or error trackers

### Admin Flow
- [ ] Organization list / create / edit / status toggle
- [ ] Contract list per organization / create / edit / status toggle
- [ ] Benefit plan list per contract / create / edit / status toggle
- [ ] Generate code batch — CSV download handling (handle non-JSON response)
- [ ] List code batches with `exportedAt` display (download button if not yet exported)
- [ ] Revoke code batch with confirmation dialog

---

## DO / DO NOT

### DO
- ✅ Display `originalAmount`, `coveredAmount`, `patientPayAmount` with currency
- ✅ Support both EGP and USD
- ✅ Show Arabic/English based on user locale
- ✅ Show loading states during API calls
- ✅ Handle all error states with `message` field from response
- ✅ Clear `benefitCode` from memory after reserve/release
- ✅ Show `reservedUntil` countdown if within 5 minutes of expiry

### DO NOT
- ❌ Store `benefitCode` in `localStorage`, `sessionStorage`, cookies, or URL
- ❌ Log `benefitCode` to console, error trackers, or analytics
- ❌ Display `codeHash`, `codePrefix`, `codeLast4`, or any code metadata to patients
- ❌ Display `sponsorshipId` (UUID) to patients in UI
- ❌ Assume EGP only — USD sessions exist
- ❌ Show raw backend error codes to patients
- ❌ Bypass payment initiation even for zero-amount — backend handles routing internally
- ❌ Attempt to re-export plain codes after batch generation (not possible in current backend)