# Architecture and Developer Guide

Fayed is organized as a monorepo with separate apps and shared product rules.

## Top-level applications

- `D:\Web\full-projects\fayed\fayed-backend-v1` - backend API and business logic.
- `D:\Web\full-projects\fayed\fayed-frontend-v1` - web application used by public users, patients, practitioners, and admins.
- `D:\Web\full-projects\fayed\fayed-mobile` - mobile client and mobile-specific flows.

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
- payments and wallet
- reports and support
- content and training
- notifications and settings

## Frontend shape

The web app is organized by audience and route group:

- public web
- patient web
- practitioner web
- admin web

The app relies on shared UI primitives, route guards, translations, and feature folders. That keeps each screen close to the user task while still sharing the Fayed visual system.

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
- **Design system**: page structure should follow the Fayed Clinical Warmth rules.
- **Chat states**: available, read-only, unavailable, and error states must be explicit.
- **Cancellation and refunds**: must be data-driven and policy-based, not guessed.
- **Instant booking**: pricing stays backend-owned and payment confirmation must come before session access.

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

Fayed should use one explicit timezone contract across backend, web, mobile, and docs.

### Storage rules

- Sessions, payments, reminders, request expiry, join windows, and chat timestamps are stored as UTC instants.
- Weekly availability is practitioner-local wall time plus an IANA timezone.
- Availability exceptions are stored as UTC ranges, but they must be created from an explicit local date/time plus timezone context.
- A session timezone snapshot is for audit and display context only; it is not the primary source of scheduling truth.
- Write boundaries validate timezone values as IANA names; fixed offsets such as `+02:00` are rejected, and blank values normalize to null or fallback handling only where the flow already intends that behavior.

### Timezone ownership

- Practitioner availability editing uses the practitioner timezone.
- Patient booking display uses the patient or viewer timezone.
- Practitioner session display uses the practitioner timezone or the session snapshot when helpful.
- Admin views may show patient time, practitioner time, and UTC together when needed.
- Backend remains the source of truth for slot generation, conflicts, join windows, payment unlocks, and request expiry.

### Source priority

- Practitioner timezone: saved practitioner/user timezone first, then the availability slot timezone, then UTC as the final safe fallback.
- Patient/viewer timezone: saved user timezone first, then device/browser timezone for display fallback, then UTC only as a last resort.
- Admin timezone: admin profile timezone if available, otherwise viewer/device timezone for display only.
- Anonymous/public visitor timezone: device/browser timezone for display only, with UTC as final safe fallback.

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

### Target architecture

The long-term model should be:

- UTC for runtime facts
- IANA timezone for recurring availability interpretation
- timezone snapshots for audit and human-readable context
- viewer-local display for patient-facing readouts unless the screen is explicitly practitioner-facing
- backend-only authority for all scheduling, conflicts, join windows, and payment unlocks

### Phased implementation plan

#### Phase 3: timezone profile validation and defaults

- Likely touched: user/practitioner profile DTOs, settings forms, seed/default profile values.
- Risk level: medium.
- Expected verification: timezone fields are valid IANA names and default cleanly when missing.
- Must not change: booking logic, session timing, payment behavior.

#### Phase 4: backend timezone utility/service consolidation

- Likely touched: backend availability utilities, session scheduling helpers, join policy helpers, payment return helpers.
- Risk level: medium.
- Expected verification: one shared conversion path for wall time to UTC and UTC back to display context.
- Must not change: state machines, public API contracts, or money logic.

#### Phase 5: availability engine hardening tests

- Likely touched: availability generation tests, conflict tests, schedule compatibility tests, instant booking eligibility tests.
- Risk level: medium to high.
- Expected verification: weekly recurrence, exceptions, booked-session subtraction, and cross-timezone cases stay correct.
- Must not change: user-facing wording or route structure.

#### Phase 6: web/mobile formatting normalization

- Likely touched: shared date/time formatters, patient session views, practitioner availability editor, payment-return screens, mobile session screens.
- Risk level: medium.
- Expected verification: practitioner-local views and viewer-local views are intentionally different where required.
- Must not change: backend timestamps or session status rules.

#### Phase 7: admin/support multi-timezone display

- Likely touched: admin read models, support dashboards, finance views, session detail views with dual-time display.
- Risk level: low to medium.
- Expected verification: admin can see UTC, practitioner time, and patient time when useful.
- Must not change: permissions, read-only vs action states, or financial totals.

#### Phase 8: QA matrix

- Likely touched: QA documentation and test plans.
- Risk level: low.
- Expected verification: Egypt, Gulf, traveler, and DST-adjacent cases are covered.
- Must not change: production behavior.

### First safest implementation task

The safest first implementation step after this contract is to validate and normalize timezone fields consistently at the profile and availability boundaries, before changing any display formatting or scheduling behavior.

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
- `/[locale]/patient/training`
- `/[locale]/patient/package-purchases`
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
- `/[locale]/practitioner/support`
- `/[locale]/practitioner/help`

### Admin web

- `/[locale]/admin/dashboard`
- `/[locale]/admin/users`
- `/[locale]/admin/patients`
- `/[locale]/admin/practitioners`
- `/[locale]/admin/sessions`
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

## Platform Module Catalog

This catalog is intentionally practical. It tells you what each module is for, who uses it, where the logic tends to live, and what depends on it.

| Module | Purpose | Main users | Key backend area | Key web/mobile surfaces | Current status | Important business rules / dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Identity and Auth | Login, persistence, route protection, and role-based access | Patients, practitioners, admins | auth, identity, permissions | login/signup, guarded dashboards, mobile session persistence | Closed | Backend is the final source of truth for access. |
| Practitioner Onboarding and Profile | Application, review, professional identity, pricing, instant booking pricing, direct create | Practitioners, admins | practitioners, admin practitioner applications | practitioner application, profile forms, admin create forms | Closed | Profile/pricing contracts must stay synchronized across web and backend. |
| Discovery and Matching | Help patients find the right practitioner | Patients | matching, practitioner read models | public directory, patient discovery, guided matching entry points | Closed / evolving | Discovery should stay clearer than a raw list. |
| Availability and Schedule | Recurring schedule, specific-day adjustments, exceptions, booked-session subtraction | Practitioners, patients | availability, booking slot generation | practitioner availability page, patient booking screens | Closed | Weekly schedule repeats; `BLOCK` and `OPEN_EXTRA` are the key override types. |
| Scheduled Booking | Normal session booking with duration/price/time selection | Patients, practitioners, finance | sessions, payments, financial rules | patient session booking, payment return screens | Closed | Booking depends on availability and payment confirmation. |
| Instant Booking | Available-now flow with frozen backend pricing and request/accept/reject cycle | Patients, practitioners | instant-booking, payments, sessions | patient instant booking, practitioner queue, payment-return handling | Closed with external blocker | Provider-side Paymob QA is still deferred; join remains locked until backend confirmation. |
| Sessions and Join | Session detail, presentation status, join availability, join window rules | Patients, practitioners, admins | sessions, session mapping, join policy | session detail pages, join actions, session states | Closed | No join before backend permission; `joinAvailability` and `presentationStatus` must stay accurate. |
| Session Chat and Care/Support Chat | Session chat plus broader support/care chat distinction | Patients, practitioners, support, admins | chat, moderation, support conversations | session chat, care chat, support hub | Closed | Read-only and disabled states must be explicit; chat is not the same as the session itself. |
| Payments, Wallet, Refunds, and Finance | Session payments, instant-booking payment purpose, package/training payments, wallet, refunds, settlements | Patients, practitioners, finance, admins | payments, wallet, refunds, settlements, financial rules | payment-return screens, wallet, payments history, settlements, ledgers | Closed | Money must stay currency-aware and backend-owned; Paymob external QA remains deferred. |
| Admin Operations | Visibility, moderation, support, finance tools, reports, settings | Admins, support, finance | admin, moderation, support, finance ops | admin dashboards, lists, tables, review pages, settlement tools | Closed | Admin actions must be auditable and explicit. |
| Mobile App | Patient and practitioner mobile parity | Patients, practitioners | mobile-specific routing and screens | Expo patient/practitioner screens, payment-return, instant booking | Closed | Mobile should mirror the core flow, not invent a separate product contract. |
| Content, Training, and Assessments | Articles, training enrollments, assessments, matching support | Patients, admins, content teams | content, training, assessments | content pages, enrollments, assessments | Closed / partial by feature | Useful as care-adjacent expansion; not the core booking contract. |
| Notifications | Reminders, presence nudges, request alerts, push behavior | Patients, practitioners, admins | notifications, push settings | in-app, email, SMS, push surfaces | Planned / partial | Important for instant booking and session reminders; not fully treated as core closure here. |

## Core Business Rules

- The backend is the source of truth.
- Frontend and mobile do not calculate session or instant booking prices.
- No join before backend `joinAvailability` allows it.
- No payment unlock before backend confirmation.
- Instant booking requires online/present readiness, current availability, backend pricing, and no conflict.
- The weekly schedule repeats automatically unless changed.
- Exceptions do not delete booked sessions.
- Money must be currency-aware at every surface.
- User-facing copy must not expose raw enums or keys.
- Timezone rules must stay explicit: UTC for runtime facts, IANA timezones for recurring availability, and viewer-local display only where intended.
- Paymob provider QA is external and deferred.

## How to test locally

Use the app roots, not this docs folder, for runtime checks.

### Common paths

- Backend: `D:\Web\full-projects\fayed\fayed-backend-v1`
- Web: `D:\Web\full-projects\fayed\fayed-frontend-v1`
- Mobile: `D:\Web\full-projects\fayed\fayed-mobile`

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

- The Paymob sandbox/provider checkout may return `403 Forbidden` in the current dev setup.
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
- [Booking, sessions, and availability](booking-sessions-and-availability.md)
- [Payments, wallet, and finance](payments-wallet-and-finance.md)
- [Operations and support](operations-and-support.md)
- [Security, roles, and permissions](security-roles-and-permissions.md)
- [Design, content, and i18n](design-content-and-i18n.md)
- [Glossary](glossary.md)
