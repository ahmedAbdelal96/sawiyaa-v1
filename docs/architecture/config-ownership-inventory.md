# Sawiyaa Configuration Ownership Inventory

This inventory records the current ownership boundary. The canonical source for
platform settings is
`sawiyaa-backend-v1/src/modules/config/registry/config.definitions.ts`.
Derived keys, the `CONFIG` facade, catalog metadata, seed metadata, and Admin
API metadata must not be maintained separately.

## Canonical Config Definitions

| Setting/value                                        | Final owner          |    Runtime editable | Admin visible | Secret |    Snapshot-sensitive | Source file                                   |
| ---------------------------------------------------- | -------------------- | ------------------: | ------------: | -----: | --------------------: | --------------------------------------------- |
| `platform.defaultLocale`                             | `DATABASE_CONFIG`    |                 Yes |           Yes |     No |                    No | `config.definitions.ts`                       |
| `features.practitionerApplicationAdminReviewEnabled` | `DATABASE_CONFIG`    |                  No |           Yes |     No |                    No | `config.definitions.ts`                       |
| `notifications.channels.default`                     | `DATABASE_CONFIG`    |                  No |           Yes |     No |                    No | `config.definitions.ts`                       |
| `packages.enabled`                                   | `DATABASE_CONFIG`    |                 Yes |           Yes |     No |                    No | `config.definitions.ts`                       |
| `packages.purchaseEnabled`                           | `DATABASE_CONFIG`    |                 Yes |           Yes |     No |                    No | `config.definitions.ts`                       |
| `payment.provider.paymob.enabled`                    | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No |                    No | `config.definitions.ts`                       |
| `payment.provider.paymob.checkoutFlow`               | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No | Transaction-dependent | `config.definitions.ts`                       |
| `payment.provider.paymob.defaultMethod`              | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No | Transaction-dependent | `config.definitions.ts`                       |
| `payment.provider.paymob.methodRegistry`             | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No |                    No | `config.definitions.ts`                       |
| `payment.provider.paymob.maintenanceMode`            | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No |                    No | `config.definitions.ts`                       |
| `payment.provider.paymob.allowedCountries`           | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No |                    No | `config.definitions.ts`                       |
| `payment.provider.stripe.enabled`                    | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No |                    No | `config.definitions.ts`                       |
| `payment.provider.stripe.maintenanceMode`            | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No |                    No | `config.definitions.ts`                       |
| `payment.provider.stripe.allowedCountries`           | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No |                    No | `config.definitions.ts`                       |
| `payment.routing.defaultProvider`                    | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No | Transaction-dependent | `config.definitions.ts`                       |
| `payment.routing.priorityOrder`                      | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No | Transaction-dependent | `config.definitions.ts`                       |
| `payment.routing.fallbackProvider`                   | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No | Transaction-dependent | `config.definitions.ts`                       |
| `payment.routing.currencyRoutes`                     | `DATABASE_CONFIG`    | Dedicated flow only | Yes/read-only |     No | Transaction-dependent | `config.definitions.ts`                       |
| `auth.otp.loginTtlMinutes`                           | `ENV_INFRASTRUCTURE` |                  No |            No |     No |                    No | `config.definitions.ts` (legacy catalog only) |
| `auth.passwordReset.otpTtlMinutes`                   | `ENV_INFRASTRUCTURE` |                  No |            No |     No |                    No | `config.definitions.ts` (legacy catalog only) |
| `security.jwt.accessTokenTtlMinutes`                 | `ENV_INFRASTRUCTURE` |                  No |            No |     No |                    No | `config.definitions.ts` (legacy catalog only) |

`platform.defaultLocale` is stored as a string for database compatibility but
has semantic type `STRING_ENUM` and exactly `ar`/`en` as allowed values. JSON
payment settings use versioned JSON schemas. Financial settings cannot be
edited through the generic Admin endpoint.

## Ownership Rules

| Owner                | Meaning                            | Examples                                                                      |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_CONFIG`    | Safe platform-wide business policy | package visibility, package purchasing, platform locale                       |
| `ENV_SECRET`         | Secret or credential               | JWT signing material, payment keys, SMTP/storage credentials                  |
| `ENV_INFRASTRUCTURE` | Deployment/runtime topology        | port, database URL, public service URLs, pool/runtime settings                |
| `CODE_INVARIANT`     | Stable safety contract             | UTC storage, IANA timezone validation, currency precedence, fixed error codes |
| `USER_PREFERENCE`    | Per-user preference                | user locale, timezone, notification preferences, theme                        |
| `ENTITY_SNAPSHOT`    | Historical operation value         | booked price, currency, selected provider, session policy snapshot            |
| `TEST_OR_DEV_ONLY`   | Local fixture behavior             | seed users, OTP bypass, fake provider mode, emulator URLs                     |

## Intentionally Not Added

The following remain outside editable Config DB because they are secrets,
infrastructure, user-specific, safety invariants, or require a separate
snapshot/schema phase:

- authentication secrets, OTP/JWT runtime security controls, and rate limits;
- payment credentials, provider URLs, webhook secrets, and storage credentials;
- database/Redis/queue topology and process tuning;
- UTC/IANA/country/currency resolution invariants;
- session, cancellation, refund, fee, payout, and package historical policies
  that would require entity snapshots to avoid changing existing operations;
- user locale/timezone and notification preferences;
- fixed upload MIME/security allowlists unless separately governed.

## Proof Obligations

- `ConfigRuntimeService` is the read boundary for database-owned settings.
- `ConfigurationManagementService` is the write boundary and validates type,
  bounds, enum values, JSON schemas, authorization, optimistic concurrency,
  and atomic batches before persistence.
- Legacy OTP/JWT catalog entries are not Admin-visible, editable, or seeded.
- Payment settings are read-only in generic Admin Platform Settings and use
  the dedicated Payment Gateway Control flow.
- No production seed/bootstrap or database mutation is required for this
  inventory update.
