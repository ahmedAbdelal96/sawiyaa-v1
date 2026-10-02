# Instant Booking pricing and entry current-state discovery

**Scope:** read-only discovery across `sawiyaa-backend-v1`, `sawiyaa-frontend-v1`, and `sawiyaa-mobile` on 2026-08-08. This document does not change runtime behaviour, API contracts, database schema, migrations, seeds, or UI.

**Baseline read:** [instant-booking-current-state.md](instant-booking-current-state.md). That audit remains the source for the existing request/accept lifecycle. This audit focuses on the directory/profile entry point, pricing, promotion, payment, availability, and downstream consequences.

## A. Executive summary

There are two distinct price families in the current model:

* **scheduled-session prices** (`sessionPrice30/60Egp|Usd`), which power the public practitioner directory, practitioner profile, scheduled availability booking, and their displayed prices;
* **instant-booking prices** (`instantBookingPrice30/60Egp|Usd`), which power only the dedicated authenticated Instant Booking discovery/request flow and are snapshotted on the `InstantBookingRequest`.

Therefore the public directory card and `/[locale]/patient/practitioners/[slug]` do **not** currently quote or create instant bookings. The profile already reads public presence and displays whether instant booking is enabled, but it has no instant-booking action. The smallest future patient path is consequently:

`directory card -> existing practitioner profile -> profile booking panel action -> existing instant request/payment flow`.

No new patient page is needed for that integration. It does require a backend contract extension so the profile can receive a server-resolved instant quote and a final eligibility check at the request/accept boundary.

## B. Pricing architecture map

```mermaid
flowchart TD
  C[Trusted request country\nTrustedCountryResolutionMiddleware] --> R[Payment regional resolver]
  R -->|EG / EGY| EGP[EGP]
  R -->|other or unavailable| USD[USD]
  EGP --> D[Public directory and profile\nscheduled price resolver]
  USD --> D
  D --> S[sessionPrice30/60Egp|Usd\nselected display price]
  EGP --> I[Authenticated Instant discovery]
  USD --> I
  I --> P[instantBookingPrice30/60Egp|Usd\nselected instant quote]
  P --> Q[InstantBookingRequest.metadataJson.pricingSnapshot]
  Q --> F[Financial breakdown for INSTANT session]
  F --> PAY[Payment amount snapshot\nsubtotal / discount / total / currency]
```

Authoritative country selection is `TrustedCountryResolutionMiddleware` plus `TrustedCountryResolutionService`, consumed through `resolveCountryFromRequest`. It can use the development override, a trusted Cloudflare country header, or trusted-client-IP GeoIP. A missing/failed country resolves to the documented default USD. Patient/account/checkout country fields are deliberately not authoritative for payment-region selection.

`resolvePaymentRegionalResolution` maps Egypt (`EG`/`EGY`) to EGP and all other/unavailable countries to USD. `PublicPractitionerPricingContextService` currently receives a patient ID but resolves public pricing from the trusted request country rather than a stored patient profile country.

## C. Scheduled versus Instant pricing

| Concern | Scheduled booking | Instant booking |
| --- | --- | --- |
| Practitioner fields | `sessionPrice30Egp`, `sessionPrice30Usd`, `sessionPrice60Egp`, `sessionPrice60Usd` | `instantBookingPrice30Egp`, `instantBookingPrice30Usd`, `instantBookingPrice60Egp`, `instantBookingPrice60Usd` |
| Public card/profile quote | Yes. `resolvePublicPractitionerPricing` / `getPublicSessionPrices` choose the requested-region scheduled field. | No. Neither public list nor public-details DTO maps instant price fields. |
| Dedicated discovery quote | Not used. | Yes. `ListPatientInstantBookingPractitionersUseCase` returns the regional instant amount and the EGP/USD pricing map. |
| Snapshot moment | Normal session payment has a payment amount snapshot. | Request creation stores both currency families in `InstantBookingRequest.metadataJson.pricingSnapshot`; financial calculation uses the selected snapshot for an INSTANT session. |
| Payment | Generic session payment, coupon optional. | Same generic session payment only **after practitioner acceptance** creates the `PENDING_PAYMENT` Session. |
| Country/currency authority | Trusted request country; EGP for Egypt, USD otherwise/default. | Same trusted region resolver; the client `currency` discovery parameter is not an authority. |

Prices are stored separately as EGP and USD fields. There is no observed arithmetic that adds them together: the regional resolver selects one currency family, and financial values are decimal strings at API boundaries. A product quote must keep that one selected currency through request, payment, and receipt; it must not infer conversion or sum the two source fields.

## D. Directory contract

**Backend endpoint:** `GET /api/v1/public/practitioners` in `src/modules/practitioners/controllers/public-practitioner.controller.ts`.

`ListPublicPractitionersUseCase` obtains the trusted request country, resolves one `currencyCode`/regional-pricing mode, filters the read model for that currency, then maps only the selected scheduled amounts as `displaySessionPrice30` and `displaySessionPrice60`. The DTO/type surface includes the public identity, title, specialties, languages, rating, avatar, verification, online flag, currency context, raw scheduled price fields, and selected scheduled price values. It does not return instant price, instant quote, instant eligibility, or a callable instant action.

**Web card:** `src/features/practitioners-discovery/components/PractitionerCard.tsx`, supplied by `practitioners-ssr.api.ts`. It renders the scheduled “Session fees / رسوم الجلسة” 30/60-minute values, live `isOnlineNow`, and only links to the existing profile route. It does not have an instant CTA.

**Mobile card:** `src/features/patient/discovery/components/TherapistCard.tsx` shows the public discovery information and online indicator; profile navigation is the relevant existing route. It does not present an instant quote/action from the directory card.

## E. Profile contract

**Route:** `/[locale]/patient/practitioners/[slug]`, for example `/ar/patient/practitioners/dr-karim-hassan`.

**Backend:** `GET /api/v1/public/practitioners/:slug`, implemented by `GetPublicPractitionerDetailsUseCase`. It applies the same trusted-country scheduled-price resolution and returns profile content, credentials summary, packages, and selected `sessionPrice30`/`sessionPrice60` with `currencyCode`. It does not map the instant price fields or a server-calculated instant eligibility decision.

**Presence:** the profile separately calls `GET /api/v1/public/practitioners/:slug/presence`. `ProfileBookingPanel.tsx` displays live status and whether `isInstantBookingEnabled` is true, but it does not authorise booking.

**Current booking action:** `PublicAvailabilityViewer.tsx` displays weekly scheduled slots, lets the patient choose 30/60 minutes, and calls `useCreateScheduledSession` with `sessionMode: "VIDEO"`; success sends the user to `/patient/sessions/:id/pay`. Thus its price, slot selection, and CTA are scheduled-booking behaviour, not an instant booking path.

## F. Presence and Instant availability

`PractitionerPresence` is the runtime source of live state and instant readiness. It stores `status`, `isInstantBookingEnabled`, and `lastSeenAtUtc`; a missing row defaults to OFFLINE and disabled. `presence-liveness.ts` makes non-OFFLINE status effective only when `lastSeenAtUtc` is fresh within the hard-coded two-minute liveness TTL.

Web and Mobile practitioner shells issue a heartbeat immediately and every 60 seconds only while their app is visible/active. `PractitionerPresenceRepository.touchHeartbeat` may promote a seeded OFFLINE row to ONLINE, but a manually OFFLINE record stays OFFLINE. These 60-second client and two-minute server liveness constants are presence mechanics, not the requested future booking/payment window configuration.

The public presence endpoint is visibility-gated with the same public-practitioner policy, then returns public-safe status and `isInstantBookingEnabled`. It is not sufficient on its own to make a practitioner bookable: the instant eligibility service is authoritative.

## G. Current exact instant eligibility matrix

| Check | Discovery | Request creation | Practitioner acceptance | Notes |
| --- | --- | --- | --- | --- |
| Public/approved practitioner and active user | Yes | Yes | Revalidated | Requires public slug, display name/title/bio, and active specialty. |
| Duration | 30/60 | 30/60 | Revalidated | Invalid values rejected. |
| Session mode | VIDEO/AUDIO | VIDEO/AUDIO | Revalidated | CHAT rejected; this conflicts with a video-only product direction. |
| Effective presence | ONLINE and fresh | ONLINE and fresh | Revalidated | BUSY is separately rejected; stale becomes OFFLINE. |
| Instant readiness flag | Required | Required | Revalidated | `PractitionerPresence.isInstantBookingEnabled` is the source. |
| Complete instant pricing | Required by discovery/readiness | Snapshot taken | Existing request snapshot used | Enabling readiness rejects missing any of four instant price fields. |
| Published weekly availability covers now through end | Yes | Yes | Revalidated | Current behaviour; must be removed only by a deliberate policy change if product says it must not gate Instant. |
| Availability exception | Must permit | Must permit | Revalidated | Current behaviour. |
| Blocking session conflict | Must be absent | Must be absent | Revalidated plus session DB constraints | Uses canonical blocking-session rules. |
| Patient eligibility | Authenticated patient | Patient owner | N/A | Request belongs to the authenticated patient. |

The current intended product rule “online + instant enabled means bookable without weekly availability” is therefore **not implemented**: weekly availability and exceptions still gate all three stages.

## H. Promo code behaviour

The generic session payment flow accepts optional `couponCode` in `InitiateSessionPaymentDto`. `CalculateSessionFinancialBreakdownService` validates it through `ValidateCouponEligibilityService`; successful payment creates a `CouponRedemption` through `RedeemCouponService` in the payment-success path. The calculator returns decimal-string subtotal, discount, total, and currency snapshots.

For an accepted INSTANT session, this generic pay route can therefore use a valid code. The code is **not** included in `CreateInstantBookingRequestDto`, not part of the request’s pricing snapshot, not shown as a quote on the public profile, and is not reserved/consumed until payment succeeds. Current validation supports active, approved-if-required, date-valid, usage-limited PLATFORM_WIDE and PRACTITIONER_SESSIONS coupons; practitioner scope is owner-matched. It does not currently express an instant-only/duration restriction.

Smallest future integration: place the optional existing promo-code input in the profile’s instant action/confirmation, carry only the code to the server, and have the server calculate the final quote. Do not trust a client price or client currency.

## I. Quote and payment model

`CalculateSessionFinancialBreakdownService` is the shared server authority. For `SessionFlowType.INSTANT`, it reads the immutable request `pricingSnapshot` in the selected trusted currency/duration; only legacy/missing snapshot data falls back to the live instant price, then scheduled price as a final compatibility fallback. It resolves commission purpose `SESSION_INSTANT_BOOKING`, applies a valid coupon, and feeds `InitiateSessionPaymentUseCase`.

Payment creates the durable `Payment` amount snapshot (`amountSubtotal`, `amountDiscount`, `amountTotal`, `currency`, coupon metadata/provider). Once a payment already exists, later calculation reuses its snapshot instead of recalculating coupon or price. This is the correct existing “single monetary authority” building block, but the current instant request itself has no final payable quote/discount snapshot.

## J. Payment-window policy

An accepted request is transformed by `CreateSessionFromInstantBookingService` into a normal `Session` with `flowType: INSTANT`, `status: PENDING_PAYMENT`, start at acceptance, end at acceptance plus duration, and a hard-coded 15-minute `expiresAt` payment reservation. The request itself has a hard-coded two-minute pending expiry in `CreateInstantBookingRequestUseCase`; `InstantBookingExpirySweeperService` polls every minute to expire pending requests.

There are no existing Database Config keys for the 2-minute request TTL or the 15-minute post-accept payment reservation. The absolute resulting `expiresAt` is persisted, so expiry enforcement is stable once created, but the policy source is duplicated/hard-coded rather than configurable/snapshotted. A future config must be read at the authoritative request/accept decision, persist the final expiry/snapshot, and never trust a browser countdown.

## K. Existing Database Config integration points

The typed runtime Database Config infrastructure is `src/modules/config`: `CONFIG_DEFINITIONS`, `ConfigRuntimeService`, `ConfigurationManagementService`, and the existing admin platform-settings service/audit trail. It already supports typed values, validation, global scope, initial seed values, Arabic/English catalog metadata, and configuration audit history.

Existing session timing keys are managed by `SessionSchedulePolicyService` and are deliberately separate from Instant request/payment TTLs:

* `SESSION_REMINDER_OFFSETS_MINUTES = [60, 15, 0]`
* `SESSION_LATE_REMINDER_ENABLED = true`
* `SESSION_LATE_REMINDER_MINUTES_AFTER_START = 5`
* `SESSION_JOIN_EARLY_MINUTES = 15`
* `SESSION_JOIN_AFTER_END_GRACE_MINUTES = 10`
* `SESSION_IN_APP_REMINDERS_ENABLED = true`
* `SESSION_EMAIL_REMINDERS_ENABLED = true`

Recommended future keys, using this same registry rather than environment variables or local constants: an instant-request response TTL, an instant-payment reservation TTL, and any business-approved Instant feature/presence policy. The producer of each expiry must persist the selected policy/absolute expiry with the request or session. The sweeper should consume persisted due times, not recompute a changing policy.

## L. Notifications

Current notifications are asymmetric. Request creation does not invoke an immediate practitioner notification; practitioner Web/Mobile queues poll pending requests every four seconds. Acceptance, rejection, and expiry use `OperationalNotificationService` for the patient and build stable Sawiyaa instant-request routes. Once payment succeeds, the session passes through the standard payment confirmation, session reminder-plan, and join-window policy pipeline.

Future product work needs a durable practitioner “new instant request” notification (in-app and, if policy permits, email), an expiry-safe action route, and idempotent delivery. It must never place a provider URL or join credential in the notification. The accepted patient action can reuse the existing session payment route, after its server-side state/ownership check.

## M. Existing-page integration only

No new patient page is required or recommended. The lowest-friction Web integration is:

1. keep `PractitionerCard.tsx` as directory entry and route to the existing profile;
2. extend the existing public profile contract with a **server-derived, non-authorising** Instant display quote/availability summary;
3. add an Instant action in `ProfileBookingPanel.tsx`, adjacent to the current scheduled booking section;
4. invoke the existing authenticated instant-request endpoint from a client child component;
5. after acceptance, reuse the existing `Session` payment page and standard session lifecycle.

The action must re-fetch/revalidate eligibility at creation and acceptance. The profile’s public presence response is for display only and must not become an authorisation claim.

## N. Mobile parity

Mobile already has dedicated Instant screens under `app/(patient)/instant-booking.tsx` and practitioner request handling under `app/(practitioner)/instant-booking.tsx`; its API/types mirror the Web request/accept flow. Mobile profile routes (`app/(patient)/discovery/[slug].tsx` and public counterpart) fetch and render public presence but do not initiate Instant from that profile. Mobile practitioner presence heartbeat is the same one-minute foreground cadence, and it exposes the instant-readiness switch in practitioner availability.

Future mobile work should add the same profile-level instant action and consume the same backend quote/eligibility contract; it must not calculate price, coupon discount, currency conversion, TTL, or availability locally.

## O. Video-only divergence

The public scheduled profile viewer always creates `VIDEO` sessions. However the backend scheduled-session DTO accepts the Prisma `SessionMode` enum, package public quote/purchase APIs accept it as well, and Instant explicitly accepts `VIDEO` **and** `AUDIO` in its DTO/eligibility service. Session join/runtime code has video-specific paths and safely marks non-video modes as not video-joinable, but the persisted mode still exists through session, package, payment, and notification read models.

If the product rule is now “all future sessions are video-only,” this must be enforced consistently at backend DTO/use-case boundaries, package quotes/purchases, Instant request creation, seed fixtures, Web/Mobile type/selector UI, and tests. Existing historical non-video records should remain renderable/readable. This discovery makes no such change.

## P. Concurrency and duplicate-request findings

* The request repository checks for an existing pending request for the **same patient and practitioner**, then inserts. It has no idempotency key and no database partial unique constraint for that pair; concurrent identical submissions can race.
* Multiple patients can submit PENDING requests to one practitioner. Acceptance atomically changes the selected row with `updateMany(PENDING -> ACCEPTED)` and creates one session under the database’s canonical session overlap constraints.
* Acceptance revalidates eligibility before its transaction. A conflict during session creation is still protected by PostgreSQL’s session overlap constraints, but other pending instant requests are not automatically rejected/cancelled by the accepted one; they remain pending until action/expiry.
* The expiry sweeper is process-local interval work (one-minute cadence) without an observed cross-instance leader lock. Its transition must remain idempotent; a production multi-instance deployment should use a durable claim/lock mechanism or a single explicitly elected worker.

Recommended future idempotency: accept a patient-scoped idempotency key for create, persist a unique scope/key record or a partial unique invariant suitable for the business rule, and make request-finalisation/notification paths idempotent. Do not use client-side disabling as the integrity mechanism.

## Q. Downstream lifecycle and settlement impact

On successful payment, `MarkPaymentSucceededUseCase` delegates to `OrchestrateSessionPaymentStatusService`, which confirms the Session and captures the current `SessionSchedulePolicyService` snapshot/schedule revision. `OperationalNotificationService` builds the durable reminder plan. From there an INSTANT Session uses normal session lifecycle, join-bootstrap/join policy, attendance, completion/no-show handling, financial calculation/commission, practitioner earnings, review/settlement, payout, refund, and reporting paths because it is a canonical `Session` with `flowType: INSTANT`.

The key rule for future changes: preserve `flowType: INSTANT`, source payment snapshot, original `InstantBookingRequest` link, and session funding/financial fields so finance can distinguish instant operational sessions without creating a second settlement model. An unpaid accepted request expires as `PENDING_PAYMENT`; it must not create earnings or payouts.

## R. Seed and test strategy

No seed changes were made. The existing `session-access`/Instant-focused tests cover eligibility, stale presence, request acceptance, price snapshots, and normal session lifecycle components. Future implementation should add deterministic test fixtures rather than modify production logic during discovery.

Required focused coverage for a future change:

* public directory/profile returns scheduled values today and the new server-authoritative instant quote only when intended;
* EGP and USD remain separate price buckets; Egypt selects EGP, non-Egypt/unknown selects USD, and no code sums/cross-converts them;
* each of 30/60-minute instant snapshots survives profile price edits between request and payment;
* promo eligibility/discount is calculated server-side and payment snapshots remain stable;
* presence freshness, ONLINE/BUSY/OFFLINE, readiness flag, conflict, visibility, and the revised no-weekly-availability policy are tested separately;
* request TTL and payment reservation are configurable, snapshotted/persisted, and expiry is enforced by the backend;
* concurrent duplicate create and competing-patient acceptance have explicit expected outcomes;
* accepted-and-paid instant sessions enter reminders, join, completion, earnings, settlement, refund, and reporting exactly once;
* video-only rejection is covered at scheduled, package, and Instant creation boundaries.

## S. Gap list

| Severity | Gap | Why it matters |
| --- | --- | --- |
| BLOCKER | Directory/profile display only scheduled prices and cannot create an instant request. | The requested profile-first Instant booking journey does not exist. |
| BLOCKER | Weekly availability/exception is required by Instant eligibility. | Contradicts the stated online-and-enabled Immediate booking rule. |
| HIGH | Instant request TTL (2m) and payment reservation (15m) are hard-coded, not typed Database Config policy. | Operations cannot change the policy safely and no policy snapshot is recorded. |
| HIGH | Public profile lacks a server-derived instant quote/eligibility summary. | UI would otherwise need to guess readiness/pricing from public presence. |
| HIGH | Instant creation has no persisted idempotency key/DB uniqueness protection; competing requests are not resolved on acceptance. | Race/duplicate operational risk. |
| HIGH | No immediate practitioner notification on new request; queue polling is the only discovery mechanism. | Practitioner can miss the short response window. |
| MEDIUM | Promo codes work only after acceptance on the generic payment page. | Product cannot show/confirm discounted final price at the desired entry point. |
| MEDIUM | AUDIO remains accepted across Instant and broader session/package APIs. | Diverges from video-only rule. |
| MEDIUM | Process-local expiry sweeper has no observed multi-instance leadership/claim protocol. | Potential duplicated work/delivery in scaled deployment. |
| LOW | The profile exposes instant readiness even when other eligibility checks fail. | It is display-safe but can create confusing UX without an explicit availability summary. |

## T. Recommended implementation phases

1. **Policy and integrity:** add typed Database Config definitions for Instant response/payment windows, validate and persist the selected expiry/policy snapshot; add idempotency and exact competing-request behaviour; make all future creation video-only if confirmed.
2. **Eligibility correction:** change the centralized eligibility service so weekly availability no longer gates Instant when the approved product policy says it should not, while retaining visibility, fresh ONLINE state, explicit readiness, pricing completeness, and conflict checks.
3. **Server quote contract:** extend the public-profile/read contract with a trusted-country selected Instant quote and non-authorising display state; keep four stored price fields and return only one selected currency for the current request.
4. **Existing profile UX:** add the profile action on Web and Mobile, collect duration and optional promo code, call the existing request endpoint, and reuse the existing accepted-session payment route. Do not add a competing patient page.
5. **Durable notification and observability:** send idempotent practitioner request notifications, improve expiry-worker ownership/metrics, and retain stable internal routes.
6. **Regression and seed proof:** add focused unit/integration/e2e coverage for currency isolation, snapshots, promo, config snapshots, concurrency, video-only, payment expiry, and downstream finance lifecycle.

## Evidence index

* Backend pricing/country: `src/common/payments/payment-region.resolver.ts`, `src/common/country-resolution/trusted-country-resolution.service.ts`, `src/common/country-resolution/trusted-country-resolution.middleware.ts`, `src/modules/practitioners/services/public-practitioner-pricing-context.service.ts`, `src/modules/practitioners/utils/public-practitioner-pricing.util.ts`.
* Public directory/profile: `src/modules/practitioners/controllers/public-practitioner.controller.ts`, `list-public-practitioners.use-case.ts`, `get-public-practitioner-details.use-case.ts`; Web `PractitionerCard.tsx`, `ProfileBookingPanel.tsx`, `PublicAvailabilityViewer.tsx`.
* Instant lifecycle: `src/modules/instant-booking/services/validate-instant-booking-eligibility.service.ts`, `use-cases/create-instant-booking-request.use-case.ts`, `use-cases/accept-instant-booking-request.use-case.ts`, `services/create-session-from-instant-booking.service.ts`, `services/instant-booking-expiry-sweeper.service.ts`.
* Payment/promo/downstream: `calculate-session-financial-breakdown.service.ts`, `initiate-session-payment.use-case.ts`, `validate-coupon-eligibility.service.ts`, `redeem-coupon.service.ts`, `mark-payment-succeeded.use-case.ts`, `orchestrate-session-payment-status.service.ts`.
* Presence/config: `src/modules/presence/utils/presence-liveness.ts`, `practitioner-presence.repository.ts`, `src/modules/config/registry/config.definitions.ts`, `src/modules/config/services/session-schedule-policy.service.ts`; equivalent Web/Mobile heartbeat hooks.

## No-change confirmation

Only this discovery document was created. No backend, frontend, mobile, database, migration, seed, API, pricing, promo, payment, notification, or UI code was modified.

SAWIYAA_INSTANT_BOOKING_PRICING_ENTRY_DISCOVERY_COMPLETED
