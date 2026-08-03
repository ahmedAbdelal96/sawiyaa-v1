# Configuration Write Boundary Audit and Design

Status: Phase 3 audit and architecture design only.

This document describes the Backend configuration write surface as found on the `fix/production-deployment-parity` worktree. It does not introduce a write service, API, permission, migration, seed behavior change, or runtime behavior change.

## Baseline and scope

- Git root: `D:\Web\full-projects\sawiyaa`
- Backend: `D:\Web\full-projects\sawiyaa\sawiyaa-backend-v1`
- Current branch: `fix/production-deployment-parity`
- Current HEAD at audit start: `ce1d4d12a13402614626f7b2f58342ea74f198cb`
- The worktree was already dirty across Backend, Web, Mobile, and documentation. Existing changes were preserved and are not attributed to this audit.

The accepted configuration foundation provides an immutable `CONFIG_KEYS` registry, typed definitions, an additive seed, and a typed `ConfigRuntimeService` read facade. The existing resolver precedence remains: ordered active/effective scoped database value, catalog default, then missing.

## Current database schema

`ConfigKeyCatalog` is the catalog identity and policy metadata:

- unique `key` and `slug`;
- `configKind`, `dataType`, `category`;
- `isSensitive`, `isRequired`, `supportsOverride`;
- optional `defaultValueJson`;
- timestamps and relations to values and change logs.

`ConfigValue` stores version-like runtime values:

- `configKeyId`;
- `scopeType` and optional `scopeRefId`;
- typed value columns (`valueString`, `valueNumber`, `valueBoolean`, `valueJson`);
- `priority`, `isActive`, `effectiveFrom`, `effectiveTo`;
- timestamps and relations to the catalog and change logs.

There is no database uniqueness constraint for one active value per key/scope, no version column, and no compare-and-swap token. Existing writers therefore enforce active-value replacement in application code and are not protected against every concurrent writer race.

`ConfigChangeLog` records `configKeyId`, optional `configValueId`, optional `changedByUserId`, `changeAction`, old/new JSON snapshots, optional reason, and `changedAt`. It is an audit record, not an authorization or concurrency mechanism.

## Complete write inventory

The repository audit found these configuration writers, excluding generated Prisma declarations and tests:

| Location                                                                                 | Writer type             | Business area                         | Current authority                                                                 | Should migrate?                                                      |
| ---------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `prisma/seed/modules/config.seed.ts`                                                     | Bootstrap/seed writer   | Catalog and initial values            | Development/curated seed execution                                                | No, retain as a dedicated additive seed exception                    |
| `prisma/scripts/bootstrap-development-payment-routes.ts`                                 | System/bootstrap script | Payment routing                       | Explicit non-production operator command                                          | Yes, after the boundary supports controlled system bootstrap writes  |
| `prisma/scripts/bootstrap-payment-routes.ts`                                             | System/operator script  | Payment routing                       | Explicit `ALLOW_PAYMENT_ROUTE_BOOTSTRAP` plus staging/production environment gate | Yes, highest-risk legacy operator path                               |
| `src/modules/package-plans/services/package-plan-admin.service.ts`                       | Admin human writer      | Package feature toggles               | Admin package settings controller, `ADMIN` role                                   | Yes, first business-writer migration candidate                       |
| `src/modules/payment-gateway-control/repositories/payment-gateway-control.repository.ts` | Admin human writer      | Payment provider and routing controls | Payment control service/controller, admin roles, password/step-up flow            | Yes, after payment-specific validation and approval policy is mapped |

No other non-test `ConfigValue`/`ConfigChangeLog` create/update/upsert/delete calls were found. The configuration read repositories and seed catalog creation are not write-boundary consumers.

## Writer findings

### Seed writer

The config seed now creates missing catalog/value rows only and preserves compatible existing rows. It is intentionally outside the future human-management boundary. It has no actor and does not create change logs because it is bootstrap data, not an operational change.

### Development payment bootstrap

The development script can create a catalog row with `upsert` and create a global route value plus a `ConfigChangeLog`. It has no user actor and is guarded against production. It is useful for local setup but should eventually call an explicit system-write adapter with a source such as `DEVELOPMENT_BOOTSTRAP`.

### Production/staging payment bootstrap

The operator script creates a route only after an explicit environment flag and target-environment check. It refuses conflicting active values. It writes a change log without `changedByUserId`. It must not be exposed through an Admin UI and should remain a separately authorized deployment/operator workflow even after migration.

### Package Admin writer

`PackagePlanAdminService` replaces active global boolean values by deactivating the current record, creating a new record, and writing a `ConfigChangeLog`. The controller is protected by JWT, account state, and `ADMIN` role. The service accepts an optional actor ID and reason, but validation is currently limited to boolean presence and non-empty update checks. There is no generic catalog editability check, scope policy check, optimistic concurrency check, or explicit approval level.

### Payment Gateway writer

`PaymentGatewayControlRepository.applySnapshot` changes provider/routing values in one Prisma transaction. It deactivates active global rows, creates replacement values, writes `ConfigChangeLog` entries, and writes a broader `AuditEvent` containing request, actor, reason, changed keys, and before/after snapshots. The controller is protected by JWT, active account, admin roles, throttling, password confirmation, and step-up for high-risk provider operations. This is the strongest existing writer, but it remains a payment-specific persistence path and its `ConfigValue` writes are not centralized.

## Configuration ownership matrix

`DB` means the database resolver can read a value. `ENV` means the existing runtime adapter remains authoritative. `Seed` means the catalog/initial value is created by seed only. `Admin` identifies the current operational writer, not a recommended future permission.

| Key                                                  | Read source                                        | Current write source                                       | Owner                                          | Risk                                                                 |
| ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `platform.defaultLocale`                             | DB resolver/default                                | Seed only                                                  | Database catalog, currently unused             | Low/medium; duplicate authority risk if runtime locale code diverges |
| `auth.otp.loginTtlMinutes`                           | DB catalog/default, auth runtime uses ENV          | Seed only; ENV runtime                                     | ENV security                                   | High; duplicated with ENV and security-sensitive                     |
| `auth.passwordReset.otpTtlMinutes`                   | DB catalog/default, reset runtime uses ENV         | Seed only; ENV runtime                                     | ENV security                                   | High; duplicated with ENV                                            |
| `security.jwt.accessTokenTtlMinutes`                 | DB catalog/default, JWT runtime uses ENV           | Seed only; ENV runtime                                     | ENV security                                   | Critical; must not be Admin-editable                                 |
| `features.practitionerApplicationAdminReviewEnabled` | DB catalog/default                                 | Seed only                                                  | Database feature policy, currently unused      | Medium; seeded-but-unused ambiguity                                  |
| `notifications.channels.default`                     | DB catalog/default                                 | Seed only                                                  | Database notification policy, currently unused | Medium; no active operational writer                                 |
| `packages.enabled`                                   | DB runtime facade                                  | Package Admin service                                      | Admin-managed database policy                  | High; immediate product availability impact                          |
| `packages.purchaseEnabled`                           | DB runtime facade                                  | Package Admin service                                      | Admin-managed database policy                  | High; financial/product availability impact                          |
| `payment.provider.paymob.enabled`                    | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | Critical; affects payment availability                               |
| `payment.provider.paymob.checkoutFlow`               | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | Critical; provider contract/runtime risk                             |
| `payment.provider.paymob.defaultMethod`              | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | High; checkout behavior risk                                         |
| `payment.provider.paymob.methodRegistry`             | DB snapshot plus ENV credentials                   | No supported editable writer; catalog is non-editable JSON | Payment operations/system                      | Critical; JSON schema and provider-integrity risk                    |
| `payment.provider.paymob.maintenanceMode`            | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | High; can disable payment provider                                   |
| `payment.provider.paymob.allowedCountries`           | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | High; market/checkout eligibility risk                               |
| `payment.provider.stripe.enabled`                    | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | Critical; affects payment availability                               |
| `payment.provider.stripe.maintenanceMode`            | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | High; can disable payment provider                                   |
| `payment.provider.stripe.allowedCountries`           | DB snapshot plus ENV credentials                   | Payment Gateway Control repository                         | Payment operations                             | High; market/checkout eligibility risk                               |
| `payment.routing.defaultProvider`                    | DB routing snapshot                                | Payment Gateway Control repository                         | Payment operations                             | Critical; payment routing risk                                       |
| `payment.routing.priorityOrder`                      | DB routing snapshot                                | Payment Gateway Control repository                         | Payment operations                             | Critical; routing precedence risk                                    |
| `payment.routing.fallbackProvider`                   | DB routing snapshot                                | Payment Gateway Control repository                         | Payment operations                             | Critical; fallback/routing risk                                      |
| `payment.routing.currencyRoutes`                     | DB routing snapshot, ENV supplies credentials only | Payment Gateway Control repository and bootstrap scripts   | Payment operations/system                      | Critical; money movement routing risk; JSON requires schema          |

## Current ownership problems

1. The same `ConfigValue` lifecycle is implemented independently by package admin, payment control, and scripts.
2. Authorization is controller-specific rather than a property of a configuration change command.
3. `ConfigKeyCatalog.editable` and typed registry policy are not enforced uniformly by all writers.
4. `ConfigChangeLog.changedByUserId` is nullable, so scripts and some system changes are not attributable to a human or explicit system actor.
5. Active-row replacement has no shared concurrency token or unique active identity constraint.
6. Payment routing has both operator scripts and Admin control paths, creating potential authority overlap.
7. Several catalog entries are seeded but unused or duplicated with ENV, making ownership unclear.
8. Sensitive/ENV-owned keys exist in the catalog and must be denied by any future management interface even if they are readable through internal tooling.

## Existing Admin capabilities

### Present

- Internal read-only `ConfigController`, protected by `ConfigInternalGuard`, with sensitive values redacted.
- Package settings read/update endpoint under `admin/package-plans/settings`, protected by JWT, active account state, and `ADMIN` role.
- Payment provider and routing control endpoints under `admin/payment-gateway-control`, protected by JWT, active account state, admin roles, throttling, password confirmation, and step-up flows where required.
- Payment control history backed by `AuditEvent`; config-level history backed by `ConfigChangeLog`.

### Missing

- No generic Admin configuration catalog/list/edit API.
- No centralized configuration write service.
- No dedicated configuration view/edit permission model.
- No uniform editability, scope, schema, reason, actor, or concurrency enforcement.
- No cache invalidation contract.
- No approval workflow for sensitive, security, or financial configuration changes.

### Duplicate or overlapping functionality

- Payment routing can be changed by the payment Admin control path and by explicit bootstrap scripts.
- Package toggles have a package-specific writer rather than the future shared boundary.
- DB catalog values for auth/security exist beside ENV-owned runtime configuration, but are not runtime authorities.

## Recommended write boundary

Future implementation should introduce a narrowly scoped `ConfigurationManagementService` or equivalent application service. A command should include:

- canonical key;
- typed proposed value;
- scope and optional effective dates;
- actor identity or explicit system actor;
- reason and request/correlation ID;
- expected current version/revision for concurrency.

Responsibilities:

1. Resolve the canonical definition from the immutable registry.
2. Reject unknown, legacy, non-editable, sensitive, ENV-owned, or JSON-without-schema keys according to policy.
3. Authorize the actor and required approval level.
4. Validate type, range, enum, array, schema, scope, effective dates, and cross-field invariants.
5. In one transaction, close or supersede the previous value, create the new value, and append an audit record.
6. Return a redacted result for sensitive values and a revision/invalidation token for future cache integration.

It must not make payment, package, session, notification, or business decisions. Those domains may request a configuration change through the boundary but must not own generic persistence semantics.

## Permission model design

Do not give every Admin unrestricted configuration access.

| Class            | Examples                                                              | Recommended view                              | Recommended edit                                                            |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Safe operational | locale, non-sensitive notification defaults, bounded feature defaults | `configuration.view`                          | `configuration.edit.operational`                                            |
| Sensitive        | any secret-like or redacted setting                                   | metadata only                                 | no generic Admin edit; controlled operator workflow                         |
| Financial        | provider enablement, maintenance, routing, country eligibility        | `configuration.view.financial` with redaction | `configuration.edit.financial` plus password, step-up, reason, and approval |
| Security         | OTP and JWT policy                                                    | metadata/status only                          | deployment/security operator only; never Admin UI                           |
| Infrastructure   | ENV-owned credentials, URLs, connection settings                      | no raw value; status only                     | deployment/platform process only                                            |

Separate view from edit. `SUPER_ADMIN` may be eligible for financial approval, but role alone should not replace per-action authorization, step-up, or dual approval where risk requires it.

## Audit model design

Every future boundary mutation must record:

- key and scope;
- before value snapshot, redacted for sensitive data;
- after value snapshot, redacted for sensitive data;
- actor type (`USER`, `SYSTEM`, `DEPLOYMENT`, or equivalent);
- actor user ID when applicable;
- reason and request/correlation ID;
- source/application path;
- validation result and approval evidence;
- timestamp;
- resulting value ID and revision token.

`ConfigChangeLog` is a usable low-level history record but needs a defined redaction policy and explicit system source convention. Existing `AuditEvent` is appropriate for high-risk payment operations and should remain as a domain-level event in addition to the config change record, not as a replacement for the boundary.

## Validation rules

- `BOOLEAN`: only actual booleans; reject string coercion.
- `NUMBER`/`INTEGER`: enforce finite values, integerness where applicable, and registry min/max.
- String enum: enforce the registry allowed-values list.
- String arrays: enforce array shape, element type, normalization, uniqueness, and allowed-value membership where defined.
- JSON: remain non-editable until a versioned schema is registered and validated.
- Scope: key must support the requested scope; global-only keys reject scoped writes; scope reference must match the scope type.
- Effective dates: reject invalid ranges and ambiguous overlapping active windows unless the policy explicitly supports them.
- Sensitive: never return raw before/after values to Admin UI, logs, or generic API responses.
- ENV-owned: reject database management writes; catalog presence does not make ENV-owned settings editable.
- Required: a write cannot remove the last valid value when the definition is required and has no safe default.

## Concurrency strategy

Preferred future design:

1. Add a monotonic configuration revision or version token at the aggregate/key-scope level.
2. Require `expectedRevision` or `expectedUpdatedAt` on human updates.
3. Execute read-check-close-create-log in one serializable transaction.
4. Reject stale updates with a conflict response rather than silently overwriting.
5. Treat seed/bootstrap and Admin writes as separate source policies; deployment defaults must not overwrite a newer operational value.

Until a schema change is approved, an application-level `updatedAt` compare is only a partial safeguard and cannot replace a unique active identity or revision. No concurrency implementation is introduced in Phase 3.

## Cache invalidation design

No cache is implemented. The future event contract should be:

```text
validated write
  -> committed ConfigChange
  -> invalidate canonical key + scope
  -> reload runtime snapshot/cache
  -> publish diagnostics and revision
```

Immediate-effect candidates include package toggles, provider maintenance/enabled flags, provider methods, allowed countries, and payment routes. Security/ENV-owned settings should not be dynamically invalidated from this database path. Cache invalidation must happen after commit and must be idempotent; a failed invalidation should be observable and retried without rolling back a committed database change.

## Migration roadmap

### Phase 3A: audit complete

This document and the writer inventory establish current ownership and risks. Rollback is documentation-only: delete the design document if the architecture is rejected; no runtime rollback is needed.

### Phase 3B: implement the write boundary

Build the service, typed command/result, redaction, authorization policy, validation, transaction, and focused tests. Keep existing writers as compatibility paths. Rollback is a feature-flagged deployment rollback before migrations are applied.

### Phase 3C: migrate package writer

Move package toggles first because the value type is simple and the current role boundary is narrow. Compare old/new audit output and preserve response contracts. Rollback by routing package updates to the old service until parity is proven.

### Phase 3D: migrate payment control writer

Move provider/routing changes only after payment-specific schema, step-up, approval, and audit parity tests pass. Preserve payment `AuditEvent` semantics. Rollback must preserve the last committed active value and disable the new path, never reset data.

### Phase 3E: migrate operator scripts

Introduce explicit system/deployment actor metadata and keep production bootstrap approval separate from Admin permissions. Rollback is command disablement; no destructive cleanup.

### Phase 3F: Admin configuration UI

Only after the boundary and permissions are proven should a UI be created. It must expose metadata and redacted values according to class, never raw secrets or ENV-owned settings.

### Phase 3G: remove legacy writers

After staged telemetry and audit comparison, remove direct ConfigValue persistence from package/payment writers and enforce architecture checks against new direct writers.

## Safety confirmation

This phase changed documentation only. It did not change:

- database schema or migrations;
- seed behavior;
- runtime values or resolver behavior;
- APIs or Admin UI;
- Web or Mobile;
- payments, packages, sessions, authentication, or notification behavior.
