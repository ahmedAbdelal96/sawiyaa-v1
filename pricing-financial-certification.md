# Sawiyaa Pricing and Financial Certification

**Certification date:** 2026-07-20  
**Repository:** `D:\Web\full-projects\sawiyaa`  
**Scope:** individual sessions, session packages, and academy/training enrollments  
**Change policy:** no commit, push, deployment, database mutation, or migration execution was performed.

## Certification decision

**NOT CERTIFIED / NOT PRODUCTION READY.**

The current code has meaningful financial controls, but the requested proof chain is incomplete. The blockers are:

1. The current production Nginx file does not configure `set_real_ip_from`, `real_ip_header CF-Connecting-IP`, or `real_ip_recursive`. The deployment README documents these directives, but the mounted file does not contain them.
2. The repository has no invoice model, invoice repository, invoice use case, invoice controller, or invoice test for the three paid products. `MANUAL_INVOICE` is only a payment-purpose enum value. Invoice amount/currency equality therefore cannot be proven.
3. `normalizeCountryIsoCode` accepts any two-character value after sentinel filtering; it is not a real ISO-country allowlist. `AA`, for example, is structurally accepted.
4. The fresh targeted test run failed. Payment-initiation fixtures omit the now-required trusted request country, and package payment lifecycle fixtures do not provide `SessionLifecycleService.transition`.
5. Prisma schema drift exists: `PractitionerPayoutDestination.countryCode` is present in `prisma/schema.prisma` but has no matching migration in `prisma/migrations`.

Because invoice equality, production IP trust, real country allowlisting, and the complete financial test suite are not proven, no claim is made that every displayed amount is necessarily the amount invoiced or charged in production.

## 1. Current diff inventory

The worktree contains a large pre-existing dirty diff. The following is the complete current diff subset matching pricing, payment, refund, country, currency, package, academy, financial, or deployment concerns, plus the two new untracked financial utility/test files:

### Backend pricing/payment files

```text
sawiyaa-backend-v1/src/common/payments/payment-region.resolver.spec.ts
sawiyaa-backend-v1/src/common/payments/payment-region.resolver.ts
sawiyaa-backend-v1/src/modules/academy/programs/controllers/admin-academy-programs.controller.ts
sawiyaa-backend-v1/src/modules/academy/programs/controllers/public-academy-programs.controller.ts
sawiyaa-backend-v1/src/modules/academy/programs/presenters/academy-program.presenter.ts
sawiyaa-backend-v1/src/modules/academy/programs/presenters/academy-program-enrollment.presenter.ts
sawiyaa-backend-v1/src/modules/academy/programs/use-cases/create-academy-program-enrollment.use-case.ts
sawiyaa-backend-v1/src/modules/academy/programs/use-cases/create-admin-academy-program-enrollment.use-case.ts
sawiyaa-backend-v1/src/modules/academy/programs/use-cases/get-patient-academy-program-enrollment.use-case.ts
sawiyaa-backend-v1/src/modules/academy/programs/use-cases/get-patient-academy-program-enrollment-payment-redirect.use-case.ts
sawiyaa-backend-v1/src/modules/academy/programs/use-cases/get-public-academy-program-by-slug.use-case.ts
sawiyaa-backend-v1/src/modules/academy/programs/use-cases/get-public-academy-program-enrollment-payment-redirect.use-case.ts
sawiyaa-backend-v1/src/modules/academy/programs/use-cases/list-public-academy-programs.use-case.ts
sawiyaa-backend-v1/src/modules/academy/utils/academy-pricing.util.ts
sawiyaa-backend-v1/src/modules/auth/utils/request-country-context.util.ts
sawiyaa-backend-v1/src/modules/financial-operations/repositories/financial-operations-practitioner.repository.ts
sawiyaa-backend-v1/src/modules/financial-operations/services/practitioner-manual-payout-balance.service.ts
sawiyaa-backend-v1/src/modules/financial-operations/services/record-settlement-payout.service.ts
sawiyaa-backend-v1/src/modules/financial-operations/types/financial-operations.types.ts
sawiyaa-backend-v1/src/modules/financial-rules/services/calculate-session-financial-breakdown.service.ts
sawiyaa-backend-v1/src/modules/financial-rules/types/financial-rules.types.ts
sawiyaa-backend-v1/src/modules/package-plans/controllers/patient-package-purchases.controller.ts
sawiyaa-backend-v1/src/modules/package-plans/controllers/patient-package-quotes.controller.ts
sawiyaa-backend-v1/src/modules/package-plans/controllers/public-package-plans.controller.ts
sawiyaa-backend-v1/src/modules/package-plans/services/package-quote-calculator.service.ts
sawiyaa-backend-v1/src/modules/package-plans/use-cases/create-package-purchase.use-case.ts
sawiyaa-backend-v1/src/modules/package-plans/use-cases/initiate-package-purchase-payment.use-case.ts
sawiyaa-backend-v1/src/modules/package-plans/use-cases/list-public-package-plans.use-case.ts
sawiyaa-backend-v1/src/modules/package-plans/use-cases/quote-package-plan.use-case.ts
sawiyaa-backend-v1/src/modules/payments/controllers/patient-payments.controller.ts
sawiyaa-backend-v1/src/modules/payments/providers/payment-provider-adapter.interface.ts
sawiyaa-backend-v1/src/modules/payments/providers/paymob-payment-provider.adapter.ts
sawiyaa-backend-v1/src/modules/payments/providers/stripe-payment-provider.adapter.ts
sawiyaa-backend-v1/src/modules/payments/services/resolve-session-payment-pricing.service.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/get-patient-session-payment-capabilities.use-case.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/handle-paymob-webhook.use-case.spec.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/handle-paymob-webhook.use-case.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/handle-stripe-webhook.use-case.spec.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/handle-stripe-webhook.use-case.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/reconcile-session-payment-return.use-case.spec.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/reconcile-session-payment-return.use-case.ts
sawiyaa-backend-v1/src/modules/payments/use-cases/request-payment-refund.use-case.ts
sawiyaa-backend-v1/src/modules/payments/utils/money-units.util.ts [untracked]
sawiyaa-backend-v1/src/modules/payments/utils/money-units.util.spec.ts [untracked]
sawiyaa-backend-v1/src/modules/practitioners/services/public-practitioner-pricing-context.service.ts
sawiyaa-backend-v1/src/modules/practitioners/utils/public-practitioner-pricing.util.ts
```

### Frontend/mobile/deployment files

```text
sawiyaa-frontend-v1/src/features/academy/components/PublicAcademyDetailScreen.tsx
sawiyaa-frontend-v1/src/features/academy/components/PublicAcademyHomeScreen.tsx
sawiyaa-frontend-v1/src/features/academy-programs/types/academy-programs.types.ts
sawiyaa-frontend-v1/src/features/package-plans/components/PackagePlansSection.tsx
sawiyaa-frontend-v1/src/features/package-plans/components/PackagePurchaseFlowModal.tsx
sawiyaa-frontend-v1/src/features/package-plans/components/PackagePurchasePaymentAction.tsx
sawiyaa-frontend-v1/src/features/package-plans/components/PatientPackagePurchaseDetailPanel.tsx
sawiyaa-frontend-v1/src/features/package-plans/components/PatientPackagePurchasesPanel.tsx
sawiyaa-frontend-v1/src/features/package-plans/hooks/use-package-plans.ts
sawiyaa-frontend-v1/src/features/payments/components/PaySessionPanel.tsx
sawiyaa-frontend-v1/src/features/payments/lib/patient-currency.ts
sawiyaa-frontend-v1/src/features/practitioners-discovery/lib/public-pricing.ts
sawiyaa-mobile/src/features/patient/academy/components/AcademyBrowseScreen.tsx
sawiyaa-mobile/src/features/patient/academy/components/AcademyDetailScreen.tsx
sawiyaa-mobile/src/features/patient/academy/components/AcademyEnrollmentCreateScreen.tsx
sawiyaa-mobile/src/features/patient/academy/display.ts
sawiyaa-mobile/src/features/patient/academy/types.ts
sawiyaa-mobile/src/lib/currency.ts
deploy/nginx/sawiyaa.conf
deploy/README.md
docker-compose.prod.yml [unchanged in current diff; inspected]
```

The complete diff also contains unrelated application, generated Prisma, localization, and administrative changes. They were not treated as financial certification evidence.

## 2. Product financial-chain matrix

| Product | Display source | Quote source | Persisted snapshot | Gateway request | Verified webhook | Invoice | Refund | Result |
|---|---|---|---|---|---|---|---|---|
| Individual session | Backend session pricing/breakdown and `PaymentMapper` `amountTotal`/`currencyCode` | `ResolveSessionPaymentPricingService` using trusted request country | `Payment.amountTotal`, `Payment.currencyCode`, plus wallet/gateway split metadata | `toGatewayMinorUnits(amountFromGateway, pricing.currencyCode)` | Stripe/Paymob adapters now expose amount/currency; handlers compare against `Payment` | No invoice implementation found | `Refund.currencyCode = payment.currencyCode`; amount bounded through refund eligibility and succeeded-refund aggregate | Partial proof only; invoice and full integration tests missing |
| Session package | Package quote response | `PackageQuoteCalculatorService` and quote use case | `PatientPackagePurchase.currencyCodeSnapshot`, `patientPayableTotalSnapshot`; linked `Payment` repeats amount/currency | `toGatewayMinorUnits(patientPayableTotalSnapshot, currencyCodeSnapshot)` | Shared Stripe/Paymob payment webhook handlers validate linked `Payment` | No invoice implementation found | Refund uses persisted `Payment` amount/currency | Partial proof only; package lifecycle tests currently fail from stale mocks |
| Academy/training | Public academy presenter returns `priceAmount`/`currencyCode`; enrollment/payment presenter returns persisted payment values | `resolveAcademyCheckoutPricing` with trusted request country for new enrollment | Enrollment amount/currency snapshot plus linked `Payment.amountTotal`/`currencyCode` | `toGatewayMinorUnits(createdPayment.amountTotal, createdPayment.currencyCode)` | Shared Stripe/Paymob webhook handlers validate linked `Payment` | No invoice implementation found | No academy-specific refund/invoice chain proving equality found | Partial proof only; invoice and end-to-end academy tests missing |

The matrix cannot be upgraded to “proven” because the invoice column is absent for every product.

## 3. Exact money examples

The Decimal conversion utility proves these unit conversions in isolation:

| Region | Major amount | Currency | Gateway minor amount | Expected webhook amount | Refund currency |
|---|---:|---|---:|---|---|
| Egypt | 500.00 | EGP | 50000 | 50000 | EGP |
| Outside Egypt | 20.00 | USD | 2000 | 2000 | USD |

`money-units.util.spec.ts` currently tests exact conversion, including `10.10 -> 1010`, and amount/currency match/mismatch behavior. It does **not** prove that all three product displays, quotes, persisted rows, gateways, invoices, and refunds carry those examples end to end.

## 4. Snapshot persistence

### Sessions

The session payment use case computes the current trusted-region price, then creates a `Payment` with `amountTotal` and `currencyCode`. Subsequent checkout refreshes use the active persisted payment. The session itself does not contain a dedicated immutable price snapshot; the payment row is the transaction snapshot.

### Packages

`create-package-purchase.use-case.ts` persists `currencyCodeSnapshot` and `patientPayableTotalSnapshot` on `PatientPackagePurchase`. Payment initiation reads those values and creates/updates the linked `Payment`.

### Academy

Academy enrollment creation persists the selected amount/currency snapshot and creates a linked `Payment`. Later enrollment payment redirects read the existing payment snapshot rather than recomputing the public catalog price.

## 5. Webhook and payment verification

Implemented controls:

- Stripe and Paymob adapters parse provider amount/currency.
- Webhook handlers verify provider signatures/HMAC before processing.
- Provider reference is used to locate the persisted payment.
- Amount and currency are compared using `gatewayMoneyMatchesPayment`.
- A mismatch records `FINANCIAL_MISMATCH_AMOUNT_OR_CURRENCY` and does not fulfill the payment.
- Existing terminal/captured states are handled idempotently.
- Browser payment-return flags no longer capture pending payments; settlement must come from provider validation.

Not proven by the current test suite:

- Dedicated wrong-reference tests for both providers.
- A complete duplicate-webhook assertion for every product and both providers.
- Academy and package provider webhook integration tests using real persisted fixtures.
- Live Stripe/Paymob signature, amount, currency, and reference integration.

## 6. Refund review

The refund use case:

- Reads the persisted payment first.
- Preserves `payment.currencyCode` when creating the refund.
- Resolves requested amount against the payment total and already-succeeded refund aggregate.
- Uses a transaction/advisory lock and rejects active duplicate refunds.
- Supports explicit retry by refund ID rather than creating an unrelated refund.
- Converts the persisted refund amount to gateway minor units.

The repository contains refund unit tests, but the fresh certification run did not establish every requested case as a passing end-to-end test: original currency preservation, cumulative over-refund, duplicate idempotency, and client amount override protection need explicit assertions in one complete suite.

## 7. Country resolution and SSR

Current behavior:

- Production pricing reads `cf-ipcountry` only.
- `X-Forwarded-For`, `X-Real-IP`, `X-GeoIP-Country`, and Vercel country headers are not accepted by the backend resolver.
- `XX`, `ZZ`, `T1`, `UNKNOWN`, `UN`, malformed, empty, and unsupported-length values are unavailable.
- The resolver currently accepts any two-character value, not a real ISO allowlist; this is a certification failure.
- Stored account country must not select new pricing, but older learner/account country resolution code remains for profile/contact metadata and must not be confused with pricing authority.

Next.js SSR uses `src/lib/api/server-http-client.ts`:

- It reads incoming request headers and forwards `cf-ipcountry` to the backend.
- It forwards some legacy geo headers too, but the backend ignores them.
- It uses `cache: "no-store"`.
- Docker uses `/api/v1` and the frontend rewrite target `http://backend:7000`.
- If no request context exists, it does not fabricate a country; backend resolution should return unavailable.

The SSR path is structurally safe, but there is no dedicated SSR/client parity test proving an Egypt request reaches both paths with the same trusted context.

## 8. Nginx, Docker, and cache review

`docker-compose.prod.yml` correctly exposes only Nginx ports. Backend and frontend use `expose`, not host `ports`, and share the internal Docker network. The Nginx container mounts `./deploy/nginx/sawiyaa.conf` read-only.

The actual Nginx file overwrites `X-Forwarded-For` and `X-Real-IP` with `$remote_addr`, but it does **not** contain:

```nginx
set_real_ip_from <cloudflare-cidr>;
real_ip_header CF-Connecting-IP;
real_ip_recursive on;
```

Therefore the real client IP is not proven in production. Cloudflare-only origin access is only documented in `deploy/README.md`; it is not enforced by Docker or Nginx itself.

The backend sets region-sensitive API responses to private/no-store, and the Next.js server client uses no-store. However, public Academy controller code still explicitly sets public cache headers for cover assets; those assets are not price responses. Cloudflare cache bypass for pricing APIs remains a required external configuration and was not testable from the repository.

## 9. Prisma migration review

`npx prisma validate --schema prisma/schema.prisma` passed.

The current schema diff adds:

```prisma
PractitionerPayoutDestination.countryCode String? @db.VarChar(2)
```

No migration adds this column. `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` could not run without a shadow database URL, but direct inspection proves the migration is absent. No migration was applied or tested against a database.

This is unrelated to the three paid-product price snapshots, but it prevents certifying the current repository as migration-clean.

## 10. Fresh validation results

| Check | Result |
|---|---|
| Prisma schema validation | PASS |
| Backend targeted financial/payment tests | FAIL: stale package lifecycle mocks; payment/package initiation fixtures omit required request country |
| Backend payment adapter tests | Included in targeted run; suite result not certifying because combined run failed |
| Backend webhook tests | Included; focused webhook tests previously pass, but combined certification run is not all-green |
| Backend refund tests | Included; combined certification run not all-green |
| Backend `npm run typecheck` | PASS |
| Backend `npm run build` | PASS |
| Frontend `npm run typecheck` | PASS |
| Frontend `npm run i18n:check` | PASS |
| Frontend `npm run build` | PASS |
| Targeted frontend ESLint | PASS |
| Mobile `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS, with expected CRLF conversion warnings |

The failing tests are evidence against certification and must be fixed/rerun before release.

## 11. Required remediation before certification

1. Add a real ISO-3166 allowlist and test every requested invalid value plus representative valid countries.
2. Add Cloudflare real-IP directives to the actual mounted Nginx configuration and enforce a Cloudflare-only origin firewall.
3. Add or identify the invoice domain. For each product, persist invoice amount/currency from the payment snapshot and test it.
4. Add a migration for `PractitionerPayoutDestination.countryCode`, or remove the unrelated schema drift before certification.
5. Update stale payment/package test fixtures with a trusted request country and `SessionLifecycleService.transition` mock.
6. Add exact 500.00 EGP/20.00 USD end-to-end unit tests for sessions, packages, and academy.
7. Add explicit Stripe/Paymob wrong amount, wrong currency, wrong reference, failure, and duplicate webhook tests.
8. Add explicit refund tests for currency preservation, cumulative limits, duplicate requests, and client amount override.
9. Add SSR/client country-parity tests and a cache-isolation test.
10. Rerun the complete requested suite and only then reconsider production readiness.

## Certification conclusion

The current implementation demonstrates a strong direction: backend-authoritative regional pricing, persisted payment snapshots, Decimal gateway conversion, webhook amount/currency checks, and no browser-return capture bypass. It does not prove the requested equality chain for all three paid products because invoice infrastructure is absent, production real-IP configuration is incomplete, the country validator is not a real allowlist, and the full financial test run fails. **Do not deploy or label this code financially certified.**
