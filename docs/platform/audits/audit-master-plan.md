# Fayed Platform — Audit Master Plan

**Phase:** 0 — Audit Master Plan
**Created:** 2026-06-16
**Status:** Complete — planning and mapping only

---

## Purpose

This document is the structured beginning of a full platform audit program for the Fayed healthcare marketplace. It defines what will be audited, how, and in what order.

The audit is **non-random** and **evidence-based**. It proceeds module-by-module and journey-by-journey, guided by platform documentation as the baseline and source code as the final source of truth when documentation and implementation disagree.

**This phase (Phase 0) does not fix anything. It only maps what will be audited and how.**

---

## Audit principles

1. The code is always the final source of truth. Docs explain intent; code决定 behavior.
2. No fixes are made during audit phases unless separately approved via a formal change request.
3. Every finding must cite evidence: a file path, a line number, a screen behavior, or a contract discrepancy.
4. Risk severity is classified P0–P3 and drives phase ordering and remediation priority.
5. Audits proceed journey-by-journey and module-by-module, not by folder proximity or file size.

---

## Module inventory

All modules listed below exist in the codebase. Each row maps the module to its backend area(s), web surfaces, mobile surfaces, and admin surfaces. Risk level reflects the impact if the module fails silently or incorrectly.

| Module | Purpose | Backend area | Web surfaces | Mobile surfaces | Admin surfaces | Risk level | Audit priority |
| ------ | ------- | ------------ | ------------ | --------------- | -------------- | ---------- | -------------- |
| Auth & Identity | Login, signup, session persistence, route guards, role-based access | `modules/auth` | Sign-in, sign-up pages; all guarded dashboards | `app/(auth)/signin`, `app/(auth)/signup` | Admin login | P0 | Phase 4 |
| Patients | Patient identity, profiles, patient-specific data | `modules/patients` | `/patient/profile`, `/patient/dashboard` | `app/(patient)/profile-details` | `/admin/patients` | P1 | Phase 4 |
| Practitioners | Practitioner profiles, specialties, public identity | `modules/practitioners` | `/practitioners/[slug]`, `/practitioner/profile` | Discovery surfaces | `/admin/practitioners` | P1 | Phase 5 |
| Practitioner Applications / Onboarding | Application submission, admin review, approval/rejection | `modules/practitioners` + admin | `/practitioner/application` | None | `/admin/practitioner-applications`, `/admin/practitioner-applications/create` | P0 | Phase 5 |
| Discovery / Matching | Practitioner directory, search, filters, specialty pages | `modules/matching` | `/specialties`, `/practitioners`, practitioner profiles | `app/(patient)/discovery`, `app/(patient)/matching` | None | P1 | Phase 3 |
| Availability | Weekly recurring schedule, specific-day adjustments, exceptions | `modules/availability` | `/practitioner/availability` | `app/(practitioner)/availability` | `/admin/sessions` (read) | P1 | Phase 3 |
| Scheduled Booking | Normal session booking with time/duration/price selection | `modules/sessions`, `modules/payments` | `/patient/sessions/[id]`, payment return | Session booking flows | None | P0 | Phase 3 |
| Instant Booking | Available-now flow: practitioner discovery, request/accept/reject, frozen pricing | `modules/instant-booking` | `/patient/instant-booking`, `/practitioner/instant-booking` | `app/(patient)/instant-booking`, `app/(practitioner)/instant-booking` | None | P0 | Phase 3 |
| Sessions / Join / Daily | Session detail, presentation status, join availability, join window | `modules/sessions` | `/patient/sessions/[id]`, `/practitioner/sessions/[id]` | `app/(patient)/sessions/[id]`, `app/(practitioner)/sessions` | `/admin/sessions`, `/admin/sessions/runtime-inspector` | P0 | Phase 1 |
| Session Chat | Per-session chat thread, read-only/disabled states, attachments | `modules/chat` | `/patient/sessions/[id]/chat`, `/practitioner/sessions/[id]/chat` | None | `/admin/chat` (moderation) | P1 | Phase 1 |
| Messages Shell | Unified message inbox for care chat and support conversations | `modules/care-chat`, `modules/support` | `/patient/messages`, `/practitioner/messages` | `app/(patient)/messages`, `app/(practitioner)/messages` | None | P1 | Phase 1 |
| Support / Care Chat | Broader support conversations and care follow-up threads | `modules/care-chat`, `modules/support` | `/patient/support`, `/patient/care-chat/[id]`, `/practitioner/support` | `app/(patient)/support`, `app/(practitioner)/support` | `/admin/support` | P1 | Phase 1 |
| Payments | Session payments, package purchases, training enrollments, payment return | `modules/payments`, `common/payments` | `/patient/payments`, `/patient/sessions/[id]/payment-return` | `app/(patient)/payments` | `/admin/payments` | P0 | Phase 2 |
| Wallet | Patient wallet balance, activity history | `modules/customer-wallets` | `/patient/wallet` | None | None | P1 | Phase 2 |
| Refunds | Refund decisions, status tracking | `modules/financial-rules`, `modules/financial-operations` | Patient payment history | None | `/admin/payments` | P0 | Phase 2 |
| Settlements / Ledger | Practitioner payout records, platform settlement operations | `modules/financial-operations` | `/practitioner/ledger` | None | `/admin/settlements` | P0 | Phase 2 |
| Admin Operations | Session manual decisions, user/practitioner management, moderation | `modules/admin`, `modules/sessions` | None | None | Full admin suite | P0 | Phase 4 |
| Notifications | Push device registration, reminders, presence nudges | `modules/notifications` | In-app notifications | Push surfaces | `/admin/notifications` | P2 | Phase 8 |
| Mobile Patient App | Expo patient flows: discovery, booking, payment return, sessions | `modules/patients`, `modules/sessions` | N/A | Full patient Expo app | N/A | P0 | Phase 7 |
| Mobile Practitioner App | Expo practitioner flows: availability, sessions, finance | `modules/practitioners`, `modules/sessions` | N/A | Full practitioner Expo app | N/A | P1 | Phase 7 |
| i18n / RTL / Design System | Bilingual UI (EN/AR), RTL layout, Clinical Warmth design language | `common/i18n` | All surfaces | All mobile surfaces | All admin surfaces | P1 | Phase 9 |
| Security / Permissions | Role-based access, permission guards, route protection | `common/guards`, `modules/auth` | Route guards on all guarded routes | Auth persistence | Admin access control | P0 | Phase 4 |
| Reports / Analytics | Admin reports, session statistics, platform metrics | `modules/reports` | None | None | `/admin/reports` | P2 | Phase 6 |
| Content / Training / Assessments | Articles, training enrollments, assessments | `modules/articles`, `modules/training`, `modules/assessments` | `/articles`, `/patient/training`, `/patient/assessments` | `app/(patient)/academy`, `app/(patient)/articles`, `app/(patient)/assessments` | `/admin/articles`, `/admin/training` | P2 | Phase 6 |
| Presence | Practitioner online/away presence for instant booking eligibility | `modules/presence` | Presence indicators on discovery | None | None | P1 | Phase 3 |
| Moderation | Chat moderation, content flagging | `modules/moderation` | None | None | `/admin/chat`, `/admin/moderation-reports` | P1 | Phase 6 |
| Package Plans | Pre-paid session packages | `modules/package-plans` | `/patient/package-purchases` | `app/(patient)/package-purchases` | `/admin/package-plans`, `/admin/package-settlements` | P2 | Phase 6 |

---

## Journey inventory

### Patient journeys

| # | Journey | Expected goal | Expected backend contract | Web surfaces | Mobile surfaces | Admin surfaces | Highest risk points | What audit must verify |
| -- | ------- | ------------- | ------------------------- | ------------ | --------------- | -------------- | ------------------- | ---------------------- |
| P1 | Signup / Login | Authenticated patient session | JWT token, user role=PATIENT | `/ar/signin`, `/ar/signup`, `/en/signin`, `/en/signup` | `app/(auth)/signin`, `app/(auth)/signup` | None | Token persistence, route guard enforcement, role correctness | Token stored correctly, protected routes redirect unauthenticated users to login |
| P2 | Discovery / Practitioner profile | Find and evaluate a practitioner | Practitioner read model, specialties, pricing | `/specialties`, `/practitioners`, `/practitioners/[slug]` | `app/(patient)/discovery` | None | Data consistency between directory and profile, pricing display | Profile data matches backend, no raw enum in specialty/status labels |
| P3 | Scheduled booking | Book a session with a selected practitioner | Session created, price confirmed, availability deducted | Patient session detail + payment flow | Session booking flow | None | Availability conflict handling, price accuracy, payment creation | Session created with correct price, payment record exists before confirmation |
| P4 | Instant booking | Request immediate session, receive accept/reject | Instant booking request/accept/reject cycle, frozen price | `/patient/instant-booking`, `/practitioner/instant-booking` | `app/(patient)/instant-booking`, `app/(practitioner)/instant-booking` | None | Request expiry, practitioner online state, frozen price integrity | Request expires correctly, practitioner sees pending request, price frozen at request time |
| P5 | Payment and payment return | Pay for session, see confirmation | Payment confirmation, session unlock | `/patient/sessions/[id]/payment-return` | `app/(patient)/sessions/[id]/payment-return` | None | Return URL handling, payment state refetch, no premature unlock | Payment-return screen refetches backend state before showing unlocked actions |
| P6 | Sessions list | View upcoming and past sessions | Session list with `presentationStatus`, `joinAvailability` | `/patient/sessions` | `app/(patient)/sessions` | None | Status badge display, Join CTA visibility | All status values render as translated text, Join CTA hidden when `canJoin=false` |
| P7 | Session detail | Understand session state, next steps | Session detail with full presentation state | `/patient/sessions/[id]` | `app/(patient)/sessions/[id]` | None | State copy translation, no raw enum, chat availability shown | `presentationStatus` renders translated copy, `joinAvailability.canJoin` controls CTA |
| P8 | Join session | Enter live session at correct time | `joinAvailability.canJoin=true` from backend | `/patient/sessions/[id]` (Join CTA) | Session join via deep link | None | Premature join prevention, join window enforcement | Join CTA absent before backend confirms join eligibility |
| P9 | Session chat / messages | Communicate in session context | Chat availability from backend | `/patient/sessions/[id]/chat`, `/patient/messages` | `app/(patient)/messages` | None | Chat availability states (read-only, disabled), correct thread | Chat sends only when backend confirms sending is allowed |
| P10 | Support | Open a support request | Support ticket / care chat thread | `/patient/support`, `/patient/care-chat` | `app/(patient)/support`, `app/(patient)/care-chat` | `/admin/support` | Correct routing between support and care chat | Support surfaces show correct thread list and states |
| P11 | Wallet / payments history | View balance and transaction history | Wallet balance, payment records | `/patient/wallet`, `/patient/payments` | `app/(patient)/payments` | None | Currency separation, no mixed-currency display | Each currency shown separately, amounts match backend |
| P12 | Profile / settings | Manage profile, timezone, preferences | Patient profile update API | `/patient/profile` | `app/(patient)/profile-details` | None | Timezone field validity (IANA), update persistence | Timezone value is valid IANA name, updates persist |

### Practitioner journeys

| # | Journey | Expected goal | Expected backend contract | Web surfaces | Mobile surfaces | Admin surfaces | Highest risk points | What audit must verify |
| -- | ------- | ------------- | ------------------------- | ------------ | --------------- | -------------- | ------------------- | ---------------------- |
| PR1 | Login | Authenticated practitioner session | JWT token, role=PRACTITIONER | `/ar/signin`, `/en/signin` | `app/(auth)/signin` | None | Token persistence, route guard, role enforcement | Unauthenticated requests to practitioner routes return 401/redirect |
| PR2 | Application / onboarding | Submit and track application status | Practitioner application lifecycle | `/practitioner/application` | None | `/admin/practitioner-applications` | Status display, no raw status enum, admin review flow | Application status renders as translated copy, admin can approve/reject |
| PR3 | Profile | Manage professional profile, specialties, bio | Practitioner profile update API | `/practitioner/profile` | None | `/admin/practitioners` | Profile data consistency, pricing fields | Profile changes persist correctly, instant booking prices editable |
| PR4 | Availability | Set and manage weekly schedule and exceptions | Weekly schedule + exceptions API | `/practitioner/availability` | `app/(practitioner)/availability` | None (read only) | Timezone consistency, exception conflict handling | Schedule changes reflect in slot generation, no double-booking |
| PR5 | Instant booking queue | Accept or reject pending instant booking requests | Instant booking request list, accept/reject API | `/practitioner/instant-booking` | `app/(practitioner)/instant-booking` | None | Request expiration, accept/reject atomicity, frozen price display | Request disappears after accept/reject, frozen price matches request time |
| PR6 | Sessions list | View all practitioner sessions | Session list with `presentationStatus` | `/practitioner/sessions` | `app/(practitioner)/sessions` | None | Status badge translation, Join CTA visibility | All status values translated, no raw enum |
| PR7 | Session detail | View session state and participant info | Session detail with full state | `/practitioner/sessions/[id]` | `app/(practitioner)/sessions` | `/admin/sessions` | State copy translation, no raw enum, chat availability | `presentationStatus` translated, `joinAvailability.canJoin` controls CTA |
| PR8 | Join session | Enter live session | `joinAvailability.canJoin=true` from backend | `/practitioner/sessions/[id]` (Join CTA) | Session join via deep link | None | Premature join prevention | Join CTA only visible when backend allows join |
| PR9 | Messages / support | View and respond to messages | Care chat threads | `/practitioner/messages`, `/practitioner/support` | `app/(practitioner)/messages`, `app/(practitioner)/support` | None | Thread list accuracy, sending state | Correct threads shown, sending only when backend allows |
| PR10 | Wallet / ledger / settlements | View earnings and payout history | Wallet balance, ledger entries, settlement records | `/practitioner/wallet`, `/practitioner/ledger` | `app/(practitioner)/finance` | `/admin/settlements` | Currency-aware display, settlement accuracy | Amounts match backend, settlements show correct practitioner |
| PR11 | Settings | Manage account settings, timezone | Practitioner settings API | `/practitioner/settings` | None | None | Timezone validity, settings persistence | Timezone is valid IANA, updates persist |

### Admin journeys

| # | Journey | Expected goal | Expected backend contract | Web surfaces | Admin surfaces | Highest risk points | What audit must verify |
| -- | ------- | ------------- | ------------------------- | ------------ | -------------- | ------------------- | ---------------------- |
| A1 | Login | Authenticated admin session | JWT token, role=ADMIN or SUPER_ADMIN | `/ar/signin`, `/en/signin` | Admin login | Token persistence, role guard | Unauthenticated requests to admin routes blocked |
| A2 | Dashboard | Platform overview with KPIs | Admin dashboard read model | None | `/admin/dashboard` | Data freshness, metric accuracy | Dashboard loads without error, numbers plausible |
| A3 | User management | View and manage patient accounts | Patient list and detail APIs | None | `/admin/patients`, `/admin/users` | Data access control, PII handling | Admin can list and view patient detail without leaking other patient data |
| A4 | Practitioner applications | Review and approve/reject practitioner applications | Practitioner application review API | None | `/admin/practitioner-applications`, `/admin/practitioner-applications/create` | Audit trail, approval atomicity | Application status changes are atomic, audit trail exists |
| A5 | Practitioner management | View and manage practitioner accounts | Practitioner list and detail APIs | None | `/admin/practitioners` | Data consistency, profile update propagation | Profile changes persist and reflect in public-facing practitioner surfaces |
| A6 | Session operations / manual decisions | Apply manual session decisions (no-show, under-review) | Manual session decision API | None | `/admin/sessions`, `/admin/sessions/runtime-inspector` | Decision propagation, financial side effects | Decision propagates to patient/practitioner session detail, no auto refund/payout unless policy states |
| A7 | Payments / refunds / wallet | View payment records, issue refunds | Payment and refund APIs | None | `/admin/payments` | Refund amount accuracy, refund policy enforcement | Refund respects policy, amount matches session payment |
| A8 | Settlements / ledger | Manage practitioner payouts | Settlement and payout APIs | None | `/admin/settlements` | Settlement calculation accuracy, payout integrity | Settlement amounts match ledger entries, payouts traceable |
| A9 | Support / care chat | Handle patient and practitioner support | Support thread management | None | `/admin/support`, `/admin/chat`, `/admin/chat-conversations` | Thread access control, message visibility | Admin can view threads without breaking patient-practitioner privacy |
| A10 | Reports | View platform reports | Report data APIs | None | `/admin/reports` | Data accuracy, report freshness | Reports load without error, data consistent with other admin surfaces |
| A11 | Settings / permissions | Manage platform settings and admin access | Admin settings and permission APIs | None | `/admin/settings` | Permission change auditability, settings propagation | Permission changes take effect and are auditable |

### Mobile journeys

| # | Journey | Expected goal | Expected backend contract | Mobile surfaces | Highest risk points | What audit must verify |
| -- | ------- | ------------- | ------------------------- | --------------- | ------------------- | ---------------------- |
| M1 | Auth persistence | Remain logged in across app restarts | Token refresh or persisted token | All Expo screens | Token expiry handling, silent refresh | App relaunch does not log user out silently, token refreshes correctly |
| M2 | Patient session detail | View session state with translated labels | Session detail with `presentationStatus` | `app/(patient)/sessions/[id]` | Raw enum in status label, missing AR translations | Status renders translated text, AR translations present |
| M3 | Practitioner session detail | View session state with translated labels | Session detail with `presentationStatus` | `app/(practitioner)/sessions` | Raw enum, missing AR translations | Status renders translated text |
| M4 | Session join | Enter live session from mobile | `joinAvailability.canJoin=true` from backend | Deep link from notification or session screen | Premature join, deep link security | Join only works when backend confirms eligibility |
| M5 | Messages shell | View care chat and support threads | Message thread list | `app/(patient)/messages`, `app/(practitioner)/messages` | Thread list accuracy, sending state | Correct threads, sending only when allowed |
| M6 | Support | Open or view support conversations | Support API | `app/(patient)/support`, `app/(practitioner)/support` | Thread routing accuracy | Support threads route correctly |
| M7 | Payment return / deep link | Complete payment and return to app | Payment confirmation API | `app/(patient)/sessions/[id]/payment-return` | Premature unlock after payment return | App refetches backend state before unlocking join |
| M8 | Push notifications / device registration | Receive session reminders and updates | Device registration API | All mobile surfaces | Device token registration, notification content | Notifications fire for correct events, content is human-readable |
| M9 | RTL/LTR rendering | UI renders correctly in Arabic (RTL) and English (LTR) | Locale context from app entry | All mobile screens | Layout mirroring, text alignment, component sizing | Arabic text is right-aligned, layout mirrors LTR correctly |

---

## Severity definitions

| Severity | Meaning | Examples | Remediation |
| -------- | ------- | -------- | ----------- |
| **P0** | Platform is unusable or a financial/safety breach is possible | Login broken, payment incorrect, session join accessible before payment, raw enum visible as user-facing text in a critical path | Fix before next release |
| **P1** | Core journey is broken or a user can be meaningfully misled | Status badge shows raw enum, Join CTA appears when it should not, booking creates double-charge risk | Fix within current release cycle |
| **P2** | Important UX degradation or data inconsistency that does not block the journey | Dashboard shows stale data, list filter state unclear, timezone display confusing but functional | Fix in next release cycle |
| **P3** | Polish, cleanup, future improvement | Unused import, inconsistent spacing, cosmetic copy variation | Track for future sprint |

---

## Audit phases

### Rationale for phase ordering

Phase 1 (Sessions/Join/Chat/Messages/Support) is recommended as the first deep audit because:

- Session state is the most contract-heavy part of the platform (`presentationStatus`, `joinAvailability`, `chatAvailability`)
- Phase 5A/5B recently touched session hooks and i18n keys — regression risk is high
- Sessions touch every role (patient, practitioner, admin) and both web and mobile
- Chat and messages are adjacent and share session-context data

Phase 2 (Payments/Wallet/Refunds/Settlements) follows because:

- Sessions and payments are the two highest-stakes financial surfaces
- They share the `PENDING_PAYMENT` state that connects booking to money
- Getting both right early prevents regression in the most expensive part of the product

Phase 3 (Availability/Booking/Instant Booking) is third because:

- These are the primary value-creation flows for patients and practitioners
- Availability errors cascade into booking and instant booking
- The instant booking request/accept cycle has multiple state transitions that are hard to test without a running system

Phase 4 (Auth/Roles/Permissions) is fourth because:

- Auth failures in production affect every other module
- Permissions are cross-cutting — auditing them late means re-auditing every module
- Admin access control must be verified before Phase 6 (admin UX audit)

Phase 5 (Practitioner Applications/Onboarding/Profile) is fifth because:

- Application approval is a regulated, high-trust flow
- Profile data flows into discovery, booking, and session display
- Onboarding errors can create compliance or safety issues

Phase 6 (Patient Web/Practitioner Web/Admin Web UX integrity) is sixth because:

- By this point, all backend contracts and module behaviors are verified
- Phase 6 audits the surface-level consistency: no raw enums, correct copy, proper loading states
- Admin UX integrity specifically audits the ops console without functional backend changes

Phase 7 (Mobile Patient/Practitioner parity) is seventh because:

- Mobile must mirror web backend contracts, not invent its own
- After web sessions and payments are audited, mobile parity checks are fast to execute
- RTL/LTR rendering is easiest to verify once all other content is confirmed correct

Phase 8 (Notifications/Push/Reminders/Deep links) is eighth because:

- Notifications are delivery-level, not core product logic
- They depend on session and auth state already verified in Phases 1 and 4
- Deep link routing can be tested in isolation

Phase 9 (i18n/RTL/Clinical Warmth/raw enum/key sweep) is ninth because:

- A full sweep for raw enums, i18n key leakage, undefined/null, and `[object Object]` is most efficient after all module behaviors are confirmed
- This phase applies a consistent QA checklist across every surface in one pass
- It is the final quality gate before release readiness

Phase 10 (Final Release Readiness Roadmap) is the last because:

- All prior findings have been registered and triaged
- Phase 10 produces the final prioritized remediation roadmap and go/no-go recommendation

### Phase sequence summary

| Phase | Focus | Key modules |
| ----- | ----- | ----------- |
| 1 | Sessions / Join / Chat / Messages / Support | Sessions, Session Chat, Messages Shell, Support |
| 2 | Payments / Wallet / Refunds / Settlements / Ledger | Payments, Wallet, Refunds, Settlements |
| 3 | Availability / Scheduled Booking / Instant Booking | Availability, Scheduled Booking, Instant Booking, Presence |
| 4 | Auth / Roles / Permissions / Admin access | Auth, Security/Permissions, Admin Operations |
| 5 | Practitioner Applications / Onboarding / Profile / Pricing | Practitioner Applications, Practitioners, Practitioner Profile |
| 6 | Patient Web / Practitioner Web / Admin Web UX integrity | All patient/practitioner/admin web surfaces |
| 7 | Mobile Patient / Mobile Practitioner parity | Mobile Patient App, Mobile Practitioner App |
| 8 | Notifications / Push / Reminders / Deep links | Notifications |
| 9 | i18n / RTL / Clinical Warmth / raw enum/key sweep | i18n/RTL/Design System (all surfaces) |
| 10 | Final Release Readiness Roadmap | All modules |

---

## Recommended first deep audit phase

**Phase 1 — Sessions / Join / Daily / Session Chat / Messages / Support**

Rationale: Sessions are the contract-heavy core of the platform, recently modified by Phase 5A/5B, touch all three roles and both platforms, and have the highest P0 risk when broken. Auditing sessions first gives the audit team the most important signal about platform health before expanding to adjacent modules.

---

## What is intentionally out of scope in Phase 0

- No deep code inspection beyond route and module mapping
- No test execution or CI/CD verification
- No database schema inspection or migration review
- No third-party integration testing beyond what docs describe as deferred
- No performance, load, or stress testing
- No security penetration testing
- No mobile binary review or app store submission review
- No business model validation or product strategy review
- No changes to any application code, configuration, or seed data
- No creation of reports outside `docs/platform/audits`