# Corporate Sponsorship — Security Notes

## Code Storage Security

### Plain Code is Never Stored

The full benefit code (e.g., `FYD-ABCD-EFGH-IJKL`) **never enters the database**.

When a patient submits a benefit code:
1. `CorporateCodeHashService.hashCode(companyCode, plainCode)` computes `codeHash = HMAC-SHA256(pepper, plainCode).digest('hex')`
2. The code record is stored with `codeHash` (64-char hex), `codePrefix` (first 8 chars, e.g., `FYD-ABCD`), and `codeLast4` (last 4 chars, e.g., `IJKL`)
3. The **plain code is returned only once** — in the CSV body of the generate batch response

### What is Stored vs. Not Stored

| Stored | NOT Stored |
|--------|------------|
| `codeHash` — HMAC-SHA256(pepper, plainCode) — 64-char hex | Plain benefit code (only in CSV export) |
| `codePrefix` — e.g., `FYD-ABCD` | Full code for lookup (uses hash instead) |
| `codeLast4` — e.g., `IJKL` | `benefitCode` input by patient |
| `codeId` — internal UUID | `codeHash` for any patient-facing purpose |

---

## Payment Metadata Security

**Mandatory rule:** Payment metadata (internal field stored with payment records) must NEVER contain:

- `benefitCode`
- `codeHash`
- `codeId`
- `codePrefix`
- `codeLast4`

### What Payment Metadata DOES Include (Corporate Sponsorship)

When a sponsorship is active and payment is initiated, metadata includes:

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

### Why This Design Matters

Consume is triggered by `sponsorshipId` only — no code identifier is needed or used in the consume flow. This means:

1. **Payment metadata breach does not expose any usable code information.** An attacker with access to payment metadata cannot derive or look up the benefit code.
2. **Code lookup requires the pepper secret + HMAC computation** — not derivable from any field in payment metadata.
3. **Consume authorization** is validated by matching `sponsorshipId` + `sessionId` + `paidAmount` + `currency` — all of which come from the payment record, not from any user-supplied input.

---

## Consume Authorization Flow

`CorporateSponsorshipConsumeService.consumeAfterPayment()` validates all of the following before marking code USED and sponsorship CONSUMED:

1. `sponsorshipId` exists and sponsorship status is `RESERVED`
2. `sponsorship.sessionId === input.sessionId` (sponsorship tied to correct session)
3. `sponsorship.currency === input.currency` (currency match)
4. `sponsorship.patientPayAmount.toFixed(2) === input.paidAmount` (amount match — prevents tampering)
5. `code.reservedSessionId === input.sessionId` (code reserved for correct session)
6. `code.status === RESERVED` (code not already used or revoked)
7. `sponsorship.status !== RELEASED`
8. `sponsorship.status !== REFUNDED`

All checks run within a single DB transaction. If any check fails, no state is modified.

---

## Ledger Metadata

`CODE_CONSUMED` ledger entries have this metadata:
```json
{
  "paymentId": "uuid",
  "originalAmount": "500.00",
  "coveredAmount": "500.00",
  "patientPayAmount": "0.00",
  "source": "PAYMENT_SUCCESS_CONSUME"
}
```

**The ledger metadata JSON field does NOT include:** `codeHash`, `benefitCode`, `codePrefix`, `codeLast4`, `plain code`

Note: `codeId` is an internal DB column on the CorporateLedger table (foreign key to CorporateBenefitCode). It must not be exposed to patients or included in payment metadata.

Ledger entries record the financial event. They do not expose any code identifiers.

---

## Patient Input Handling

- `companyCode` and `benefitCode` are entered by the patient in the UI
- They are used once to hash and look up the code record via `findByHash(codeHash)`
- They are **never stored, never logged, never returned in any API response**
- The `benefitCode` must be cleared from component state after `reserve` or `release` completes

**Security requirements for frontend:**
- Do NOT store `benefitCode` in `localStorage`, `sessionStorage`, cookies, or URL query params
- Do NOT log `benefitCode` to console, error trackers (Sentry, Datadog, etc.), or analytics
- Do NOT include `benefitCode` in any analytics events or user recordings
- Clear the input field(s) after navigation away from the corporate sponsorship flow

---

## Admin CSV Handling

The CSV generated at batch creation contains the only copy of plain-text codes. After generation:

- The CSV is returned as the HTTP response body (not stored)
- `exportedAt` timestamp is recorded on the batch when the CSV is downloaded
- **The plain codes cannot be re-exported** — the backend does not store them

Admin responsibilities (document for admin UI):
- Download CSV immediately after generation
- Securely distribute codes to employees (encrypted email, HR portal, etc.)
- Delete local copy after distribution
- Do not store CSV in publicly accessible locations

---

## Security Checklist for Frontend

Before shipping patient corporate sponsorship UI, confirm:

- [ ] `benefitCode` cleared from component state after reserve/release
- [ ] `benefitCode` not in URL query params
- [ ] `benefitCode` not logged to console
- [ ] `benefitCode` not sent to error/analytics trackers
- [ ] `sponsorshipId` (UUID) not displayed to patients
- [ ] No `codeHash`, `codePrefix`, `codeLast4` displayed to patients
- [ ] Payment form shows `patientPayAmount` only — no internal metadata
- [ ] Admin CSV download clearly marked as one-time — admin prompted to download immediately

---

## Security Checklist for Backend Code Review

- [ ] No `codeHash`, `codePrefix`, `codeLast4`, `codeId` in payment metadata
- [ ] `consumeAfterPayment` called with `sponsorshipId` only — no code field passed
- [ ] `findByHash` uses `codeHash` as the DB lookup key — not plain code
- [ ] Ledger metadata excludes sensitive code fields
- [ ] Patient response DTOs do not include `codeHash`, `benefitCode`, or internal code identifiers
- [ ] Admin response DTOs include `codePrefix` and `codeLast4` for identification but not `codeHash` or plain code
- [ ] CSV generation returns plain codes only in the HTTP body — not stored in DB