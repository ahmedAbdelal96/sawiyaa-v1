# Sawiyaa Configuration Governance Foundation

## Scope

Phase 0A/0B/0C establishes metadata and architecture checks only. It does not alter resolver behavior, database values, seed behavior, APIs, or consumers.

## Ownership

| Owner                | Boundary                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `ENV_SECRET`         | API credentials, signing keys, and other secrets; never Admin-editable.                     |
| `ENV_INFRASTRUCTURE` | Database, Redis, port, bootstrap, and deployment wiring available before DB access.         |
| `DATABASE_CONFIG`    | Admin-editable operational/business policy resolved through the Config facade.              |
| `CODE_INVARIANT`     | Non-configurable protocol/domain invariant.                                                 |
| `USER_PREFERENCE`    | User locale, timezone, and notification preferences in Settings.                            |
| `ENTITY_SNAPSHOT`    | Historical policy copied onto a session/order/payment decision.                             |
| `TEST_ONLY`          | Test fixtures only; never a production setting.                                             |

## Registry contract

`src/modules/config/config.registry.ts` is the developer-facing facade over the canonical `CONFIG_KEYS` namespace and immutable definitions. Each definition declares owner, type, default policy, editability, sensitivity, scopes, failure mode, status, and snapshot policy. Derived key coverage prevents a separate hand-maintained key list from drifting.

The enforcement rule is: **one value, one owner, one read path, one write path**. `DATABASE_CONFIG` values are read through `ConfigRuntimeService` and written through `ConfigurationManagementService`; ENV-owned values have no database fallback or editable catalog authority.

Existing catalog strings remain unchanged. Legacy/duplicated/partial/write-only entries are labeled rather than made to appear authoritative. No future Session key is registered.

## Read/write boundary

Future domain reads must go through a typed Config facade, not direct Prisma or raw key literals. Writes must go through `ConfigurationManagementService` with reason, authorization, audit, and concurrency controls. The additive Config seed is the only direct table bootstrap exception; payment bootstrap commands call the management service rather than owning ConfigValue lifecycle.

## Defaults, failure, and scope

`SAFE_DEFAULT` preserves a safe code/catalog default; `OPTIONAL_UNAVAILABLE` disables an optional integration when absent; `REQUIRED_FAIL_CLOSED` is reserved for required security values; `CATALOG_DEFAULT_COMPATIBILITY` records current resolver behavior without changing it. Supported scopes are exactly `GLOBAL`, `COUNTRY`, `SPECIALTY`, `PRACTITIONER`, `ROLE`, `CHANNEL`, and `ENVIRONMENT`.

Secrets cannot be editable. Database config is not a secret store. Payment credentials, JWT secrets, SMTP/Brevo/Stripe/Paymob credentials, and database/Redis URLs remain ENV-owned.

JSON entries currently use `JSON_UNVALIDATED` and are not Admin-editable. They may become editable only after a per-key `JSON_SCHEMA` validator is introduced. The registry intentionally does not pretend that arbitrary Prisma JSON is safely governed.

## Current catalog status

The registry covers the 21 keys in `prisma/seed/modules/config.seed.ts`: platform locale; auth OTP and password reset TTLs; JWT TTL; practitioner review flag; notification defaults; package flags; Paymob provider settings; Stripe provider settings; and payment routing settings. OTP/JWT entries are duplicated with ENV and are not authoritative. Platform locale, practitioner review, and notification channel entries are seeded-but-unused. Provider settings are partial/hybrid because credentials remain ENV-owned. Routing defaults/priority/fallback are write-only/partial until runtime consumption is complete.

## Deprecation and seed safety

Renaming a key requires a compatibility alias, migration metadata, and a deliberate consumer migration. `config.seed.ts` is now additive: it creates missing catalog rows and missing `GLOBAL`/`scopeRefId = null` initial values, while preserving any existing value regardless of active state, priority, or effective dates. It never calls `deleteMany`, never changes existing values, and never fabricates ConfigChangeLog records. Catalog identity/type conflicts fail without repair. Initialization runs in a Serializable transaction with bounded retry for PostgreSQL serialization/unique conflicts.

The seed's initial-value identity is the configuration key plus global scope and null scope reference. The absence of a database unique constraint means Serializable transactions are the strongest application-level protection currently available without a migration. The seed reports a structured summary to tests; the root orchestrator continues to report only module completion timing.

The root `npm run prisma:seed` command still runs many development/fixture modules. A safe Config module does not make that full root seed production-safe. Production should use a future isolated Config bootstrap command or invoke only the additive Config module after deployment preflight; do not run the full root seed against production.

## ENV cleanup prerequisites

Before removing an ENV variable, identify all readers, classify it, provide a replacement owner, define startup/failure behavior, migrate consumers, and preserve deployment documentation. Secrets must never be copied to the database catalog.

## Contributor checklist

Declare one owner, canonical key, type, default policy, failure mode, scopes, sensitivity, editability, audit requirements, and snapshot policy. Add a definition and focused registry tests. Do not add raw literals, direct Config table access, or an ENV duplicate without an explicit allowlist reason and migration phase.

## Decision record

The registry is governance metadata, not a second resolver. It is loaded at module import, performs no database calls, and is not injected into domain services during this phase. A future Platform Settings facade should own authorization, validation, audit, step-up, reason, and optimistic concurrency before any direct-writer migration.

## Boundary enforcement limitations

The initial boundary helper is deterministic regex-based source inspection, not an AST compiler plugin. It recognizes the canonical quoted key forms, common Prisma model names, and direct `process.env`/`ConfigService.get` forms. It does not prove alias-based access, computed property names, arbitrary template interpolation, or semantic ownership. Production code, tests, docs, generated output, seed, and scripts must be scanned by a repository runner in the next enforcement increment; exact allowlists are path-based and category-specific, and each entry must be verified as existing and still violating its declared boundary.
