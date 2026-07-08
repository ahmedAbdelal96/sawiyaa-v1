# Booking, Sessions, and Availability

This document covers the care booking core:

- practitioner availability
- week-by-week availability windows
- specific-day overrides
- exceptions
- session lifecycle
- chat access policy
- Instant Booking flow and status

## Availability and schedule model

The current model is week-by-week availability, not a legacy recurring runtime schedule.

- Practitioners manage the current week and the next week.
- Each availability week has a clear status: `DRAFT`, `PUBLISHED`, or `ARCHIVED`.
- Public patient booking and discovery read only `PUBLISHED` weeks.
- `DRAFT` and `ARCHIVED` weeks must not authorize booking.
- Backend booking validation uses published week windows only.
- Instant booking eligibility also uses published week windows only.
- `BLOCK` means prevent bookings.
- `OPEN_EXTRA` means add extra availability.
- Booked sessions are subtracted from the available windows when the backend generates slots.
- Deleting an exception removes only the exception record; it does not delete booked sessions.
- Patient booking screens reflect live published availability plus exceptions plus booking conflicts.

The practitioner availability page should be understood as three layers:

1. Week draft or published windows
2. Specific-day adjustments
3. Global current/future exceptions table

That separation matters because the current week model is explicit and the old recurring runtime flow has been removed.

## Timezone behavior

- Week editing is practitioner-local wall time plus an IANA timezone.
- Specific-day adjustments are created for one explicit local date/time context and stored as UTC exception ranges.
- Session creation, join windows, payment expiry, and chat availability are all driven from UTC session facts on the backend.
- Patient-facing booking screens may show viewer-local times, but the backend still owns the actual slot validation and conflict checks.
- Practitioner-facing availability screens should stay in the practitioner timezone so the weekly plan remains understandable.
- The UI should label the timezone context when a time could be confusing, especially for cross-country travel or mixed-country teams.
- Write endpoints should accept only valid IANA timezone names, with blank values normalized or rejected according to the specific flow contract.

## Practitioner availability UX

The practitioner availability page is the operational editor for the schedule.

It should make three things clear:

- the week being edited
- the temporary adjustment for one date
- the full list of current and future exceptions

The global exceptions table should show the current and upcoming availability overrides, not just the selected day.

## Session lifecycle

The exact states depend on the backend session model, but the UX usually needs to cover:

- upcoming
- available to join
- in progress
- expired
- cancelled
- closed
- no-show
- under review
- read-only

Admin operations can apply manual session decisions to move a session to `NO_SHOW` or `UNDER_REVIEW` outside the normal flow. These decisions are audited and do not automatically imply refund or payout unless the finance policy explicitly handles those outcomes.

## Join policy

The user should always know:

- what session this is
- who it is with
- when it starts
- whether they can enter now
- whether they can send a message
- what happens if the session is cancelled or closed

The session detail page is the decision screen for the patient.
It should answer quickly:

- Can I enter?
- Can I chat?
- Can I cancel?
- What is the price and refund outcome?
- What happens next?
- If this came from Instant Booking, has backend payment already been confirmed?

## Chat policy

Sawiyaa uses two distinct chat experiences:

1. **Session chat** - tied to one booked session.
2. **Care chat** - broader support or ongoing care conversation.

They should not be visually or linguistically confused.

The chat page should handle:

- not opened yet
- read-only conversation
- sending disabled
- practitioner or admin moderation
- attachment access
- loading errors
- forbidden or not found states

Accepted instant-booking sessions should stay in `PENDING_PAYMENT` until backend payment confirmation arrives. The user should not see join or chat access before that confirmation.

That rule applies even if the payment-return screen opens in a browser or mobile web view with a different local timezone. The return screen should always refetch backend state before showing unlocked actions.

When chat is not available, the user should see a calm explanation and a clear return action.
It should never expose a raw route or technical enum as the main message.

## Session presentation status and join availability contract

The backend owns session display state through two primary fields:

- **`presentationStatus`** - drives all user-facing status copy: badges, list labels, detail headings, session summary counts, and filter tabs. The UI must not derive its own display label from raw backend session state.
- **`joinAvailability.canJoin`** - the only signal the UI should use to show or hide the Join CTA. No other condition, clock-based logic, or local status inference should control this.

### Enforcing the join contract

The Join CTA must stay hidden whenever `joinAvailability.canJoin` is `false`, including but not limited to these states:

- `NO_SHOW` - session was closed as a no-show
- `UNDER_REVIEW` - session is under operational review
- session has ended or been cancelled
- payment is not yet confirmed
- the join window has not opened

### Rendering session state

The session detail page should always answer these questions from backend fields, not from client-side logic:

- Who is the session with?
- When is it scheduled?
- Can the user join right now?
- Is chat available?
- What state is the session in?
- What support or next action is available?

### No-show and under-review states

`NO_SHOW` and `UNDER_REVIEW` are session closeout states. They must render as human-readable copy, not raw enum values. For example, in Arabic the label should be translated, not shown as the raw enum. The raw enum must never appear in visible UI text.

These states are set through admin manual decision operations and propagate through the same `presentationStatus` contract used across patient, practitioner, and admin surfaces. They do not automatically trigger refunds or payouts unless the finance policy explicitly handles that outcome.

## Instant Booking summary

Instant Booking is the fast-path care flow for patients who want a session today or as soon as possible with a practitioner who is actually available now.

### Flow

1. The patient opens Instant Booking.
2. The backend returns practitioners who are eligible right now.
3. The patient selects a practitioner, duration, and currency.
4. The backend returns the frozen instant price.
5. The patient sends a request.
6. The practitioner accepts or rejects the request.
7. On acceptance, the backend creates a real session with `flowType=INSTANT` and `status=PENDING_PAYMENT`.
8. The patient pays.
9. The backend confirms payment.
10. The session follows the normal join rules and stays locked until payment is confirmed.

### Pricing rules

- instant booking pricing is backend-owned
- each approved practitioner can have four instant booking prices:
  - 30 minutes, EGP
  - 60 minutes, EGP
  - 30 minutes, USD
  - 60 minutes, USD
- instant booking prices are separate from normal session prices
- the frontend never falls back to normal session prices for instant booking
- the frontend never derives or recalculates instant booking prices
- accepted requests use the frozen quote captured by the backend

### Eligibility rules

The backend discovery API only returns practitioners that satisfy the current instant booking rules, including:

- approved, active, public practitioner profile
- instant booking enabled
- fresh online/presence state
- a valid instant booking price for the requested duration and currency
- current availability that can support the request
- no conflicting session that blocks the requested window

Instant Booking is intentionally restricted to practitioners who are truly available now.

### Web surfaces

- `/[locale]/patient/instant-booking`
- `/[locale]/practitioner/instant-booking`

Accepted instant booking requests create a normal session that goes through the standard payment return flow before any join action is unlocked.

### Mobile surfaces

- `app/(patient)/instant-booking.tsx`
- `app/(practitioner)/instant-booking.tsx`
- `app/(patient)/sessions/[id]/payment-return.tsx`

### Backend API contract

Patient discovery:

- `GET /api/v1/patients/me/instant-booking/practitioners`

Patient requests:

- `POST /api/v1/patients/me/instant-booking-requests`
- `GET /api/v1/patients/me/instant-booking-requests`
- `GET /api/v1/patients/me/instant-booking-requests/:id`
- `POST /api/v1/patients/me/instant-booking-requests/:id/cancel`

Practitioner queue:

- `GET /api/v1/practitioners/me/instant-booking-requests/pending`
- `GET /api/v1/practitioners/me/instant-booking-requests`
- `POST /api/v1/practitioners/me/instant-booking-requests/:requestId/accept`
- `POST /api/v1/practitioners/me/instant-booking-requests/:requestId/reject`

### Status

- Phases 1-4 are closed.
- Phase 5 is partially closed because provider-side checkout QA is still externally blocked.
- Phase 6 is closed for mobile parity.
- Phase 6B and 6C are closed for mobile visual polish and scale alignment.

## Related routes

- `/[locale]/patient/sessions/[id]`
- `/[locale]/patient/sessions/[id]/payment-return`
- `/[locale]/patient/sessions/[id]/chat`
- `/[locale]/practitioner/availability`
- `/[locale]/practitioner/instant-booking`
- `/[locale]/practitioner/sessions/[id]/chat`

## Related docs

- [Availability system](availability-system.md)
- [Platform overview](platform-overview.md)
