# Sawiyaa Mobile â€” Product UX Tracker

> **Status:** Active source of truth
> **Scope:** Sawiyaa Mobile App
> **Canonical path:** `D:\Web\full-projects\sawiyaa\sawiyaa-mobile`

## Purpose

This file is the permanent Product/UX execution tracker for the mobile app. Future work should start here instead of repeating a full-project UX audit.

**Core rule:** The backend is organized by modules. The mobile app is organized by human workflows.

---

## Working Rules

1. Start every mobile UX task from the relevant issue IDs in this file.
2. Do only focused discovery around the affected workflow.
3. Preserve correct backend contracts and business rules.
4. Do not expose backend modules, raw enums, technical IDs, providers, or API wording to users.
5. Validate Arabic + English, RTL + LTR, accessibility, and loading/empty/error/success states.
6. Update this file in the same task after implementation.
7. An item is DONE only after validation/tests, not because the screen looks better.

### Status

- `[ ]` Not completed
- `[x]` Completed and validated
- Use `Status: TODO | IN_PROGRESS | BLOCKED | DONE`

---

# 1. Product Architecture

## UX-ARCH-001 â€” One app, two independent product experiences
- [x] **Status: DONE**
- One Store/App binary:
  - Patient Experience
  - Practitioner Experience
- Shared: API, auth, i18n, design tokens, primitives, session contracts, messaging infrastructure, notifications, formatters, error mapping.
- Experience-specific: Home, navigation, workflows, role-specific cards/copy/CTAs.
- Do not force both roles into generic screens full of role conditionals.
- Decision finalized in UX-0. Current role-specific navigation and UI migration remain implementation TODO.

## UX-ARCH-002 â€” Workflow-first mobile architecture
- [x] **Status: DONE**
- **P0**
- User navigation must follow real jobs, not NestJS/backend modules.
- Every primary screen should answer one dominant user question.
- Decision finalized in UX-0. Applying the rule to remaining screens remains implementation TODO.

---

# 2. Global UX Problems

## UX-GLOBAL-001 â€” Excessive cards / weak hierarchy
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Too many equal-weight Cards, headings, descriptions, summaries and repeated actions.
- **Classification:** PARTIALLY COMPLETE. Accepted core workflows were reviewed and duplicate Wallet/notification/More hierarchy was corrected; a repository-wide card audit remains debt.
- **Target:** hierarchy through spacing, typography, grouping and progressive disclosure.
- One obvious primary action per important state.
- No repeated information in the same viewport.
- Cards only where containment has real meaning.

## UX-GLOBAL-002 â€” Deep navigation for simple tasks
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Common actions require Screen â†’ Screen â†’ Screen â†’ edit â†’ back â†’ back.
- **Target:** perform contextual actions from the closest relevant screen.
- **Classification:** PARTIALLY COMPLETE. Schedule, booking, session, notification, and More context paths were verified; the full booking visual fixture remains blocked by its acceptance-modal scroll step.
- Preserve selected day/session/filter after completion.

## UX-GLOBAL-003 â€” Duplicate navigation entry points
- [x] **Status: DONE**
- **P1**
- Bottom tabs, Home quick access, headers and More can repeat destinations.
- Each primary destination needs one predictable owner.
- **Classification:** DONE. Patient and Practitioner primary owners are bottom tabs; notification ownership is the header bell; More is secondary-only.

## UX-GLOBAL-004 â€” Backend terminology leaks into UI
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Remove/translate user-hostile values such as:
  - `EXPIRED`
  - `PAYMOB`
  - `PUSH`
  - `Africa/Cairo`
  - internal IDs such as `P-15DA`
  - backend-oriented explanations
- Backend codes remain available only for logs/support.
- **Classification:** PARTIALLY COMPLETE. Core tested surfaces hide internal IDs, raw enums, provider names, and IANA zones; Discovery still depends on backend English-only specialty content.

## UX-GLOBAL-005 â€” Literal translation instead of product localization
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Arabic should be short, clear Modern Standard Arabic.
- English should be concise product English.
- Arabic and English do not need identical sentence structures.
- No mixed backend terminology in Arabic UI.
- **Classification:** PARTIALLY COMPLETE. Core AR/EN screens were reviewed; repository i18n validation still reports 2,000 legacy issues and the Discovery specialty contract lacks localized titles.

## UX-GLOBAL-006 â€” State consistency
- [ ] **Status: PARTIALLY COMPLETE**
- **P1**
- Every core workflow must define:
  - loading
  - empty
  - retryable error
  - non-retryable error
  - disabled
  - success
  - stale/refetch if relevant
- **Classification:** PARTIALLY COMPLETE. Representative loading, empty, error, disabled, success, and stale-safe states were exercised; full native/device state coverage remains unavailable.

## UX-GLOBAL-007 â€” Large screens mixing responsibilities
- [ ] **Status: PARTIALLY COMPLETE**
- **P1**
- Target:
  `Screen orchestration â†’ focused hooks/view-model â†’ UI sections â†’ primitives`
- Avoid overengineering; refactor only when it makes workflow changes safer/testable.
- **Classification:** PARTIALLY COMPLETE. Existing view-model/component decomposition is sufficient for accepted workflows; broad decomposition was intentionally deferred.

---

# 3. Canonical Product Vocabulary

## UX-COPY-001 â€” Establish mobile vocabulary
- [x] **Status: DONE**
- **P0**

| Internal/current | Arabic | English |
|---|---|---|
| Availability | Ø§Ù„Ø¬Ø¯ÙˆÙ„ / Ø¬Ø¯ÙˆÙ„ÙŠ | Schedule / My schedule |
| Find Doctor | Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ø®ØªØµ | Find a specialist |
| Ledger | Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª | Transactions |
| Settlement | Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø§Øª / Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª Ø­Ø³Ø¨ context | Earnings / Transfers |
| Instant Booking Presence | Ù…ØªØ§Ø­ Ù„Ù„Ø­Ø¬Ø² Ø§Ù„Ø¢Ù† | Available now |
| Africa/Cairo | ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù‚Ø§Ù‡Ø±Ø© | Cairo time |
| PUSH | Ø¥Ø´Ø¹Ø§Ø± ÙÙˆØ±ÙŠ | Push notification |
| Provider unavailable | Ø§Ù„Ø¯ÙØ¹ ØºÙŠØ± Ù…ØªØ§Ø­ Ù…Ø¤Ù‚ØªÙ‹Ø§ | Payments are temporarily unavailable |

Approved UX-0B vocabulary decisions:

Practitioner money destination: **الأرباح** (AR) / **Earnings** (EN). The \`finance\` route and backend module remain technical/internal.

| Concept | Arabic | English |
|---|---|---|
| Availability | Ø§Ù„Ø¬Ø¯ÙˆÙ„ / Ø¬Ø¯ÙˆÙ„ÙŠ | Schedule / My schedule |
| Generic practitioner role | Ù…Ø®ØªØµ | Specialist |
| Patient primary discovery | Ø§ÙƒØªØ´Ù | Discover |
| Find the right specialist | Ø§ÙƒØªØ´Ù Ø§Ù„Ù…Ø®ØªØµ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ | Find the right specialist |
| Sessions history | Ø§Ù„Ø³Ø¬Ù„ | History |
| Transactions | Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª | Transactions |
| Earnings | Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ | Earnings |
| External payout/transfer | Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª | Transfers |
| Wallet | Ø§Ù„Ù…Ø­ÙØ¸Ø© | Wallet |
| Notification settings | Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª | Notification settings |
| PUSH | Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù‡Ø§ØªÙ | Push notifications |
| IN_APP | Ø¯Ø§Ø®Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ | In-app |
| EMAIL | Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ | Email |

Do not expose `Ledger` as a user-facing product concept or expose technical timezone identifiers in normal UI.

Decision finalized in UX-0. Migrating existing production copy and translations remains implementation TODO.

## UX-COPY-002 â€” Full Arabic/English translation audit
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Remove obsolete/duplicate copy.
- Resolve missing AR/EN keys.
- Prevent silent fallback in core flows.
- Eliminate mixed-language production UI.
- **Classification:** PARTIALLY COMPLETE. Core touched flows were reviewed and duplicate hierarchy removed; `validate:i18n` remains at 2,000 repository-wide issues.

## UX-COPY-003 â€” Central user-facing error mapper
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Example:
  `PAYMENT_PROVIDER_UNAVAILABLE` â†’ `Ø§Ù„Ø¯ÙØ¹ ØºÙŠØ± Ù…ØªØ§Ø­ Ù…Ø¤Ù‚ØªÙ‹Ø§. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ø¨Ø¹Ø¯ Ù‚Ù„ÙŠÙ„.`
- Never expose raw backend error codes in normal UI.
- **Classification:** PARTIALLY COMPLETE. `extractApiErrorMessage` now maps unknown/provider/stack text to safe localized copy; specialized error presenters still need a repository-wide migration audit.

---

Approved UX-0B error boundary:

`backend error/code â†’ normalized diagnostic classification â†’ localized product message â†’ optional user action`

The foundational user-facing representation is limited to `messageKey`, `retryable`, `action`, and `diagnosticCode`. Raw backend/provider/payload details remain diagnostic only. Raw backend `message` or `error` must never be the generic user-facing fallback. Repository-wide migration remains TODO.

# 4. Practitioner Experience

## UX-PR-IA-001 â€” Practitioner Information Architecture
- [x] **Status: DONE**
- **P0**
- Build around daily work:
  - What do I have today?
  - What is my next session?
  - What times are open/booked?
  - How do I add/remove time?
  - What needs action?
  - What did I earn?
  - What messages need attention?
- Suggested direction: `Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© | Ø§Ù„Ø¬Ø¯ÙˆÙ„ | Ø§Ù„Ø¬Ù„Ø³Ø§Øª | Ø§Ù„Ø±Ø³Ø§Ø¦Ù„/appropriate slot | Ø§Ù„Ù…Ø²ÙŠØ¯`
- Final tab structure must be decided from workflow, not current modules.
- Decision finalized in UX-0 as `Home | Schedule | Sessions | Messages | More`. Migrating the current bottom tabs/routes remains implementation TODO.

---

Approved UX-0B Practitioner navigation: `Home | Schedule | Sessions | Messages | More`.

Arabic: `Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© | Ø§Ù„Ø¬Ø¯ÙˆÙ„ | Ø§Ù„Ø¬Ù„Ø³Ø§Øª | Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ | Ø§Ù„Ù…Ø²ÙŠØ¯`.

More owns finance, notification settings, account/profile, support, instant-booking configuration, promo codes, and logout. Schedule, Sessions, and Messages must not be duplicated inside More.

## Practitioner Home

### UX-PR-HOME-001 â€” Operational Home instead of module dashboard
- [x] **Status: DONE**
- **P0**
- Current problems:
  - account readiness too prominent;
  - next session can be repeated;
  - many cards compete equally;
  - Quick Access duplicates navigation.
- Target priority:
  1. greeting/context
  2. next session or useful empty state
  3. urgent required action
  4. concise today summary
  5. contextual shortcut only when useful
- Healthy account status should not consume a large card.

### UX-PR-HOME-002 â€” Context-aware Home states
- [x] **Status: DONE**
- **P1**
- Validate: session soon / later today / no sessions / required post-session action / instant request / account problem / loading / error / offline.
- UX-2B completes the supported Home state matrix: later-today, joinable/current, no-upcoming, required-action, account-attention, loading, retryable session/profile error, and stale/refetch preservation. Instant booking remains in its existing Practitioner queue route because Home has no separate actionable request contract; no Home-specific offline infrastructure exists to expose safely, so no invented offline state was added.

---

## Practitioner Schedule

### UX-PR-SCH-001 â€” Rename Availability â†’ Schedule
- [x] **Status: DONE**
- **P0**
- Arabic tab: `Ø§Ù„Ø¬Ø¯ÙˆÙ„`
- Screen: `Ø¬Ø¯ÙˆÙ„ÙŠ`
- English: `Schedule` / `My schedule`
- Backend can keep `availability`.

### UX-PR-SCH-002 â€” Day-first schedule workflow
- [x] **Status: DONE**
- **P0**
- Target:
  `Schedule â†’ current week â†’ select day â†’ actual slots â†’ understand booked/available â†’ add/edit/remove â†’ save â†’ return to same day`
- Do not make the practitioner manage a weekly configuration entity as the primary UX.

### UX-PR-SCH-003 â€” All / 30 / 60 filter
- [x] **Status: DONE**
- **P0**
- `Ø§Ù„ÙƒÙ„ | 30 Ø¯Ù‚ÙŠÙ‚Ø© | 60 Ø¯Ù‚ÙŠÙ‚Ø©`
- Filter must preserve selected day and update counts.

### UX-PR-SCH-004 â€” Slot status clarity
- [x] **Status: DONE**
- **P0**
- Available / booked / protected when relevant.
- Never rely on color alone.
- Summary example: `5 Ù…ØªØ§Ø­Ø© â€¢ 2 Ù…Ø­Ø¬ÙˆØ²Ø©`
- Hide meaningless zero-count categories.

### UX-PR-SCH-005 â€” Empty day
- [x] **Status: DONE**
- **P0**
- Example:
  - `Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙˆÙ‚Ø§Øª Ù…Ø¶Ø§ÙØ© Ù„ÙŠÙˆÙ… Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡`
  - `Ø£Ø¶Ù Ø§Ù„Ø£ÙˆÙ‚Ø§Øª Ø§Ù„ØªÙŠ ØªØ±ÙŠØ¯ Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª Ø®Ù„Ø§Ù„Ù‡Ø§.`
  - CTA: `Ø¥Ø¶Ø§ÙØ© Ø£ÙˆÙ‚Ø§Øª`
- Adding times must preserve the selected day.

### UX-PR-SCH-006 â€” Redesign Add Times
- [x] **Status: DONE**
- **P0**
- Avoid a giant grid containing most of the day.
- Choose duration.
- Group manageable slots by morning / afternoon / evening.
- Clearly show selected count.
- Allow custom range when supported.
- Explain conflicts immediately.
- Clear selected/disabled/unavailable states.

### UX-PR-SCH-007 â€” Weekly repeat is secondary
- [x] **Status: DONE**
- **P1**
- First make one selected day easy.
- Then optionally repeat into future weeks.
- Explain protected/skipped dates in human language.

### UX-PR-SCH-008 â€” Human timezone
- [x] **Status: DONE**
- **P1**
- Replace `Africa/Cairo` with `ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù‚Ø§Ù‡Ø±Ø© (UTC+3)` or localized equivalent.
- Keep timezone low priority.

---

Approved UX-1 Schedule product decisions:

`My Schedule â†’ current week â†’ selected day â†’ All / 30 min / 60 min â†’ relevant slots â†’ status meaning â†’ compact summary â†’ Add Times`

- Select Today by default on entry to the current week.
- Preserve week, selected day, and active duration filter after contextual add/edit/remove/save actions whenever still valid.
- Keep recurrence secondary.
- Present timezone in human localized form.
- Generate custom ranges from existing discrete 30/60-minute slot payloads client-side; do not add a backend range contract or arbitrary durations.
- Validate end > start, duration boundaries, overlap, booked/protected safety, and backend constraints.

## Practitioner Sessions

### UX-PR-SES-001 â€” Sessions around operational state
- [x] **Status: DONE**
- **P1**
- User questions:
  - what is next?
  - what can I join?
  - what needs action?
  - what already happened?
- Backend operational state remains authoritative.
- Never recreate lifecycle rules with local date guesses.

### UX-PR-SES-002 â€” Simplify cards
- [x] **Status: DONE**
- **P1**
- Primary: patient, date/time, duration, human status, next valid action.
- Secondary details move to detail screen.

### UX-PR-SES-003 â€” Progressive session details
- [x] **Status: DONE**
- **P1**
- Priority: who â†’ when â†’ what can I do now â†’ booking details â†’ finance/admin/support only when needed.

---

## Practitioner Finance

### UX-PR-FIN-001 â€” User finance mental model
- [x] **Status: DONE**
- **P1**
- User wants: available balance, pending/review amount, earnings, transfers, transaction history.
- Do not expose `Ledger` as a primary product concept.

### UX-PR-FIN-002 â€” Central money formatting
- [x] **Status: DONE**
- **P1**
- One formatter for currency display across AR/EN and RTL/LTR.

---

## Practitioner Messages / Notifications / More

### UX-PR-MSG-001 â€” Unified inbox
- [x] **Status: DONE**
- **P1**
- One user-facing messages destination.
- Backend may keep technical conversation contexts.

### UX-PR-NOTIF-001 â€” Event â†’ channel notification preferences
- [x] **Status: DONE**
- **P1**
- Example:
  - ØªØ°ÙƒÙŠØ± Ù‚Ø¨Ù„ Ø§Ù„Ø¬Ù„Ø³Ø©
    - Ø¥Ø´Ø¹Ø§Ø± ÙÙˆØ±ÙŠ
    - Ø¯Ø§Ø®Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚
    - Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
  - Ø¨Ø¯Ø¡ Ø§Ù„Ø¬Ù„Ø³Ø©
    - Ø¥Ø´Ø¹Ø§Ø± ÙÙˆØ±ÙŠ
    - Ø¯Ø§Ø®Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚
    - Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
- Do not show repeated `PUSH`/event combinations.

### UX-PR-MORE-001 â€” Clean More
- [x] **Status: DONE**
- **P1**
- Removed duplicate primary destinations from More; Home, Schedule, Sessions, Messages, and Notification Center remain owned by their existing navigation surfaces.
- More now exposes only secondary Profile, Earnings/work tools, Settings, Support, and Log out actions using compact grouped rows and soft dividers.

---

# 5. Patient Experience

## UX-PT-IA-001 â€” Patient care journey IA
- [x] **Status: DONE**
- **P1**
- Core journey:
  `Discover specialist â†’ duration â†’ appointment â†’ review â†’ payment/entitlement â†’ confirmed â†’ join â†’ history/follow-up`
- Patient should never need to understand booking/payment backend internals.
- Decision finalized in UX-0 as `Home | Discover | Sessions | Messages | More`. Migrating the current bottom tabs/routes remains implementation TODO.

---

Approved UX-0B Patient navigation: `Home | Discover | Sessions | Messages | More`.

Arabic: `Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© | Ø§ÙƒØªØ´Ù | Ø¬Ù„Ø³Ø§ØªÙŠ | Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ | Ø§Ù„Ù…Ø²ÙŠØ¯`.

Discover owns search, filters, matching, specialist profiles, and booking entry. More owns wallet/financial activity, profile, notification settings, account/settings, support, articles, academy, packages, and logout. Matching remains a contextual discovery funnel, not a primary tab.

## Patient Home

### UX-PT-HOME-001 â€” Context-aware Patient Home
- [x] **Status: DONE**
- **P1**
- Backend-authoritative Home priority is implemented: payment-required, joinable/current, upcoming, then discovery when no next session exists.
- Loading, retryable error, and stale/refetch behavior preserve the shell and avoid blanking cached primary content.
- New vs returning Patient distinction is not marked as supported because the current Home/next-session contracts do not safely expose booking history in this orchestration.

### UX-PT-HOME-002 â€” Remove duplicate quick actions
- [x] **Status: DONE**
- **P1**
- Home has one contextual primary CTA and no permanent Quick Actions rows for Discover, Sessions, Messages, or More.

---

## Patient Discovery

### UX-PT-DISC-001 â€” Specialist vocabulary
- [x] **Status: DONE**
- **P0**
- Replace inaccurate generic `doctor` wording.
- Arabic: `Ù…Ø®ØªØµ`
- English: `specialist` or context-appropriate practitioner term.

### UX-PT-DISC-002 â€” Public/authenticated discovery consistency
- [x] **Status: DONE**
- **P1**
- Share the discovery core where the user job is truly the same.
- Do not force reuse where authenticated context is genuinely different.

---

## Patient Booking

### UX-PT-BOOK-001 â€” One primary decision per step
- [x] **Status: DONE**
- **P1**
- Flow:
  `Specialist â†’ Duration â†’ Appointment â†’ Review â†’ Payment/entitlement â†’ Confirmation`
- Packages, quote internals, and availability configuration should appear only when relevant.

### UX-PT-BOOK-002 â€” Appointment selection
- [x] **Status: DONE**
- **P1**
- Near dates first.
- Concise available times.
- Clear timezone if relevant.
- No availability-system explanation.

### UX-PT-BOOK-003 â€” Booking review
- [x] **Status: DONE**
- **P1**
- Show practitioner, date/time, duration, price/currency, discount, package/entitlement if used, final amount due.
- One unambiguous primary CTA.

---

## Patient Sessions

### UX-PT-SES-001 â€” Sessions mental model
- [x] **Status: DONE**
- **P1**
- Suggested: `Ø§Ù„Ù‚Ø§Ø¯Ù…Ø© | Ø§Ù„Ø³Ø¬Ù„`
- Optional history filters only where useful.
- Backend lifecycle remains authoritative.

### UX-PT-SES-002 â€” Session card action
- [x] **Status: DONE**
- **P1**
- Practitioner, date/time, duration, human status, next valid action such as join/pay/view.

### UX-PT-SES-003 â€” Progressive detail
- [x] **Status: DONE**
- **P1**
- First: who / when / can I join / is payment/action required.
- Then booking/payment/cancel-reschedule/support detail.

---

## Patient Wallet / Finance

### UX-PT-FIN-001 â€” Wallet mental model
- [x] **Status: DONE**
- **P1**
- Balance, refunds/credits, payments, recent activity, transaction history.

### UX-PT-FIN-002 â€” Hide provider internals
- [x] **Status: DONE**
- **P0**
- Never show `PAYMOB unavailable` directly.
- Show human payment error with retry/support when appropriate.

---

## Patient More / Settings

### UX-PT-MORE-001 â€” Remove technical profile values
- [x] **Status: DONE**
- **P0**
- Remove internal IDs such as `P-15DA`.
- Replace technical timezone such as `Africa/Cairo` with human localized wording only where useful.

### UX-PT-MORE-002 â€” Consolidate settings
- [x] **Status: DONE**
- **P1**
- Suggested:
  - Ø§Ù„Ù„ØºØ©
  - Ø§Ù„Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø²Ù…Ù†ÙŠØ©
  - Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª
- Keep account/security/support separately when needed.

---

# 6. Shared Messaging & Notifications

## UX-MSG-001 â€” One inbox mental model
- [x] **Status: DONE**
- **P1**
- User sees conversations, not backend communication modules.
- Conversation context may identify patient/practitioner, session, or support.

## UX-NOTIF-001 â€” Human notification copy
- [x] **Status: DONE**
- **P1**
- Practitioner and Patient notification feeds now use human localized copy; unknown backend event names use a generic human update.
- Examples:
  - `Ø¬Ù„Ø³ØªÙƒ Ø¨Ø¹Ø¯ 15 Ø¯Ù‚ÙŠÙ‚Ø©`
  - `Ù„Ø¯ÙŠÙƒ Ø­Ø¬Ø² Ø¬Ø¯ÙŠØ¯`
  - `ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… Ø¥Ù„Ù‰ Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø¢Ù†`
- No raw backend event names.

## UX-NOTIF-002 â€” Contextual deep links
- [x] **Status: DONE**
- **P1**
- Practitioner and Patient exact session/message targets are supported; Patient payment/session payment targets are supported where the backend action href or session identifier provides a safe accepted route. Unsupported or identifier-less events remain informational.
- Tapping a notification should open the exact relevant session/message/payment/action.

---

Approved UX-0B notification ownership:

- Notifications are not a primary bottom tab.
- Notification Center is a global app-header utility through a bell icon with unread state/badge where supported.
- Notification Settings belong under More â†’ Settings and answer how the user wants to receive notifications.
- Future notification deep links should resolve to the exact relevant session, message, payment, or action context when supported.

# 7. Design System Rules

## UX-DS-001 â€” Keep Sawiyaa visual identity
- [x] **Status: DONE**
- **P0**
- Learn from competitor workflows, do not visually clone competitors.
- Preserve calm, premium, trustworthy healthcare identity.
- **Classification:** DONE. Fresh compact-width screenshots retain Sawiyaa warm ivory, teal, restrained borders, and role-specific hierarchy.

## UX-DS-002 â€” Reduce decorative containers
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Not every section needs a card.
- Use spacing/dividers/typography when containment adds no value.
- **Classification:** PARTIALLY COMPLETE. Targeted duplicate/decorative containers were reduced; a broad screen-by-screen container audit was not reopened.

## UX-DS-003 â€” Standardize primitives
- [ ] **Status: PARTIALLY COMPLETE**
- **P1**
- Audit/reuse: buttons, segmented controls, day selector, status chips, empty states, alerts, money/date/time display, list rows, sheets, dialogs, skeletons, retry blocks.
- **Classification:** PARTIALLY COMPLETE. Existing shared primitives and centralized money/time/zone helpers were verified; no global primitive rewrite was authorized.

## UX-DS-004 â€” Accessibility / RTL / touch
- [ ] **Status: PARTIALLY COMPLETE**
- **P1**
- No color-only meaning.
- Accessible touch targets.
- Screen-reader labels for icon-only buttons.
- Correct RTL/LTR.
- Text scaling must not break key workflows.
- **Classification:** PARTIALLY COMPLETE. Representative AR/EN RTL/LTR touch targets and status treatments were visually checked; native accessibility tooling was unavailable.

---

# 8. Navigation Rules

## UX-NAV-001 â€” One navigation owner per destination
- [x] **Status: DONE**
- **P0**
- Primary workflow â†’ bottom tab.
- Contextual action â†’ current screen.
- Secondary settings â†’ More.
- Urgent state â†’ contextual Home CTA.
- Practitioner scope implemented in UX-2A: `Home | Schedule | Sessions | Messages | More`; Patient scope implemented in UX-5A: `Home | Discover | Sessions | Messages | More`. Shared/global cleanup remains open.
- **Classification:** DONE. Patient and Practitioner shells have one predictable owner per primary destination, with header-owned notifications and secondary More destinations.

## UX-NAV-002 â€” Preserve context
- [ ] **Status: PARTIALLY COMPLETE**
- **P0**
- Example: after adding Tuesday availability, return to Tuesday with updated slots.
- **Classification:** PARTIALLY COMPLETE. Schedule, sessions, notifications, and More context were verified; full booking context is limited by the blocked fixture step.

---

# 9. Technical UX Safeguards

## UX-TECH-001 â€” Backend operational state is authoritative
- [x] **Status: DONE**
- **P0**
- Mobile must not duplicate join/pay/cancel/complete/no-show lifecycle decisions already provided canonically by backend operational capabilities.
- **Classification:** DONE. Existing hooks, capability objects, mutations, query keys, invalidation, and route identifiers were preserved; only presentation mappings were added.

## UX-TECH-002 â€” Central formatting
- [x] **Status: DONE**
- **P1**
- Money, date, time, timezone, duration, human status.
- **Classification:** DONE. Central money/date/time/timezone helpers and backend-provided capability/status presentations were used in the audited workflows.

## UX-TECH-003 â€” Performance baseline
- [ ] **Status: PARTIALLY COMPLETE**
- **P1**
- Check Home, Schedule, Sessions, Discovery, Booking, Messages for redundant queries/refetching/re-rendering/layout shifts.
- **Classification:** PARTIALLY COMPLETE. Static/query review and compact-width screenshots passed; no native profiler or device performance baseline was available.

## UX-TECH-004 â€” Query/error/retry consistency
- [ ] **Status: PARTIALLY COMPLETE**
- **P1**
- Standardize loading, retry, stale state and user feedback across React Query/API flows.
- **Classification:** PARTIALLY COMPLETE. Representative states passed and the central mapper is safer; broad specialized error/query migration remains.

---

# 10. Initial Technical Baseline

## TECH-BASE-001 â€” Test failures from initial audit
- [ ] **Status: PARTIALLY COMPLETE**
- **P1**
- Initial observed baseline:
  - 30 suites
  - 201 tests
  - 28 suites passing
  - 2 suites failing
  - 198 tests passing
  - 3 tests failing
- Known areas:
  - public-home translation/fallback consistency
  - practitioner promo-code validation/date payload expectations
- UX-0B confirmed the same baseline: 30 suites / 28 passing / 2 failing; 201 tests / 198 passing / 3 failing.
- `validate:i18n` has 2,236 existing issues.
- Re-run before implementation and record the current baseline.
- **Classification:** PARTIALLY COMPLETE. Final Jest run is 50/51 suites and 284/286 tests; two unrelated Practitioner Promo Code assertions remain failing.

## TECH-BASE-002 â€” ESLint warnings
- [ ] **Status: PARTIALLY COMPLETE**
- **P2**
- Current exact baseline: `0 errors`, `137 warnings`.
- UX work must not materially increase warnings.
- **Classification:** PARTIALLY COMPLETE. Final lint is 0 errors and 103 legacy warnings; no warning increase was introduced by the gate fixes.

## TECH-BASE-003 â€” Large screen decomposition candidates
- [ ] **Status: TODO**
- **P2**
- Practitioner Promo Codes
- Patient Session Pay
- Practitioner Onboarding
- Practitioner Session Details
- Practitioner Home
- **Classification:** TODO. No broad decomposition was started during this consistency gate.
- Practitioner Sessions
- Patient Sessions
- Refactor only where it improves safety/testability of the target workflow.

---

# 11. Execution Roadmap

## Phase UX-0 â€” Product Foundation
- [x] UX-0.1 Adopt this tracker as mobile UX source of truth.
- [x] UX-0.2 Finalize Patient + Practitioner information architecture.
- [x] UX-0.3 Finalize canonical AR/EN vocabulary.
- [x] UX-0.4 Establish central user-facing error mapping boundary.
- [x] UX-0.5 Re-run tests/lint and record baseline.

**Exit gate:** navigation purpose, vocabulary and first reference workflow are explicit.

## Phase UX-1 â€” Practitioner Schedule Reference Workflow
- [x] UX-1.1 Rename user-facing Availability to Schedule.
- [x] UX-1.2 Week/day selector.
- [x] UX-1.3 Day-first slot list.
- [x] UX-1.4 All / 30 / 60 filter.
- [x] UX-1.5 Available/booked/protected states.
- [x] UX-1.6 Empty-day state.
- [x] UX-1.7 Add Times redesign.
- [x] UX-1.8 Custom range where supported.
- [x] UX-1.9 Recurring availability as secondary flow.
- [x] UX-1.10 Preserve selected-day context after save.
- [x] UX-1.11 Validate protected/booked safety.
- [x] UX-1.12 AR/EN + RTL/LTR + accessibility.
- [x] UX-1.13 Regression tests.
- [x] UX-1.14 Update tracker and execution log.

**Exit gate:** practitioner can understand a selected day and safely add/edit availability with minimal navigation.

## Phase UX-2 â€” Practitioner Home
- [x] Remove repeated next-session content.
- [x] Reduce dashboard cards.
- [x] Prioritize next meaningful action.
- [x] Add context-aware states.
- [x] Remove duplicate quick access.
- [x] Demote healthy account readiness.
- [x] Validate/tests.
- UX-2A established the approved Practitioner shell and first operational Home state matrix; UX-2B completes supported context states, duplicate-information cleanup, compactness, and locale-aware tab placement.

## Phase UX-3 â€” Practitioner Sessions
- [x] Redesign grouping.
- [x] Simplify cards.
- [x] Progressive details.
- [x] Preserve operational authority.
- [x] Regression tests.

## Phase UX-4 â€” Practitioner Finance / Messages / Notifications / More
- [x] Finance mental model.
- [x] Transactions/transfers presentation.
- [x] Inbox.
- [x] Notification preferences.
- [x] More cleanup.
- [x] Remove technical copy/duplicates.

## Phase UX-5 â€” Patient Home & Discovery
- [x] Context-aware Home.
- [x] Specialist vocabulary.
- [x] Remove duplicate quick actions.
- [x] Align public/authenticated discovery.
- [ ] New vs returning patient states.

## Phase UX-6 â€” Patient Booking
- [x] One decision per step.
- [x] Duration.
- [x] Appointment selection.
- [x] Package/entitlement only when relevant.
- [x] Review.
- [x] Payment states.
- [x] Confirmation.

## Phase UX-7 â€” Patient Sessions & Finance
- [x] Upcoming/history model.
- [x] Cards.
- [x] Progressive detail.
- [x] Wallet.
- [x] Financial history.
- [x] Remove provider internals.

## Phase UX-8 â€” Shared Messaging / Notifications / Settings
- [x] Inbox presentation.
- [x] Notification copy/actions.
- [x] Deep links.
- [x] Settings consolidation.
- [x] Human timezone everywhere.
- [x] Remove remaining raw IDs/enums/internal copy.

## Phase UX-9 â€” Final Consistency Gate
- [x] Full Arabic walkthrough (Playwright matrix completed; booking fixture limitation documented).
- [x] Full English walkthrough (Playwright matrix completed; booking fixture limitation documented).
- [x] RTL/LTR pass.
- [x] Accessibility pass (representative labels/touch targets; native tooling remains unavailable).
- [x] Loading/empty/error/success pass.
- [x] Navigation duplication audit.
- [x] Vocabulary audit.
- [ ] Performance pass.
- [x] Regression tests.
- [x] Final tracker cleanup.

**Gate result:** PASS WITH DOCUMENTED DEBT. Core Patient and Practitioner workflows are consistent in the authenticated compact-width web matrix. Remaining debt is repository-wide i18n/type/lint/test debt, native-device coverage, the blocked booking fixture step, and the backend Discovery specialty-localization contract gap.

---

# 12. Definition of Done

A redesigned workflow is DONE only when all applicable items pass:

- [x] User goal explicitly defined.
- [x] Primary action obvious.
- [ ] Navigation depth reasonable (core routes pass; booking fixture remains blocked at terms-scroll step).
- [x] No unnecessary module terminology.
- [x] No duplicated content/actions.
- [x] No raw backend enums.
- [x] No raw internal IDs.
- [x] No provider/infrastructure error leakage.
- [x] Arabic product copy reviewed.
- [x] English product copy reviewed.
- [x] RTL verified.
- [x] LTR verified.
- [x] Loading verified.
- [x] Empty verified.
- [x] Error/retry verified.
- [x] Disabled state verified.
- [x] Success state verified.
- [ ] Accessibility/touch targets verified (representative web inspection only; no native screen-reader/device gate).
- [x] Backend business behavior preserved.
- [x] Backend operational authority preserved.
- [x] Regression tests updated where applicable.
- [x] Unrelated behavior remains intact.
- [x] This tracker updated.
- [x] Execution Log updated.

---

# 13. Required Report After Every Phase

Every coding-agent phase must end with:

### What was actually changed
Files/workflows and user-visible behavior.

### Why
Tracker issue IDs and user problem solved.

### What was deliberately not changed
Backend/domain behavior, deferred work, unrelated screens.

### Validation
Commands, tests and manual scenarios.

### Remaining issues
Unresolved or newly discovered follow-ups.

### Next step
One coherent next phase/sub-phase.

---

# 14. Execution Log

## 2026-08-14 â€” Initial Mobile Product Audit

**Type:** Discovery/audit
**Code changed:** No

### Established findings

- Keep one app with separate Patient and Practitioner experiences.
- Main problem is workflow/product architecture, not the one-app structure.
- Practitioner Schedule/Availability is the highest-priority workflow problem.
- Practitioner Home is too dashboard/module-oriented and repeats content/actions.
- Product localization requires a dedicated cleanup.
- Backend terminology leaks into UI.
- Patient experience has a stronger base but still needs workflow simplification.
- Finance, notifications, messages and settings need human mental models.
- Existing backend session/operational authority must be preserved.
- Sawiyaa should keep its own visual identity while learning from competitor workflows.

### Next action

Start **Phase UX-0**, then **Phase UX-1 Practitioner Schedule** as the reference workflow for the rest of the mobile redesign.

---

## 2026-08-15 â€” Phase UX-0A/UX-0B Product Foundation Finalization

**Type:** Documentation/foundation finalization
**Code changed:** No production code

### Decisions recorded

- Patient primary navigation: `Home | Discover | Sessions | Messages | More`.
- Practitioner primary navigation: `Home | Schedule | Sessions | Messages | More`.
- Notifications are a global header utility, not a primary tab; Notification Settings live under More â†’ Settings.
- Canonical vocabulary finalized for Schedule, Discover, Specialist, History, Transactions, Earnings, Transfers, Wallet, notification settings/channels, and human timezone presentation.
- Error mapping boundary finalized as diagnostic classification â†’ localized message â†’ optional action. Raw backend `message`/`error` is diagnostic only.
- UX-1 Schedule decisions finalized: Today default, day-first workflow, All/30/60 filter, context preservation, secondary recurrence, human timezone, and client-generated discrete slots for custom ranges.

### Baseline recorded

- Jest: 30 suites, 28 passing, 2 failing; 201 tests, 198 passing, 3 failing.
- `validate:i18n`: 2,236 existing issues.
- ESLint: 0 errors, 137 warnings.
- Policy: known legacy baseline + no regression + touched-scope cleanup.

### Focused contract check

`AvailabilityWeekSlot` exposes `isBookedOrReserved`, `canEdit`, `canRemove`, and `reasonCode`, but no booking/session identifier or safe relation to `/(practitioner)/sessions/[id]`. Direct booked-slot navigation is therefore **not currently supported** and remains a UX-1 limitation. No unsafe relationship was invented.

### Remaining work

- UX-1 Practitioner Schedule implementation and validation remain TODO.
- Current-screen navigation migration, translation migration, centralized mapper implementation, and visual redesign remain TODO.
- Legacy i18n issues remain separate cleanup; touched UX-1 scope must be complete in AR and EN.

### Next action

Start **Phase UX-1 â€” Practitioner Schedule Reference Workflow**.

---

## 2026-08-15 â€” Phase UX-0C Documentation Consistency Fix

**Type:** Documentation consistency cleanup
**Code changed:** No production code

### Completed

- Repaired unambiguous UTF-8/mojibake content in `DESIGN.md`, including the Arabic brand and tagline, typographic symbols, and `clichÃ©s`.
- Updated `DESIGN.md` scope to govern the first-class Patient and Practitioner experiences in Sawiyaa Mobile.
- Removed the obsolete generic Phase 0â€“8 roadmap and established the tracker/design source-of-truth boundary.
- Verified current session authority wording against the client contracts: the `operational` contract and endpoint-specific capabilities are authoritative; legacy/display-only `status` or `presentationStatus` fields are not, and `joinAvailability` is not the current contract.
- Reconciled decision-level statuses: UX-ARCH-001, UX-ARCH-002, UX-COPY-001, UX-PR-IA-001, and UX-PT-IA-001 are now DONE. Their UI/navigation/copy migrations remain TODO.
- Updated Current Priority so Practitioner Schedule is the active P0 execution priority.

### Validation

- `git diff --check` passed.
- Focused searches confirmed no mojibake patterns remain in `DESIGN.md`, no obsolete `### Phase 0`â€“`### Phase 8` roadmap remains, and the contradictory old-brand wording is gone.

### Next action

Start **Phase UX-1 â€” Practitioner Schedule**.

---

## 2026-08-15 â€” Phase UX-1A Practitioner Schedule Day View Foundation

**Type:** Production UI implementation
**Code changed:** Practitioner Schedule route, schedule view-model/components, editor context bridge, translations, and focused tests

### Implemented

- Replaced the practitioner availability week-card overview with a day-first Schedule foundation: current supported week, selected day, actual slots, duration filter, summary, status rows, empty state, Add Times CTA, and low-priority timezone context.
- Added local All / 30 / 60-minute filtering and chronological slot sorting without additional network requests.
- Mapped only backend-provided slot state to Available, Booked, or Not editable; booked slots do not navigate to Session Details.
- Added Arabic/English Schedule copy and renamed the practitioner tab and More entry from Availability to Schedule.
- Added the minimal editor bridge for selected `dayOfWeek`, active duration, and return-to-Schedule behavior after create/save.
- Follow-up runtime fix: guarded slot derivation until matching week details exist, preventing an initial-render `undefined.slots` crash.

### Validation

- Focused Schedule view-model Jest suite: 5 tests passed.
- Follow-up focused Schedule view-model suite: 6 tests passed, including unavailable week-details protection.
- `npm run validate:changed-types`: passed; existing repository errors outside this phase: 102.
- Targeted ESLint: 0 errors, 0 warnings on the changed Schedule files.
- AR/EN JSON parse and required touched-key check: passed.
- Web bundle completed successfully.

### Visual validation

**NOT VISUALLY VALIDATED.** The web route was blocked before Schedule mounted by the existing Root Layout/AuthProvider navigation error: `Attempted to navigate before mounting the Root Layout component`.

### Remaining work

- Inspect real populated and empty Schedule states in Arabic RTL and English LTR at compact and typical phone widths.
- Keep UX-PR-SCH-001 through UX-PR-SCH-005 IN_PROGRESS until rendered QA completes.
- Add Times redesign, recurrence, custom ranges, broader accessibility regression coverage, and full navigation migration remain TODO.

### Next action

Resolve or bypass the existing visual QA runtime blocker, complete Schedule visual inspection, then begin **UX-1B â€” Add/Edit Times redesign**.

## 2026-08-15 â€” UX-1A-FIX Practitioner Schedule Visual Repair

**Type:** Focused production UI repair; no backend/API/business-rule changes.

### Implemented

- Replaced the Schedule day strip's large card treatment with compact day buttons, explicit selected-day border/indicator, tighter spacing, and a lighter All / 30 / 60 segmented control.
- Tightened Schedule summary, empty-state spacing, Add Times hierarchy, and timezone presentation. Arabic timezone copy now uses the human wording `Ø§Ù„Ø£ÙˆÙ‚Ø§Øª Ø¨ØªÙˆÙ‚ÙŠØª {{timezone}}`.
- Repaired the Add/Edit Times slot grid with measured card width, a safe minimum slot width, two columns at compact widths, and three columns only when the wider layout can fit them. Three-column ranges use a compact vertical treatment so long localized time strings remain readable. Existing selection, protection, save, and navigation logic is unchanged.
- Added focused layout regression coverage for 360 px, 430 px, and an insufficient-width fallback.

### Validation

- Focused Jest: 2 suites passed, 9 tests passed.
- `npm run validate:changed-types`: passed; existing repository errors outside this phase: 102.
- Targeted ESLint: passed with 0 errors and 0 warnings.
- Touched AR/EN locale JSON parse: passed.
- `git diff --check`: passed; only existing LF-to-CRLF normalization warnings were reported.

### Visual validation

- Actual Expo web UI rendered and inspected with authenticated mock API fixtures at 360 px and 430 px.
- Reviewed Arabic populated Schedule screenshot: `schedule-auth-360.png`.
- Reviewed English populated Schedule screenshot: `schedule-en-430.png`.
- Reviewed Arabic editor screenshot at compact width: `editor-ar-360.png`; two-column slots were readable, evenly spaced, and showed no overlap.
- Reviewed English editor screenshot at typical width: `editor-en-430-fixed.png`; three-column slots wrapped cleanly with no clipping or overlap.
- Real backend requests were not available in this local browser run and emitted unrelated 401 responses; the target UI itself rendered successfully with the focused fixtures.

### Tracker state

- Completed UX-1.1 through UX-1.6 and UX-1.10 through UX-1.13.
- UX-1.7 Add Times redesign, UX-1.8 custom ranges, and UX-1.9 recurrence remain open. UX-1B items were not started.

### Next action

Begin **UX-1B â€” Add/Edit Times redesign**.

## 2026-08-15 â€” UX-1A-FIX Warm Surface Correction

**Type:** Focused visual correction for Practitioner Schedule and the current Add/Edit Times editor.

### Implemented

- Changed only screen-local unselected controls and containers from raised white surfaces to `theme.colors.background` (the warm `#F7F4EE` page token).
- Updated Schedule day buttons, duration segments, week navigation arrows, editor duration/day controls, the slot-grid container, unselected slot buttons, and the editor Cancel button.
- Preserved selected teal/soft-selected states, borders, protected-slot opacity, primary CTA styling, and all scheduling logic.
- Global theme semantics, `surface.card`, shared `Card`, and shared `Button` implementations were not changed.

### Validation

- Focused Jest: 2 suites passed, 9 tests passed.
- Targeted ESLint: passed with 0 errors and 0 warnings.
- `npm run validate:changed-types`: passed; existing repository errors outside this phase: 102.
- Targeted AR/EN Schedule locale validation remained passed.

### Visual validation

- Rendered and inspected the actual Schedule and Add/Edit Times screens at compact 360 px with authenticated mock API fixtures.
- Screenshots reviewed: `schedule-warm-360.png` and `editor-warm-360.png`.
- Confirmed continuous warm surfaces, visible soft borders, readable slots, selected teal states, and preserved primary actions.

### Remaining work

- No unrelated screens or global surfaces were changed.
- UX-1B Add/Edit Times redesign remains the next product phase.

### Next action

Proceed to **UX-1B â€” Add/Edit Times redesign** only when explicitly started.

## 2026-08-15 â€” UX-1B-FINAL Practitioner Schedule + Add/Edit Times Product Completion

**Type:** Focused production UI implementation; no backend/API/business-rule changes.

### Implemented

- Finalized the Practitioner Schedule hierarchy with full weekday labels, a horizontally scrollable day strip, white week navigation and duration controls, status-aware white slot rows, compact empty state, clear Add Times CTA, and human localized timezone presentation.
- Rebuilt the Add/Edit Times editor around one selected day with the same full-name day strip, grouped Morning/Afternoon/Evening slot sections, responsive two-/three-column layout, explicit selected/protected states, custom range inputs that generate existing discrete 30/60-minute slots, selected count, Save times, and Cancel.
- Preserved selected-day, week, duration, return-to-Schedule, protection, booked-slot, and existing create/update payload behavior.
- Added focused view-model, range-generation, and responsive-layout coverage plus the required AR/EN copy.

### Validation

- Focused Jest: 3 suites passed, 22 tests passed.
- Targeted ESLint: 0 errors and 0 warnings on changed Schedule/editor files.
- `npm run validate:changed-types`: passed; 102 existing repository errors remain outside this phase.
- AR/EN JSON parse and required touched-key validation: passed.
- `git diff --check`: passed; only existing LF-to-CRLF normalization warnings were reported.

### Visual validation

- Rendered and inspected the actual Expo web UI with authenticated mock API fixtures at compact mobile widths.
- Reviewed:
  - `C:/Users/IT/.codex/visualizations/2026/08/15/01a004d4-c139-7b22-89dc-0071fe4bcfd1/schedule-ar-populated-360.png`
  - `C:/Users/IT/.codex/visualizations/2026/08/15/01a004d4-c139-7b22-89dc-0071fe4bcfd1/schedule-ar-empty-360.png`
  - `C:/Users/IT/.codex/visualizations/2026/08/15/01a004d4-c139-7b22-89dc-0071fe4bcfd1/schedule-en-populated-390.png`
  - `C:/Users/IT/.codex/visualizations/2026/08/15/01a004d4-c139-7b22-89dc-0071fe4bcfd1/editor-ar-selected-360.png`
  - `C:/Users/IT/.codex/visualizations/2026/08/15/01a004d4-c139-7b22-89dc-0071fe4bcfd1/editor-ar-selected-slots-360.png`
  - `C:/Users/IT/.codex/visualizations/2026/08/15/01a004d4-c139-7b22-89dc-0071fe4bcfd1/editor-en-430.png`
- Real backend requests were unavailable in this local browser run and emitted unrelated 401 responses; the target screens rendered successfully with the focused fixtures.

### Deliberately not changed

- No backend/API contracts, business rules, recurrence flow, global theme semantics, `surface.card`, shared Card/Button primitives, or unrelated screens were changed.

### Remaining work

- UX-PR-SCH-007 / UX-1.9 recurrence remains intentionally open for a separate phase.
- UX-1.8 remains open as a separate tracker item until the custom-range section receives a dedicated scrolled visual capture against the fixture state; its discrete-slot generation and validation are implemented.
- Broader device-native visual coverage and real-backend end-to-end validation remain follow-up work.

### Next action

Do not start recurrence until the Schedule and Add/Edit Times workflow is accepted as the reference production flow.

## 2026-08-15 â€” UX-1 Schedule Compact Availability Period Presentation

**Type:** Focused Schedule content-presentation improvement; no backend/API/business-rule changes.

### Implemented

- Replaced standalone full-width Schedule slot cards with one compact white daily schedule surface containing grouped period rows.
- Reused `groupAvailabilityPeriods()` so consecutive compatible slots merge while gaps, duration changes, booked boundaries, and protected boundaries remain split.
- Integrated the period count, time range, appointment count/duration, and localized Available / Booked / protected status into each schedule section.
- Left the approved day strip, week navigator, duration filter, page colors, empty state, Add Times CTA, editor, and recurrence flow unchanged.

### Validation

- Focused Jest: 4 suites passed, 27 tests passed.
- Targeted ESLint: passed with 0 errors and 0 warnings.
- `npm run validate:changed-types`: passed; 102 existing repository errors remain outside this phase.
- AR/EN Schedule locale-key validation: passed.
- `git diff --check`: passed; only existing LF-to-CRLF normalization warnings were reported.

### Visual validation

**NOT VISUALLY VALIDATED.** The local Expo server was reachable, but the browser had no authenticated practitioner fixture/session. Direct Schedule navigation redirected to the public landing screen, so no valid post-change Arabic or English Schedule screenshot was captured.

### Remaining work

- Render and inspect the populated Schedule at approximately 360dp in Arabic and English, including a booked/protected boundary where fixture data supports it.
- Do not mark this visual correction complete until screenshot inspection is available.

## 2026-08-15 â€” UX-1 Schedule Copy and Hierarchy Micro-Polish

**Type:** Focused Schedule copy polish; no workflow, layout, backend, or business-rule changes.

### Implemented

- Simplified the integrated Schedule section heading to `Times` / `Ø§Ù„Ø£ÙˆÙ‚Ø§Øª`.
- Removed the redundant period-count label from the section header.
- Added i18next pluralized period metadata: one appointment shows only the duration; multiple appointments show count plus duration in Arabic and English.
- Removed GMT/UTC offsets from the main Schedule timezone label while preserving dynamic city resolution from the availability/account timezone.

### Validation

- Focused Jest: 3 suites passed, 25 tests passed.
- Targeted ESLint passed.
- `npm run validate:changed-types` passed; 102 existing repository errors remain outside this phase.
- Schedule copy/plural-key validation and `git diff --check` passed.

### Visual validation

**NOT VISUALLY VALIDATED.** The local app route redirected to the public landing screen because no authenticated practitioner session was available in the browser.

### Deliberately not changed

- No grouping logic, layout, colors, day strip, week navigator, duration filter, CTA, Add/Edit Times editor, recurrence flow, backend/API contract, or business behavior was changed.

## 2026-08-16 â€” UX-1.8 Visual QA Environment Unblock and Acceptance

**Type:** Focused test-only visual QA harness; no production auth, API, or workflow changes.

### Implemented

- Added a deterministic practitioner availability fixture at `scripts/visual-qa-practitioner-availability-fixture.mjs` with approved practitioner session data, Riyadh timezone, populated periods, available slots, booked time, and protected time.
- Added `scripts/visual-qa-practitioner-availability.mjs` to inject the fixture only into an isolated Playwright browser context, intercept local visual-QA API responses, render the protected Schedule and Add/Edit routes, and capture the UX-1.8 states.
- Kept production authentication unchanged. The harness supplies the persisted practitioner session and fake API responses only during the test run; it does not add a production bypass or weaken route guards.

### Validation

- Focused Jest: 4 suites passed, 28 tests passed.
- Targeted ESLint for the visual-QA runner: passed.
- `npm run validate:changed-types`: passed; 102 existing repository errors remain outside this phase.
- `git diff --check`: passed; only existing LF-to-CRLF normalization warnings were reported.
- `npm run validate:i18n`: remains a pre-existing baseline failure with 2,244 repository-wide missing-key issues.

### Visual validation

- Rendered and inspected the actual Expo web UI with the test-only practitioner fixture at AR/RTL 360dp, EN/LTR 390dp, and EN/LTR 430dp.
- Accepted the Schedule and Add/Edit Times gate for the initial range-first view, Add period form, valid preview, invalid boundary, protected/booked conflict, expanded individual times, selected times, and Save action.
- Fresh evidence is stored in `test/ux/UX-1.8/`; no prior/pre-range-first screenshots were used for this acceptance.

### Remaining work

- UX-1.9 recurrence remains intentionally open for a separate phase.
- Real-backend/device-native visual coverage remains follow-up work; this task unblocked and completed the local fixture-backed visual gate.

### Next action

Proceed to the next approved Practitioner Schedule phase only after preserving the current range-first workflow; do not start recurrence until explicitly requested.

## 2026-08-16 â€” UX-1.9 Recurring Availability as a Secondary Flow

**Type:** Focused recurrence workflow completion using the existing backend preview/confirm contract; no backend/API or recurrence-model changes.

### Implemented

- Verified that the backend repeats the entire source week into eligible future Sunday weeks as draft schedules, while preserving its preview classifications and protected/booked safety rules.
- Added a quiet `Repeat weekly schedule` / `ØªÙƒØ±Ø§Ø± Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹` action below the primary Schedule Add times CTA.
- Reworked target selection around localized human week ranges, selectable future weeks, locked/protected weeks, and conflict wording without exposing IDs, enums, or reason codes.
- Reworked review around eligible-week and copied-time summaries, meaningful conflict exceptions, explicit confirmation, safe failure copy, and return to Schedule after completed confirmation.
- Preserved the existing source week ID, target dates, operation ID, idempotency key, preview/confirm endpoints, and cache invalidation/refetch behavior.
- Extended the existing visual-QA fixture/runner with selectable, blocked, conflict, preview, confirmation, success, AR/RTL, and EN/LTR recurrence states.

### Validation

- Focused Jest: 6 suites passed, 36 tests passed, including target mapping, selection states, preview summary, API payloads, cache invalidation, and AR/EN touched keys.
- Targeted ESLint: passed with 0 errors and 0 warnings.
- Visual-QA runner: passed for AR/RTL 360dp, EN/LTR 390dp, and EN/LTR 430dp.
- `npm run validate:changed-types`: passed; 103 existing repository errors remain outside this phase.
- `npm run validate:i18n`: remains a repository-wide baseline failure with 2,258 missing-key issues; focused AR/EN recurrence keys passed in Jest.
- `git diff --check`: passed; only existing LF-to-CRLF normalization warnings were reported.

### Visual validation

- Rendered and inspected fresh recurrence screenshots in `test/ux/UX-1.9/`, including Schedule entry point, target selection, conflict/protected targets, review, inline confirmation, and post-confirm Schedule success.
- Confirmed the recurrence action remains visually secondary to Add times and that the accepted Schedule/Add/Edit Times hierarchy is unchanged.

### UX-1 exit gate

Satisfied: UX-1.1 through UX-1.14 are complete, and the Practitioner can understand a selected week/day, safely add/edit times, and optionally repeat the source week into future weeks with server-authoritative preview and confirmation.

### Remaining work

- Real-backend/device-native recurrence coverage remains follow-up work; local visual acceptance uses the isolated test-only practitioner fixture.
- Broader translation debt and unrelated repository baseline failures remain outside this phase.

### Next action

Proceed to **UX-2 â€” Practitioner Home**. Keep recurrence as a secondary Schedule workflow.

## 2026-08-16 â€” UX-2A Practitioner Shell + Operational Home Foundation

**Type:** Focused Practitioner navigation migration and Home workflow implementation; no backend/API contract or Patient experience changes.

### Implemented

- Completed the Practitioner bottom-tab ownership migration as `Home | Schedule | Sessions | Messages | More` in Arabic and English, including visible Messages ownership and retained deep-link/stack routes.
- Removed Schedule, Sessions, and Messages rows from Practitioner More; Finance, account/profile, notifications, support, instant-booking configuration, promo codes, and logout remain secondary destinations.
- Replaced the module dashboard Home composition with compact greeting/date context, one backend-authoritative next-session/action surface, conditional account/required-action notice, concise Today summary, and a useful no-upcoming state.
- Removed the permanent healthy-account readiness card, Instant Booking card, Finance card, and generic Quick Access grid from Home. Healthy readiness is hidden; account/action issues remain actionable.
- Added a focused Home view-model for next-session selection, required-action precedence, display-only Today counting in the practitioner timezone, and backend capability-driven CTA labels.
- Added Arabic/English Home and tab copy, including localized status mapping for administrative review without exposing raw backend enums.
- Extended the existing practitioner visual-QA fixture/runner with later-today, joinable/current, empty, and required-action Home states. Production auth and API contracts were untouched.

### Validation

- Focused Jest: 8 suites passed, 49 tests passed, including Home derivation, backend action authority, navigation ownership, duplicate More cleanup, Schedule/Editor/recurrence regressions, and touched AR/EN keys.
- Targeted ESLint: passed with 0 errors and 0 warnings for changed Home, shell, More, view-model, tests, and visual-QA files.
- `npm run validate:changed-types`: passed; 101 existing repository errors remain outside this phase.
- Practitioner visual-QA runner: passed for AR/RTL 360dp, EN/LTR 390dp, and EN/LTR 430dp.
- `git diff --check`: passed; only existing LF-to-CRLF normalization warnings were reported.
- Repository-wide `npm run validate:i18n`: remains a baseline failure with 2,268 issues; no unrelated translation debt was changed. The only remaining `practitioner.home` matches are pre-existing Instant Booking copy outside this task.

### Visual validation

- Rendered and inspected fresh Home screenshots in `test/ux/UX-2A/`: AR/RTL 360 next-session, joinable/current, empty, and urgent states; EN/LTR 390 next-session and empty states; EN/LTR 430 next-session and empty states.
- Confirmed the bottom navigation visibly reads `Home | Schedule | Sessions | Messages | More` in EN and `Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© | Ø§Ù„Ø¬Ø¯ÙˆÙ„ | Ø§Ù„Ø¬Ù„Ø³Ø§Øª | Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ | Ø§Ù„Ù…Ø²ÙŠØ¯` in AR, with no Quick Access duplication, no healthy-account card, no repeated next session, a single clear CTA, compact Today summary, and header-only notifications utility.
- Existing Schedule/Add/Edit and recurrence screenshots were rerun in the same harness to ensure this shell/Home work did not regress the accepted UX-1 workflow.

### Remaining work

- UX-PR-HOME-002 remains open for the complete context matrix, including instant-request and offline behavior plus any session-soon/device-native confirmation that needs real backend coverage.
- Practitioner Sessions redesign, broader More redesign, Patient navigation migration, global error mapping, and repository-wide translation debt remain outside UX-2A.

### Next action

Proceed to **UX-2B â€” Practitioner Home context-state completion and final polish**.

## 2026-08-16 â€” UX-2B Practitioner Home Context States + Final Polish

**Type:** Focused Practitioner Home completion; no backend/API contract, Schedule, or secondary-workflow redesign.

### Implemented

- Removed the repeated next-session time from the Today summary; the summary now adds only today/upcoming information and is omitted when both are empty.
- Restored Arabic plural selection through the i18n layer so counts use the locale-specific forms such as `Ø¬Ù„Ø³ØªØ§Ù† Ø§Ù„ÙŠÙˆÙ…`.
- Kept the single Home priority model: required action, joinable/current session, next upcoming session, useful empty state, then compact secondary summary.
- Tightened only the accepted next-session card's internal padding/gap while preserving patient, time, duration, status, CTA, and touch-target sizing.
- Applied the existing locale direction to the Practitioner tab bar. EN remains Home | Schedule | Sessions | Messages | More; AR is physically right-to-left while retaining the same logical route/accessibility order.
- Added a visual-QA physical tab-order assertion and retained existing deterministic Home, Schedule, Editor, and recurrence fixture coverage.
- Did not add Instant Booking or offline Home UI because no separate Home action contract or Home-specific offline infrastructure is available to expose safely.

### Validation

- Focused Jest: 2 suites passed, 14 tests passed, including Home priority, backend CTA authority, duplicate-summary suppression, Arabic plural copy, navigation ownership, and More cleanup.
- Targeted ESLint: passed with 0 errors and 0 warnings for changed Home, shell, view-model, tests, and visual-QA files.
- `npm run validate:changed-types`: passed; 101 existing repository errors remain outside this phase.
- Practitioner visual-QA runner: passed AR/RTL 360dp, EN/LTR 390dp, and EN/LTR 430dp, including physical tab-order assertions and the accepted Schedule/Editor/recurrence journey.
- `git diff --check`: passed; only existing LF-to-CRLF normalization warnings were reported.
- Repository-wide `npm run validate:i18n` remains a baseline failure with 2,254 issues; no unrelated translation debt was changed.

### Visual validation

- Rendered and inspected fresh screenshots in `test/ux/UX-2A/`: AR/RTL 360 later-today, joinable/current, required-action, and no-upcoming; EN/LTR 390 and 430 next-session and no-upcoming.
- Confirmed the next-session time is not repeated below the primary card, the no-upcoming state has no redundant Today section, the Arabic two-session copy is localized, and Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© is physically rightmost.

### Remaining work

- UX-2 is complete. Instant Booking remains owned by its existing Practitioner queue flow; Home-specific offline handling remains deferred until a supported app-wide network-state contract exists.
- Practitioner Sessions is now the next active product phase. Broader navigation migration, global error mapping, and repository-wide translation debt remain outside UX-2.

### Next action

Proceed to **UX-3 â€” Practitioner Sessions**.

# UX-3 Execution Log — Practitioner Sessions

- Implemented UX-PR-SES-001, UX-PR-SES-002, and UX-PR-SES-003.
- Replaced the technical filter wall with Upcoming | History; required follow-up remains operationally prioritized and history is sorted chronologically.
- Simplified practitioner session cards to patient, date/time, duration, human status, and one strongest action.
- Simplified session detail hierarchy to who → when → current state → primary action → optional quick facts; added an in-screen Review session CTA without inventing a backend mutation.
- Preserved backend-authoritative join, prepare, review, no-show, room-close, chat, invalidation, and external-room behavior.
- Added deterministic Sessions fixtures and captured AR/RTL 360 Upcoming, joinable, action-required, History, empty Upcoming, and both detail states; EN/LTR 390 and 430 Upcoming, History, and joinable detail.
- Validation: focused Jest passed (practitioner-sessions-view-model, practitioner-home-view-model); targeted ESLint passed with no errors; TypeScript has no Sessions-related errors. Repository-wide npm run validate:i18n remains a pre-existing baseline failure with 2,227 issues, including unrelated locale debt.
- Visual validation: PASSED via the existing authenticated Playwright harness; screenshots are in test/ux/UX-3/.
- Final micro-polish: removed the Sessions intro copy, removed duplicate priority status labels from cards, and kept only non-redundant detail action hints.
- Final validation: AR/EN locale JSON parses successfully; the existing visual harness passed again at AR/RTL 360px and EN/LTR 390px/430px.
- Remaining work: global UX issues, repository-wide translation cleanup, and cross-product Sessions consistency remain open.
- Next step: UX-4 — Practitioner Finance / Messages / Notifications / More.

# UX-4A Execution Log — Practitioner Messages / Unified Inbox

- Implemented UX-PR-MSG-001: Practitioner Messages now presents one canonical conversation inbox with human counterpart identity, latest preview, latest activity, optional human context, compact unread count, and authoritative activity ordering.
- Removed Practitioner-only technical lane tabs, intro/action walls, and elevated card repetition; patient messaging presentation and backend conversation contexts remain unchanged.
- Preserved the existing canonical conversation/detail/message APIs, realtime/read/send/retry behavior, older-message paging, session-detail message route, and bottom-tab unread badge using the canonical unread summary.
- Added focused inbox view-model coverage, AR/EN accessibility labels, compact loading skeletons, concise empty/error states, and authenticated visual-QA fixture coverage for inbox, unread, empty, thread, composer, and Session Detail → Messages routing.
- Validation: 34 focused messaging tests passed; targeted ESLint passed; touched locale JSON parsed; messaging TypeScript errors are clear. Repository-wide TypeScript/i18n baselines still contain unrelated existing errors.
- Visual validation: PASSED via the existing authenticated Playwright harness at AR/RTL 360px and EN/LTR 390px/430px; screenshots are in test/ux/UX-4A/.
- UX-MSG-001 remains open because the shared Patient inbox and cross-product messaging migration are not complete.
- Remaining UX-4 work: Practitioner Finance, Notifications, and More. Next step: UX-4B — Practitioner Finance.

# UX-4B Execution Log — Practitioner Finance

- Implemented UX-PR-FIN-001: Finance now answers available balance, under review, earnings, transferred amount, recent activity, and transfer history without exposing Ledger, settlement, or accounting as user-facing destinations.
- Consolidated the Practitioner Finance flow into Finance → Earnings, Transfers, and Transactions; removed duplicate Wallet/Ledger/Settlements entries from More while preserving Finance under More.
- Replaced the dashboard tile wall with a dominant available balance, compact supporting summaries, divider-based activity rows, localized transfer statuses, and progressive transfer gross/adjustment/net detail.
- Enforced central money formatting through the existing money contract; currency remains sourced per wallet/entry/transfer and no mixed-currency aggregation or client-side financial decisions were added.
- Added focused AR/EN Finance tests, localized finance copy, accessibility labels, deterministic authenticated Finance fixtures, and overview/transactions/transfers/empty visual captures.
- Validation: 12 focused tests passed; targeted ESLint passed; changed-code TypeScript gate passed with 99 unrelated repository errors; AR/EN JSON parsed; visual runner passed at AR/RTL 360px and EN/LTR 390px/430px; `git diff --check` passed.
- Repository-wide i18n validation remains baseline debt with 2,188 issues; touched Finance keys are present and exercised by focused tests/visual QA.
- Remaining UX-4 work: Practitioner Notifications and More cleanup. Next step: UX-4C — Practitioner Notifications.

# UX-4C Execution Log — Practitioner Notifications

- Implemented UX-PR-NOTIF-001 for the Practitioner experience: the global Notification Center now presents human event titles/bodies, context, timestamps, unread state, authoritative unread count, and actions only when a safe destination exists.
- Added supported Practitioner event-to-channel settings under More → Settings → Notification settings, using only backend-provided event rows and supported IN_APP, PUSH, and EMAIL channels. Patient notification behavior and Patient/shared tracker items remain out of scope.
- Added safe exact internal deep-link handling for session/message/support/care-chat targets, with message-lane fallback only when the backend does not provide an exact target; raw event/channel/backend vocabulary is never shown.
- Preserved notification APIs, settings batch-update contract, backend authority, global bell ownership, and the non-tab information architecture.
- Validation: 17 focused notification/navigation/route-hardening tests passed; targeted ESLint passed with one pre-existing SettingsScreen array-style warning; changed-code TypeScript gate passed with 97 unrelated repository errors; touched locale JSON and focused keys parsed; `git diff --check` passed.
- Visual validation: PASSED through the authenticated Playwright harness at AR/RTL 360px and EN/LTR 390px/430px. Feed and settings screenshots are in `test/ux/UX-4C/`; the session notification deep link was verified to land on `/sessions/session-joinable`.
- Repository-wide i18n validation remains baseline debt with 2,128 existing issues; focused notification keys are present and exercised. Remaining UX-4 work: Practitioner More cleanup. Next step: UX-4D — Practitioner More + final Practitioner cleanup.

# UX-4C-FIX Execution Log — Practitioner Notification Settings Hierarchy

- Corrected the Practitioner notification settings presentation model from flat event/channel records to `category → event → supported channels`; each event title now renders once while each original backend preference row remains independently mutable.
- Polished the Notification Center summary to `{{count}} unread` / `{{count}} غير مقروءة`, kept Mark all read as a compact secondary action, and verified RTL filter order through the shared direction helper.
- Preserved notification feed structure, unread authority, read/deep-link behavior, settings API/batch mutation semantics, backend enums, Patient notifications, authentication, and UX-4D More scope.
- Validation: 17 focused tests passed; targeted ESLint passed; changed-code TypeScript gate passed with 97 unrelated repository errors; locale JSON parsed; visual harness passed at AR/RTL 360px and EN/LTR 390px/430px; `git diff --check` passed.
- Visual validation: PASSED. Screenshots are in `test/ux/UX-4C-FIX/`. UX-PR-NOTIF-001 remains DONE; shared UX-NOTIF-001/002 remain TODO for incomplete Patient scope. Next step remains UX-4D only when explicitly started.

# UX-4D Execution Log — Practitioner More + Final Practitioner Experience Cleanup

- Implemented UX-PR-MORE-001 and closed the Practitioner More cleanup: More is now a secondary-work hub with grouped Profile, Earnings/work tools, Settings, Support, and Log out rows.
- Removed duplicate primary destinations and notification ownership from More. Home, Schedule, Sessions, Messages, and the global Notification Center remain in their existing owners; Notification settings remains under More → Settings.
- Replaced the More card wall with compact section headings, soft dividers, concise row subtitles, and a visually subordinate separated logout action. Preserved existing Earnings, Instant booking, Promo codes, Support, Settings, and logout routes/behavior.
- Cleaned directly linked Practitioner vocabulary: Profile / الملف الشخصي, Earnings / الأرباح, Instant booking / الحجز الفوري, Help grouping / المساعدة, Support / الدعم, and Log out / تسجيل الخروج. Removed the duplicate Earnings heading from the Earnings overview without changing data or route contracts.
- Validation: focused More/navigation, timezone-label, and Finance vocabulary tests passed (15 tests); targeted ESLint passed with 3 pre-existing unused-variable warnings in the touched Account screen; locale JSON parsed; visual-QA runner passed the Practitioner regression walkthrough at AR/RTL 360px and EN/LTR 390px/430px; `git diff --check` passed.
- Visual validation: PASSED. More full/lower screenshots plus More → Earnings and More → Settings → Notification settings are in `test/ux/UX-4D/`.
- Practitioner UX-4 is now closed for the current product-redesign scope. Shared/global issues and Patient work remain open; no Patient scope was changed.
- Next step: UX-5 — Patient Home & Discovery.

# UX-5A Execution Log — Patient Shell + Context-Aware Home

- Implemented the Patient primary navigation for UX-NAV-001 scope: Home, Discover, Sessions, Messages, and More. Notifications remains a header-bell destination, not a bottom tab; existing hidden stack routes and technical route names remain unchanged.
- Implemented UX-PT-HOME-001: Home now selects one primary surface from backend-provided next-session capabilities in this order: payment required, joinable/current, upcoming, then discovery when no next session exists.
- Implemented UX-PT-HOME-002: removed the generic Quick Actions row and the duplicate Messages entry from Patient More. Home now presents one contextual CTA; discovery, sessions, messages, and More are owned by the bottom tabs.
- Preserved backend authority: `operational.actions.canPay`, `operational.join.allowed`, and `operational.actions.canJoin` drive the Home state/CTA; no client-side payment or session lifecycle rules were added. Amount/currency is omitted when the next-session contract does not safely provide it.
- Added focused Patient Home state tests, tab/navigation assertions, Patient AR/EN copy, a test-only deterministic Patient Playwright fixture/runner, and tab-order validation. Practitioner screens were not redesigned.
- Validation: 16 focused Jest tests passed; targeted ESLint passed; changed-code TypeScript gate passed with 97 unrelated repository errors; locale JSON and focused keys parsed; Patient tab validator passed; Patient visual-QA passed at AR/RTL 360px and EN/LTR 390px/430px; `git diff --check` passed.
- Visual validation: PASSED. Required upcoming, joinable/current, payment-required, discovery-first, and final-tab screenshots are in `test/ux/UX-5A/`.
- Known limitation: current Patient Home/next-session contracts do not safely distinguish new versus returning Patients, so no fabricated history-based state was added. Shared/global UX issues remain open.
- Phase UX-5 remains IN_PROGRESS. Exact next step: UX-5B — Patient Discovery.

# UX-5B Execution Log — Patient Discovery

- Implemented UX-PT-DISC-001: Patient Discovery now uses `مختص / Specialist` vocabulary, including the Discover title, search placeholder, result states, profile fallback, and contextual matching copy. Specific practitioner credentials remain specific when supplied by the backend.
- Implemented UX-PT-DISC-002: consolidated the authenticated and public discovery list/filter workflow into shared `DiscoveryListScreen` and `DiscoveryFiltersScreen` components. Shell ownership remains role-specific: the authenticated Patient route keeps the bottom tabs and matching prompt, while public discovery keeps its back navigation.
- Added the target hierarchy: compact search, backend-ordered specialty categories, progressive category → sub-specialty filtering, one Filter action, compact result cards, pagination, human empty/error/loading states, and one View profile action. Search, category, filter, and result context remain in route params through navigation.
- Preserved backend authority and contracts: discovery continues to call `/public/practitioners`, sends the backend-supported `specialtyCategorySlug`, keeps existing pagination and pricing/currency fields, uses the central `PriceDisplay`, and does not infer booking availability from presence or incomplete slot data. Booking/profile detail and matching questionnaire behavior were not redesigned.
- Added focused discovery view-model/vocabulary tests and deterministic Patient Discovery Playwright fixtures/screenshots covering AR/RTL 360px initial/search/category/filter/no-results states and EN/LTR 390px/430px initial/populated/filtered states. Public and authenticated routes share the same core implementation.
- Validation: 8 focused Jest tests passed; targeted ESLint passed; changed-code TypeScript gate passed with 95 unrelated repository errors; locale JSON parsed; focused Discovery i18n keys passed the locale validator; Patient Discovery visual-QA passed; `git diff --check` passed. Repository-wide i18n validation remains baseline debt outside the touched Discovery keys.
- Visual validation: PASSED. Screenshots are in `test/ux/UX-5B/`, including `patient-discovery-ar-360-initial.png`, `patient-discovery-ar-360-search-results.png`, `patient-discovery-ar-360-specialty-selected.png`, `patient-discovery-ar-360-filters-open.png`, `patient-discovery-ar-360-filtered.png`, `patient-discovery-ar-360-no-results.png`, and the corresponding EN 390px/430px states.
- Remaining work: new-versus-returning Patient Home state remains open because the current contract does not safely expose that distinction. Patient Booking is untouched and is the exact next phase.
- Phase UX-5 is fully complete for its scoped Home + Discovery work; next step: UX-6 — Patient Booking.

# Practitioner Vocabulary Correction Log

- Updated the Practitioner money destination to **الأرباح / Earnings** across More, the Finance overview title, loading/error copy, and visual-QA assertions.
- Preserved the \`app/(practitioner)/finance\` route, backend/API contracts, ledger/settlement implementations, money-screen layout, and Patient Wallet vocabulary.
- Validation: focused AR/EN vocabulary tests, targeted lint, locale JSON parsing, visual-QA assertions, and \`git diff --check\`.
- Next step: UX-4C — Practitioner Notifications.

# UX-6 Execution Log — Patient Booking

- Closed UX-PT-BOOK-001, UX-PT-BOOK-002, and UX-PT-BOOK-003. Patient booking now follows Specialist → Duration → Appointment → Review → Payment/entitlement → Confirmation.
- Added a dedicated duration step using only backend-published 30/60 minute options and centralized money formatting. Appointment selection now shows nearest available dates first, bookable slots only, one selected time, and a human timezone label. Package/entitlement remains secondary and appears only when supported; promo remains optional and backend-quoted.
- Simplified review, removed session identifiers/provider-facing payment vocabulary, preserved canonical payment capabilities/reconciliation, and routed successful payment return to a clear confirmation outcome.
- Added focused booking view-model tests, booking visual-QA fixture/runner, and AR/EN booking copy parity for touched keys. Preserved backend pricing, availability, session creation, payment, and reconciliation authority.
- Validation: focused Jest passed (4 tests); targeted ESLint passed; changed-code TypeScript gate passed with 95 unrelated repository errors; touched booking i18n keys passed focused parity checks; visual-QA screenshots were rendered and inspected at AR/RTL 360px and EN/LTR 390px/430px; `git diff --check` passed. Full repository i18n validation remains baseline debt (2056 existing issues).
- Remaining: new-versus-returning Patient state is still contract-limited; shared/global i18n debt remains open. Next step: UX-7 — Patient Sessions & Finance. Do not start UX-7 automatically.

## 2026-08-16 - Phase UX-7B Patient Wallet & Financial Activity

**Type:** Focused Patient Wallet/Financial Activity implementation and visual QA

### Implemented

- Completed UX-PT-FIN-001 and UX-PT-FIN-002.
- Reframed the Patient money destination as Wallet / المحفظة with an authoritative available balance first.
- Added compact recent activity and Transactions presentation using human financial meanings, explicit positive/negative amounts, dates, and useful payment statuses.
- Preserved separate currencies and suppressed only wallet rows explicitly linked to a payment record.
- Removed provider, gateway, ledger, and raw payment error language from the Patient money workflow.
- Kept Wallet under Patient More; no sixth bottom tab was added.

### Validation

- Focused wallet view-model Jest tests passed.
- Changed-code TypeScript gate passed; repository reports 95 pre-existing errors outside this phase.
- Focused AR/EN lint passed with no errors or warnings for touched wallet files.
- Playwright visual QA rendered AR RTL at 360px and EN LTR at 390px/430px for populated, refund/credit, transactions, empty, error, and loading states.
- Screenshots were visually inspected from `test/ux/UX-7B`.
- `git diff --check` completed without diff errors.

### Backend safety

- Wallet summary, wallet entries, and payment list endpoints/hooks/query keys were preserved.
- No payment, refund, credit, balance, currency, or mutation business rules moved to mobile.
- Presentation-only mappings use backend amount, currency, direction, timestamps, entry types, payment status, and explicit payment/session references.

### Next action

Start **Phase UX-8 - Shared Messaging / Notifications / Settings**. Do not start it automatically.

## 2026-08-16 - Phase UX-7A Patient Sessions

**Type:** Focused Patient Sessions implementation and visual QA

### Implemented

- Completed UX-PT-SES-001, UX-PT-SES-002, and UX-PT-SES-003.
- Replaced lifecycle tabs/filters with Upcoming and History.
- Ordered Upcoming by canonical backend action priority: review, join, payment, then nearest future session.
- Reduced cards to practitioner, date/time, duration, human status, and one strongest current action.
- Kept payment and join CTAs dependent on canonical operational capabilities.
- Restructured detail content around practitioner, timing, state, current action, messages, and progressive facts.
- Removed visible session codes, raw join errors, and provider/infrastructure terminology from the patient workflow.

### Validation

- Focused view-model Jest tests passed.
- Changed-code TypeScript gate passed; repository reports 100 pre-existing errors outside this phase.
- Focused AR/EN translation key parity check passed.
- Playwright visual QA rendered AR RTL at 360px and EN LTR at 390px/430px across upcoming, payment, joinable, history, empty, and detail states.
- Screenshots were visually inspected from `test/ux/UX-7A`.
- Full i18n validator remains blocked by the repository baseline (2,012 existing issues); ESLint remains blocked by the existing TypeScript resolver incompatibility.

### Deliberately not completed

- Wallet, financial history, and broader provider-internals cleanup remain open under Phase UX-7.
- Backend/API/session lifecycle behavior and unrelated Patient or Practitioner screens were not changed.

### Next action

Start **Phase UX-7B - Patient Wallet & Financial Activity**.

# UX-8A Execution Log — Patient Messages + Shared One-Inbox Completion

- Implemented UX-MSG-001 for Patient Messages: one canonical inbox now presents compact conversation rows ordered by backend activity, with human counterpart identity, latest preview, time, context, and authoritative unread count.
- Reused the shared Practitioner-proven inbox row, thread, message bubble, composer, loading, empty, retry, read, send, realtime, and pagination presentation paths. Removed Patient-only lane filters and the separate card/action wall without changing technical routes or APIs.
- Patient Session Detail continues to resolve the exact backend conversation ID and opens the same `/(patient)/messages/[id]` thread used by the inbox. Support conversations remain in that inbox and use the existing support creation route.
- Preserved canonical conversation/message endpoints, hooks, query keys, unread source, read/send/retry behavior, realtime subscriptions, pagination, authentication, and deep-link identifiers. No messaging business rule moved to mobile; mappings are presentation-only.
- Added Patient inbox view-model tests and an authenticated AR/RTL 360px plus EN/LTR 390px/430px visual-QA fixture covering populated/unread inbox, empty inbox, thread/composer, and Session Detail → Messages routing. Visual screenshots are in `test/ux/UX-8A/`.
- Validation: 11 focused messaging tests passed; targeted ESLint passed; visual runner passed; screenshots were inspected; changed-code TypeScript gate passed with 95 pre-existing repository errors; visual-QA scripts passed syntax checks; `git diff --check` completed without diff errors. Repository-wide i18n debt remains outside this phase.
- Remaining work: shared Patient Notifications/deep links, More/Settings, human timezone cleanup, and remaining raw copy remain in UX-8. Next step is **UX-8B — Patient Notifications + contextual deep links**; do not start it automatically.

# UX-8B Execution Log - Patient Notifications + Contextual Deep Links

- Implemented UX-NOTIF-001 for Patient Notifications: known session, message, payment, refund, and account events now render concise human AR/EN copy through a presentation-only mapper. Raw type slugs, channel names, and backend title/body fallbacks are not rendered.
- Implemented UX-NOTIF-002 for supported Patient targets: session notifications resolve to exact session detail, payment-required-style session actions preserve the accepted session payment route, and message notifications resolve to the canonical conversation thread only when a safe conversation identifier or exact internal href exists. Identifier-less/unsupported items remain informational without a chevron.
- Corrected Patient header ownership: the global Messages utility is suppressed for Patient because Messages is owned by the Patient bottom tab. The Patient tab, canonical thread routes, unread source, and Practitioner header behavior remain intact. The contextual headset action inside the Messages inbox remains a distinct start-support action and was not changed.
- Kept the Notification Center as a compact chronological activity feed: removed the push-device setup card from this activity surface, added useful All/Unread/Read filters, compact loading skeletons, accessible unread/read labels, and border/divider grouping instead of per-notification cards.
- Preserved `/notifications/me`, `/notifications/me/unread-count`, read/read-all mutations, React Query keys/invalidation, notification payloads, auth/session behavior, session/message/payment contracts, and backend-authoritative lifecycle/action behavior. No business rule moved into mobile; mappings and route allowlisting are presentation-only.
- Added focused Patient copy/route tests and an authenticated Playwright visual-QA fixture. Visual QA passed AR/RTL 360px and EN/LTR 390px/430px populated/empty states, no duplicate Patient header Messages owner, no raw event leakage, and session/message/payment deep-link assertions. Screenshots are in `test/ux/UX-8B/`.
- Validation: 43 focused Jest tests passed; targeted ESLint passed; changed-code TypeScript gate passed with 97 unrelated repository errors; Patient notification AR/EN keys aligned; visual runner passed; `git diff --check` passed. Full repository i18n validation remains existing baseline debt (2,004 issues).

### Deliberately not completed

- Patient More/Settings cleanup remains UX-8C and was not started.
- Notification APIs, unread/read semantics, pagination contract, backend lifecycle/payment authority, and unrelated Practitioner or Patient screens were not redesigned.

### Next action

Start Phase UX-8C - Patient More / Settings cleanup only when explicitly requested.

# UX-8C Execution Log - Patient More + Settings + Shared Product Cleanup

- Completed UX-PT-MORE-001 and UX-PT-MORE-002. Patient More now keeps only secondary destinations, removes the duplicate Notification Center and duplicated language/timezone/notification rows, keeps Wallet, Articles, Academy, Packages, Support, and the separate logout action, and preserves the existing primary bottom tabs.
- Removed the visible Patient technical profile ID. Profile and settings surfaces no longer render raw role/provider/API values or IANA timezone identifiers. Central timezone presentation now uses human localized labels such as Cairo time / توقيت القاهرة while the persisted IANA value and PATCH payload remain unchanged.
- Patient Settings owns language, timezone, and notification settings. Notification preferences are grouped as category -> event -> supported channels; each switch still updates the exact backend record and the existing PUT mutation sends the unchanged item list.
- Preserved support ownership: More opens the canonical Patient Messages support context, while the Messages inbox headset remains the distinct start-support action. Notification Center remains bell-owned and is not duplicated in More.
- Preserved `/settings/me`, `/settings/me/preferences`, `/settings/me/notification-preferences`, `/patients/me`, existing hooks/query keys, PATCH/PUT mutations, cache invalidation, locale persistence, timezone persistence, auth/logout, Wallet routes, content routes, and all backend-authoritative capabilities. No business rule moved from backend to mobile; only presentation grouping, human labels, and route ownership were changed.
- Added focused preference grouping/navigation tests and an authenticated Playwright visual-QA fixture. Visual QA passed AR/RTL 360px and EN/LTR 390px/430px for More top/lower/logout, Profile, Settings, human timezone, Notification Settings, and support row visibility. Screenshots are in `test/ux/UX-8C/` and were visually inspected.
- Validation: 25 focused Jest tests passed; targeted ESLint passed; changed-code TypeScript gate passed with 96 unrelated repository errors; locale JSON parsed; visual runner passed; `git diff --check` passed. Full repository i18n debt remains outside this phase.

### Deliberately not changed

- Completed Patient Home, Discovery, Booking, Sessions, Wallet, Messages, Notification Center, and Practitioner workflows were not redesigned.
- No backend/API contract, payload, React Query key, mutation semantics, notification preference record, authentication behavior, or business rule was changed.

### Next action

Start **Phase UX-9 - Final Consistency Gate**. Do not start it automatically.

## UX-9 Execution Log — Final Consistency Gate

**Type:** Cross-product consistency audit and focused repair
**Result:** PASS WITH DOCUMENTED DEBT

### What changed

- Removed duplicate Patient Wallet available-balance copy in `app/(patient)/payments.tsx`.
- Reduced Practitioner More intro copy to a concise secondary-tools description in `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`.
- Suppressed low-information Active status pills in `src/features/messages/components/MessagesInboxScreen.tsx` while retaining useful backend status treatments.
- Removed the duplicate Patient Notification Center summary heading and moved Mark all read from the global header into the notification content hierarchy in `app/(patient)/notifications.tsx`; the mutation and invalidation behavior are unchanged.
- Hardened `extractApiErrorMessage` in `src/lib/api.ts` and added `__tests__/api-error-presentation.test.ts` so unknown/provider/stack text is never presented as normal UI copy.
- Updated the obsolete Patient Wallet vocabulary assertion in `__tests__/practitioner/practitioner-finance-vocabulary.test.ts`.

### Backend safety

- APIs, hooks, query keys, request payloads, response contracts, authentication/session behavior, mutations, cache invalidation, deep-link identifiers, and lifecycle/payment capabilities were preserved.
- No business rule moved from backend to mobile. Added mappings are presentation-only.

### Validation

- Focused gate tests: 7 suites / 57 tests passed.
- Full Jest: 50/51 suites passed; 285/287 tests passed. The two failures remain the unrelated Practitioner Promo Code validation/date expectation mismatch.
- Lint: 0 errors / 103 legacy warnings.
- Changed-code TypeScript gate: passed; 96 existing repository errors remain.
- Runtime safety gate: passed; 17 classified matches, all SAFE.
- i18n validator: 2,000 existing issues remain.
- `git diff --check`: passed.

### Visual and native validation

- Fresh Playwright matrix generated 201 screenshots under `test/ux/UX-9/` across Patient Home, Discovery, Booking (partial until acceptance-modal scroll), Sessions, Wallet, Messages, Notifications, More/Settings, and Practitioner Home, Schedule, Add/Edit Times, Sessions, Messages, Earnings, Notifications, and More.
- Representative AR/RTL 360px and EN/LTR 390px/430px screenshots were inspected.
- Maestro is not installed and `adb devices` reports no connected device; native validation is therefore pending.

### Contract gap and remaining debt

- Patient Discovery specialty titles are English-only in the public practitioner specialty contract (`title` only); mobile does not fabricate Arabic translations. Backend content/schema localization is required.
- Repository-wide i18n, TypeScript, lint-warning, native/device, and unrelated promo-code test debt remain.
- No UX-10 redesign is started. Future work should be classified as a bug/debt item or a new feature, not another automatic redesign phase.

## UX-9 RTL/LTR Directional Icon Correction

**Scope:** Reopened only the UX-9 directional-icon portion; no UX-10 redesign started.

### What changed

- Added the pure semantic `getDirectionalIcon` resolver in `src/i18n/directional-icons.ts`, re-exported by `src/i18n/direction.ts`, for `back`, `forward`, `previous`, `next`, and `disclosure` meanings.
- Migrated the shared Header back icon, shared list/action rows, Patient and Practitioner disclosure rows, onboarding/assessment/session CTAs, payment policy/forward actions, discovery, instant booking, previous/next time and promo controls, and Practitioner Schedule-adjacent navigation usages to the central semantic mapping.
- Preserved non-directional icons such as trend/status arrows, calendar/clock, upload/download, lock/check/close/refresh, and payment/status inflow/outflow indicators.

### Validation

- Added focused LTR/RTL resolver coverage in `__tests__/directional-icons.test.ts`; focused suite: 4 suites / 31 tests passed.
- Changed-code TypeScript gate passed; 96 existing repository errors remain. Changed-file ESLint passed with 0 errors and legacy warnings only. `git diff --check` passed.
- Full post-fix search found no remaining direct physical directional icon names in `app/` or `src/`; remaining physical arrow text is limited to date/API comments. Existing direction-aware variables in shared primitives/components are intentional centralized consumers.

### Visual validation

- Fresh Playwright captures were generated under `test/ux/UX-9/directional-icons/` for Patient More/Settings, Sessions, Notifications, Discovery, Practitioner Schedule/Add/Edit Times, Home, Sessions, More, and Messages at AR/RTL 360px and EN/LTR 390px. Representative paired captures were visually inspected.
- Patient Booking reached fresh AR/RTL payment states, but the existing fixture stopped at the refund-policy interaction because the acceptance copy intercepted the click; this is a fixture limitation, not a directional-icon regression.
- Native Maestro/device validation remains unavailable; UX-DS-004 therefore remains PARTIALLY COMPLETE despite the directional-icon slice passing the web matrix.

### Backend safety

- APIs, hooks, query keys, payloads, response contracts, authentication/session behavior, mutations, cache invalidation, deep-link identifiers, lifecycle/payment capabilities, and backend authority were untouched. All changes are presentation-only icon resolution.

## UX-9 Directional Icon Guardrail — Permanent Documentation

- Updated `DESIGN.md` and `.agents/skills/sawiyaa-mobile-ui/SKILL.md` with the accepted directional-icon guardrail: navigation icons use semantic `back`/`forward`/`previous`/`next`/`disclosure` direction through the central resolver, not physical left/right names.
- Documented that direct `ArrowLeft`/`ArrowRight`/`ChevronLeft`/`ChevronRight` usage is forbidden outside the resolver, non-directional icons must not be mirrored solely for RTL, double-mirroring is prohibited, and new directional navigation components require focused RTL/LTR coverage.
- Documentation-only follow-up. No production UI, screen design, routes, APIs, backend behavior, or central resolver implementation changed.

## Navigation Shell Persistence Refactor — Execution Log

- Refactored Guest navigation ownership so the `(public)` layout renders one persistent `Slot` + `PublicBottomNav` shell; removed the screen-level Guest Home mount and routed root Guest entry through `/(public)`.
- Preserved the existing Patient and Practitioner native Expo Router tab layouts while removing nested-route `tabBarStyle: { display: "none" }` overrides from support, message, care-chat, and promo-code detail routes.
- Kept active Guest tab selection derived from the current route path, including public Discovery detail/filter routes. Existing labels, colors, route contracts, auth behavior, and backend/API behavior were unchanged.
- Added focused persistent-navigation regression coverage for single Guest mounting, native role shells, root role routing, and Guest/Patient/Practitioner destination resolution.
- Validation: focused Jest suites passed (18 tests); changed-code TypeScript gate passed with the existing 96 repository errors outside this phase; changed-file ESLint passed with 0 errors and 1 existing warning; `git diff --check` passed.
- Visual validation: fresh Playwright captures were generated and inspected in `test/ux/UX-NAV/` for Guest EN/LTR 390px and AR/RTL 360px Home, Guest Discovery and Packages EN/LTR, Patient AR/RTL 360px plus EN/LTR 390px/430px, and Practitioner AR/RTL Schedule/Home/Session/Message states plus a focused EN/LTR Home capture. The broader Practitioner matrix stopped at its existing protected-conflict fixture assertion before the EN pass; this did not affect the focused shell captures.
- Backend safety: APIs, hooks, query keys, request/response contracts, mutations, authentication/session semantics, lifecycle/payment authority, cache invalidation, deep-link identifiers, and business rules were untouched. No mobile business rule moved from backend to the UI.
- No broader navigation redesign or new UX phase was started. Future full-screen exceptions should be treated as focused technical defects with a documented reason and role-specific RTL/LTR coverage.

## UX-PT-INSTANT-001 — Instant Booking cross-platform lifecycle parity

**Status:** PARTIALLY COMPLETE — implementation and contract tests complete; native device visual validation pending.

### Scope and outcome

- Added the mobile public practitioner-profile Instant Booking CTA and availability indicator. Both are driven by `GET /public/practitioners/:slug/instant-booking-availability` (`availableNow`), not by presence alone.
- Preserved the existing native Patient and Practitioner request state machines, server timestamps, polling, cancellation, acceptance/rejection, payment handoff, and backend pricing contracts.
- Added mobile Patient and Practitioner notification deep-link routing for Instant Booking. Patient request IDs are preserved through the route so refresh/open-from-notification resolves the same request.
- Added English and Arabic profile copy for the new entry point and availability states.
- Added a dev-only deterministic backend QA fixture for practitioner J (`dr-hassan-tarek`) and corrected payment pricing resolution so Payment Initiation requires the configured commission rule while quote-only Instant Booking pricing remains readable without one.

### Validation

- Native focused notification-route suite: 37 tests passed.
- Native changed-code TypeScript gate: passed; 96 pre-existing repository errors remain.
- Locale JSON parsing: passed. Full locale validator still reports the repository's pre-existing broad baseline debt; Instant Booking keys are now present in both locales.
- Desktop Instant Booking UX suite: 5 tests passed.
- Local backend E2E evidence: `availableNow=true` for both 30/60 minutes; Patient Omar created a request, Practitioner Hassan received and accepted it, and the Patient recovered `ACCEPTED` / `PENDING_PAYMENT` from server state with the acceptance deep-link identifiers. The local unpaid session later expired through the backend sweep.
- Notification evidence: request-created, request-accepted, and request-expired types/events were persisted to IN_APP; PUSH attempts were correctly recorded as unavailable because no device was registered. Tap behavior remains contract-tested, not native-runtime tapped.
- Local payment readiness stopped at `PAYMENT_FINANCIAL_CONFIGURATION_UNAVAILABLE` before gateway initiation in the pre-fix run; the commission-resolution fix is covered by the focused backend tests, but a fresh accepted-session payment attempt still requires a new OTP-clean E2E cycle.
- Fresh post-fix cycle completed: request `d2da7d7b-076c-426f-a312-a3934b36ecae` reached `ACCEPTED`; session `b8bb58c6-a914-4c94-bda3-cdba616b48a3` reached `PENDING_PAYMENT` with a five-minute backend expiry and the immutable USD 33 / 30-minute quote snapshot. Payment initiation then reached the provider guard and returned `PAYMENT_PROVIDER_UNAVAILABLE`; no Payment row was created, so no ledger or webhook state was fabricated.
- Paymob control closure follow-up: the six canonical database defaults are now defined once in the config registry/platform defaults and are idempotently seeded without overwriting active values. A fresh local EGP initiation reached Paymob checkout successfully (`PENDING`, provider reference recorded, EGP amount snapshot and commission breakdown persisted); the success-card/webhook/ledger-confirmation leg remains unproven because no provider test-card result was available.
- Native toolchain follow-up: Android Studio JBR 21 and the Android release Gradle build are available/running, but `adb` has no connected device and the local SDK has no AVD/system image, so native patient/practitioner visual validation remains pending.
- Paymob remaining configuration limitation is currency-specific environment coverage: the local `.env` has only legacy/generic integration settings, which currently satisfy the EGP compatibility fallback; USD remains not-ready until `PAYMOB_USD_CARD_INTEGRATION_ID` is supplied. No credentials or provider secrets were changed.
- Native device/Maestro validation: **NOT VISUALLY VALIDATED**; no connected device/emulator was available in this environment.

### Remaining limitation

The native profile and request screens still require a real Expo/native-device visual pass at AR/RTL and EN/LTR sizes. This is a validation blocker only; the mobile implementation uses the existing backend-authoritative Instant Booking workflow and shared route contracts.

# 15. Product Guardrails

1. Do not redesign a screen before identifying the user job.
2. Do not expose a backend module merely because it exists.
3. Do not expose raw enums, provider names, technical IDs or API wording.
4. Do not use a card for every section.
5. Do not duplicate primary destinations across navigation areas.
6. Do not make users leave context for common contextual actions.
7. Do not rebuild backend lifecycle logic on the client.
8. Do not translate keys literally when the product meaning differs.
9. Do not fix Arabic by breaking English, or vice versa.
10. Do not mark a phase complete without updating this file.
11. Do not copy competitor visual identity.
12. Do study competitor workflows where they solve the same user job well.
13. Prefer fewer screens and clearer decisions over feature-per-screen architecture.
14. Prefer progressive disclosure over showing every capability at once.
15. Design Patient and Practitioner UX independently even though they share one app/platform.

---

# Current Priority

1. **P1 — Resolve the 2,000-item repository i18n baseline debt**
2. **P1 — Restore native/device validation (Maestro/emulator availability)**
3. **P1 — Resolve the 96 existing TypeScript errors**
4. **P2 — Reduce the 103 existing lint warnings**
5. **P2 — Close the Discovery specialty-localization contract gap and unrelated Promo Code test debt**

UX-9 is closed for the current redesign scope. Do not start another redesign phase automatically; classify follow-up work as a specific bug, technical debt item, or new feature.

---

**Final rule:**
**Backend = modules. Mobile = human workflows.**
