# Corporate Sponsorship — Known Deferred Work

Items listed here are NOT implemented. They were identified during implementation but are intentionally deferred. Do not assume any item on this list is done.

---

## 1. DB Migration on Clean Environment
**Status:** Deferred — NOT applied to any environment
**Description:** The corporate sponsorship schema (models, enums) exists in `prisma/schema.prisma` but no `prisma migrate deploy` has been executed to apply it on a clean database. This must be done before deploying to any new environment.
**Action Required:** Run `prisma migrate deploy` in target environments before enabling corporate sponsorship features.

---

## 2. Runtime API Smoke Tests (Clean DB)
**Status:** Deferred — NOT run
**Description:** All corporate sponsorship tests use mocked repositories. No end-to-end API test has been executed against a real database with the full flow: create org → create contract → create plan → generate codes → preview → reserve → payment → consume → ledger.
**Action Required:** Before go-live, run full API smoke tests against a clean DB to verify the complete flow works with real data.

---

## 3. Frontend Admin UI
**Status:** Deferred — NOT built
**Description:** Backend APIs exist, but no admin UI has been implemented. The frontend team needs to build:
- Organization CRUD + status management
- Contract CRUD + status management
- Benefit plan CRUD + status management
- Code batch generation with CSV download handling (non-JSON response)
- Batch revocation
- CSV download management (handle `exportedAt` and one-time download behavior)

---

## 4. Frontend Patient UI
**Status:** Deferred — NOT built
**Description:** Backend APIs exist and tested, but no patient UI has been built. Frontend team needs to implement:
- "I have a company code" input flow
- Preview/reserve/release integration
- Payment screen sponsorship display with EGP/USD currency
- Zero-amount flow (bypass external payment, call backend to route to INTERNAL_WALLET)

---

## 5. Refund / Cancellation Flow
**Status:** Deferred — NOT implemented
**Description:** `CorporateSponsorshipStatus.REFUNDED` exists in the enum but no logic handles refunds. If a patient requests a refund after payment success:
- No mechanism to reverse the CODE_CONSUMED ledger entry
- No mechanism to refund the corporate portion to the sponsor
- No API or UI for handling this flow

**Action Required:** If refunds need to be supported, design and implement: refund initiation API, ledger reversal entry, code status reversal, and payment refund to corporate sponsor.

---

## 6. Expired Reservation Cleanup Job
**Status:** Deferred — NOT implemented
**Description:** When a `CorporateSessionSponsorship` is `RESERVED` but payment never occurs and the `reservedUntil` TTL has passed, there is no scheduled job to:
- Mark the sponsorship as `RELEASED`
- Return the code to `AVAILABLE` state

Currently, codes remain `RESERVED` indefinitely if payment is never attempted. A nightly cleanup job should find stale RESERVED sponsorships and return codes to the pool.

**Action Required:** Implement a scheduled cleanup job for expired reservations.

---

## 7. CSV Re-Export After Download
**Status:** Deferred — NOT implemented
**Description:** The `exportedAt` timestamp on `CodeBatchItemResponseDto` records when the CSV was downloaded, but the CSV content itself is not stored — it is generated once at batch creation and returned in the HTTP response. There is no mechanism to re-download or re-export codes after the initial response.
**Action Required:** If corporate clients need re-export capability, the CSV content must be stored (e.g., encrypted in DB or object storage) or a regeneration mechanism must be added.

---

## 8. Production Monitoring / Audit Dashboard
**Status:** Deferred — NOT built
**Description:** `CorporateLedger` provides `CODE_CONSUMED` audit events, but no dashboard or monitoring UI exists for:
- Corporate sponsorship metrics (consumption rate, codes remaining, etc.)
- Anomaly alerting (unusually high consumption, codes exhausted, etc.)
- Admin audit log viewer for ledger entries

**Action Required:** If compliance or operations require monitoring, build a dashboard or integrate with the existing Sawiyaa audit system.

---

## 9. Rate Limiting on Preview/Reserve
**Status:** Deferred — NOT implemented
**Description:** The preview and reserve endpoints have no rate limiting. A malicious actor could enumerate benefit codes by rapidly calling preview with different codes.
**Action Required:** Implement rate limiting on patient corporate sponsorship endpoints, particularly `preview` and `reserve`.

---

## 10. Max Uses Enforcement Atomicity
**Status:** Deferred — not verified under load
**Description:** `CorporateBenefitPlan.codeUsageLimit` and `maxTotalCoverage` are checked in application logic during preview/reserve, but the enforcement is not atomic. Under high concurrent load, multiple reservations could pass the check simultaneously, potentially exceeding `maxTotalCoverage`.
**Action Required:** Verify max uses enforcement under concurrent load. Consider a DB-level constraint or atomic increment approach.

---

## 11. Large Batch Load Testing
**Status:** Deferred — NOT load tested
**Description:** Code batch generation with very large quantities (e.g., 10,000+ codes) has not been load-tested. Memory usage and CSV streaming under load have not been validated.
**Action Required:** Perform load testing for large batch generation before offering enterprise-scale batch sizes.

---

## 12. Cross-Currency Settlement Reporting
**Status:** Deferred — NOT implemented
**Description:** Corporate sponsors with sessions in both EGP and USD have no consolidated reporting. Spend across currencies is not aggregated.
**Action Required:** If multi-currency corporate clients need consolidated reporting, design and implement currency-aggregated reporting.

---

## 13. Sponsor Webhook Notifications
**Status:** Deferred — NOT implemented
**Description:** Corporate sponsors have no way to receive real-time notifications of usage events (code consumed, remaining balance low, etc.) via webhook.
**Action Required:** If sponsors require webhook notifications, design and implement a corporate webhook system.

---

## 14. Concurrent Reservation Race Condition Verification
**Status:** Deferred — not verified on real DB
**Description:** Reservation uses conditional updates (`updateMany` with `WHERE` clauses) to prevent double-reservation. This has been tested with mocked repositories but not against a real database with concurrent requests.
**Action Required:** Run concurrent reservation tests against a real DB to confirm no race conditions exist.

---

## 15. Partial Coverage (DISCOUNT_PERCENT) Patient Pay Amount Calculation
**Status:** Implemented (but verify the calculation)
**Description:** The patient pay amount calculation for `DISCOUNT_PERCENT` coverage type is implemented in `patient-corporate-sponsorship.use-cases.ts`. The formula appears to be `originalAmount - coveredAmount = patientPayAmount`, where `coveredAmount = originalAmount * (coveragePercent / 100)`. This should be verified against actual contract expectations before production use.
**Action Required:** QA team should verify DISCOUNT_PERCENT calculation with actual plan configurations.

---

## 16. Code Batch Generation Failure Recovery
**Status:** Deferred — partial only
**Description:** If batch generation fails mid-way (e.g., DB connection lost after some codes are created), the batch may be left in `GENERATING` status with partial codes. No cleanup job handles this.
**Action Required:** Add a recovery mechanism for failed batch generation (mark as FAILED and clean up orphan codes).

---

## Deferred Summary Table

| Item | Priority | Risk if Deferred |
|------|----------|-----------------|
| DB migration on new env | High | Cannot deploy to new environments |
| Runtime API smoke tests | High | Unverified end-to-end flow |
| Frontend Admin UI | High | Admins cannot use the feature |
| Frontend Patient UI | High | Patients cannot use the feature |
| Refund/cancellation | Medium | Refunds cannot be handled |
| Expired reservation cleanup | Medium | Codes remain reserved indefinitely |
| CSV re-export | Medium | Codes cannot be re-obtained after download |
| Rate limiting on preview/reserve | Medium | Code enumeration possible |
| Max uses atomicity verification | Low | Potential over-consumption |
| Large batch load testing | Low | Memory issues at scale |
| Usage reports for sponsors | Low | Sponsors have no visibility |
| Monitoring dashboard | Low | No operational visibility |
| Cross-currency settlement | Low | Consolidated reporting unavailable |
| Sponsor webhook notifications | Low | No real-time sponsor notifications |
| Concurrent reservation verification | Low | Race condition risk |
| Batch failure recovery | Low | Orphan codes on failure |
