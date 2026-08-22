# Sawiyaa Web Product Copy Tracker

Status: COMPLETE — WEB-COPY-3 frontend-owned Web Product Copy closed; dynamic backend localization gaps recorded

## Scope and authority

This tracker is the Web copy source of truth for user-facing AR/EN terminology.
The accepted Sawiyaa Mobile vocabulary is the reference for human product language;
Web route names, translation keys, API contracts, and backend modules remain unchanged.

This pass is copy/localization only. No layout, navigation architecture, visual system,
business rule, endpoint, payload, query key, or mutation was changed.

## Phase WEB-COPY-2 route/copy coverage matrix

This matrix was created before the Phase WEB-COPY-2 product-copy edits. A route is marked
complete only after its visible AR/EN copy and reasonable loading, empty, error, retry,
disabled, pending, success, validation, toast, modal, and confirmation states are reviewed.
Dynamic backend content without a localized field is recorded as a gap rather than translated
in the frontend.

Legend: `Pending` = not yet reviewed in this phase; `Reviewed` = audited in both locales;
`Gap` = backend-provided or out-of-scope content requiring follow-up.

### Public and authentication

| Reachable flow / route group | AR | EN | Hardcoded / technical risk | States | Mobile alignment | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Landing / public home `/` | Pending | Pending | Pending | Pending | Pending | Pending |
| Public specialist discovery `/practitioners` | Pending | Pending | Pending | Pending | Pending | Pending |
| Public specialist profile `/practitioners/[slug]` | Pending | Pending | Pending | Pending | Pending | Pending |
| Public specialties `/specialties`, `/specialties/[slug]` | Pending | Pending | Pending | Pending | Pending | Pending |
| Public articles / academy | Pending | Pending | Pending | Pending | Pending | Pending |
| Packages and refund policies | Pending | Pending | Pending | Pending | Pending | Pending |
| Public help / support `/help` | Pending | Pending | Pending | Pending | Pending | Pending |
| Public not-found / unavailable / error states | Pending | Pending | Pending | Pending | Pending | Pending |
| Sign in: patient, practitioner, shared | Pending | Pending | Pending | Pending | Pending | Pending |
| Patient signup | Pending | Pending | Pending | Pending | Pending | Pending |
| Practitioner signup / application entry | Pending | Pending | Pending | Pending | Pending | Pending |
| Forgot password: patient / practitioner | Pending | Pending | Pending | Pending | Pending | Pending |
| Reset password / verification / OTP | Pending | Pending | Pending | Pending | Pending | Pending |
| Public payment-return / payment-failure entry states | Pending | Pending | Pending | Pending | Pending | Pending |

### Patient

| Reachable flow / route group | AR | EN | Hardcoded / technical risk | States | Mobile alignment | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Authenticated Home `/patient` and dashboard | Pending | Pending | Pending | Pending | Pending | Pending |
| Discover / matching / result list | Pending | Pending | Pending | Pending | Pending | Pending |
| Specialist profile and booking entry | Pending | Pending | Pending | Pending | Pending | Pending |
| Booking: duration, date, time, review | Pending | Pending | Pending | Pending | Pending | Pending |
| Booking payment and return: pending / failure / confirmation | Pending | Pending | Pending | Pending | Pending | Pending |
| Sessions list: Upcoming / History | Pending | Pending | Pending | Pending | Pending | Pending |
| Session details: join / pay / cancel / reschedule / review | Pending | Pending | Pending | Pending | Pending | Pending |
| Session chat / message thread | Pending | Pending | Pending | Pending | Pending | Pending |
| Messages inbox and support context | Pending | Pending | Pending | Pending | Pending | Pending |
| Wallet and transaction history | Pending | Pending | Pending | Pending | Pending | Pending |
| Notification center and notification events | Pending | Pending | Pending | Pending | Pending | Pending |
| Profile and settings | Pending | Pending | Pending | Pending | Pending | Pending |
| Notification settings / language / timezone | Pending | Pending | Pending | Pending | Pending | Pending |
| More / academy / articles / assessments / reviews | Pending | Pending | Pending | Pending | Pending | Pending |
| Package purchases and package payment | Pending | Pending | Pending | Pending | Pending | Pending |
| Patient support list / support detail | Pending | Pending | Pending | Pending | Pending | Pending |

### Practitioner

| Reachable flow / route group | AR | EN | Hardcoded / technical risk | States | Mobile alignment | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Authenticated Home `/practitioner` and dashboard | Pending | Pending | Pending | Pending | Pending | Pending |
| Schedule `/practitioner/availability` | Pending | Pending | Pending | Pending | Pending | Pending |
| Schedule week detail / add-edit times | Pending | Pending | Pending | Pending | Pending | Pending |
| Instant booking / presence | Pending | Pending | Pending | Pending | Pending | Pending |
| Sessions list: Upcoming / History-equivalent states | Pending | Pending | Pending | Pending | Pending | Pending |
| Session details: join / chat / operational actions | Pending | Pending | Pending | Pending | Pending | Pending |
| Messages inbox and message thread | Pending | Pending | Pending | Pending | Pending | Pending |
| Earnings summary `/practitioner/wallet` | Pending | Pending | Pending | Pending | Pending | Pending |
| Transactions `/practitioner/ledger` | Pending | Pending | Pending | Pending | Pending | Pending |
| Transfers `/practitioner/settlements` | Pending | Pending | Pending | Pending | Pending | Pending |
| Notification center and notification events | Pending | Pending | Pending | Pending | Pending | Pending |
| Profile / credentials / specialties | Pending | Pending | Pending | Pending | Pending | Pending |
| Settings / notification settings / timezone | Pending | Pending | Pending | Pending | Pending | Pending |
| Application / approval / readiness states | Pending | Pending | Pending | Pending | Pending | Pending |
| Help / support list and detail | Pending | Pending | Pending | Pending | Pending | Pending |
| Practitioner articles / patients / reviews secondary flows | Pending | Pending | Pending | Pending | Pending | Pending |

## Canonical vocabulary

### Matrix completion update — WEB-COPY-2

The baseline matrix above was created before editing. The following status register is
the completion state for this phase; `Gap` means the route was inspected but still has
dynamic/backend copy or legacy hardcoded state text requiring a separate follow-up.

| Area | Route groups inspected | Reviewed | Gap | Notes |
| --- | ---: | ---: | ---: | --- |
| Public/authentication | 14 | 10 | 4 | Public profile, articles/academy, help, and some payment-return states retain dynamic or legacy follow-up copy. |
| Patient | 16 | 11 | 5 | Booking/profile detail, session detail/chat, and secondary destinations need deeper state-by-state cleanup. |
| Practitioner | 16 | 11 | 5 | Instant-booking modal, session detail, settings/application, and secondary flows retain focused copy debt. |

Total reachable route groups inspected: **46**. Fully copy-closed in this phase: **32**.

| Product concept | English | Arabic |
| --- | --- | --- |
| Specialist | Specialist | مختص |
| Discover | Discover | اكتشف |
| Practitioner destination | Schedule / My schedule | الجدول / جدولي |
| Add times | Add times | إضافة أوقات |
| Edit day times | Edit day times | تعديل أوقات اليوم |
| Sessions | Sessions | الجلسات |
| Upcoming / History | Upcoming / History | القادمة / السجل |
| Ready to join | Ready to join | جاهزة للانضمام |
| Payment required | Payment required | الدفع مطلوب |
| Under review | Under review | قيد المراجعة |
| Completed / Cancelled | Completed / Cancelled | مكتملة / ملغاة |
| Messages | Messages | الرسائل |
| Patient money destination | Wallet | المحفظة |
| Available balance | Available balance | الرصيد المتاح |
| Transactions | Transactions | المعاملات |
| Refund | Refund | استرداد |
| Session payment | Session payment | دفع جلسة |
| Practitioner money destination | Earnings | الأرباح |
| Transfers / Transferred | Transfers / Transferred | التحويلات / تم تحويله |
| Notifications | Notifications | الإشعارات |
| Timezone examples | Cairo time / Riyadh time | توقيت القاهرة / توقيت الرياض |

## Audited and migrated areas

- Practitioner navigation now uses a practitioner-only translation namespace for Schedule,
  Earnings, Transactions, Transfers, Messages, and settings labels. The existing paths
  (`/availability`, `/wallet`, `/ledger`, `/settlements`, and others) remain unchanged.
- Practitioner schedule copy now prefers Schedule, session times, and schedule workflow
  language. Internal `availability` translation keys remain for compatibility.
- Practitioner money copy now presents Earnings, Transactions, and Transfers while keeping
  the existing finance translation namespace and technical field keys.
- Patient shell and patient-area copy now uses Specialists in the reachable patient journey;
  admin `main.practitioners` terminology remains separate.
- Public listing/profile metadata uses Specialist/Specialists and natural Arabic مختص/المختصين.
- Patient wallet/payment copy uses transaction language rather than ledger language.
- Notification subtitles no longer expose Finance, PUSH-style delivery terminology, or raw
  delivery channel names; technical notification error keys remain available for mapping.
- Reachable profile timezone examples now use Cairo time / Riyadh time rather than raw IANA IDs.
- Guided matching, instant booking, public specialties, package discovery, payment provider
  labels, care-chat request/detail states, support-request modal, moderation report action,
  profile payout labels, data-table accessibility/export labels, auth shell labels, and
  session-review star labels were moved to or aligned with AR/EN i18n.

## Corrected copy examples

### Arabic

- `اكتشف المختص المناسب`
- `لا يوجد مختصون متاحون الآن`
- `طلبك قيد المراجعة من فريق الرعاية في سويّة`
- `الرصيد المتاح` / `المعاملات` / `الأرباح` / `التحويلات`

### English

- `Find the right specialist`
- `No specialists are available right now`
- `Your request is under review by the Sawiyaa care team`
- `Available balance` / `Transactions` / `Earnings` / `Transfers`

## Migration and gap accounting

- Hardcoded user-facing copy migrated: **12 reachable source components**, covering the
  care-chat home/detail states, support modal, moderation report flow, auth shell controls,
  profile payout fields, package price fallback, data-table states/export/pagination, and
  session-review accessibility labels.
- Technical/raw user-facing terms removed or mapped: **18+** targeted values, including
  practitioner-facing Finance/Ledger/Settlement destination copy, Paymob provider text,
  wallet-ledger wording, raw delivery-channel labels, backend-contract wording, and raw
  IANA timezone examples.
- Status/error/empty/validation/modal copy corrected: **30+** reachable state strings,
  with additional legacy session/payment states recorded as follow-up gaps.

## Backend localization gaps

- Dynamic practitioner names, specialty names, professional titles, and session metadata
  still come from backend fields without guaranteed localized variants; the Web preserves
  those values and does not fabricate translations.
- Some operational/session/payment error payloads still require backend error-key mapping
  coverage before they can be consistently localized in every state.

## Copy-induced UI follow-ups

- Representative public specialist discovery rendered at compact/mobile (390px), tablet
  (768px), and desktop (1440px) widths in both English and Arabic mobile views. No clipping,
  overlap, or unusable wrapping was observed in the changed copy. Dynamic long names remain
  a data-dependent risk.
- No layout, spacing, color, component hierarchy, route, or navigation change was made.

## Remaining copy debt

- No remaining frontend-owned Web Product Copy debt was identified in the 46 registered
  route/groups. The remaining `BLOCKED` entries are limited to backend/CMS-owned content
  localization gaps listed in the dedicated section below.
- Admin-only/operator terminology remains intentionally out of scope.
- New backend-localized fields will require a follow-up mapping pass when the contract is
  available; the Web UI must not fabricate translations for those fields.

## Deliberately preserved

- Technical keys and route/module names such as `finance`, `ledger`, `settlements`, and
  `availability`.
- Admin/operator vocabulary and admin locale debt outside the reachable patient/practitioner
  product journeys.
- Dynamic backend-provided profile/specialty content where the contract does not provide a
  localized field. The Web UI does not fabricate translations for those values.
- Backend-authoritative state/action copy and all request/response behavior.

## Overflow and visual notes

- No layout or component styling was changed.
- Copy was kept concise in navigation, status labels, metadata, and empty/error states.
- Representative rendered text-fit checks were performed for English and Arabic discovery,
  patient articles, and the practitioner entry route at compact/mobile width (390px). No
  changed frontend copy clipped or overlapped. The practitioner gap route redirected to the
  unauthenticated practitioner sign-in gate because no E2E practitioner credentials were
  available; this is recorded as an environment limitation, not a product-copy failure.

## Execution log

### 2026-08-16 — WEB-COPY-2 full reachable product-copy audit

- Inspected 46 reachable Public/Auth, Patient, and Practitioner route groups and recorded
  Reviewed/Gap status above before claiming closure.
- Expanded canonical and hardcoded-copy validators; migrated targeted hardcoded UI labels
  into existing i18n namespaces and aligned discovery, booking, care-chat, support, payment,
  auth, profile, notification, and review copy with the Mobile vocabulary.
- Validation: `npm run i18n:check`, `npm run ux-copy:check`, `npm run ux-copy:canonical`,
  `npm run ux-copy:hardcoded`, targeted ESLint, TypeScript, and `git diff --check` passed.
- Visual validation: rendered representative `/en/practitioners` at 390/768/1440px and
  `/ar/practitioners` at 390px; no changed-copy fit defects observed.
- Backend safety: APIs, hooks/query keys, mutations, navigation, pricing/payment/session
  authority, and business logic were unchanged. Only user-facing copy/i18n mappings changed.
- Remaining work: complete the explicit Gap route groups; do not start UI redesign from this log.

### 2026-08-16 — Focused Web localization pass

- Implemented canonical Specialist, Schedule, Earnings, Transactions, Transfers, Wallet,
  Notifications, and timezone vocabulary across the touched patient/practitioner/public copy.
- Added practitioner-specific and patient-specific navigation translation scopes without changing
  routes or shell structure.
- Added `scripts/validate-web-product-copy.mjs` and the `ux-copy:canonical` package script.
- Validation: focused canonical copy check passed; JSON parsing is covered by the script.
- Remaining work: none for this focused pass. Broader legacy/admin locale cleanup remains out of scope.
- Next step: use the existing Web visual/e2e flow for a separate visual review if product wants
  screenshot confirmation of long localized strings.

## WEB-COPY-3 final status register — all 46 route/groups

`DONE` means frontend-owned AR/EN product copy and reachable state copy are closed.
`BLOCKED — BACKEND CONTENT LOCALIZATION GAP` is used only where visible content is
server/CMS-owned and the current contract does not provide locale-specific fields.

| # | Route / group | Final status |
| ---: | --- | --- |
| 1 | Landing / public home `/` | DONE |
| 2 | Public specialist discovery `/practitioners` | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 3 | Public specialist profile `/practitioners/[slug]` | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 4 | Public specialties `/specialties`, `/specialties/[slug]` | DONE |
| 5 | Public articles / academy | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 6 | Packages and refund policies | DONE |
| 7 | Public help / support `/help` | DONE |
| 8 | Public not-found / unavailable / error states | DONE |
| 9 | Sign in: patient, practitioner, shared | DONE |
| 10 | Patient signup | DONE |
| 11 | Practitioner signup / application entry | DONE |
| 12 | Forgot password: patient / practitioner | DONE |
| 13 | Reset password / verification / OTP | DONE |
| 14 | Public payment-return / payment-failure entry states | DONE |
| 15 | Authenticated Home `/patient` and dashboard | DONE |
| 16 | Discover / matching / result list | DONE |
| 17 | Specialist profile and booking entry | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 18 | Booking: duration, date, time, review | DONE |
| 19 | Booking payment and return: pending / failure / confirmation | DONE |
| 20 | Sessions list: Upcoming / History | DONE |
| 21 | Session details: join / pay / cancel / reschedule / review | DONE |
| 22 | Session chat / message thread | DONE |
| 23 | Messages inbox and support context | DONE |
| 24 | Wallet and transaction history | DONE |
| 25 | Notification center and notification events | DONE |
| 26 | Profile and settings | DONE |
| 27 | Notification settings / language / timezone | DONE |
| 28 | More / academy / articles / assessments / reviews | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 29 | Package purchases and package payment | DONE |
| 30 | Patient support list / support detail | DONE |
| 31 | Authenticated Home `/practitioner` and dashboard | DONE |
| 32 | Schedule `/practitioner/availability` | DONE |
| 33 | Schedule week detail / add-edit times | DONE |
| 34 | Instant booking / presence | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 35 | Sessions list: Upcoming / History-equivalent states | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 36 | Session details: join / chat / operational actions | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 37 | Messages inbox and message thread | DONE |
| 38 | Earnings summary `/practitioner/wallet` | DONE |
| 39 | Transactions `/practitioner/ledger` | DONE |
| 40 | Transfers `/practitioner/settlements` | DONE |
| 41 | Notification center and notification events | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 42 | Profile / credentials / specialties | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |
| 43 | Settings / notification settings / timezone | DONE |
| 44 | Application / approval / readiness states | DONE |
| 45 | Help / support list and detail | DONE |
| 46 | Practitioner articles / patients / reviews secondary flows | BLOCKED — BACKEND CONTENT LOCALIZATION GAP |

## BACKEND LOCALIZATION GAPS

These are explicit contract boundaries, not frontend translation debt:

| Route | Entity / field | Current visible example | Required localized backend field |
| --- | --- | --- | --- |
| `/practitioners`, `/patient/practitioners/[slug]`, `/practitioners/[slug]` | Practitioner `displayName` | `Dr. Sara...` or a single Latin/Arabic name in both locales | `displayNameAr` and `displayNameEn`, or a locale-keyed display-name object. If a credential prefix is intended, expose it separately from identity. |
| `/practitioners`, `/patient/practitioners/[slug]`, `/practitioners/[slug]` | Practitioner `professionalTitle` / credential | A backend title such as `Therapist` or `Psychologist` | Locale-specific title labels or a canonical credential enum mapped by the backend contract; preserve the real credential and do not convert it to generic Doctor. |
| `/practitioners/[slug]`, `/patient/practitioners/[slug]` | Practitioner `fullBio` | One backend biography reused as `bioAr` and `bioEn` | `bioAr` and `bioEn`, or `{ ar, en }`. |
| `/articles`, `/articles/[slug]`, `/patient/articles`, `/patient/articles/[slug]` | Article `title`, `excerpt`, `content` | CMS/article text returned as one string for the requested locale | `titleAr/titleEn`, `excerptAr/excerptEn`, `contentAr/contentEn`, or a locale-keyed content object. |
| `/articles`, `/patient/articles` | Article category `title` | A single category title such as `Anxiety` | `category.titleAr/titleEn` or a localized category object. |
| `/articles/[slug]`, `/patient/articles/[slug]` | Article trust author `displayName` | A single author name in article trust metadata | `authorDisplayNameAr/authorDisplayNameEn`, or a locale-keyed author display-name object. |
| Patient/practitioner session and instant-booking routes | Session participant `displayName` / patient metadata | A single backend participant name shown in the opposite locale | Locale-specific identity fields where the product requires localized names; otherwise treat as identity data and do not fabricate translation. |

## WEB-COPY-3 execution log — 2026-08-16

- Closed the documented WEB-COPY-2 gaps across discovery/profile, articles/help,
  patient booking/session/chat/support, practitioner instant booking/session/support,
  finance presentation, assessments, notifications, and secondary state copy.
- Moved remaining reachable frontend-owned strings into existing AR/EN namespaces,
  including session list/loading/empty states, chat fallbacks, instant-booking queue
  filters, support filters, finance table labels, discovery filters, and session detail
  event/payment presentation mappings.
- Verified the `Dr.` root cause: the public list contract provides one `displayName`
  field and profile detail provides one `fullBio`; the former instant-booking pending
  modal also had a presentation-level `Dr.` prefix, which was removed. The remaining
  identity examples are backend data or unreachable mock/test fixtures and are recorded
  above rather than rewritten in the Web UI.
- Generic platform role copy is now Specialist / مختص; actual professional titles and
  specialty names remain authoritative data or credential-specific translations.
- Validation: JSON/i18n parity, canonical vocabulary, hardcoded-copy audit, TypeScript, and
  `git diff --check` passed. Focused ESLint reported only pre-existing hook/purity violations
  in touched screens plus existing warnings; no copy-specific lint issue was introduced.
- Visual validation: compact Arabic/English discovery and patient-article routes rendered at
  390px. The practitioner route was rendered but stopped at its auth gate because the local
  environment had no practitioner credentials. No UI redesign, route, API, hook, mutation,
  or business-rule change was made.
