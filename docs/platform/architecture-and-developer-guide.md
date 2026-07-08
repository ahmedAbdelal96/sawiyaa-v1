# Architecture and Developer Guide

Sawiyaa is organized as a monorepo with separate apps and shared product rules.

## Top-level applications

- `D:\Web\full-projects\sawiyaa\sawiyaa-backend-v1` - backend API and business logic.
- `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1` - web application used by public users, patients, practitioners, and admins.
- `D:\Web\full-projects\sawiyaa\sawiyaa-mobile` - mobile client and mobile-specific flows.

## Backend shape

The backend follows a modular monolith model:

- each domain lives in its own module
- controllers expose the API surface
- DTOs define contracts
- services hold business logic
- repositories handle data access when needed
- shared concerns such as permissions, auditing, and formatting are centralized

Typical backend domains include:

- auth and user identity
- patient journeys
- practitioner journeys
- sessions and availability
- instant booking
- chat and moderation
- payments, payouts, and accounting
- support and notifications
- content and training

## Frontend shape

The web app is organized by audience and route group:

- public web
- patient web
- practitioner web
- admin web

The app relies on shared UI primitives, route guards, translations, and feature folders. That keeps each screen close to the user task while still sharing the Sawiyaa visual system.

## Mobile shape

The mobile app mirrors the patient and practitioner journeys where it matters most:

- patient discovery and booking entry points
- patient payment return screens
- practitioner request queues and practice actions
- the same Arabic / English content rules as web

## Shared concerns

- **Permissions**: access must be enforced in both backend and frontend.
- **Translations**: English and Arabic must stay in sync for user-facing text.
- **Money**: currency-aware formatting is mandatory.
- **Design system**: page structure should follow the Sawiyaa Clinical Warmth rules.
- **Chat states**: available, read-only, unavailable, and error states must be explicit.
- **Cancellation and refunds**: must be data-driven and policy-based, not guessed.
- **Instant booking**: pricing stays backend-owned and payment confirmation must come before session access.
- **Localized specialties**: admin edits raw fields; public displays use locale-aware helpers.

## Data and contracts

The platform should treat the backend contract as the source of truth for:

- session eligibility
- money and currency values
- refund results
- chat availability
- role-based permissions
- moderation state
- instant booking eligibility

The frontend should present these values clearly, without inventing fallback logic that changes meaning.

## Timezone contract

Sawiyaa should use one explicit timezone contract across backend, web, mobile, and docs.

### Storage rules

- Sessions, payments, reminders, request expiry, join windows, and chat timestamps are stored as UTC instants.
- Weekly availability is practitioner-local wall time plus an IANA timezone.
- Availability exceptions are stored as UTC ranges, but they must be created from an explicit local date/time plus timezone context.
- A session timezone snapshot is for audit and display context only; it is not the primary source of scheduling truth.
- Write boundaries validate timezone values as IANA names.

### Timezone ownership

- Practitioner availability editing uses the practitioner timezone.
- Patient booking display uses the patient or viewer timezone.
- Practitioner session display uses the practitioner timezone or the session snapshot when helpful.
- Admin views may show patient time, practitioner time, and UTC together when needed.
- Backend remains the source of truth for slot generation, conflicts, join windows, payment unlocks, and request expiry.

### API contract

Time-sensitive APIs should return:

- UTC fields such as `startAt`, `endAt`, `expiresAt`, and `joinOpenAt`
- timezone metadata such as `practitionerTimeZone`, `viewerTimeZone`, and `timezoneSnapshot`
- no frontend-calculated availability, join unlocking, or payment unlocking

### UI display contract

- Patient screens show times in the patient or viewer timezone.
- Practitioner availability editor shows times in the practitioner timezone.
- Session detail should label the timezone context when confusion is possible.
- Payment-return screens must refetch backend state and never unlock based on local time alone.
- Mobile and web should follow the same formatting policy, even if the final display locale differs.
- `joinAvailability` and `PENDING_PAYMENT` must be rendered from backend state, not inferred from local clock behavior.

### DST and edge-case policy

- Daylight-saving changes must be handled through IANA timezone conversion, not fixed offsets.
- Missing local times and repeated local times should be resolved by backend timezone logic before UI presentation.
- Day-boundary changes between countries should not change the underlying UTC session record.
- If a user travels after booking, the session remains the same UTC session; only the display timezone changes.
- If a practitioner changes timezone after existing bookings, new availability should use the new timezone, but historical sessions must keep their original audit context.

## Route map

### Public web

- `/[locale]/`
- `/[locale]/help`
- `/[locale]/refund-policies/session`
- `/[locale]/articles`
- `/[locale]/articles/[slug]`
- `/[locale]/specialties`
- `/[locale]/specialties/[slug]`
- `/[locale]/practitioners`
- `/[locale]/practitioners/[slug]`
- `/[locale]/patient/sessions/[id]`
- `/[locale]/patient/sessions/[id]/payment-return`

### Patient web

- `/[locale]/patient`
- `/[locale]/patient/dashboard`
- `/[locale]/patient/sessions`
- `/[locale]/patient/sessions/[id]`
- `/[locale]/patient/sessions/[id]/chat`
- `/[locale]/patient/wallet`
- `/[locale]/patient/payments`
- `/[locale]/patient/profile`
- `/[locale]/patient/support`
- `/[locale]/patient/help`
- `/[locale]/patient/care-chat`
- `/[locale]/patient/care-chat/[id]`
- `/[locale]/patient/assessments`
- `/[locale]/patient/assessments/[slug]`
- `/[locale]/patient/training` legacy redirect to `/[locale]/patient/academy`
- `/[locale]/patient/package-purchases`
- `/[locale]/patient/messages`
- `/[locale]/patient/instant-booking`

### Practitioner web

- `/[locale]/practitioner/dashboard`
- `/[locale]/practitioner/application`
- `/[locale]/practitioner/profile`
- `/[locale]/practitioner/availability`
- `/[locale]/practitioner/instant-booking`
- `/[locale]/practitioner/sessions`
- `/[locale]/practitioner/sessions/[id]`
- `/[locale]/practitioner/sessions/[id]/chat`
- `/[locale]/practitioner/wallet`
- `/[locale]/practitioner/ledger`
- `/[locale]/practitioner/promo-codes`
- `/[locale]/practitioner/messages`
- `/[locale]/practitioner/settings`
- `/[locale]/practitioner/support`
- `/[locale]/practitioner/help`

### Admin web

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
- `/[locale]/admin/practitioner-payouts`
- `/[locale]/admin/practitioner-payouts/history`
- `/[locale]/admin/finance/accounting/reconciliation`
- `/[locale]/admin/refund-policies`
- `/[locale]/admin/support`
- `/[locale]/admin/reports`
- `/[locale]/admin/articles`
- `/[locale]/admin/training` legacy redirect to `/[locale]/admin/academy/programs`
- `/[locale]/admin/notifications`
- `/[locale]/admin/settings`

## Platform module catalog

| Module | Purpose | Main users | Key backend area | Key web/mobile surfaces | Current status | Important business rules / dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Identity and Auth | Login, persistence, route protection, and role-based access | Patients, practitioners, admins | auth, identity, permissions | login/signup, guarded dashboards, mobile session persistence | Closed | Backend is the final source of truth for access. |
| Practitioner Onboarding and Profile | Application, review, professional identity, pricing, instant booking pricing, direct create | Practitioners, admins | practitioners, admin practitioner applications | practitioner application, profile forms, admin create forms | Closed | Profile/pricing contracts must stay synchronized across web and backend. |
| Discovery and Matching | Help patients find the right practitioner | Patients | matching, practitioner read models | public directory, patient discovery, guided matching entry points | Closed / evolving | Discovery should stay clearer than a raw list. |
| Availability and Schedule | Week-by-week windows, specific-day adjustments, exceptions, booked-session subtraction | Practitioners, patients | availability, booking slot generation | practitioner availability page, patient booking screens | Closed | Public reads only `PUBLISHED` weeks; `DRAFT` and `ARCHIVED` weeks do not authorize booking. |
| Scheduled Booking | Normal session booking with duration/price/time selection | Patients, practitioners, finance | sessions, payments, financial rules | patient session booking, payment return screens | Closed | Booking depends on availability and payment confirmation. |
| Instant Booking | Available-now flow with frozen backend pricing and request/accept/reject cycle | Patients, practitioners | instant-booking, payments, sessions | patient instant booking, practitioner queue, payment-return handling | Closed with external blocker | Provider-side checkout QA is still deferred; join remains locked until backend confirmation. |
| Sessions and Join | Session detail, presentation status, join availability, join window rules | Patients, practitioners, admins | sessions, session mapping, join policy | session detail pages, join actions, session states | Closed | No join before backend permission; `joinAvailability` and `presentationStatus` must stay accurate. |
| Session Chat and Care/Support Chat | Session chat plus broader support/care chat distinction | Patients, practitioners, support, admins | chat, moderation, support conversations | session chat, care chat, support hub | Closed | Read-only and disabled states must be explicit; chat is not the same as the session itself. |
| Payments, Wallet, Refunds, Payouts, and Accounting | Session payments, instant-booking payment purpose, package/training payments, wallet, refunds, individual practitioner payouts, reconciliation | Patients, practitioners, finance, admins | payments, wallet, refunds, payouts, accounting | payment-return screens, wallet, payments history, payout pages, reconciliation | Closed | Money must stay currency-aware and backend-owned. |
| Admin Operations | Visibility, moderation, support, finance tools, reports, settings | Admins, support, finance | admin, moderation, support, finance ops | admin dashboards, lists, tables, review pages, payout and reconciliation tools | Closed | Admin actions must be auditable and explicit. |
| Mobile App | Patient and practitioner mobile parity | Patients, practitioners | mobile-specific routing and screens | Expo patient/practitioner screens, payment-return, instant booking | Closed | Mobile should mirror the core flow, not invent a separate product contract. |
| Content, Training, and Assessments | Articles, Academy v2 learner surfaces, legacy training compatibility, assessments | Patients, admins, content teams | content, academy, training, assessments | content pages, Academy public/admin/learner surfaces, assessments | Closed / complete for Academy v2; Training stays legacy and redirect-only | Academy is the visible learning product; Training remains backend compatibility only. |
| Notifications | Reminders, presence nudges, request alerts, push behavior | Patients, practitioners, admins | notifications, push settings | in-app, email, SMS, push surfaces | Closed / active | Operational notification service and catalog sync matter. |

## Core business rules

- The backend is the source of truth.
- Frontend and mobile do not calculate session or instant booking prices.
- No join before backend `joinAvailability` allows it.
- No payment unlock before backend confirmation.
- Instant booking requires online/present readiness, current availability, backend pricing, and no conflict.
- The availability contract is week-by-week, not legacy recurring runtime slots.
- Money must be currency-aware at every surface.
- User-facing copy must not expose raw enums or keys.
- Timezone rules must stay explicit: UTC for runtime facts, IANA timezones for recurring interpretation, and viewer-local display only where intended.
- Localized specialty names must use raw edit fields in admin and locale-aware display helpers in public UI.

## How to test locally

Use the app roots, not this docs folder, for runtime checks.

### Common paths

- Backend: `D:\Web\full-projects\sawiyaa\sawiyaa-backend-v1`
- Web: `D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1`
- Mobile: `D:\Web\full-projects\sawiyaa\sawiyaa-mobile`

### Common ports

- backend: `http://localhost:7000`
- web: `http://localhost:3000`
- Expo web: `http://localhost:8081`

### Practical QA sequence

1. Start the backend first.
2. Start web or mobile after the backend is healthy.
3. Verify the target page and follow the real user journey.
4. Confirm the backend response matches what the UI shows.
5. Re-check the empty, pending, blocked, and read-only states.

### Instant Booking local QA prerequisites

- practitioner is online / present
- instant booking is enabled
- current availability exists
- instant prices are populated
- no conflicting session blocks the requested window

### Payment and provider note

- Provider checkout may still return `403 Forbidden` in the current dev setup.
- That is a provider-side blocker, not a platform logic change.
- Internal return / confirmation / join-lock guards still need to be verified before external provider QA is considered complete.

## Practical onboarding notes

When you are new to the repo:

1. Read the platform overview first.
2. Find the route group and feature folder for the screen you are touching.
3. Check the backend module that owns the contract before changing UI behavior.
4. Keep money, availability, and session logic backend-owned.
5. Avoid fallback logic that changes the meaning of a state.
6. Keep public and patient copy calm, explicit, and human.

## What to keep in mind

- The code is the source of truth for live behavior.
- The docs explain the product and its intended operating model.
- The design language is Clinical Warmth: calm, clear, and trustworthy.
- Money flows must stay currency-aware and policy-driven.
- Chat and cancellation states must be explained in human language, not raw technical terms.

## Related docs

- [Platform overview](platform-overview.md)
- [Users and journeys](users-and-journeys.md)
- [Availability system](availability-system.md)
- [Booking, sessions, and availability](booking-sessions-and-availability.md)
- [Payments, wallet, and finance](payments-wallet-and-finance.md)
- [Finance and payouts](finance-and-payouts.md)
- [Practitioner onboarding](practitioner-onboarding.md)
- [Operations and support](operations-and-support.md)
- [Security, roles, and permissions](security-roles-and-permissions.md)
- [Design, content, and i18n](design-content-and-i18n.md)
- [Specialties localization](specialties-localization.md)
- [Notifications and alerting](notifications-and-alerting.md)
- [Accounting reconciliation](accounting-reconciliation.md)
- [Production rollout](production-rollout.md)
- [Removed and deprecated flows](removed-and-deprecated-flows.md)
- [Glossary](glossary.md)
