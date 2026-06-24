# Sawiyaa Instant Booking Implementation Plan

## 1. Full Flow Summary

Instant booking is a fast-path patient experience for sessions now or today with practitioners who are actually available in the current window. The backend remains the source of truth for:

- practitioner eligibility
- available-now decisioning
- duration options
- currency-specific price
- final payable amount
- request expiry
- request acceptance/rejection
- session creation
- payment confirmation

Expected flow:

1. Patient opens Instant Booking.
2. Backend returns eligible practitioners who are truly available now.
3. Patient selects practitioner, duration, and currency.
4. Backend creates an instant booking request with a frozen price quote.
5. Practitioner accepts or rejects the request.
6. On acceptance, backend creates a session in `PENDING_PAYMENT`.
7. Patient pays.
8. Backend confirms payment.
9. Session becomes joinable according to existing session rules.

## 2. Phase Breakdown

### Phase 1, backend instant pricing contract

Goal:

- add backend-owned instant booking prices to practitioner profile data
- expose prices through the practitioner profile and public practitioner read contracts
- add practitioner edit surfaces in web/admin profile flows
- keep frontend from calculating instant prices on its own

Deliverables:

- Prisma schema fields for instant booking prices
- backend DTO/input updates for practitioner profile update and direct-create flows
- profile mapper/read-model updates
- frontend practitioner profile forms to edit the new instant prices
- admin direct-create form to capture the same instant prices
- validation rules requiring all four instant prices when instant booking is enabled

### Phase 2, eligible practitioners API

Goal:

- add a patient-facing API that lists practitioners eligible for instant booking now
- return only minimal discovery data and backend-owned pricing

Deliverables:

- eligible-now practitioner list endpoint
- compact response DTO for patient discovery
- filters for duration, currency, specialty, online state, and instant-booking readiness

Phase 2 completion notes:

- endpoint path: `GET /api/v1/patients/me/instant-booking/practitioners`
- eligibility rules:
  - approved, public, active practitioner profile
  - instant booking enabled presence flag
  - effective online/presence freshness
  - positive instant booking price for at least one supported duration/currency
  - recurring weekly availability plus exceptions and current booking conflict checks
  - only `available now` practitioners are returned in this phase
- response shape:
  - compact paginated list of eligible practitioners
  - `items` includes backend-owned instant pricing, current window end, supported durations, and minimal discovery fields
  - `meta` includes `page`, `limit`, `total`, `hasMore`, and `generatedAt`
- known limitations:
  - this phase intentionally does not expose today/soon/future discovery windows
  - the discovery list is restricted to currently available practitioners only
  - patient UI is not part of Phase 2
- next phase:
  - build patient web discovery UI that consumes this endpoint

### Phase 3, patient web instant booking flow

Goal:

- create a fast, compact web booking entry point
- show available-now practitioners and backend-owned instant prices

Deliverables:

- patient instant booking landing/listing page
- practitioner cards with duration/price options
- request creation and waiting state
- accepted/rejected/expired transitions

Verification notes:

- The patient web flow now renders a real live-eligible practitioner card from backend discovery.
- The page shows backend-owned pricing for 30 and 60 minute durations and does not calculate prices on the frontend.
- Pending, accepted, rejected, and expired request states were verified on the patient web surface using live backend responses.
- A temporary dev/QA open-extra availability window was used to make a seeded practitioner eligible for the positive-path run; this was not a code change.

### Phase 4, practitioner accept/reject flow polish

Goal:

- make request handling faster and safer for practitioners
- keep stale requests from being accepted

Deliverables:

- request inbox polish
- expiry-safe accept/reject handling
- clear request timer/status presentation

Verification notes:

- Practitioners now have two live surfaces:
  - the dashboard priority strip for pending instant-booking requests
  - a dedicated queue page at `/practitioner/instant-booking`
- The queue uses a live countdown for request expiry and refreshes the practitioner inbox while pending requests exist.
- Accept and reject actions are guarded against stale requests by backend expiry revalidation and frontend disabled states.
- The queue currently shows patient name, request duration, mode, request time, expiry time, and status, but it does not yet expose a frozen price quote because the request contract does not include one.
- Phase 5 remains the payment/session hardening phase for accepted requests.

### Phase 5, payment/session hardening

Goal:

- ensure accepted instant-booking sessions follow the safe payment contract
- preserve same-surface return and backend confirmation

Deliverables:

- session creation with `flowType=INSTANT`
- payment initiation from the frozen quote
- payment callback/reconcile checks
- UI refetch after backend confirmation

Verification notes:

- The accepted instant-booking session now resolves payment pricing from the frozen instant quote captured on the request record before falling back to the practitioner instant pricing fields.
- The runtime financial breakdown for the verified session resolved to `paymentPurpose=SESSION_INSTANT_BOOKING`, `currency=EGP`, and `grossAmount=520.00` / `netPaidAmount=520.00`, which matched the eventual initiate response amount.
- The payment-purpose mapping now distinguishes instant sessions from scheduled sessions:
  - `SessionFlowType.INSTANT` -> `PaymentPurpose.SESSION_INSTANT_BOOKING`
  - `SessionFlowType.SCHEDULED` -> `PaymentPurpose.SESSION_BOOKING`
- The session payment initiation path now reads the latest active payment snapshot first so an already-created payment cannot silently fall back to stale or unrelated normal pricing.
- The verified payment initiation call returned a Paymob hosted checkout URL and used the trusted same-surface return URL `http://localhost:3000/ar/patient/sessions/:sessionId/payment-return`.
- Browser QA reached the Paymob checkout URL, but the provider page resolved to `403 Forbidden` in this sandbox/dev setup before a successful external payment completion could be recorded.
- Accepted instant-booking sessions still respect the existing session join policy:
  - before payment confirmation `joinAvailability.canJoin = false`
  - after backend payment confirmation the session follows the existing join window rules
- The returned session remained `PENDING_PAYMENT` after the blocked checkout attempt, so the join/chat guard stayed intact and no premature access was unlocked.
- If an accepted instant-booking session remains unpaid, it stays in the existing pending-payment lifecycle until the normal unpaid-expiry behavior handles it.
- Phase 5 is partially closed: backend pricing and initiation are verified, but the external Paymob sandbox checkout is still blocked by provider-side 403 in this environment.

### Phase 6, mobile parity

Goal:

- mirror the patient web flow on mobile
- keep mobile payment and request status handling consistent with web

Deliverables:

- mobile instant booking discovery
- mobile request creation/waiting screen
- mobile payment transition

## 3. Current Phase Scope

This phase is backend pricing contract plus practitioner pricing capture/edit surfaces only.

In scope:

- add instant booking prices to practitioner profile persistence
- add instant booking prices to update/create DTOs
- expose instant booking prices in profile/read models
- add UI fields in existing practitioner profile editors
- add UI fields in the admin direct-create flow

Out of scope:

- patient instant booking discovery
- patient request lifecycle UI
- practitioner accept/reject queue polish
- payment/session flow implementation changes
- mobile parity

## 4. Decisions Made

1. Instant booking pricing must be backend-owned.
2. Each practitioner needs four instant prices:
   - 30 minutes, EGP
   - 60 minutes, EGP
   - 30 minutes, USD
   - 60 minutes, USD
3. Normal session prices remain separate from instant booking prices.
4. The same pricing contract should be usable by:
   - practitioner self-edit profile
   - practitioner application submit
   - admin direct-create flow
5. Frontend should submit only validated numeric values, never derive pricing locally.

## 5. Open Questions

1. Should instant pricing be required for all approved practitioners, or only when instant booking is enabled?
2. Should instant booking prices be editable only by practitioners/admin, or also visible on public profile cards later?
3. Should patient discovery prefer the practitionerâ€™s live currency or let the patient choose currency explicitly?
4. Should the backend expose instant prices in the same `pricing` object as normal session pricing or under a separate `instantPricing` block?
5. Should the availability API later expose `availableNow` and `earliestStartAt` in one response for discovery?

## 6. Files/Modules Likely to Be Touched

Backend:

- `prisma/schema.prisma`
- `src/modules/practitioners/dto/update-practitioner-profile.dto.ts`
- `src/modules/practitioners/types/practitioner.types.ts`
- `src/modules/practitioners/utils/normalize-practitioner-profile-input.util.ts`
- `src/modules/practitioners/use-cases/update-practitioner-profile.use-case.ts`
- `src/modules/practitioners/use-cases/submit-practitioner-application.use-case.ts`
- `src/modules/practitioners/mappers/practitioner-profile.mapper.ts`
- `src/modules/practitioners/dto/public-practitioner-response.dto.ts`
- `src/modules/practitioners/repositories/public-practitioner-read.repository.ts`
- any profile seed/migration helpers

Frontend:

- `src/features/practitioners/types/practitioners.types.ts`
- `src/features/practitioners/api/practitioners.api.ts`
- `src/features/practitioners/components/PractitionerProfileForm.tsx`
- `src/features/practitioners/components/PractitionerProfileWorkspace.tsx`
- `src/features/practitioners/components/PractitionerApplicationWizardThreeStep.tsx`
- `src/features/admin/practitioner-applications/components/AdminPractitionerCreatePage.tsx`
- `src/features/admin/practitioner-applications/types/practitioner-applications.types.ts`

## 7. Testing Checklist

- backend build passes
- profile DTOs validate four instant price fields
- practitioner profile update persists instant prices
- admin direct-create persists instant prices
- profile read model returns instant prices
- public practitioner read model returns instant prices
- frontend profile/admin create forms render the new fields
- frontend payloads omit empty instant price fields rather than sending garbage values
- no raw translation keys or missing labels in the updated forms

## 8. Phase 4 Runtime Verification Notes

- Temporary dev-only instant booking fixtures were used to validate the accept path end-to-end.
- Patient request `a306376e-1630-4b8c-810a-0da68b230ae7` was accepted by practitioner `dr-youssef-abdallah`.
- The backend created session `7e1e2007-e495-4222-b7b8-ae3e94a8b5bc` with `flowType=INSTANT` and `status=PENDING_PAYMENT`.
- Patient request state now resolves to `ACCEPTED` with `createdSessionId=7e1e2007-e495-4222-b7b8-ae3e94a8b5bc`.
- Practitioner request lists still distinguish `PENDING`, `ACCEPTED`, and `EXPIRED` correctly.
- Clean-up remains required for temporary QA-only requests/exceptions after the verification pass.

## 9. Phase 6 Authenticated Runtime Verification Notes

- Mobile Expo web authenticated QA now covers both patient and practitioner surfaces.
- Patient home exposes the `Ø­Ø¬Ø² ÙÙˆØ±ÙŠ` entry point for logged-in patients.
- Patient discovery returns eligible practitioners only when the practitioner is both online and instant-booking-enabled.
- A dev-only presence mismatch on `dr.mohamed` initially left discovery empty; updating the local practitioner presence to `ONLINE` with `isInstantBookingEnabled=true` restored the browse path for QA without changing production logic.
- Patient browse state renders the instant-practitioner cards with pricing for `30` and `60` minutes.
- Patient request creation transitions to the pending state with a visible expiry countdown and cancel action.
- Practitioner queue renders pending requests, accepted history, and expired history in the authenticated runtime.
- A mobile runtime bug in the practitioner queue hook was fixed so refetch intervals read the API response shape correctly instead of assuming the query data was a raw array.
- After the hook fix, the practitioner queue no longer crashes and shows live pending/handled request cards correctly.
- The authenticated runtime verification was completed on Expo web at `http://localhost:8081` with backend API at `http://localhost:7000`.

## 10. Phase 6B Mobile Visual Polish Notes

- The mobile instant booking surfaces were polished for compact phone viewports without changing any booking or payment behavior.
- Mobile QA viewports used for the visual pass:
  - 390 x 844
  - 360 x 800
  - 430 x 932
- Patient instant booking now keeps the browse, pending, accepted/payment-needed, rejected, expired, and empty states visually compact on small screens.
- Practitioner instant booking queue now keeps the summary and request sections readable on narrow screens without collapsing into dense desktop-like layouts.
- The compact layout uses smaller type and tighter spacing on mobile, while preserving the same data, actions, and state handling.
- Runtime screenshots for the visual pass were saved under `fayed-mobile/test` for comparison and QA reference.
- No backend flow changes were introduced in this visual pass.

## 11. Phase 6C Mobile Scale Alignment Notes

- The Phase 6C follow-up reduced the visual weight of the instant booking mobile surfaces again so they better match the rest of the Sawiyaa mobile product density.
- Additional phone viewports validated during this pass:
  - 360 x 800
  - 390 x 844
  - 430 x 932
- Patient instant booking now uses smaller hero typography, tighter cards, lighter chips, and a more compact request layout on small screens.
- Practitioner instant booking queue now uses the same denser mobile rhythm, with smaller summary blocks, tighter request rows, and a less dominant card stack.
- Runtime screenshots for the Phase 6C pass were saved under `fayed-mobile/test`:
  - `phase6c-patient-browse-390x844.png`
  - `phase6c-patient-pending-360x800.png`
  - `phase6c-patient-accepted-390x844.png`
  - `phase6c-patient-empty-360x800.png`
  - `phase6c-practitioner-queue-pending-390x844.png`
  - `phase6c-practitioner-queue-accepted-390x844.png`
- The practitioner queue screenshots were captured from the authenticated queue route rather than the dashboard, so they reflect the real request states.

## 12. Final Closure Summary

### Completed Phases

- Phase 1: pricing contract closed.
- Phase 2: eligible-now discovery API closed.
- Phase 3: patient web flow closed.
- Phase 4: practitioner web accept/reject closed.
- Phase 5: payment/session hardening partially closed, but Paymob provider QA remains externally blocked.
- Phase 6: mobile parity closed.
- Phase 6B and 6C: mobile visual polish closed.

### Commands and Results

- `cd D:\Web\full-projects\fayed\fayed-backend-v1 && npx prisma generate`
  - passed after stopping the backend dev server that was holding the Prisma engine file open.
- `cd D:\Web\full-projects\fayed\fayed-backend-v1 && npm run build`
  - failed with existing TypeScript errors in `src/modules/sessions/mappers/session.mapper.ts` and `src/modules/sessions/utils/session-chat-policy.util.ts`.
- `cd D:\Web\full-projects\fayed\fayed-frontend-v1 && node test/validate-i18n-duplicate-keys.mjs`
  - passed.
- `cd D:\Web\full-projects\fayed\fayed-frontend-v1 && npm run build`
  - passed.
- `cd D:\Web\full-projects\fayed\fayed-mobile && node test/validate-instant-booking-mobile.mjs`
  - passed.
- `cd D:\Web\full-projects\fayed\fayed-mobile && node test/validate-patient-tabs.mjs`
  - passed.
- `cd D:\Web\full-projects\fayed\fayed-mobile && node node_modules/typescript/bin/tsc --noEmit`
  - passed.
- `cd D:\Web\full-projects\fayed\fayed-mobile && npm run lint`
  - passed with pre-existing warnings only, no errors.

### QA Fixture Cleanup

- Removed one clearly temporary QA instant booking request:
  - `e91dae41-488d-43c4-85d0-37d784e01f80`
- No broader cleanup was performed because the remaining instant booking history entries and practitioner presence states were not clearly distinguishable as temporary QA-only data versus seeded or meaningful dev data.

### Mobile Screenshot References

- `fayed-mobile/test/phase6c-patient-browse-390x844.png`
- `fayed-mobile/test/phase6c-patient-pending-360x800.png`
- `fayed-mobile/test/phase6c-patient-accepted-390x844.png`
- `fayed-mobile/test/phase6c-patient-empty-360x800.png`
- `fayed-mobile/test/phase6c-practitioner-queue-pending-390x844.png`
- `fayed-mobile/test/phase6c-practitioner-queue-accepted-390x844.png`

### Remaining Risks

- Paymob provider QA still needs external approval, so full payment-return closure remains blocked outside the app codebase.
- Backend build currently has unrelated session typing issues.
- Mobile lint still has pre-existing warnings outside Instant Booking.

### Next Recommended Task

- Finish external Paymob sandbox QA, then return to backend session typing cleanup if the project wants a fully green repo build.

