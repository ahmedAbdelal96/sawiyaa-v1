# Canonical Configuration Write Boundary

Status: Phase 4 foundation. Existing Package and Payment writers remain compatibility paths and were not migrated in this phase.

## Canonical service

`ConfigurationManagementService` is the single application service for new database-backed configuration writes. It lives in the Config module and is exported for future domain adapters. It owns governance and persistence only; it does not contain package, payment, session, notification, or other business decisions.

The public command is `UpdateConfigurationCommand` in `configuration-write.types.ts`. It carries:

- a canonical typed key and value;
- scope type and scope reference;
- actor, explicit actor type, reason;
- optional effective-from/effective-to dates;
- optional `expectedUpdatedAt` for optimistic concurrency.

Actors support `USER`, `SYSTEM`, and `DEPLOYMENT`. System and deployment writes require an explicit `configuration.system.write` authority; no role name is hardcoded into the boundary.

## Pipeline

1. Resolve the key from the immutable registry.
2. Reject unknown, legacy, ENV-owned, non-editable, and unsupported JSON keys.
3. Validate actor type, reason, scope, UUID references, effective dates, and typed value constraints.
4. Ask `ConfigurationAuthorizationService` for the domain authorization decision.
5. Run the current-value check, deactivation, new value creation, and `ConfigChangeLog` creation in one Serializable Prisma transaction.
6. Return the new value ID, revision timestamp, change-log ID, and a redacted value view.

Supported authorization domains are operational, financial, security, and infrastructure. Current permissions are intentionally an internal abstraction, not a complete permission system:

- `configuration.edit.operational`
- `configuration.edit.financial`
- `configuration.edit.security`
- `configuration.edit.sensitive`
- `configuration.system.write`

ENV-owned configuration is rejected before authorization and remains deployment-owned. Sensitive values are redacted in the result and audit snapshots.

## Validation

- Boolean values must be actual booleans.
- Numeric values must be finite and respect integer/range rules.
- Strings must satisfy allowed-value rules when present.
- String arrays must contain only strings.
- JSON values remain blocked until a registered schema exists; current JSON definitions are also non-editable.
- Scope references are null for GLOBAL and UUIDs for non-global scopes.
- Effective-to must be later than effective-from.
- Non-empty reasons are limited to the database audit field length.

## Concurrency and audit

The boundary requires the current `updatedAt` for an existing active value. A missing or stale timestamp produces `CONFIG_WRITE_CONFLICT`; it never silently overwrites a newer value. New keys may be created without an expected timestamp.

Each boundary write records the config key, value ID, actor user ID when applicable, change action, scope, reason, and redacted before/after snapshots. System/deployment actor type and actor ID are included in the new audit snapshot because the existing schema has no separate actor-type column.

The implementation uses the existing `ConfigValue` and `ConfigChangeLog` tables. No migration, cache, event, Admin API, or UI is introduced. Cache invalidation remains a future post-commit concern.

## Compatibility and architecture protection

Package Admin and Payment Gateway Control still write directly as explicitly allowlisted compatibility paths. Seed and payment bootstrap scripts remain separate approved writers. The architecture test scans non-test Backend TypeScript writers and rejects any new direct Config table mutation outside those paths or the canonical service.

Migration adapters are the next step:

```text
PackagePlanAdminService
  -> ConfigurationManagementService
  -> ConfigValue + ConfigChangeLog

PaymentGatewayControlRepository
  -> ConfigurationManagementService
  -> ConfigValue + ConfigChangeLog
```

Those migrations are intentionally excluded from Phase 4.
