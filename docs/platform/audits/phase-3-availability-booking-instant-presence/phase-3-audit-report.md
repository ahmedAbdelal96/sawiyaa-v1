# Phase 3 Audit Report — Availability / Scheduled Booking / Instant Booking / Presence

**Phase:** 3
**Scope:** Practitioner Availability, Scheduled Booking, Instant Booking, Presence, Matching
**Started:** 2026-06-17
**Status:** Complete
**Auditor:** Claude Code (AI-assisted audit)

---

## Executive Summary

Phase 3 audited the booking and availability core of the Fayed platform across backend, web, and mobile. The availability and slot generation infrastructure is well-designed: backend owns all real availability computation, timezone handling is IANA-compliant, conflict detection works at session creation time, and the practitioner approval guard blocks unapproved practitioners from exposing availability.

However, Phase 3 found significant gaps in two areas: **instant booking backend robustness** (race condition on accept, no request expiration sweeper, no notifications) and **admin operational visibility** (no `flowType` in session list, no payment data in session drawer, no instant booking oversight surface). Mobile has three P0 findings related to missing i18n fallback guards for `presentationStatus`.

**22 findings registered** (AUDIT-009 through AUDIT-030): 4 P0, 18 P1. This is the highest finding count of any phase so far, driven largely by the breadth of the booking surface and the number of cross-surface consistency checks required.

---

## Modules Audited

| Module | Location | Risk Tier |
|--------|----------|-----------|
| Availability | `fayed-backend-v1/src/modules/availability/` | P0 |
| Sessions | `fayed-backend-v1/src/modules/sessions/` | P0 |
| Instant Booking | `fayed-backend-v1/src/modules/instant-booking/` | P0 |
| Presence | `fayed-backend-v1/src/modules/presence/` | P1 |
| Matching | `fayed-backend-v1/src/modules/matching/` | P1 |
| Patient Web Availability | `fayed-frontend-v1/src/features/practitioners-discovery/` | P1 |
| Patient Web Sessions | `fayed-frontend-v1/src/features/sessions/` | P1 |
| Patient Web Instant Booking | `fayed-frontend-v1/src/features/instant-booking/` | P1 |
| Practitioner Web Availability | `fayed-frontend-v1/src/features/availability/` | P1 |
| Practitioner Web Instant Booking | `fayed-frontend-v1/src/features/instant-booking/` | P1 |
| Practitioner Web Sessions | `fayed-frontend-v1/src/features/sessions/` | P1 |
| Admin Sessions | `fayed-frontend-v1/src/features/admin/sessions/` | P0 |
| Admin Practitioners | `fayed-frontend-v1/src/features/admin/practitioners/` | P1 |
| Mobile Patient Sessions | `fayed-mobile/app/(patient)/sessions/` | P0 |
| Mobile Practitioner Sessions | `fayed-mobile/app/(practitioner)/sessions/` | P0 |
| Mobile Patient Instant Booking | `fayed-mobile/app/(patient)/instant-booking/` | P1 |
| Mobile Practitioner Instant Booking | `fayed-mobile/app/(practitioner)/instant-booking/` | P1 |
| Mobile Presence | `fayed-mobile/src/features/practitioner/presence/` | P1 |

---

## Backend Availability Summary

### Weekly Availability Model

The weekly schedule is stored as individual `AvailabilitySlot` rows in Prisma — one row per contiguous time range per weekday. Each slot carries a `timezone` column (IANA name, e.g., `"Africa/Cairo"`), `startMinuteOfDay` / `endMinuteOfDay` (0–1440 practitioner-local minutes), and `durationMinutes` (30 or 60). The model uses `effectiveFrom` / `effectiveTo` date bounds. Write operations use a replace-all pattern: `replace-weekly-availability.use-case.ts` deletes all existing slots then creates the new set in a single Prisma transaction.

### Specific-Day Overrides / Exceptions

`AvailabilityException` rows store concrete UTC start/end datetimes with `type: BLOCK | OPEN_EXTRA`. They are composed with weekly slots at read time in `build-availability-windows.service.ts:50-86` — extra OPEN_EXTRA windows are added to base windows, then BLOCK windows are subtracted. Exceptions are soft-deleted (`isActive: false`).

### Timezone Handling

Timezone resolution follows a 4-tier cascade: explicit request → saved slot timezone → `user.account.timezone` → `'UTC'`. Validation uses `Intl.DateTimeFormat` to reject non-IANA strings (including fixed-offset strings like `+02:00`). All session times are stored as UTC; practitioner-local times are converted at the slot boundary.

### Slot Generation

**No discrete slot endpoint exists.** The backend exposes `build-availability-windows.service.ts` which returns UTC `startsAt`/`endsAt` windows. The frontend tiles these windows into 30/60-minute discrete slots. The backend is authoritative for window composition; the frontend is responsible for slot decomposition.

### Conflict Detection

Double-booking is prevented at session creation time by `ValidateSessionConflictsService.assertNoPractitionerConflict`, which queries overlapping sessions and throws `ConflictException`. `PENDING_PAYMENT` sessions are treated as blocking only if `expiresAt > now` (stale unpaid sessions don't block). **No database-level lock or unique constraint** protects the time range — the check is application-level only.

**Critical gap:** `replace-weekly-availability.use-case.ts` does **not** call `ValidateAvailabilitySessionConflictsService`. A practitioner can remove availability for a day that already has confirmed bookings. Existing bookings continue to block new ones at the session level, but the practitioner's own schedule becomes internally inconsistent.

### Practitioner Approval Gate

All authenticated availability write endpoints require `@RequireAccountStates(APPROVED, PRACTITIONER_OTP_VERIFIED, ACTIVE_ACCOUNT)` — only fully-approved practitioners can modify availability. Public availability is gated by `PublicPractitionerVisibilityPolicy` which requires `APPROVED + ACTIVE + published + slug + profile completeness`.

---

## Backend Scheduled Booking Summary

### Session Creation Contract

`CreateScheduledSessionDto` accepts: `practitionerSlug`, `scheduledStartAt` (UTC ISO8601), `durationMinutes` (30 | 60), `sessionMode` (VIDEO | AUDIO). **No price, currency, or amount fields exist** — payment is entirely deferred. The session is created in `PENDING_PAYMENT` status with a 15-minute `expiresAt` TTL.

### Slot Validation

`ValidateSessionScheduleCompatibilityService` fetches weekly slots + exceptions + booked sessions in parallel and verifies the requested start/end falls within a real availability window with matching duration. The check is comprehensive and backend-authoritative.

### Conflict Detection

`ValidateSessionConflictsService` checks practitioner AND patient overlap. `PENDING_PAYMENT` sessions expire via a background sweeper (`ExpireUnpaidSessionSweeperService`) running every 60 seconds in 50-session batches. Expired sessions are transitioned to `EXPIRED` and wallet reservations are released.

### Payment Handoff

Payment is initiated separately via `InitiateSessionPaymentUseCase`. The session stays in `PENDING_PAYMENT` until the payment webhook fires. The `PaymentPurpose` is set to `SESSION_BOOKING` (or `SESSION_INSTANT_BOOKING` for instant) at payment initiation time, not at session creation.

### Unpaid Session Expiration

`expire-unpaid-session-sweeper.service.ts` runs every 60 seconds, batch size 50. After expiry, `buildBlockingSessionWhere` no longer treats the session as blocking. The sweeper cancels open payments and releases wallet reservations.

---

## Backend Instant Booking Summary

### Request Lifecycle

Patient creates a request via `POST /patients/me/instant-booking-requests`. A `pricingSnapshot` is captured in `metadataJson`. The request TTL is hardcoded at 2 minutes. A duplicate-pending check prevents the same patient from having more than one live PENDING request to the same practitioner.

### Practitioner Eligibility at Creation

Four dimensions checked in `ValidateInstantBookingEligibilityService`:
1. **Visibility** — APPROVED + ACTIVE + published + slug + profile complete
2. **Presence** — effective status `ONLINE` (within 2-minute TTL) + not `BUSY` + `isInstantBookingEnabled: true`
3. **Availability** — current time within a real availability window
4. **Conflicts** — no overlapping sessions

### Accept / Reject

Both endpoints require `APPROVED + OTP_VERIFIED + ACTIVE` practitioner. The accept flow: `markExpired` → ownership check → linkedSessionId check → status transition → full eligibility re-validation → transaction: creates session + updates request with `linkedSessionId`. `flowType` on the created session is `SessionFlowType.INSTANT`. `PaymentPurpose.SESSION_INSTANT_BOOKING` is set at payment initiation time.

### Race Condition

The accept use case reads the request without `SELECT ... FOR UPDATE`. Two simultaneous accepts both read `linkedSessionId: null`, both pass, both create sessions, and one gets an unhandled `UniqueConstraintViolation` from Prisma. This is a **P0** finding (AUDIT-010).

### Frozen Price

`pricingSnapshot` captured at creation is stored in `metadataJson` but never retrieved — `requestInclude` excludes `metadataJson` and the mapper doesn't surface it. The frozen price is an invisible audit record with no API access. This is a **P1** finding (AUDIT-023).

### No Notifications

Accept and reject use cases emit zero notifications. The requesting patient has no push or in-app signal — they must poll. This is a **P1** finding (AUDIT-024).

### No Expiration Sweeper

`markExpired` is only called lazily on accept/reject/cancel/list operations. A PENDING request that is never accessed remains PENDING past its 2-minute TTL indefinitely. This is a **P1** finding (AUDIT-030).

---

## Presence Summary

### State Model

`PresenceStatus` enum: `OFFLINE | ONLINE | AWAY | BUSY`. Four states exist in the schema. **However, `AWAY` is never explicitly set** in any use case or controller — it is dead code. `BUSY` blocks instant booking eligibility.

### TTL Mechanism

Presence freshness is a **read-time demotion**, not a background correction. `PRESENCE_LIVENESS_TTL_MS = 2 * 60 * 1000`. `resolveEffectivePresenceStatus` returns `OFFLINE` for stale records without writing to the database. No cron job or sweeper ever corrects the `Presence` table row. Stale `ONLINE` records persist indefinitely. This is a **P1** finding (AUDIT-029).

### Heartbeat

`POST /practitioners/me/presence/heartbeat` refreshes `lastSeenAtUtc` and `lastHeartbeatAtUtc`. If the practitioner is `OFFLINE` with no `manuallySetAtUtc`, heartbeat auto-promotes them to `ONLINE`. `isInstantBookingEnabled` is a separate boolean controlled via `PUT /practitioners/me/presence/instant-booking`.

### Public Read

`GET /public/practitioners/:slug/presence` returns only `status`, `isInstantBookingEnabled`, `lastSeenAt` — no auth required, visibility-gated.

---

## Patient Web Findings

### Availability Display

`PublicAvailabilityViewer` uses backend-provided UTC windows and tiles them into 30/60-minute slots client-side. Slots are correct and timezone-safe. However:

- **AUDIT-015 (P1):** The practitioner IANA timezone received in the API response (`data.timezone`) is never displayed. Patients see only their own browser timezone, not the practitioner's timezone.

- **AUDIT-016 (P1):** Slot conflict with existing patient bookings is not pre-checked. The slot is selectable; the 409 conflict is discovered only after booking submission.

### Booking Flow

- Confirmation is an inline phase within `PublicAvailabilityViewer` — **no separate `/patient/sessions/confirm` route** exists (P2 gap, not a finding).
- Price is shown on the payment page via `useSessionFinancialBreakdown`, not at booking confirmation — this is by design.
- `joinAvailability.canJoin` correctly gates the Join CTA through a two-step prepare → resolve → join URL chain.

### Instant Booking

`PatientInstantBookingScreen` correctly uses `usePatientInstantBookingPractitioners` and `useCreatePatientInstantBookingRequest`. On acceptance with `createdSessionId`, the Pay screen is shown. Frozen price is accessed via `practitioner.instantBookingPricing[currency][minutes]` directly — no local computation.

### Payment Return Route

- **AUDIT-009 (P0):** The payment return page is in the `(public)` route group, not `(patient)`. While `usePatientSession` would error for unauthenticated users, the page shell renders first. This is a security concern — the route should have an explicit auth guard.

---

## Practitioner Web Findings

### Availability Management

`WeeklyScheduleEditor` and `AvailabilityExceptionsList` are well-implemented with proper IANA timezone display. Three exception modes (DAY_OFF, BLOCK_SELECTED_TIMES, ADD_EXTRA_TIMES) map correctly to `BLOCK`/`OPEN_EXTRA`. Backend validates all writes.

- **AUDIT-019 (P1):** The availability editor has no awareness of existing booked sessions. A practitioner can block a day that has confirmed bookings — existing bookings continue to work but the schedule becomes internally inconsistent. No booking-conflict check runs on weekly schedule replacement.

### Instant Booking Queue

`PractitionerInstantBookingRequestsScreen` polls every 4 seconds while PENDING requests exist. Accept/reject buttons are gated by `isPending` and `requestExpired`. Backend correctly returns 409 `INSTANT_BOOKING_REQUEST_ALREADY_FINALIZED` for expired requests.

- **AUDIT-018 (P0):** The practitioner cannot see any price, currency, or amount on incoming requests. `InstantBookingRequest` type has zero financial fields. The practitioner accepts a request without knowing what the patient will pay or what their own earnings will be.

- **P2:** Accepted requests are not grouped by status in the handled section — ACCEPTED, REJECTED, EXPIRED, and CANCELLED all appear together.

### Sessions

`PractitionerSessionsPanel` correctly displays `presentationStatus` via `SessionStatusBadge`. `joinAvailability.canJoin` gates the Join CTA through the proper two-step pattern. `markCompleted` and `markNoShow` are available to practitioners for their own sessions.

---

## Admin Web Findings

### Session List

`AdminSessionsListScreen` shows all sessions across patients and practitioners with filter tabs and a detail drawer.

- **AUDIT-011 (P0):** `AdminSessionListItem` type has no `flowType` field. Admin cannot distinguish scheduled vs instant booking from the list. Must drill into each session to determine booking origin.

- **AUDIT-020 (P1):** `instantBookingRequestId` is absent from all admin types and components. No traceability from session to originating instant booking request.

- **AUDIT-021 (P1):** The admin session drawer has no payment section. `paymentStatus`, `paymentAmountTotal`, and `refundAmount` are not shown. Admin investigating booking disputes must navigate to the Payments screen separately.

- **AUDIT-022 (P1):** `DRAFT` status is in `STATUS_FILTERS` but excluded from `SessionTabValue`. It is reachable via URL param but mapped silently to "ALL" in the tab UI.

### Admin Session Runtime Inspector

Correctly separates `presentationStatus` (Phase 3 lifecycle) from `status` (operational state). Shows participant identity, evidence timeline, overlap analysis, and recommendation panel. No `flowType` or `instantBookingRequestId` shown — same gaps as above.

### Admin Availability

**No availability visibility exists in admin surfaces.** Admin cannot view practitioner weekly slots or exceptions. This is a **P1** gap (AUDIT-025).

### Admin Instant Booking

**No instant booking surface exists in admin.** Only pricing configuration on the practitioner application form and cancellation policy distinction exist. This is a **P1** gap (AUDIT-026).

### Manual Session Decisions

`AdminSessionManualDecisionPanel` correctly implements 6 decision types with three-confirmation safety (evidence reviewed, no automatic refund, no automatic payout). Properly gated by `PermissionKey.SESSIONS_MANUAL_DECISIONS_WRITE`.

---

## Mobile Findings

### Patient Sessions

`sessions.tsx` (list) and `sessions/[id].tsx` (detail) both display `presentationStatus` via i18n. The detail page uses a proper map with `?? status` fallback — the list page does not.

- **AUDIT-012 (P0):** `sessions.tsx:406-408` — direct `t()` for `presentationStatus` without fallback. Unknown enum values render as raw key strings.
- **AUDIT-027 (P1):** `formatModeLabel` at `sessions/[id].tsx:448-462` — fallback is raw `mode` string.
- **AUDIT-028 (P1):** `formatFlowTypeLabel` at `sessions/[id].tsx:464-478` — fallback is raw `flowType` string. `flowType` is typed as `string` (not a closed enum), making unexpected values more likely.

### Practitioner Sessions

- **AUDIT-013 (P0):** `sessions/index.tsx:520-522` — direct `t()` for `presentationStatus` without fallback. Same pattern as patient session list.
- **AUDIT-014 (P0):** `sessions/index.tsx:784-800` — `mapSessionBadge` is missing the `UNDER_REVIEW` case. Returns `undefined` for `UNDER_REVIEW`, causing the `StatusChip` to have no visible tone.
- **AUDIT-007-equivalent (P1):** `sessionMode` used directly in i18n key without guard — if `practitioner.detail.modeValue.VIDEO/AUDIO/CHAT` keys are missing, raw enum appears.

### Instant Booking (Mobile)

Both patient and practitioner instant booking flows use `refetchInterval` polling (3–4 second intervals) while PENDING requests exist. Status display uses i18n keys per state. No raw enum display issues found in mobile instant booking surfaces.

### Presence (Mobile)

`useHeartbeatPresence` runs on a 60-second interval, AppState-aware, with in-flight request guard. `useSetPresenceStatus` and `useSetInstantBooking` use optimistic updates. `isInstantBookingEnabled` is a separate toggle from `status`.

---

## Runtime Checks

**Status:** Skipped

Runtime checks were not performed because:
1. Starting all three servers simultaneously (backend port 7000, web port 3000, mobile port 8081) was not feasible.
2. Creating real bookings, instant booking requests, or availability mutations was explicitly forbidden.
3. Without running servers, read-only verification of slot rendering, instant booking state transitions, and presence display could not be performed.

All verification was performed through source code inspection. Runtime checks should be performed when Phase 3 findings are addressed.

---

## Open Questions

See `phase-3-open-questions.md` for the full list. Key questions carried forward from Phase 2:

- **Q-018:** NO_SHOW after payment capture does not reverse earnings — is this intentional policy?
- **Q-019:** Manual payout step-up absent — intentional or security gap?
- **Q-026:** Coupon state not cleared after successful payment — can old coupon be reused?

New from Phase 3:

- **Q-027:** Can a practitioner's `AWAY` status be set by any UI action, or is it unreachable?
- **Q-028:** Should the frozen `pricingSnapshot` be used at session creation instead of re-querying current prices?
- **Q-029:** Should `PENDING_PAYMENT` sessions that are past their `expiresAt` be surfaced in the admin UI?
- **Q-030:** Should instant booking requests show a countdown timer to patients on mobile?
- **Q-031:** Is the matching module intentionally decoupled from the booking flow (no matching-to-booking continuity)?
- **Q-032:** Should the admin have authority to override practitioner availability in emergency situations?

---

## Findings Summary

| ID | Title | Severity |
|----|-------|----------|
| AUDIT-009 | Payment return route — in `(public)` group without auth guard | P0 |
| AUDIT-010 | Race condition on instant booking accept | P0 |
| AUDIT-011 | `flowType` absent from `AdminSessionListItem` | P0 |
| AUDIT-012 | Patient session list — direct `t()` for `presentationStatus` without fallback | P0 |
| AUDIT-013 | Practitioner session list — direct `t()` for `presentationStatus` without fallback | P0 |
| AUDIT-014 | `mapSessionBadge` missing `UNDER_REVIEW` case | P0 |
| AUDIT-015 | Practitioner timezone received but never displayed | P1 |
| AUDIT-016 | Slot conflict not pre-checked before booking submission | P1 |
| AUDIT-017 | `presentationStatus` i18n key interpolation without unknown-value fallback | P1 |
| AUDIT-018 | No price visibility in practitioner instant booking queue | P1 |
| AUDIT-019 | Availability editor has no awareness of existing bookings | P1 |
| AUDIT-020 | `instantBookingRequestId` absent from all admin session surfaces | P1 |
| AUDIT-021 | No payment data on admin session detail drawer | P1 |
| AUDIT-022 | `DRAFT` status reachable via URL filter but absent from UI tabs | P1 |
| AUDIT-023 | Frozen price stored but never retrieved or displayed | P1 |
| AUDIT-024 | No notifications on instant booking accept/reject | P1 |
| AUDIT-025 | No practitioner availability visibility in admin surfaces | P1 |
| AUDIT-026 | No admin surface for instant booking request oversight | P1 |
| AUDIT-027 | Mobile `formatModeLabel` returns raw mode string as fallback | P1 |
| AUDIT-028 | Mobile `formatFlowTypeLabel` returns raw flowType string as fallback | P1 |
| AUDIT-029 | Presence TTL is read-time only — stale ONLINE records never corrected | P1 |
| AUDIT-030 | No background sweeper for instant booking request expiration | P1 |

**Phase 3 total: 22 findings — 4 P0, 18 P1, 0 P2, 0 P3**

---

## Final Audit Verdict

The booking and availability infrastructure is fundamentally sound: slots are backend-computed, timezone handling is IANA-compliant, conflict detection works at session creation, practitioner approval gates are enforced, and the instant booking eligibility checks are comprehensive (presence TTL, availability window, conflict check, instant booking toggle).

The most significant risks are in **instant booking backend reliability**: a race condition on accept can produce unhandled exceptions in high-demand scenarios (AUDIT-010), no background sweeper means orphaned PENDING requests can persist indefinitely (AUDIT-030), and no notifications mean patients must poll for request outcomes (AUDIT-024). These are infrastructure gaps that compound under real-world load.

**Admin operational visibility is the second major concern.** With no `flowType` in the session list (AUDIT-011), no payment data in the session drawer (AUDIT-021), and no instant booking oversight surface (AUDIT-026), admin cannot efficiently investigate booking disputes or monitor instant booking health.

**Mobile has three P0 findings** (AUDIT-012, AUDIT-013, AUDIT-014) all related to missing defensive fallbacks for `presentationStatus` and related enums — future enum additions without corresponding i18n keys will render as raw strings on mobile.

**Recommended next phase:** Phase 4 — Auth / Roles / Permissions / Security. AUDIT-009 (payment return auth), AUDIT-010 (race condition), and AUDIT-019 (manual payout step-up, carried from Phase 2 Q-019) all have security dimensions. Phase 4 should also address the presence sweeper (AUDIT-029) and instant booking sweeper (AUDIT-030) which are infrastructure reliability concerns.
