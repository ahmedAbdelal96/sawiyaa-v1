# Users and Journeys

This document groups the product by audience so the care experience is easier to understand.

## Public web

The public web is the first impression of Fayed.

It should feel like a calm, trustworthy healthcare platform, not a generic marketing site.

### Main public areas

- Home and landing content
- Specialties discovery
- Practitioner directory and profiles
- Articles and educational content
- Help center
- Refund policy pages
- Sign in and sign up entry points
- Public session booking or session entry pages where applicable

### Public UX goals

- Help visitors understand what Fayed does quickly.
- Reduce anxiety around booking and payments.
- Make the next step obvious without shouting.
- Keep legal and policy pages readable, not overwhelming.

## Patient journey

The patient experience is the most sensitive part of the platform.
It must feel clear, gentle, and reliable from first visit to follow-up.

### Main patient goals

- Find the right practitioner or service.
- Use instant booking when care is needed today or as soon as possible.
- Understand session availability and price before booking.
- Pay safely and see the result clearly.
- Join the session at the right time.
- Chat when allowed, without confusion.
- Review wallet, payments, and support history without technical noise.

### Typical patient flow

1. Discover practitioners or services.
2. Sign in or create an account.
3. Review a practitioner, session, or instant booking option.
4. Book and pay.
5. Check the session detail page or payment-return page.
6. Join the session when it becomes available.
7. Continue in session chat or care chat where appropriate.
8. Review wallet and payments after the session.
9. Use support or help if anything needs clarification.

### Important patient surfaces

- `/[locale]/patient`
- `/[locale]/patient/sessions`
- `/[locale]/patient/sessions/[id]`
- `/[locale]/patient/sessions/[id]/chat`
- `/[locale]/patient/messages`
- `/[locale]/patient/wallet`
- `/[locale]/patient/payments`
- `/[locale]/patient/profile`
- `/[locale]/patient/support`
- `/[locale]/patient/help`
- `/[locale]/patient/instant-booking`

### UX expectations

- The patient should know who the session is with.
- The patient should know when the session starts.
- The patient should know whether they can join now.
- The patient should know whether chat is available.
- The patient should know whether cancellation is allowed.
- The patient should know what happened with the money.
- Session states must appear as human-readable translated labels. For example, `NO_SHOW` should render as `لم يحذر` in Arabic, not as the raw enum value.
- The Join CTA must be hidden when `joinAvailability.canJoin` is `false`, including for no-show, under-review, ended, or payment-locked sessions.
- Accepted instant-booking sessions should stay locked until backend payment confirmation arrives.

### Failure states

Patient-facing screens must handle blocked or unavailable states with supportive language:

- chat not opened yet
- session not eligible yet
- sending disabled
- read-only conversation
- cancellation not allowed
- payment pending or failed
- accepted instant-booking session waiting for payment confirmation
- wallet empty

These states should explain the next safe action instead of showing raw technical details.

## Practitioner journey

Practitioners use the platform to manage their professional presence, schedule, sessions, chat, and earnings.

### Main practitioner goals

- Complete onboarding and profile setup.
- Set specialties, pricing, and availability.
- Respond to instant booking requests when the practitioner is ready now.
- Manage upcoming and past sessions.
- Communicate with patients when appropriate.
- Track wallet, ledger, and payouts.
- Use promo codes and practice tools.

### Typical practitioner flow

1. Sign in or complete the practitioner application.
2. Finish profile and identity setup.
3. Set availability and session rules.
4. Receive booked sessions.
5. Respond to pending instant booking requests.
6. Join session chat at the right time.
7. Review session history and earnings.
8. Track wallet and ledger movements.
9. Use support for operational issues.

### Important practitioner surfaces

- `/[locale]/practitioner/dashboard`
- `/[locale]/practitioner/application`
- `/[locale]/practitioner/profile`
- `/[locale]/practitioner/availability`
- `/[locale]/practitioner/instant-booking`
- `/[locale]/practitioner/sessions`
- `/[locale]/practitioner/sessions/[id]`
- `/[locale]/practitioner/sessions/[id]/chat`
- `/[locale]/practitioner/messages`
- `/[locale]/practitioner/settings`
- `/[locale]/practitioner/wallet`
- `/[locale]/practitioner/ledger`
- `/[locale]/practitioner/promo-codes`
- `/[locale]/practitioner/support`
- `/[locale]/practitioner/help`

### UX expectations

- Availability must be simple to edit and easy to trust.
- Instant booking requests should be easy to scan and should expire clearly if not acted on in time.
- Earnings and ledger values must be currency-aware.
- Session states must be obvious and human-readable. Session detail must not leak raw enum values or internal i18n key paths.
- The session presentation and join availability contract follows the same backend field contract as patient surfaces. `presentationStatus` and `joinAvailability` drive the UI consistently.
- Chat should show whether sending is allowed.
- The dashboard should help practitioners act, not just inspect data.

## Admin journey

The admin experience is an operations console for the platform.

It should prioritize control, clarity, auditing, and safe moderation.

### Main admin goals

- Manage users and practitioner records.
- Moderate sessions, chat, and support cases.
- Operate payments, settlements, and refunds.
- Review reports, notifications, and content.
- Configure platform policies and settings.

### Typical admin flow

1. Sign in with admin credentials.
2. Review dashboard indicators.
3. Inspect users, practitioners, or patients.
4. Open sessions, payments, or settlement records.
5. Handle moderation or support tasks.
6. Review reports and resolve anomalies.
7. Update policies or settings when authorized.

### Important admin surfaces

- `/[locale]/admin/dashboard`
- `/[locale]/admin/users`
- `/[locale]/admin/patients`
- `/[locale]/admin/practitioners`
- `/[locale]/admin/practitioner-applications`
- `/[locale]/admin/practitioner-applications/create`
- `/[locale]/admin/sessions`
- `/[locale]/admin/sessions/runtime-inspector`
- `/[locale]/admin/chat`
- `/[locale]/admin/chat-conversations`
- `/[locale]/admin/payments`
- `/[locale]/admin/settlements`
- `/[locale]/admin/refund-policies`
- `/[locale]/admin/support`
- `/[locale]/admin/reports`
- `/[locale]/admin/articles`
- `/[locale]/admin/training`
- `/[locale]/admin/notifications`
- `/[locale]/admin/settings`

### UX expectations

- Tables and detail pages must be fast to scan.
- Moderate actions should be explicit and auditable.
- Sensitive states should not be hidden behind vague copy.
- Financial data should be precise and currency-aware.
- Admin tooling should feel operational, not decorative.

