# Glossary

This glossary defines the terms used across the platform documentation.

## Core terms

- **Managed healthcare marketplace**: A platform that connects patients and practitioners while also operating booking, payments, support, moderation, and finance rules.
- **Platform Core**: The backend and product backbone that owns identity, scheduling, sessions, payments, support, and operational data.
- **Care Experience Layer**: The guided surface that helps users discover, decide, book, pay, join, and follow up without confusion.
- **Patient**: The person using the platform to find care, book sessions, pay, chat, and follow their journey.
- **Practitioner**: The healthcare provider who offers sessions and manages availability, practice, and earnings.
- **Admin**: The platform operator who manages users, content, finance, moderation, and settings.
- **Session**: A scheduled care appointment between a patient and a practitioner.
- **Session chat**: A chat thread attached to one specific session.
- **Care chat**: A broader conversation used for support or ongoing care follow-up.
- **UTC instant**: A real runtime timestamp stored in UTC so it does not depend on the viewer's local timezone.
- **IANA timezone**: A named timezone such as `Africa/Cairo` or `Asia/Riyadh`, used for recurring local-time interpretation.
- **Practitioner timezone**: The timezone used to interpret practitioner availability and schedule editing.
- **Viewer timezone**: The timezone used when a screen intentionally displays time in the current viewer's local context.
- **Timezone snapshot**: The timezone recorded on a session for audit and display context after booking.
- **Wallet**: The user balance area that shows available funds and wallet activity.
- **Payments history**: The list of transactions related to sessions, refunds, and payment events.
- **Refund policy**: The rule set that determines what happens if a session is cancelled.
- **Ledger**: A record of financial movements, usually on the practitioner side.
- **Settlement**: The operational process of moving platform earnings to the correct party.
- **Availability**: The time windows when a practitioner can accept bookings or sessions.
- **Instant booking**: A fast-path booking flow for patients who need care today or now; it only returns practitioners who are eligible in the current window.
- **Matching**: The flow that helps a patient find a suitable practitioner.
- **Assessment**: A questionnaire or screening flow used before or during care discovery.
- **Moderation**: Administrative control of content, chat, sessions, or other sensitive flows.
- **Available now**: A practitioner is eligible in the current window and can be returned by the instant booking discovery flow.
- **Frozen instant quote**: The backend-captured price quote used for an accepted instant booking request before payment.

## Scheduling terms

- **Weekly schedule**: The recurring base availability pattern that repeats every week.
- **Specific-day adjustment**: A one-day override that affects only the selected date.
- **Availability exception**: A stored override that either blocks bookings or adds extra availability.
- **BLOCK**: Prevent bookings for a day or a time range.
- **OPEN_EXTRA**: Add extra availability for a day or a time range.
- **Current exception**: A non-past exception that still affects future availability.
- **Future exception**: An exception scheduled for a later date.

## Session and payment terms

- **PENDING_PAYMENT**: The session or purchase exists, but backend payment confirmation has not yet been completed.
- **presentationStatus**: The human-friendly status the UI shows after mapping backend state into readable copy.
- **joinAvailability**: The structured backend result that tells the UI whether the user can enter the session now.
- **Same-surface return URL**: A trusted payment return URL that brings the user back to the same surface they started from.
- **PaymentPurpose.SESSION_INSTANT_BOOKING**: The payment purpose used for accepted instant-booking sessions.
- **Paymob provider blocker**: The external sandbox/provider QA issue where checkout returned `403 Forbidden` during testing.
- **External QA**: A provider- or sandbox-dependent check that still needs to be completed outside the product logic.

## Usage note

If a UI label conflicts with a product term, prefer the term that matches the user task and the surrounding screen context.
