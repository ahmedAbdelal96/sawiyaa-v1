# How to Add a Platform Setting

Use one owner and one path for every value:

`DATABASE_CONFIG` -> `ConfigRuntimeService` -> `ConfigurationManagementService`

Secrets and infrastructure remain in ENV/Secret Manager. User preferences belong to the user profile, and historical values belong on entity snapshots. Do not add an ENV fallback or a second hardcoded business default for a database setting.

## Decision checklist

Before adding a setting, answer these questions in order:

1. Is it a secret or credential? Keep it in `ENV_SECRET`.
2. Is it infrastructure or deployment topology? Keep it in `ENV_INFRASTRUCTURE`.
3. Is it user-specific? Keep it in the user profile/preferences boundary.
4. Must history preserve the original value? Keep it as an entity snapshot.
5. Is it a stable safety invariant? Keep it in code.
6. Is it a platform-wide runtime business policy? Only then use Config DB.

If the answer is uncertain, do not add a Config definition. Record the reason
in `docs/architecture/config-ownership-inventory.md` and defer it to a
separate domain decision.

## 1. Add the definition

Add the setting under its domain in `src/modules/config/registry/config.definitions.ts`. This file is the canonical definition source. Do not add a parallel entry to `CONFIG_KEYS`, `CONFIG_KEY_LIST`, the registry, the seed module, or the Admin Web: those are derived from the definition/API. The definition must declare its key, type, owner, scopes, safe default policy, editability, permission metadata, failure mode, catalog metadata, seed policy, and `adminVisible` policy. The public `CONFIG` facade exposes the derived key and definition to consumers.

Examples:

```ts
CONFIG.packages.enabled.key;
CONFIG.payment.provider.paymob.maintenanceMode.key;
CONFIG.payment.provider.paymob.methodRegistry.key;
```

## 2. Read and write it

Read database settings through `ConfigRuntimeService` only. Write them through `ConfigurationManagementService` with an authorized actor, reason, audit record, and expected version when updating an existing value. Payment credentials, signing keys, and service URLs are read from ENV infrastructure configuration and are never written to ConfigValue.

## 3. Validate JSON settings

For a JSON setting, register a schema and set `validationStrategy: 'JSON_SCHEMA'` with its schema ID. Do not make arbitrary JSON editable. The Paymob method registry is the reference pattern.

## 4. Seed safely

Declare catalog metadata and an additive initial value in the canonical definition only when a new setting needs a default row. Run the isolated Config seed/bootstrap path after checking that it is additive and idempotent. Existing values, inactive history, and audit records must be preserved.

The production-safe command is:

```bash
npm run db:bootstrap:config
```

It runs only `seedConfigData`; it never invokes the root `prisma:seed` orchestrator or development/fixture modules. Every run requires `ALLOW_CONFIG_BOOTSTRAP=true`. Production and staging also reject localhost databases. Development/test runs require the additional explicit `CONFIG_BOOTSTRAP_ALLOW_DEVELOPMENT=true` flag and a localhost database.

## 5. Keep ENV-owned values out of the registry

ENV secrets and infrastructure values such as `DATABASE_URL`, JWT secrets, payment API keys, and provider URLs must not have editable Config definitions or database seed values. If an old catalog key is retained for compatibility, mark it `LEGACY`, stop creating new values, and reject management writes.

Before finishing, add focused registry/governance tests proving uniqueness, ownership, seed coverage, and absence of duplicate ENV consumers.

Keep the ENV inventory synchronized across runtime validation, `.env.example`,
production/staging examples, deployment configuration, and documentation.
Remove obsolete declarations instead of leaving a silent DB/ENV fallback.

## Admin Platform Settings

The Admin Platform Settings page consumes `GET /api/v1/admin/platform-settings` and renders only definitions that are database-owned, non-legacy, non-sensitive, explicitly `adminVisible`, and supported by the API. Operational edits and resets use the canonical `ConfigurationManagementService`; reads use `ConfigRuntimeService`. Every mutation requires a reason and `expectedUpdatedAt`, and reset deactivates the active override while preserving history.

Payment settings are intentionally read-only in the generic page. High-risk changes remain in the dedicated Payment Gateway Control flow so password confirmation, step-up, throttling, payment validation, and Payment AuditEvent behavior cannot be bypassed.

Config cache is intentionally not implemented in this phase. Consumers must continue using `ConfigRuntimeService` so a future system-wide cache can be introduced without changing domain consumers.
