# IP-Based Pricing Context Consistency Closure — P1

## Product Rule

For new patient pricing, the effective patient pricing country is the current trusted request country returned by `resolveCountryFromRequest(request).countryCode`. `PatientProfile.countryId` remains profile/account context and is not the primary pricing source.

## Trusted Country Source

The existing trusted request-country infrastructure is preserved. Controllers pass `resolveCountryFromRequest(request).countryCode`, which is derived from the configured trusted proxy/Cloudflare/GeoIP context and normalized by the existing country utility. Arbitrary query parameters, JSON body values, local storage values, or frontend-selected countries are not used as pricing authority. No second GeoIP implementation was added.

## Effective Pricing Country

The effective patient country at unresolved pricing time is the trusted request country only. The following paths no longer fall back to `PatientProfile.countryId` for new pricing:

- public practitioner pricing context;
- Instant Booking discovery and request creation;
- scheduled session creation;
- package quotes and package purchase creation;
- session financial breakdown and payment readiness.

When the trusted country is unavailable, the existing resolver behavior is preserved: USD/international fallback with unavailable-country context.

## Profile Country Role

`PatientProfile.countryId` was not removed, migrated, or made editable. Patient profile APIs and both clients retain read-only country behavior. Admin correction remains on the existing permissioned and audited route. The profile country is still available for profile/account display and legacy/internal contexts, but pricing contexts explicitly pass the trusted-request-derived effective country.

## Public Pricing

Public practitioner list, detail, filters, featured placements, and Instant Booking discovery continue to receive backend-selected currency and pricing context from the trusted request country. The public practitioner pricing service no longer performs an unnecessary patient profile read and cannot silently substitute profile country.

## Booking Quote

Scheduled and Instant Booking creation use the trusted request country for the initial regional pricing context. Instant Booking stores the effective pricing country alongside its existing pricing snapshot metadata. Scheduled sessions store the effective pricing country in the existing `pricingPolicySnapshotJson` JSON snapshot. No new database column was required.

## Payment Context

Session payment capability and payment initiation consume the session financial breakdown. When a session pricing snapshot exists, its effective pricing country is preferred over a later request country. Payment country metadata now records the effective pricing country rather than the patient profile country. Package payment initiation similarly prefers the package purchase's existing metadata snapshot and falls back to the current trusted request only for older purchases without that snapshot.

## Currency Resolution

The existing `resolvePaymentRegionalResolution` remains authoritative. New patient pricing supplies the trusted request country as its request context and does not pass persisted patient country as a participant-country override. Existing currency behavior remains unchanged: Egypt request context resolves to EGP/local; non-Egypt or unavailable context resolves to USD/international according to the current resolver fallback.

## Commission Rule Resolution

`ResolveCommissionRuleService` remains the only commission-rule authority. The practitioner country continues to come from the authoritative practitioner profile. The effective patient country is resolved from the trusted request ISO code to the active country ID and passed as `pricingPatientCountryId` for new quote/session financial resolution. If trusted country is unavailable, the explicit pricing override is `null`; the stored profile country is not silently reused.

The existing `LOCAL`, `CROSS_BORDER`, and `ANY` market contracts remain intact. No commission percentage was hardcoded in production code, frontend code, fallback logic, or persisted business rules. Configured administrative commission-rule values continue to determine all rates and calculated shares.

## Configurability Validation

Focused tests use configured rule fixtures and verify that selected rule identity, market context, and configured rate values propagate. The implementation does not introduce platform/practitioner percentage constants.

## Snapshot Boundary

Before the authoritative quote/session/payment snapshot, the current trusted request country can determine currency, regional mode, price selection, and commission-rule context. After the snapshot is persisted:

- later IP or network changes do not change the session quote country;
- later IP or network changes do not select a different commission context;
- persisted payment amount, currency, commission, and provider economics remain authoritative;
- historical Sessions, Payments, Package Purchases, Earning Reviews, settlements, refunds, wallets, journals, ledgers, and entitlements are not rewritten.

The snapshot boundary uses existing `pricingPolicySnapshotJson` and existing purchase/payment metadata; no schema migration was added.

## Web

Web discovery/profile/booking surfaces already consume backend-returned amount and currency. Existing Web Instant Booking coverage passed. No Web local country, price, currency, or commission derivation was added. Patient profile country remains read-only.

## Mobile

Mobile patient discovery, profile, booking, package quote, and payment surfaces consume backend-returned pricing fields. The only UI adjustment removed local `EGP` fallback labels from public package/discovery money formatting; unavailable currency now remains unavailable instead of being invented locally. Mobile price guardrail and money contract tests passed, and Mobile TypeScript passed.

## Packages / Instant Booking

Package quote calculation uses the trusted request country for currency and resolves commission context with the trusted request country ID. Package purchase metadata stores the pricing country, and package payment initiation prefers that snapshot over a later IP. Instant Booking discovery/request creation and accepted-session snapshot propagation follow the same rule.

## Security Validation

- Arbitrary frontend country fields are not used by pricing controllers.
- Existing trusted request-country middleware remains the only request-country source.
- Patient profile country cannot be edited through the patient API.
- Raw frontend amount/currency is not made financial truth.
- Current request country cannot mutate a persisted payment snapshot.
- A later IP change cannot reprice or reselect commission context after the quote snapshot.
- Practitioner commission context continues to use practitioner profile country, never practitioner IP.

## Tests

Targeted verification completed:

- Backend: 14 targeted suites, 126 tests passed after the final additions.
- Backend typecheck: `npm run typecheck` passed.
- Web: `npm run typecheck` passed.
- Web component: `npx vitest run src/features/instant-booking/instant-booking-web-ux.test.tsx` — 5/5 passed.
- Mobile: `npx tsc --noEmit` passed.
- Mobile money guardrails/contracts: 2 suites, 7 tests passed.

Coverage includes request-country/profile-country divergence, unavailable country fallback, configured commission rule selection, snapshot precedence after IP change, package payment snapshot precedence, Instant Booking snapshot propagation, and frontend/backend currency consumption guardrails.

## Performance

No new GeoIP implementation or duplicate GeoIP lookup was added. The unused public pricing profile read was removed. One active-country lookup is used only when a commission rule needs the effective request country ID; public display-only paths do not perform that lookup.

## Migration

No schema migration required. No new country field was added. Existing JSON snapshot/metadata containers carry the effective pricing-country snapshot.

## Business Rules Preserved

- Current trusted request/IP country determines new patient pricing.
- Patient profile country remains valid profile context and remains non-editable by patients.
- Practitioner country remains the authoritative practitioner source for commission context.
- Existing regional resolver and USD fallback behavior remain authoritative.
- Existing configurable commission-rule engine remains the sole source of percentages.
- No commission percentage was hardcoded.
- Web and Mobile do not independently derive financial pricing.
- Existing amount/currency/commission/payment snapshots remain authoritative after persistence.
- No historical financial or accounting truth was rewritten.
- Timezone behavior was not changed.
- No entitlement or package business model was redesigned.

## Remaining Issues

No genuine P1 consistency issue remains in the bounded scope. Older sessions or package purchases created before the new JSON snapshot key may use the existing request-country fallback until their financial snapshot is already present; persisted payment snapshots remain authoritative and are not repriced.

## Final Verdict

IP PRICING CONTEXT CONSISTENCY READY
