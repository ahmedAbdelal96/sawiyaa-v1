# Configuration Runtime Access Boundary

## Purpose

`ConfigRuntimeService` is the typed read boundary for database-backed runtime configuration. It delegates to the existing `ConfigResolverService`; it does not introduce a second precedence algorithm, cache, write API, or environment-variable fallback.

## Source of truth and precedence

The canonical catalog is defined by the immutable registry under `src/modules/config/registry`. Runtime values are resolved by the existing use case with this order:

1. An active, effective `ConfigValue` candidate for the requested scope chain, in the caller-provided order.
2. The catalog default, when one exists.
3. Missing configuration, with the resolver's existing exception/nullable behavior.

For keys that do not support overrides, the resolver evaluates the global scope only. `at` remains the evaluation timestamp and is passed through unchanged. There is no implicit ENV fallback in this database resolver.

ENV-owned secrets, infrastructure settings, and security settings remain in their existing Nest configuration adapters. They must not be copied into the database catalog or mixed into this boundary.

## Typed API

Consumers inject `ConfigRuntimeService` and use canonical `CONFIG_KEYS` constants:

- `resolveValue` and `resolveByScope` for a complete resolved record;
- `getString`/`getRequiredString` for non-empty required strings;
- `getBoolean` for booleans;
- `getNumber` for numeric values;
- `getJson` for JSON and string-array values.

The key type is derived from the immutable definitions, so a boolean reader cannot receive a string or payment route key accidentally. The facade delegates parsing and error behavior to the existing resolver.

## Forbidden patterns

- Do not inject `ResolveConfigValueUseCase` or `ConfigResolverService` into new business consumers.
- Do not read `ConfigValue` directly from business services.
- Do not use raw configuration key strings when a `CONFIG_KEYS` constant exists.
- Do not add ENV fallback, a second precedence rule, or a consumer-local cache.
- Do not add writes, admin controls, migrations, or seed execution to the runtime read boundary.

Existing catalog writers and ENV/payment adapters are deliberate exceptions and remain unchanged.

## Migration status

The first safe batch migrated package feature policy, practitioner package-readiness checks, and payment gateway database snapshot reads. Payment credentials and infrastructure configuration remain ENV-owned. Controllers, catalog repositories, seed code, and write paths were not migrated because they are not runtime business reads.

Future migrations should be small batches: replace the consumer dependency with `ConfigRuntimeService`, replace raw keys with `CONFIG_KEYS`, run the consumer's focused tests, and verify that no precedence or failure behavior changed.

## Performance and extension point

The facade currently performs no caching and preserves the resolver's current database behavior. A future cache or invalidation strategy may be introduced behind this class only after its freshness, scope, effective-date, and failure semantics are specified and tested.
