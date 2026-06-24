# Corporate Sponsorship — State Machine

## CorporateOrganization Statuses

| Status | Description |
|--------|-------------|
| `ACTIVE` | Organization is active. Contracts and plans can be used. |
| `SUSPENDED` | Organization temporarily suspended — no new sponsorships. Existing sponsorships continue. |
| `INACTIVE` | Organization permanently deactivated — no new sponsorships can be created. |

**Valid transitions:**
```
ACTIVE → SUSPENDED
ACTIVE → INACTIVE
SUSPENDED → ACTIVE
SUSPENDED → INACTIVE
INACTIVE → (terminal)
```

---

## CorporateContract Statuses

| Status | Description |
|--------|-------------|
| `DRAFT` | Contract created but not yet active — plans can be created but not used. |
| `ACTIVE` | Contract active and usable — patients can reserve codes under plans. |
| `EXPIRED` | Contract end date has passed — plans become unusable. |
| `TERMINATED` | Contract was explicitly terminated before end date. |

**Valid transitions:**
```
DRAFT → ACTIVE
DRAFT → TERMINATED
ACTIVE → EXPIRED (automatic — based on endDate)
ACTIVE → TERMINATED
EXPIRED → (terminal)
TERMINATED → (terminal)
```

**Note:** `CorporateContractStatus` does not include `SUSPENDED`. Contracts are DRAFT, ACTIVE, EXPIRED, or TERMINATED. To pause a contract, use TERMINATED or update the related organization/plan status.

---

## CorporateBenefitPlan Statuses

| Status | Description |
|--------|-------------|
| `ACTIVE` | Plan is active — codes can be generated and reserved. |
| `SUSPENDED` | Plan temporarily suspended — no new code generation or reservations. |
| `EXPIRED` | Plan's validity period has passed. |

**Valid transitions:**
```
ACTIVE → SUSPENDED
ACTIVE → EXPIRED
SUSPENDED → ACTIVE
SUSPENDED → EXPIRED
EXPIRED → (terminal)
```

---

## CorporateBatch Statuses

| Status | Description |
|--------|-------------|
| `GENERATING` | Batch creation in progress (async). |
| `ACTIVE` | Batch ready — codes can be distributed and used. |
| `EXPIRED` | Batch's `expiresAt` date has passed. |
| `REVOKED` | Batch was revoked by admin — all AVAILABLE codes are marked REVOKED. |
| `FAILED` | Batch generation failed. |

**Valid transitions:**
```
GENERATING → ACTIVE (on success)
GENERATING → FAILED (on failure)
ACTIVE → EXPIRED (automatic — based on expiresAt)
ACTIVE → REVOKED (admin action)
REVOKED → (terminal)
FAILED → (terminal)
EXPIRED → (terminal)
```

---

## CorporateCode Statuses

| Status | Description |
|--------|-------------|
| `AVAILABLE` | Code exists in a generated batch and has not been used or reserved. |
| `RESERVED` | Code has been reserved by a patient for a specific session. |
| `USED` | Payment succeeded and consume was called — code is consumed for this session. |
| `REVOKED` | Code was revoked (batch revoke or individual). |
| `EXPIRED` | Code's `expiresAt` date passed. |

**Valid transitions:**
```
[Generate] → AVAILABLE
AVAILABLE → RESERVED (patient reserve action)
AVAILABLE → REVOKED (admin batch revoke)
AVAILABLE → EXPIRED (automatic — based on expiresAt)
RESERVED → AVAILABLE (patient release — code returned to pool)
RESERVED → USED (payment success + consume)
RESERVED → REVOKED (admin revoke while reserved)
RESERVED → EXPIRED (TTL expired — code returned via scheduled cleanup — DEFERRED)
USED → (terminal)
REVOKED → (terminal)
EXPIRED → (terminal)
```

**Release path:** When a patient releases a reservation, `codeRepository.releaseCode()` is called which updates:
```
status: RESERVED → AVAILABLE
reservedSessionId: cleared
reservedByUserId: cleared
reservedUntil: cleared
```

---

## CorporateSessionSponsorship Statuses

| Status | Description |
|--------|-------------|
| `RESERVED` | Sponsorship is reserved for a session — awaiting payment. |
| `CONSUMED` | Payment succeeded and consume completed. |
| `RELEASED` | Patient released reservation before payment, or code was already used. |
| `REFUNDED` | (Deferred) — refund flow not implemented. |

**Valid transitions:**
```
[Patient Reserve] → RESERVED
RESERVED → RELEASED (patient releases before payment)
RESERVED → CONSUMED (payment success + consume)
CONSUMED → (terminal for payment flow)
RELEASED → (terminal — patient can re-reserve a new code for same session if desired)
REFUNDED → (deferred — not implemented)
```

**Release behavior (code already USED):**
- If patient tries to release a sponsorship whose code is already `USED`, the backend sets sponsorship to `RELEASED` but returns `{ released: false, message: "sponsorship.errors.codeAlreadyUsed" }`
- The code remains `USED` — it is not reverted

---

## CorporateLedger Event Types

| Event Type | When Written |
|------------|-------------|
| `CODE_CONSUMED` | After successful payment consume — one entry per sponsorship consumption |

**CODE_CONSUMED creation rules:**
1. **Happy path (RESERVED → CONSUMED):** Code → USED, sponsorship → CONSUMED, ledger entry written (same transaction)
2. **Idempotent (CONSUMED + USED, ledger exists):** `findBySponsorshipIdAndEvent(CODE_CONSUMED)` returns existing entry → no write
3. **Idempotent gap-fill (CONSUMED + USED, ledger missing):** `findBySponsorshipIdAndEvent` returns null → entry created → idempotent success

**Ledger entry columns (DB):** `organizationId`, `contractId`, `sponsorshipId`, `codeId`, `sessionId`, `paymentId`, `amount`, `currency`, `quantity`, `createdAt`

**Ledger metadata (JSON field) does NOT contain:** `codeHash`, `benefitCode`, `codePrefix`, `codeLast4`, `plain code`

The `codeId` column exists in the CorporateLedger table as an internal foreign key. It must not be exposed to patient UIs or payment metadata. The metadata JSON field must not contain any code-identifying information.

---

## Cross-Entity Consistency Invariants

| Invariant | Enforcement |
|-----------|-------------|
| If code.status === USED, then sponsorship.status === CONSUMED | Transaction: `markUsedForSession` + `markConsumed` together |
| If code.status === RESERVED, then sponsorship.status === RESERVED | Reserve transaction atomically sets both |
| If sponsorship.status === CONSUMED, then code.status === USED and code.reservedSessionId === sponsorship.sessionId | `consumeAfterPayment` validates this |
| If code.status === AVAILABLE, then no sponsorship exists with status RESERVED for that codeId | `releaseCode` clears reservedSessionId |
| If sponsorship.status === RELEASED, then code.status === AVAILABLE (if code was RESERVED) | Release flow calls `releaseCode` |

---

## Reservation TTL Behavior

- Plan's `codeReservationTtlMinutes` (default 15, range 5-60) controls reservation window
- `reservedUntil` timestamp set on code at reservation time
- **TTL is NOT enforced during payment success:** If payment succeeds after `reservedUntil` has passed, consume still proceeds — the payment was initiated while the reservation was valid
- **Expired reservation cleanup job is deferred** — codes in RESERVED state with expired `reservedUntil` are not automatically returned to AVAILABLE by any scheduled job in the current implementation

---

## State Transition Summary Table

| Action | Code | Sponsorship | Ledger |
|--------|------|------------|--------|
| Patient reserves | AVAILABLE → RESERVED | → RESERVED | — |
| Patient releases | RESERVED → AVAILABLE | → RELEASED | — |
| Payment succeeds + consume | RESERVED → USED | → CONSUMED | CODE_CONSUMED entry written |
| Idempotent re-consume | USED (no change) | CONSUMED (no change) | skipped if entry exists |
| Gap-fill re-consume | USED (no change) | CONSUMED (no change) | CODE_CONSUMED entry created |
| Admin revoke batch | AVAILABLE → REVOKED | — | — |
| Code expires | AVAILABLE → EXPIRED | — | — |