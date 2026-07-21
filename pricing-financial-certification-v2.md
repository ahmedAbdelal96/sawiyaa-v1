# Sawiyaa pricing and financial-integrity implementation certification

Date: 2026-07-20  
Repository: `D:\Web\full-projects\sawiyaa`

## Certification status

**Not production-ready certified.** The pricing/payment implementation changes are present and the targeted pricing, payment, package, academy, webhook, refund, country, and SSR/controller checks pass. Production Nginx validation and disposable-database migration testing could not run because Docker Desktop's Linux engine is unavailable and Nginx is not installed on the host. The repository-wide backend Jest run also has unrelated pre-existing failures outside the financial scope.

No commit, push, deploy, or production database mutation was performed.

## Decision table

| Trusted current request country | Pricing result |
| --- | --- |
| `EG` (and legacy `EGY`, normalized to `EG`) | EGP |
| Any valid ISO-3166 Alpha-2 other than `EG` | USD |
| Missing, malformed, unsupported, `AA`, `ZZ`, `XX`, `T1`, `UN`, `UNKNOWN`, or empty | `PRICING_REGION_UNAVAILABLE`; no amount/currency |

Stored account country, practitioner country, request body, query string, cookie, frontend state, and client-requested currency are not pricing authorities.

## Current execution flow

Cloudflare supplies `CF-Connecting-IP` and `CF-IPCountry`; the mounted Nginx file only applies the real-IP transformation to Cloudflare CIDRs, overwrites forwarding headers, and forwards the request to the internal frontend/backend network. NestJS receives the trusted country context through `resolveCountryFromRequest`. The shared payment-region resolver validates the ISO allowlist and chooses the currency. Display/quote APIs return backend `amount` and `currencyCode`; Next.js server requests use `cache: no-store`, forward the edge country context, and do not calculate currency. Payment initiation creates a persisted amount/currency snapshot, provider adapters create gateway amounts from that snapshot, webhooks compare provider amount/currency/reference against it, and refunds use the persisted payment currency and amount limits.

Academy checkout now returns an unavailable state when country is unresolved. No invoice domain was found for these products, so invoice certification is explicitly excluded; no invoice subsystem or placeholder was added.

## Product financial-chain matrix

The contract test `sawiyaa-backend-v1/src/modules/payments/financial-chain.contract.spec.ts` executes the matrix independently for sessions, packages, and academy.

| Product | Region | Display | Quote | Persisted snapshot | Gateway minor amount | Webhook expected | Refund |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| Individual session | Egypt | `500.00 EGP` | `500.00 EGP` | `500.00 EGP` | `50000` | `50000 EGP` | `EGP`, original amount |
| Individual session | Outside Egypt | `20.00 USD` | `20.00 USD` | `20.00 USD` | `2000` | `2000 USD` | `USD`, original amount |
| Session package | Egypt | `500.00 EGP` | `500.00 EGP` | `500.00 EGP` | `50000` | `50000 EGP` | `EGP`, original amount |
| Session package | Outside Egypt | `20.00 USD` | `20.00 USD` | `20.00 USD` | `2000` | `2000 USD` | `USD`, original amount |
| Academy enrollment | Egypt | `500.00 EGP` | `500.00 EGP` | `500.00 EGP` | `50000` | `50000 EGP` | `EGP`, original amount |
| Academy enrollment | Outside Egypt | `20.00 USD` | `20.00 USD` | `20.00 USD` | `2000` | `2000 USD` | `USD`, original amount |

The matrix proves the shared money conversion and matching contract. Provider-specific webhook suites additionally cover wrong amount, wrong currency, wrong reference, and duplicate webhook behavior for Stripe and Paymob. Session/package initiation tests cover ignored client amount/currency, trusted region, and immutable location behavior. Refund tests cover original currency, cumulative limits, duplicate active-refund prevention, retry idempotency, and client amount/currency rejection.

## Exact files changed for this implementation

Infrastructure and schema:

- `deploy/nginx/sawiyaa.conf`
- `deploy/README.md`
- `sawiyaa-backend-v1/prisma/schema.prisma`
- `sawiyaa-backend-v1/prisma/migrations/20260720120000_add_practitioner_payout_country_code/migration.sql`

Shared country/pricing and backend financial paths:

- `sawiyaa-backend-v1/src/modules/auth/utils/request-country-context.util.ts`
- `sawiyaa-backend-v1/src/common/payments/payment-region.resolver.ts`
- `sawiyaa-backend-v1/src/modules/academy/utils/academy-pricing.util.ts`
- `sawiyaa-backend-v1/src/main.ts`
- `sawiyaa-backend-v1/src/modules/payments/providers/payment-provider-adapter.interface.ts`
- `sawiyaa-backend-v1/src/modules/payments/providers/paymob-payment-provider.adapter.ts`
- `sawiyaa-backend-v1/src/modules/payments/providers/stripe-payment-provider.adapter.ts`
- `sawiyaa-backend-v1/src/modules/payments/use-cases/handle-paymob-webhook.use-case.ts`
- `sawiyaa-backend-v1/src/modules/payments/use-cases/handle-stripe-webhook.use-case.ts`
- `sawiyaa-backend-v1/src/modules/payments/use-cases/initiate-session-payment.use-case.ts`
- `sawiyaa-backend-v1/src/modules/payments/use-cases/reconcile-session-payment-return.use-case.ts`
- `sawiyaa-backend-v1/src/modules/payments/use-cases/request-payment-refund.use-case.ts`
- `sawiyaa-backend-v1/src/modules/payments/services/resolve-session-payment-pricing.service.ts`
- `sawiyaa-backend-v1/src/modules/package-plans/services/package-quote-calculator.service.ts`
- `sawiyaa-backend-v1/src/modules/package-plans/use-cases/create-package-purchase.use-case.ts`
- `sawiyaa-backend-v1/src/modules/package-plans/use-cases/handle-package-purchase-payment-success.use-case.ts`
- `sawiyaa-backend-v1/src/modules/package-plans/use-cases/initiate-package-purchase-payment.use-case.ts`
- Academy program presenters/enrollment/payment use cases and public pricing paths under `sawiyaa-backend-v1/src/modules/academy/programs/`
- Public practitioner and instant-booking pricing paths under `sawiyaa-backend-v1/src/modules/practitioners/` and `sawiyaa-backend-v1/src/modules/instant-booking/`

Frontend/mobile authoritative-display paths:

- `sawiyaa-frontend-v1/src/lib/api/server-http-client.ts`
- `sawiyaa-frontend-v1/src/features/payments/`
- `sawiyaa-frontend-v1/src/features/package-plans/`
- `sawiyaa-frontend-v1/src/features/academy/`
- `sawiyaa-frontend-v1/src/features/practitioners-discovery/`
- corresponding academy/journey currency display files under `sawiyaa-mobile/src/`

Tests added/updated include the country allowlist, shared resolver, financial-chain contract, Stripe/Paymob wrong-reference cases, package/session stale trusted-country fixtures, lifecycle mocks, and SSR/controller country-context fixtures.

## Proxy and cache protections

The actual mounted Nginx config contains all current Cloudflare IPv4/IPv6 CIDRs, `real_ip_header CF-Connecting-IP`, and `real_ip_recursive on`. It overwrites `X-Forwarded-For` and `X-Real-IP`. Compose mounts this exact file at `/etc/nginx/conf.d/default.conf:ro`; backend has `expose: 7000` and no host `ports` mapping. Production still requires a Cloudflare-only origin firewall/security-group rule. API and personalized pricing responses are `no-store`; Next.js server fetches are `no-store`; no client currency override is sent as a pricing authority.

Host validation status:

- `nginx -t`: **not executed** — Nginx is not installed.
- Docker Nginx validation and disposable Postgres migration test: **not executed** — Docker client is installed, but the Docker Desktop Linux engine is unavailable.
- `npx prisma validate --schema prisma/schema.prisma`: passed.

## Validation results

Passed:

- Targeted country/resolver tests, including valid ISO codes, EGY normalization, spoofed/sentinel/malformed rejection.
- Final financial-focused backend run: **58 suites passed, 278 tests passed**.
- Financial-chain contract: sessions, packages, academy; Egypt/USD exact amounts and minor units.
- Session/payment initiation and capabilities.
- Package quote, initiation, expiry lifecycle, success/failure handlers.
- Stripe and Paymob webhook targeted suites, including wrong amount/currency/reference and duplicate handling.
- Academy pricing unavailable-region behavior.
- Instant-booking pricing and patient-home SSR/controller country-context tests.
- Backend `npm run typecheck` and `npm run build`.
- Frontend `npm run typecheck`, `npm run i18n:check`, `npm run build`, and targeted ESLint.
- Mobile `npx tsc --noEmit`.
- `git diff --check` exit 0; Git emitted only existing line-ending conversion warnings.

Not a clean repository-wide certification:

- `npm test -- --runInBand` still reports unrelated existing failures in notifications/settings/marketing/availability/logging/seed/OTP areas. Those are outside the pricing/payment implementation and were not modified to hide the failures.
- Infrastructure tests requiring the unavailable Docker/Nginx runtimes remain unexecuted.

## Production configuration required

1. Install the exact `deploy/nginx/sawiyaa.conf` through the Compose read-only mount and run `nginx -t` on the production host.
2. Restrict origin ingress to Cloudflare's published IPv4/IPv6 ranges at the cloud firewall/security group; do not expose backend port 7000 publicly.
3. Run the new Prisma migration against a disposable database first, then production only through the controlled migration process after backup/review.
4. Keep shared CDN/proxy caching disabled for API/personalized pricing responses unless a cache key is explicitly partitioned by the trusted country context.

Because the required infrastructure validations and the repository-wide suite are not clean, this report does not certify production readiness. Within the tested application scope, the implementation prevents stored-account country and client input from selecting the other pricing region; a payment transaction's persisted amount/currency remains authoritative after location changes.
