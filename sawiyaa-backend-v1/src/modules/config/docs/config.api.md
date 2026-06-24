# Config Module API

## Purpose Of Module

Config Module provides the internal config resolution baseline for Phase 1.
It is responsible for:

- resolving config values from database entries
- applying scope-aware fallback rules
- falling back to catalog defaults
- protecting sensitive values from accidental HTTP exposure

Most application code should use the internal resolver service directly.
The HTTP endpoint exists only as an internal diagnostic/admin fallback.

## Endpoints

- `GET /config/:key`

## Guards Used

- `ConfigInternalGuard`
  - the HTTP endpoint is internal-only
  - requires `x-config-internal-token`
  - may be disabled completely by environment configuration

## Main DTOs

- `ResolveConfigParamsDto`
- `ResolveConfigQueryDto`

## Main Use Cases

- `ResolveConfigValueUseCase`

## Response Shape Notes

- the endpoint returns resolved config metadata plus the final value source
- sensitive config values are redacted from HTTP responses
- scope resolution remains deterministic and follows the same service logic used by the rest of the backend

## Notes

- this module is not a public config API
- normal modules should prefer `ConfigResolverService` instead of calling the HTTP endpoint
- the endpoint is intended for internal tooling and debugging only
