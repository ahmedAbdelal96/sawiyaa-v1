# Phase 3 Open Questions — Availability / Scheduled Booking / Instant Booking / Presence

**Phase:** 3
**Created:** 2026-06-17

Open questions discovered during Phase 3 that warrant investigation in later phases or before fixes are applied.

---

## Questions from Phase 1 and Phase 2 (Carried Forward)

These were identified in prior phases and remained unanswered at Phase 3 close:

### Q-005: `care-experience-intelligence` module scope
**Asked in:** Phase 0
**Question:** The backend has a `modules/care-experience-intelligence` module. Is this active product logic or experimental/placeholder? Does it touch session pricing, practitioner earnings, or patient billing?
**Why it matters:** If active, it may affect the financial flows audited in Phase 2 and booking flows audited in Phase 3.
**Phase:** Phase 6
**Status:** Not resolved

### Q-011: i18n completeness for payment status values
**Asked in:** Phase 1
**Question:** Phase 2 verified that payment statuses are fully translated in `payments.json` and `patientPaymentsFlow` mobile namespace. Phase 3 verified session `presentationStatus` i18n coverage in web/mobile. Are there any other enum-to-i18n gaps across the platform?
**Why it matters:** AUDIT-012, AUDIT-013, AUDIT-014, AUDIT-027, AUDIT-028 all stem from missing i18n fallback guards — the underlying i18n keys may or may not exist.
**Phase:** Phase 9
**Status:** Not resolved — Phase 9 should sweep all enum-to-i18n key coverage

### Q-013: Admin manual decision — NO_SHOW earnings reversal
**Asked in:** Phase 1
**Question:** When a session is marked NO_SHOW after payment capture, the `PRACTITIONER_EARNING` ledger entry is NOT reversed. Is this intentional (no-show is the patient's fault, so the practitioner keeps the money)? Or is this a gap where a refund should be triggered?
**Why it matters:** This is a financial fairness question. A wrongly-declared no-show means the practitioner keeps money for a session they didn't conduct.
**Phase:** Phase 3
**Status:** Not resolved — still awaiting product/policy decision

### Q-016: Minor-unit conversion floating-point risk in refund use case
**Asked in:** Phase 2
**Question:** `request-payment-refund.use-case.ts:548` uses `Math.round(Number(amount) * 100)` for minor-unit conversion. Does this produce correct results for all decimal values?
**Why it matters:** `Number("10.33") * 100 = 1032.9999999999999` — `Math.round` of this is `1033`, which is correct for this value. But the pattern is fragile and could fail for other values.
**Phase:** Phase 3
**Status:** Not resolved — needs edge-case testing with values like `"0.01"`, `"0.001"`, `"100.005"`

### Q-017: Commission rate precision — 2 decimal places only
**Asked in:** Phase 2
**Question:** Commission rates are stored as `@db.Decimal(5, 2)` — only 2 decimal places. A rate like `12.345%` can only be stored as `12.34%` or `12.35%`. The validation `platformRatePercent + practitionerRatePercent === 100` could fail for rates requiring 3+ decimals.
**Why it matters:** If the platform adds fractional commission rates, this validation would reject valid configurations.
**Phase:** Phase 3
**Status:** Not resolved — requires testing with 3-decimal precision rates

### Q-018: NO_SHOW after payment capture — earnings reversal gap
**Asked in:** Phase 2
**Question:** When a session is marked NO_SHOW after payment capture, the `PRACTITIONER_EARNING` ledger entry is NOT reversed. The practitioner keeps earnings for a session they didn't conduct. Is this intentional or unintended?
**Why it matters:** This is the same question as Q-013 but specifically about the absence of earnings clawback. This was not resolved in Phase 2 or Phase 3.
**Phase:** Phase 4
**Status:** Not resolved — policy question

### Q-019: Manual payout step-up requirement absent
**Asked in:** Phase 2
**Question:** `POST /admin/practitioner-payouts` has no `@RequireStepUp` guard, unlike `POST /admin/settlements/:id/mark-paid` which requires MFA. Is this intentional or a security gap?
**Why it matters:** If admin credentials are compromised, an attacker could record fraudulent payouts without MFA.
**Phase:** Phase 4 (Auth/Security)
**Status:** Not resolved — requires security team decision

### Q-026: Coupon state not cleared after successful payment
**Asked in:** Phase 2
**Question:** The `appliedCoupon` state in `pay.tsx` is set during checkout but not cleared after `handleInitiatePayment` navigates to `payment-return`. Can an old coupon be reused on a subsequent payment?
**Why it matters:** A patient who applies a coupon for session A, completes payment, then tries to pay for session B without a coupon could inadvertently reuse the session A coupon if the backend doesn't validate coupon-session alignment.
**Phase:** Phase 3
**Status:** Not resolved — requires testing the backend coupon validation on subsequent payments

---

## New Questions from Phase 3

### Q-027: Can a practitioner's `AWAY` status ever be set through the UI?
**Found during:** Phase 3
**Question:** The `PresenceStatus` enum has `AWAY` as a value, but the Phase 3 audit found zero references to AWAY being set in any use case, controller, or frontend component. Is AWAY reachable through any user action, or is it unreachable dead code?
**Why it matters:** If AWAY is unreachable, it occupies enum space with no purpose. It could also indicate a missing feature (practitioner "be right back" status).
**Phase:** Phase 6
**Status:** Not resolved — requires UI walkthrough or grep verification

### Q-028: Should the frozen `pricingSnapshot` be used at session creation instead of re-querying current prices?
**Found during:** Phase 3
**Question:** The `pricingSnapshot` is captured in `metadataJson` at instant booking request creation (AUDIT-023), but when the session is created on acceptance, the `create-session-from-instant-booking.service.ts` does not use it — it creates the session without pricing. The pricing is resolved later at payment initiation. Should the frozen quote be preserved and used at session creation to guarantee price stability?
**Why it matters:** If a practitioner changes their instant booking prices between request creation and acceptance, the original price is silently discarded. The patient pays the new price, not the quoted price.
**Phase:** Phase 4
**Status:** Not resolved — product decision

### Q-029: Should PENDING_PAYMENT sessions past their expiresAt be surfaced in admin UI?
**Found during:** Phase 3
**Question:** When a session's payment expires (via the sweeper), it transitions to EXPIRED. But if the sweeper has not yet run, or if the session was created with a very long TTL, should admin be able to see sessions in `PENDING_PAYMENT` state that are approaching or past their expiration time?
**Why it matters:** Admin investigating a patient complaint ("I paid but my session is not confirmed") needs to distinguish between: (a) patient never paid, (b) patient paid but webhook hasn't fired, (c) session expired before payment completed. Showing `expiresAt` and payment status in admin surfaces would help.
**Phase:** Phase 4
**Status:** Not resolved — admin UX decision

### Q-030: Should instant booking requests show a countdown timer to patients?
**Found during:** Phase 3
**Question:** Instant booking requests have a 2-minute TTL (hardcoded at `create-instant-booking-request.use-case.ts:31`). The patient creates a request and polls. Should the UI show a live countdown ("Request expires in 1:45") so the patient knows how much time remains?
**Why it matters:** Without a countdown, a patient waiting for acceptance has no sense of urgency or time remaining. If the request expires, the patient may not understand why the practitioner's "accept" button no longer works.
**Phase:** Phase 6
**Status:** Not resolved — UX decision

### Q-031: Should the matching module produce sessions directly?
**Found during:** Phase 3
**Question:** The matching module (`MatchingSession`) is a pure recommendation engine with no relation to the `Session` model. A patient receives ranked practitioner recommendations but must book them via `CreateScheduledSessionUseCase` separately. Is there a "convert to booking" path that was planned but not built? Or is the decoupling intentional (matching is discovery, booking is a separate step)?
**Why it matters:** Analytics on "matching-to-booking conversion rate" would require external correlation. If the intent is a funnel, the missing continuity makes analysis harder.
**Phase:** Phase 6
**Status:** Not resolved — product decision

### Q-032: Should admin have authority to override practitioner availability?
**Found during:** Phase 3
**Question:** Admin surfaces have no availability management whatsoever (AUDIT-025). In an emergency (practitioner incapacitated, security incident, compliance issue), can admin block or modify a practitioner's availability? Currently admin can only mark sessions as NO_SHOW or cancel them.
**Why it matters:** If a practitioner becomes unavailable due to emergency, admin currently has no tool to block future bookings. The only option is to deactivate the practitioner account or mark individual sessions.
**Phase:** Phase 4
**Status:** Not resolved — product/security decision

### Q-033: Does the presence sweeper need to correct `Presence` table rows, or is read-time demotion sufficient?
**Found during:** Phase 3 (AUDIT-029)
**Question:** `resolveEffectivePresenceStatus` correctly demotes stale `ONLINE` to `OFFLINE` at read time. The database row is never corrected. Is this sufficient for all use cases, or do operational monitoring queries need accurate `Presence` table state?
**Why it matters:** If admin queries the `Presence` table directly (e.g., "how many practitioners are online right now?"), they would get inflated counts. But the instant booking eligibility check uses the safe `resolveEffectivePresenceStatus`, so bookings are unaffected.
**Phase:** Phase 4
**Status:** Not resolved — depends on whether operational monitoring depends on `Presence` table accuracy

### Q-034: Should `CONVERTED_TO_SESSION` be removed from the instant booking state machine?
**Found during:** Phase 3
**Question:** `CONVERTED_TO_SESSION` is a terminal state in the instant booking request state machine (`schema.prisma:314`, `validate-instant-booking-status-transition.service.ts`) but is never actually set. The actual pattern is `ACCEPTED + linkedSessionId`. Is `CONVERTED_TO_SESSION` dead code that should be removed?
**Why it matters:** Dead code in state machines creates confusion and maintenance burden. It could also cause issues if a future code path accidentally tries to use it.
**Phase:** Phase 4
**Status:** Not resolved — cleanup decision

### Q-035: Session duration compatibility — should it be validated against practitioner offerings?
**Found during:** Phase 3 (P2 gap)
**Question:** `ValidateSessionScheduleCompatibilityService` checks that a requested session duration (30 or 60 min) fits within the availability window's `durationMinutes`. But there is no cross-check against `PractitionerProfile.sessionPrice30`/`sessionPrice60` — the actual configured offerings. A practitioner who only has 30-minute slots configured could theoretically receive a 60-minute booking request if the window has no duration restriction.
**Why it matters:** This could result in a booking being created with a duration that doesn't match the practitioner's pricing configuration. The financial calculation during payment would then need to handle the mismatch.
**Phase:** Phase 4
**Status:** Not resolved — needs verification of what happens when a 60-minute session is booked against a 30-minute window with no duration restriction

---

## Resolved Questions

These questions were raised during Phase 3 and resolved before phase close:

### RQ-008: Slot generation is backend-owned
**Question:** Is slot generation fully backend-controlled, or does the frontend compute availability independently?
**Answer:** The backend exposes `buildAvailabilityWindowsService` returning UTC windows. The frontend tiles these windows into 30/60-minute discrete slots. The backend is authoritative for availability computation; the frontend handles only slot decomposition and display filtering (past slots).
**Resolved by:** Code inspection of `build-availability-windows.service.ts:29-32`, `PublicAvailabilityViewer.tsx:81-103`, and `availability-slot-utils.ts:81-103`

### RQ-009: Conflict detection prevents double-booking
**Question:** Can a practitioner be double-booked at the same time slot?
**Answer:** No — `ValidateSessionConflictsService` checks both practitioner and patient overlap before session creation. `PENDING_PAYMENT` sessions are treated as blocking only if `expiresAt > now` (stale unpaid sessions don't block). No database-level lock is used, but the application-level check is comprehensive. A race condition exists on instant booking accept (AUDIT-010), not on scheduled booking.
**Resolved by:** Code inspection of `validate-session-conflicts.service.ts:13-73`, `session.repository.ts:1032-1073`

### RQ-010: Practitioner cannot expose availability if not approved
**Question:** Can a practitioner with a pending/unapproved profile still expose availability slots?
**Answer:** No — all authenticated availability write endpoints require `@RequireAccountStates(APPROVED, PRACTITIONER_OTP_VERIFIED, ACTIVE_ACCOUNT)`. Public availability is gated by `PublicPractitionerVisibilityPolicy` requiring `APPROVED + ACTIVE + published + slug + profile completeness`. However, the frontend availability UI itself has no access gate — a pending practitioner can navigate to `/practitioner/availability` but their writes would be rejected by the backend guard.
**Resolved by:** Code inspection of `practitioner-availability.controller.ts:55-61` and `public-practitioner-visibility.policy.ts:23-35`

### RQ-011: Instant booking frozen price is captured but never used
**Question:** Is the `pricingSnapshot` captured at instant booking request creation actually used anywhere?
**Answer:** No. It is stored in `metadataJson` on the request record, but `requestInclude` in `instant-booking-request.repository.ts` explicitly excludes `metadataJson`, and the mapper does not surface pricing data. The frozen price is an invisible audit record. The session is created without pricing; the `PaymentPurpose.SESSION_INSTANT_BOOKING` is determined at payment initiation time by `ResolveCommissionRuleService`.
**Resolved by:** Code inspection of `create-instant-booking-request.use-case.ts:103-128`, `instant-booking-request.repository.ts:36-41`, `instant-booking.mapper.ts:23-46`, `create-session-from-instant-booking.service.ts`

### RQ-012: Presence TTL is read-time demotion, not background correction
**Question:** When a practitioner's heartbeat stops, does the `Presence` table get corrected, or does it stay stale?
**Answer:** It stays stale indefinitely. `PRESENCE_LIVENESS_TTL_MS = 2 * 60 * 1000` is applied as a read-time demotion in `resolveEffectivePresenceStatus` — the `Presence` table row is never updated. No cron, sweeper, or scheduled task corrects the row. The database accumulates stale `ONLINE` records over time.
**Resolved by:** Code inspection of `presence-liveness.ts:25-40`; verified no `ScheduleModule` in `presence.module.ts`
