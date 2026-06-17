# Phase 3 Findings Register — Availability / Scheduled Booking / Instant Booking / Presence

**Phase:** 3
**Created:** 2026-06-17
**Total findings:** 21 | Open: 21 | Closed: 0

---

## Finding AUDIT-009

**Finding ID:** AUDIT-009
**Title:** Payment return route — in `(public)` route group without authentication guard
**Severity:** P0
**Module:** Sessions / Payment Return / Web
**Affected users:** Patients returning from payment gateway (Stripe/Paymob)
**Affected surfaces:** `fayed-frontend-v1/src/app/[locale]/(public)/patient/sessions/[id]/payment-return/page.tsx`

**Evidence:**
`fayed-frontend-v1/src/app/[locale]/(public)/patient/sessions/[id]/payment-return/page.tsx`

The page is in the `(public)` route group, not the authenticated `(patient)` route group. `PaymentReturnPanel` calls `usePatientSession(sessionId)` which would return an error for unauthenticated users, but the page itself renders first. Any unauthenticated user with a valid session ID and redirect_status query param could hit this page before the auth check fails.

**Root cause hypothesis:** The payment return route was placed in the `(public)` group to allow Paymob/Stripe redirects from external domains that may not carry authentication cookies. The developer likely used the public group as a workaround to ensure the redirect is not blocked by auth. However, the page component itself should have an auth guard even if the route group does not enforce one.

**Risk:** An unauthenticated user who obtains a valid session ID and constructs the correct Stripe redirect URL could hit the payment return page. The backend session query would reject the request, but the page shell renders before that rejection, creating a window for unexpected behavior. More critically, if the polling logic in `PaymentReturnPanel` fires before the auth error is received, it could trigger background API calls with unauthenticated tokens.

**Smallest safe next step:** Add an explicit authentication check at the top of `PaymentReturnPanel` that redirects to sign-in if the session query returns an auth error, before any polling begins.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-010

**Finding ID:** AUDIT-010
**Title:** Race condition on instant booking accept — two practitioners can accept the same request, one fails with unhandled Prisma exception
**Severity:** P0
**Module:** Instant Booking / Backend
**Affected users:** Practitioners accepting instant booking requests; patients waiting for request fulfillment
**Affected surfaces:** `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts`

**Evidence:**
`accept-instant-booking-request.use-case.ts:50-106` — `findById` at line 50 is a plain read without `SELECT ... FOR UPDATE`. `linkedSessionId` is a unique column (`schema.prisma:2369`). Two practitioners calling accept simultaneously both read `linkedSessionId: null`, both pass the check at lines 61-66, both create sessions inside their transactions, and both try to write different `linkedSessionId` values. One transaction gets `UniqueConstraintViolation` — unhandled.

**Root cause hypothesis:** The developer assumed that the `linkedSessionId` uniqueness check at lines 61-66 would be sufficient, not anticipating simultaneous arrivals. The Prisma `UniqueConstraintViolation` is thrown from the database but is not caught by the use case, propagating as a 500.

**Risk:** If two practitioners accept the same instant booking request simultaneously (rare but possible in high-demand scenarios), one of them receives a 500 error. The patient's request is fulfilled by the winner, but the losing practitioner gets a raw error instead of a clean conflict response. This could be exploited to spam a practitioner with failing accept attempts.

**Smallest safe next step:** Wrap the entire accept sequence inside a `SELECT ... FOR UPDATE` transaction, or catch `Prisma.PrismaClientKnownRequestError` with code `P2002` (unique constraint) and return a clean `ConflictException` instead.

**Do not fix yet:** yes
**Fixed in phase:** Phase 9a Sprint 1
**Resolution summary:** Belt-and-suspenders `status === InstantBookingRequestStatus.ACCEPTED` check added inside Prisma transaction after `claimPendingRequestForAcceptance` re-read. Converts unexpected state to `ConflictException` before session creation. Architectural atomic protection (updateMany + count check) already existed.

---

## Finding AUDIT-011

**Finding ID:** AUDIT-011
**Title:** `flowType` absent from `AdminSessionListItem` — admin cannot distinguish scheduled vs instant booking at list level
**Severity:** P0
**Module:** Sessions / Admin / Web
**Affected users:** Admin users reviewing session lists
**Affected surfaces:** `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx`, `fayed-frontend-v1/src/features/admin/sessions/types/admin-sessions.types.ts`

**Evidence:**
`admin-sessions.types.ts:24-42` — `AdminSessionListItem` type has no `flowType` field. The backend `SessionItem` type (`sessions.types.ts:131`) carries `flowType: string`, but the admin type deliberately omits it. `AdminSessionsListScreen` drawer (`AdminSessionsListScreen.tsx:826-1033`) shows no booking origin indicator. `AdminSessionRuntimeInspectorScreen` also shows no `flowType` badge.

**Root cause hypothesis:** The admin session surfaces were built before instant booking was a defined product concept. The admin list type was not updated when instant booking was introduced, leaving admin with no first-class way to distinguish booking origin.

**Risk:** Admin users reviewing sessions for disputes, support tickets, or financial reconciliation cannot tell at a glance whether a session originated from scheduled booking or instant booking. They must drill into each session individually to determine booking type. This obscures the operational difference between the two flows and could lead to misrouted support cases.

**Smallest safe next step:** Add `flowType: string` to `AdminSessionListItem` and expose it as a badge in the session list table (e.g., "Scheduled" vs "Instant" chip), alongside the existing status column.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-012

**Finding ID:** AUDIT-012
**Title:** Patient session list — direct `t()` call for `presentationStatus` without unknown-value fallback
**Severity:** P0
**Module:** Sessions / Mobile / i18n
**Affected users:** Patients viewing session list on mobile
**Affected surfaces:** `fayed-mobile/app/(patient)/sessions.tsx`

**Evidence:**
`fayed-mobile/app/(patient)/sessions.tsx:406-408`:
```tsx
<StatusChip
  label={t(
    `patientSessionsFlow.presentationStatus.${session.presentationStatus}`,
  )}
  tone={tone}
/>
```
The `t()` call interpolates `session.presentationStatus` directly into the i18n key. If the backend returns a `presentationStatus` value with no corresponding i18n key (e.g., a future enum value), the raw key string is rendered silently. Compare with `sessions/[id].tsx:429-446` which uses a proper map with `?? status` fallback — the list page lacks this defensive pattern.

**Root cause hypothesis:** The list page was built as a simpler variant of the detail page but did not carry forward the defensive `formatPresentationStatusLabel` map pattern. The pattern is already established and safe in the detail screen; the list page simply omits it.

**Risk:** If the backend adds a new `SessionPresentationStatus` enum value (e.g., `RESCHEDULED`, `DEFERRED`) without adding corresponding i18n keys in both `en.json` and `ar.json`, the session list renders raw key strings for all affected sessions.

**Smallest safe next step:** Apply the same `formatPresentationStatusLabel` map pattern from `sessions/[id].tsx:429-446` to the `StatusChip` label in `sessions.tsx`, using `?? session.presentationStatus` as the fallback.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-013

**Finding ID:** AUDIT-013
**Title:** Practitioner session list — direct `t()` call for `presentationStatus` without unknown-value fallback
**Severity:** P0
**Module:** Sessions / Mobile / Practitioner / i18n
**Affected users:** Practitioners viewing session list on mobile
**Affected surfaces:** `fayed-mobile/app/(practitioner)/sessions/index.tsx`

**Evidence:**
`fayed-mobile/app/(practitioner)/sessions/index.tsx:520-522`:
```tsx
<StatusChip
  label={t(
    `practitioner.presentationStatus.${session.presentationStatus}`,
  )}
  tone={statusTone}
/>
```
Same pattern as AUDIT-012. Direct i18n key interpolation without fallback guard.

**Root cause hypothesis:** Same as AUDIT-012 — the practitioner session list was built with a simpler pattern than the detail screen.

**Risk:** Same as AUDIT-012: future backend enum additions without matching i18n keys cause raw key rendering in the practitioner session list.

**Smallest safe next step:** Add a defensive fallback wrapper to the `t()` call, or extract a `formatPractitionerPresentationStatus` function mirroring the patient pattern.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-014

**Finding ID:** AUDIT-014
**Title:** `mapSessionBadge` missing `UNDER_REVIEW` case — returns `undefined` tone for `UNDER_REVIEW` sessions
**Severity:** P0
**Module:** Sessions / Mobile / Practitioner
**Affected users:** Practitioners viewing session list on mobile
**Affected surfaces:** `fayed-mobile/app/(practitioner)/sessions/index.tsx`

**Evidence:**
`fayed-mobile/app/(practitioner)/sessions/index.tsx:784-800`:
```typescript
function mapSessionBadge(status: SessionPresentationStatus): SessionBadge | undefined {
  switch (status) {
    case 'JOINABLE': return 'success';
    case 'IN_PROGRESS': return 'info';
    case 'UPCOMING': return 'primary';
    case 'UNAVAILABLE': return 'neutral';
    case 'COMPLETED': return 'success';
    case 'ENDED': return 'neutral';
    case 'CANCELLED': return 'error';
    case 'NO_SHOW': return 'warning';
    // UNDER_REVIEW is MISSING
  }
  return undefined; // fallback
}
```
`mapSessionPresentationTone` at line 829 correctly handles `UNDER_REVIEW` (returns `'warning'`), but `mapSessionBadge` is a separate function used for `StatusBadge` rendering. If `UNDER_REVIEW` is passed to `mapSessionBadge`, it returns `undefined`, causing the badge to have no tone.

**Root cause hypothesis:** `UNDER_REVIEW` was added to the enum after `mapSessionBadge` was written, and the missing case was never caught in code review.

**Risk:** Practitioners who mark a session for technical review (or have it marked by admin) see a `StatusChip` with no visible tone/color — it renders as a blank or default-style badge, which is visually confusing and could be mistaken for a broken state.

**Smallest safe next step:** Add `case 'UNDER_REVIEW': return 'warning';` to `mapSessionBadge` in `sessions/index.tsx`.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-015

**Finding ID:** AUDIT-015
**Title:** Practitioner timezone from backend received but never displayed in patient availability viewer
**Severity:** P1
**Module:** Availability / Web / Patient
**Affected users:** Patients selecting appointment slots on web
**Affected surfaces:** `fayed-frontend-v1/src/features/practitioners-discovery/components/PractitionerSlugAdsorptionCard.tsx`, `fayed-frontend-v1/src/features/practitioners-discovery/components/PublicAvailabilityViewer.tsx`

**Evidence:**
`PublicAvailabilityViewer.tsx:496-497`:
```tsx
<span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
```
The component displays the patient's browser timezone but `data.timezone` (the practitioner's IANA timezone from the backend, e.g., `"Africa/Cairo"` or `"Asia/Riyadh"`) is received in the response but never rendered anywhere in the UI. The patient sees "Your local time: America/New_York" but has no indication of what timezone the practitioner's availability windows are computed in.

**Root cause hypothesis:** The timezone field was added to the API response for future use but was never wired into the UI display. The developer assumed the patient's local timezone would suffice for display purposes.

**Risk:** A patient in a different timezone (e.g., a patient traveling internationally) selects a slot based on their local time display, without realizing the practitioner operates in a different timezone. The slot is validated as correct by the backend, but the patient may arrive confused about the actual time. This is especially risky for cross-country or cross-region bookings.

**Smallest safe next step:** Display the practitioner's timezone alongside the patient's timezone, or show a label like "Practitioner operates in Africa/Cairo (UTC+2)" when the two differ.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-016

**Finding ID:** AUDIT-016
**Title:** Slot conflict not pre-checked before patient selects a slot — only discovered after booking submission
**Severity:** P1
**Module:** Sessions / Scheduled Booking / Web
**Affected users:** Patients booking sessions on web
**Affected surfaces:** `fayed-frontend-v1/src/features/practitioners-discovery/components/PublicAvailabilityViewer.tsx`

**Evidence:**
`PublicAvailabilityViewer.tsx:93-95`:
```tsx
if (current <= earliestAllowedStart) continue;
```
The slot filter only checks against the current time (past slots are disabled). There is no API call to check whether the patient already has a conflicting session before the slot is selectable. The backend returns `409 Conflict` on `createScheduledSession` if a conflict exists (surfaced as `tBook("createErrorConflict")`), but the UI lets the patient select a conflicting slot and only discovers the conflict after submitting the booking.

**Root cause hypothesis:** The developer assumed that conflict detection was purely a backend concern and relied on the 409 response to surface conflicts. The frontend slot grid is derived from availability windows, not from the patient's existing bookings.

**Risk:** A patient attempting to book a second session at the same time as an existing booking goes through the full slot selection → duration pick → confirm → payment initiation flow before discovering the conflict. The backend rejects the booking and the patient must start over, wasting time and potentially losing a coupon or wallet balance reservation.

**Smallest safe next step:** Before allowing slot selection (or before confirming the booking), call an API to check the patient's existing bookings and grey out any conflicting slots with a tooltip like "You already have a session at this time."

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-017

**Finding ID:** AUDIT-017
**Title:** `presentationStatus` i18n key interpolation without unknown-value fallback in web patient surfaces
**Severity:** P1
**Module:** Sessions / Web / i18n
**Affected users:** Patients viewing session status badges on web
**Affected surfaces:** `fayed-frontend-v1/src/features/sessions/components/SessionStatusBadge.tsx`, `fayed-frontend-v1/src/features/sessions/components/PatientSessionsPanel.tsx`

**Evidence:**
`SessionStatusBadge.tsx:41-45`:
```tsx
const labelKey = presentationStatus
  ? `presentationStatus.${displayStatus ?? "UNAVAILABLE"}`
  : `status.${displayStatus ?? "DRAFT"}`;
return <AdminStatusBadge tone={tone}>{labelOverride ?? t(labelKey as Parameters<typeof t>[0])}</AdminStatusBadge>;
```
If `presentationStatus` is a non-null unknown value, `displayStatus` is used as-is in the key. The `UNAVAILABLE` / `DRAFT` fallback only applies when the input is null/undefined. An unexpected enum value produces the raw key as displayed text.

`PatientSessionsPanel.tsx:687-689`:
```tsx
{t(t(`list.presentationHints.${session.presentationStatus}` as Parameters<typeof t>[0]))}
```
Same risk — unknown enum value produces raw key string.

**Root cause hypothesis:** The i18n keys are typed as template literal parameters but TypeScript only validates the syntax, not the runtime enum values. Unknown values silently pass through.

**Risk:** If a future backend enum value (e.g., `RESCHEDULED`) is added without corresponding i18n keys, patients see raw key strings in session badges and list hints. The issue is contained to non-critical UI elements (badges, hints), making it P1 rather than P0.

**Smallest safe next step:** Add a defensive `?? "UNAVAILABLE"` pattern on the `t()` calls so unknown enum values render a generic fallback rather than the raw key.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-018

**Finding ID:** AUDIT-018
**Title:** No price visibility in practitioner instant booking queue — practitioner cannot see what patient paid or will earn
**Severity:** P1
**Module:** Instant Booking / Web / Practitioner
**Affected users:** Practitioners viewing incoming instant booking requests on web
**Affected surfaces:** `fayed-frontend-v1/src/features/instant-booking/components/InstantBookingRequestCard.tsx`, `fayed-frontend-v1/src/features/instant-booking/types/instant-booking.types.ts`

**Evidence:**
`instant-booking.types.ts:84-97` — `InstantBookingRequest` type has zero price, currency, or amount fields:
```typescript
export type InstantBookingRequest = {
  id: string; patient: InstantBookingPatient; practitioner: InstantBookingPractitioner;
  requestedDurationMinutes: number; preferredMode: SessionMode;
  status: InstantBookingRequestStatus; requestedAt: string;
  expiresAt: string; respondedAt: string | null; responseReason: string | null;
  linkedSessionId: string | null;
  // NO price, NO currency, NO amount
};
```
A practitioner deciding whether to accept a request cannot see the session price, currency, platform fee, or their own earnings. They must mentally calculate or guess based on their configured prices.

**Root cause hypothesis:** The `InstantBookingRequest` type was modeled as a pure workflow entity (patient → practitioner → session) without financial details. Price visibility was considered out of scope for the request card.

**Risk:** A practitioner accepting a request does so without confirmed knowledge of what the patient will pay or what the net earnings will be. If pricing configuration is incorrect or a coupon reduces the price significantly, the practitioner has no indication at accept time. This creates expectation misalignment and potential disputes.

**Smallest safe next step:** Add `pricingSnapshot: InstantBookingPricingSnapshot` to `InstantBookingRequest` (already stored in `metadataJson` at creation) and surface it in the request card with a label like "Patient will pay: 500 EGP."

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-019

**Finding ID:** AUDIT-019
**Title:** Availability editor has no awareness of existing bookings — practitioner can create BLOCK for a day with existing confirmed sessions
**Severity:** P1
**Module:** Availability / Web / Practitioner
**Affected users:** Practitioners managing their weekly availability on web
**Affected surfaces:** `fayed-frontend-v1/src/features/availability/components/WeeklyScheduleEditor.tsx`

**Evidence:**
`WeeklyScheduleEditor.tsx:139`:
```tsx
initialDraft = useMemo(() => slotsToDraftSchedule(data.weeklySlots), [data.weeklySlots])
```
The availability editor only consumes `data.weeklySlots` and `data.exceptions` to initialize the draft form. There is no API call to fetch existing confirmed/booked sessions that would occupy or block time slots. A practitioner can navigate to the availability editor, replace their weekly schedule to block times that already have confirmed bookings, and save — the backend `replace-weekly-availability.use-case.ts` has no session conflict check.

**Root cause hypothesis:** The weekly availability replacement was designed as a schedule management tool, not a booking management tool. The assumption was that existing bookings would continue to block the calendar regardless of the practitioner's availability settings. However, the public availability windows computation subtracts booked sessions from available windows, so the blocked schedule only affects future bookings — not the existing confirmed sessions.

**Risk:** A practitioner who blocks a day that already has confirmed sessions creates a misleading state: their own availability dashboard shows the day as unavailable/blocked, but the existing booked sessions remain active. This could cause confusion during support disputes or admin review. It does not break existing bookings but creates an operational inconsistency.

**Smallest safe next step:** Add a confirmation step to the availability save flow that warns the practitioner if the new availability would conflict with existing confirmed sessions.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-020

**Finding ID:** AUDIT-020
**Title:** `instantBookingRequestId` absent from all admin session surfaces — no traceability from session to originating instant booking request
**Severity:** P1
**Module:** Sessions / Admin / Web
**Affected users:** Admin users investigating session disputes or instant booking issues
**Affected surfaces:** `fayed-frontend-v1/src/features/admin/sessions/types/admin-sessions.types.ts`, `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx`

**Evidence:**
Grep across `src/features/admin/**` for `instantBookingRequestId` — zero references found. The `AdminSessionListItem` type (`admin-sessions.types.ts:24-42`) has no `instantBookingRequestId` field. The `AdminSessionDetailDrawer` (`AdminSessionsListScreen.tsx:826-1033`) shows no instant booking reference.

**Root cause hypothesis:** Admin surfaces predate the instant booking module. When instant booking was added, the session model's `instantBookingRequestId` field was not propagated to admin types and components.

**Risk:** Admin investigating an instant booking dispute (e.g., patient claims they paid but no session was created, practitioner claims they accepted but patient never paid) has no way to trace the session back to its originating request within the admin UI. They must query the database directly or use backend logs.

**Smallest safe next step:** Add `instantBookingRequestId: string | null` to `AdminSessionListItem` and surface it in the detail drawer with a link to the request if present.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-021

**Finding ID:** AUDIT-021
**Title:** No payment data on admin session detail drawer — admin cannot see payment status, amounts, or refund state
**Severity:** P1
**Module:** Sessions / Payments / Admin / Web
**Affected users:** Admin users investigating booking/payment disputes
**Affected surfaces:** `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx`

**Evidence:**
`AdminSessionsListScreen.tsx:826-1033` (session detail drawer) — no payment section, no payment status badge, no refund amount display. The backend `SessionCancellationPreviewItem` (`sessions.types.ts:266-293`) has rich payment data (`paymentStatus`, `paymentAmountTotal`, `refundAmount`, etc.) but the admin drawer does not fetch or display any of it.

**Root cause hypothesis:** The admin session drawer was built as a session management tool rather than a financial dispute tool. Payment visibility was handled in dedicated payment admin screens.

**Risk:** Admin users investigating booking disputes (e.g., patient says they paid but cannot see the session, patient says they were charged the wrong amount) cannot see payment context from the session view. They must navigate to the Payments admin screen and search by session ID manually.

**Smallest safe next step:** Add a payment summary section to the admin session drawer, showing `paymentStatus`, `paymentAmountTotal`, `refundAmount` (if any), and currency — sourced from `SessionCancellationPreviewItem`.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-022

**Finding ID:** AUDIT-022
**Title:** `DRAFT` status reachable via URL filter but absent from session list UI tabs
**Severity:** P1
**Module:** Sessions / Admin / Web
**Affected users:** Admin users filtering session list
**Affected surfaces:** `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx`

**Evidence:**
`AdminSessionsListScreen.tsx:55` — `STATUS_FILTERS` constant includes `"DRAFT"`:
```typescript
export const STATUS_FILTERS = ['DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', ...] as const;
```
`AdminSessionsListScreen.tsx:67-75` — `SessionTabValue` union explicitly excludes `DRAFT`:
```typescript
export type SessionTabValue = 'ALL' | 'PENDING' | 'UPCOMING' | 'UNAVAILABLE' | 'ENDED';
```
`AdminSessionsListScreen.tsx:247-256` — activeTab logic maps `"DRAFT"` to `"ALL"` silently.

**Root cause hypothesis:** The `DRAFT` filter was added to `STATUS_FILTERS` for programmatic filtering (e.g., URL param `?status=DRAFT`) but the tab UI was not updated to include it. The mapping to "ALL" prevents crashes but hides the DRAFT state from normal UI usage.

**Risk:** An admin who navigates to `?status=DRAFT` sees the "ALL" tab highlighted with no indication they are actually viewing DRAFT sessions. This creates a silent state mismatch between the URL and the UI representation.

**Smallest safe next step:** Either add `"DRAFT"` to the `SessionTabValue` union and add a corresponding tab button, or remove `"DRAFT"` from `STATUS_FILTERS` if it is not a valid filter value.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-023

**Finding ID:** AUDIT-023
**Title:** Frozen price stored at request creation but never retrieved or displayed
**Severity:** P1
**Module:** Instant Booking / Backend
**Affected users:** Practitioners and patients in the instant booking flow
**Affected surfaces:** `fayed-backend-v1/src/modules/instant-booking/use-cases/create-instant-booking-request.use-case.ts`, `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts`

**Evidence:**
`create-instant-booking-request.use-case.ts:103-128`:
```typescript
metadataJson: { capturedAt: nowUtc.toISOString(), pricingSnapshot }
```
`pricingSnapshot` is stored in `metadataJson` on the instant booking request. However, `instant-booking-request.repository.ts:36-41` uses `requestInclude` which explicitly excludes `metadataJson`. The mapper (`instant-booking.mapper.ts:23-46`) also does not surface pricing data. When the practitioner or patient retrieves the request, the frozen price is not returned.

**Root cause hypothesis:** The `pricingSnapshot` was added for audit/implementation purposes but the API response layer was never updated to return it. The developer stored it but forgot to propagate it through the read path.

**Risk:** If a practitioner changes their instant booking prices between request creation and acceptance, there is no record of what the original price was. For dispute resolution or financial reconciliation, the original frozen quote is not accessible through the API — only through direct database inspection.

**Smallest safe next step:** Add `pricingSnapshot` to `requestInclude` in the repository and surface it in the `InstantBookingRequest` type and API response.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-024

**Finding ID:** AUDIT-024
**Title:** No notifications on instant booking accept/reject — patient has no push or in-app signal without polling
**Severity:** P1
**Module:** Instant Booking / Notifications / Backend
**Affected users:** Patients waiting for instant booking request outcome
**Affected surfaces:** `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts`, `fayed-backend-v1/src/modules/instant-booking/use-cases/reject-instant-booking-request.use-case.ts`

**Evidence:**
Both `accept-instant-booking-request.use-case.ts:28-111` and `reject-instant-booking-request.use-case.ts` — zero notification calls. The `instant-booking.module.ts` has no `NotificationsModule` imported, no `EventEmitter`, and no `DomainEvents` usage.

**Root cause hypothesis:** Notifications were considered out of scope for the initial instant booking implementation. The developer assumed the patient would poll via the instant booking screen's 3-second polling interval.

**Risk:** A patient waiting for request acceptance has no real-time signal. If the patient backgrounds the app or closes the tab during the 2-minute request window, they receive no push notification when the practitioner accepts (leading to payment) or rejects. They must manually return to the app/screen to see the outcome. This creates a gap where accepted requests go unpaid because the patient missed the state change.

**Smallest safe next step:** Emit domain events `INSTANT_BOOKING_REQUEST_ACCEPTED` and `INSTANT_BOOKING_REQUEST_REJECTED` from the respective use cases, and subscribe notification handlers to these events.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-025

**Finding ID:** AUDIT-025
**Title:** No practitioner availability visibility in admin surfaces
**Severity:** P1
**Module:** Availability / Admin / Web
**Affected users:** Admin users investigating scheduling disputes or managing practitioner availability
**Affected surfaces:** `fayed-frontend-v1/src/features/admin/practitioners/components/AdminPractitionersDirectory.tsx`

**Evidence:**
Grep across `src/features/admin/**` for `availability` (in the scheduling sense) — zero relevant results. `AdminPractitionersDirectory` (`AdminPractitionersDirectory.tsx`) shows `isOnlineNow: boolean` (presence), but:
- No schedule/slot management
- No availability override capability
- No view of future availability blocks
- `ListAdminPractitionersParams` (`admin-practitioners.types.ts:32-42`) has no availability-related query params

**Root cause hypothesis:** Admin practitioner management was scoped to profile and account administration, not scheduling operations. Availability management was considered a practitioner self-service feature.

**Risk:** Admin investigating a booking dispute (e.g., patient claims practitioner had no availability at the booked time) cannot view the practitioner's actual availability slots or exceptions within the admin UI. They must query the database or ask the practitioner directly.

**Smallest safe next step:** Add a read-only availability view to the admin practitioner detail screen, showing the practitioner's weekly slots and current/future exceptions with their timezone.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-026

**Finding ID:** AUDIT-026
**Title:** No admin surface for instant booking request oversight or management
**Severity:** P1
**Module:** Instant Booking / Admin / Web
**Affected users:** Admin users overseeing instant booking operations
**Affected surfaces:** Not found — no equivalent surface exists

**Evidence:**
Searched all of `fayed-frontend-v1/src/features/admin/**` for instant booking surfaces — none found. The only instant booking configuration in admin is:
1. `instantBookingPrice30/60 (EGP/USD)` fields on the practitioner application form (`AdminPractitionerCreatePage.tsx:85-88, 1339-1390`) — pricing configuration only
2. Cancellation policy editor with `STANDARD` vs `INSTANT` distinction (`AdminCancellationPolicyEditor.tsx:45`) — policy configuration only

No admin surface lists pending instant booking requests, shows which sessions originated from instant booking, or allows admin to act on stuck/failed requests.

**Root cause hypothesis:** Instant booking was launched without an admin oversight surface. Admin was expected to use backend logs or database queries for operational monitoring.

**Risk:** When an instant booking request gets stuck (e.g., practitioner accepted but session creation failed, or request expired but patient was charged), admin has no UI to inspect or resolve the issue. They must go directly to the database. This creates an operational blind spot for a revenue-generating product feature.

**Smallest safe next step:** Build a basic admin instant booking requests list surface at `/admin/instant-booking-requests` showing all requests with status, patient, practitioner, and `linkedSessionId`, with filters by status.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-027

**Finding ID:** AUDIT-027
**Title:** Mobile session detail — `formatModeLabel` returns raw `mode` string as fallback
**Severity:** P1
**Module:** Sessions / Mobile / i18n
**Affected users:** Patients viewing session detail on mobile
**Affected surfaces:** `fayed-mobile/app/(patient)/sessions/[id].tsx`

**Evidence:**
`fayed-mobile/app/(patient)/sessions/[id].tsx:448-462`:
```typescript
function formatModeLabel(t, mode: SessionMode | string): string {
  const map: Record<string, string> = {
    VIDEO: t("patientSessionsFlow.detail.modeValue.VIDEO"),
    AUDIO: t("patientSessionsFlow.detail.modeValue.AUDIO"),
    CHAT: t("patientSessionsFlow.detail.modeValue.CHAT"),
  };
  return map[mode] ?? mode; // fallback is raw string
}
```
The fallback returns `mode` directly — a raw string. If the backend returns an unexpected `sessionMode` value (e.g., a future new mode), the raw string appears in the UI at line 235.

**Root cause hypothesis:** The fallback was kept as `mode` (raw string) to avoid null/undefined rendering, but this masks unknown enum values.

**Risk:** If a future backend `sessionMode` value (e.g., `VOICE`, `IN_PERSON`) is returned without corresponding i18n keys, patients see the raw enum in the session detail mode chip instead of a graceful fallback.

**Smallest safe next step:** Change fallback from `?? mode` to `?? t("patientSessionsFlow.detail.modeValue.DEFAULT")` using a generic fallback i18n key.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-028

**Finding ID:** AUDIT-028
**Title:** Mobile session detail — `formatFlowTypeLabel` returns raw `flowType` string as fallback
**Severity:** P1
**Module:** Sessions / Mobile / i18n
**Affected users:** Patients viewing session detail on mobile
**Affected surfaces:** `fayed-mobile/app/(patient)/sessions/[id].tsx`

**Evidence:**
`fayed-mobile/app/(patient)/sessions/[id].tsx:464-478`:
```typescript
function formatFlowTypeLabel(t, flowType: string): string {
  const map: Record<string, string> = {
    SCHEDULED: t("patientSessionsFlow.detail.flowTypeValue.SCHEDULED"),
    INSTANT: t("patientSessionsFlow.detail.flowTypeValue.INSTANT"),
  };
  return map[flowType] ?? flowType; // fallback is raw string
}
```
`flowType` is typed as open `string` (not a closed enum) at `types.ts:136`. The fallback `?? flowType` returns the raw string directly. Any unexpected value renders as-is in the session detail chip.

**Root cause hypothesis:** `flowType` was typed as `string` intentionally to avoid TypeScript enum constraints, but the open typing makes unexpected values more likely to reach the UI.

**Risk:** Same as AUDIT-027: an unexpected `flowType` value renders raw in the session detail. The session detail chip for booking type would show the raw string instead of a graceful fallback.

**Smallest safe next step:** Add a defensive check that returns a generic fallback i18n key (e.g., `DEFAULT`) for any unknown `flowType`, and add that key to the locale files.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-029

**Finding ID:** AUDIT-029
**Title:** Presence TTL is read-time only — stale `ONLINE` records are never corrected in the database
**Severity:** P1
**Module:** Presence / Backend
**Affected users:** Patients using instant booking discovery
**Affected surfaces:** `fayed-backend-v1/src/modules/presence/services/presence-liveness.ts`

**Evidence:**
`presence-liveness.ts:25-40` — `resolveEffectivePresenceStatus` correctly demotes stale `ONLINE` practitioners to `OFFLINE` at read time:
```typescript
return isPresenceFresh(presence, referenceTime) ? presence.status : PresenceStatus.OFFLINE;
```
However, there is **no background process** that ever corrects the database row. No cron job, no sweeper, no scheduled task. The `ONLINE` value persists indefinitely in the `Presence` table even after the practitioner's last heartbeat.

**Root cause hypothesis:** The read-time TTL was implemented as a query-time demotion rather than a background correction. This avoids write load but leaves the database with stale `ONLINE` values indefinitely.

**Risk:** The `Presence` table accumulates `ONLINE` records for practitioners who have gone offline without explicitly changing their status. Over time, this creates an increasingly inaccurate snapshot of practitioner online state. For operational monitoring, admin queries against the `Presence` table would return incorrect counts of truly online practitioners. However, the instant booking eligibility check correctly uses `resolveEffectivePresenceStatus`, so no incorrect bookings are actually created.

**Smallest safe next step:** Add a `ScheduleModule` with a `@Cron` job (every 5 minutes) that calls a service to reset `ONLINE` practitioners whose `lastSeenAtUtc` is older than `PRESENCE_LIVENESS_TTL_MS` to `OFFLINE`.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Finding AUDIT-030

**Finding ID:** AUDIT-030
**Title:** No background sweeper for instant booking request expiration — PENDING requests persist indefinitely
**Severity:** P1
**Module:** Instant Booking / Backend
**Affected users:** Practitioners and patients in instant booking flow
**Affected surfaces:** `fayed-backend-v1/src/modules/instant-booking/instant-booking.module.ts`

**Evidence:**
`instant-booking.module.ts` — no `ScheduleModule` imported, no `@Cron` decorator. `markExpired` is only called lazily on:
- accept (`accept-instant-booking-request.use-case.ts:45`)
- reject (`reject-instant-booking-request.use-case.ts:40`)
- cancel (`cancel-instant-booking-request.use-case.ts:39`)
- list pending (`list-practitioner-pending-instant-booking-requests.use-case.ts:29`)
- list patient requests (`list-patient-instant-booking-requests.use-case.ts:27`)

**Root cause hypothesis:** The developer assumed lazy expiration (triggered on access) would be sufficient for the 2-minute TTL window. No sweeper was implemented.

**Risk:** A PENDING request that is created but never accessed (no accept/reject/cancel/list by either party) remains PENDING past its 2-minute TTL indefinitely. In practice, the patient's polling would trigger the list call, but a request where both parties go silent would become orphaned. The request would show as PENDING in any database query and could interfere with duplicate-request checks.

**Smallest safe next step:** Add a `ScheduleModule` with a `@Cron('*/30 * * * * *')` job that calls `ExpireInstantBookingRequestUseCase` for all requests where `status = PENDING AND expiresAt < now`.

**Do not fix yet:** yes
**Fixed in phase:**
**Resolution summary:**

---

## Open Findings

| ID | Title | Severity | Module |
|----|-------|----------|--------|
| AUDIT-009 | Payment return route — in `(public)` group without auth guard | P0 | Sessions / Web |
| AUDIT-010 | Race condition on instant booking accept | P0 | Instant Booking / Backend | ✅ Fixed + Verified — Phase 9a Sprint 1 (Sprint 1-R1) |
| AUDIT-011 | `flowType` absent from `AdminSessionListItem` | P0 | Sessions / Admin / Web |
| AUDIT-012 | Patient session list — direct `t()` for `presentationStatus` without fallback | P0 | Sessions / Mobile |
| AUDIT-013 | Practitioner session list — direct `t()` for `presentationStatus` without fallback | P0 | Sessions / Mobile |
| AUDIT-014 | `mapSessionBadge` missing `UNDER_REVIEW` case | P0 | Sessions / Mobile |
| AUDIT-015 | Practitioner timezone received but never displayed | P1 | Availability / Web / Patient |
| AUDIT-016 | Slot conflict not pre-checked before booking submission | P1 | Sessions / Web |
| AUDIT-017 | `presentationStatus` i18n key interpolation without unknown-value fallback | P1 | Sessions / Web / i18n |
| AUDIT-018 | No price visibility in practitioner instant booking queue | P1 | Instant Booking / Web |
| AUDIT-019 | Availability editor has no awareness of existing bookings | P1 | Availability / Web |
| AUDIT-020 | `instantBookingRequestId` absent from all admin session surfaces | P1 | Sessions / Admin / Web |
| AUDIT-021 | No payment data on admin session detail drawer | P1 | Sessions / Payments / Admin |
| AUDIT-022 | `DRAFT` status reachable via URL filter but absent from UI tabs | P1 | Sessions / Admin / Web |
| AUDIT-023 | Frozen price stored but never retrieved or displayed | P1 | Instant Booking / Backend |
| AUDIT-024 | No notifications on instant booking accept/reject | P1 | Instant Booking / Notifications |
| AUDIT-025 | No practitioner availability visibility in admin surfaces | P1 | Availability / Admin / Web |
| AUDIT-026 | No admin surface for instant booking request oversight | P1 | Instant Booking / Admin / Web |
| AUDIT-027 | Mobile `formatModeLabel` returns raw mode string as fallback | P1 | Sessions / Mobile |
| AUDIT-028 | Mobile `formatFlowTypeLabel` returns raw flowType string as fallback | P1 | Sessions / Mobile |
| AUDIT-029 | Presence TTL is read-time only — stale ONLINE records never corrected | P1 | Presence / Backend |
| AUDIT-030 | No background sweeper for instant booking request expiration | P1 | Instant Booking / Backend |

---

## Closed Findings

_No findings closed in Phase 3._

---

## Findings by Phase

| Phase | Open | Closed | Total |
|-------|------|--------|-------|
| Phase 0 | 0 | 0 | 0 |
| Phase 1 | 2 | 0 | 2 |
| Phase 2 | 6 | 0 | 6 |
| Phase 3 | 22 | 0 | 22 |
| Phase 4 | 0 | 0 | 0 |
| Phase 5 | 0 | 0 | 0 |
| Phase 6 | 0 | 0 | 0 |
| Phase 7 | 0 | 0 | 0 |
| Phase 8 | 0 | 0 | 0 |
| Phase 9 | 0 | 0 | 0 |
| **Total** | **30** | **0** | **30** |
