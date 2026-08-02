# Environment contract and production preflight

Phase 0A introduces a hybrid operational contract at `deploy/config/environment-contract.yaml` and two validators:

- `deploy/scripts/validate-environment-contract.js` reads explicit env-file paths and emits variable names with statuses only.
- `deploy/scripts/validate-production-preflight.sh` performs ordered, no-mutation host/target checks. The deployment wrapper holds the lock across the complete validation-to-release transition.

## Contract ownership

The backend Zod schema remains the source of truth for backend names, types, defaults, and cross-variable validation: `sawiyaa-backend-v1/src/config/validation/env.schema.ts`. The Node validator derives backend/source names from that schema and direct source references. YAML stores only operational metadata and cross-service exceptions: service, secret/build/runtime/deployment classification, environment, restart/rebuild impact, ownership, descriptions, aliases, placeholder patterns, and conflict rules. This avoids a manually duplicated backend schema.

## Adding a variable

1. Add or update the variable in its real validation owner (backend Zod, frontend build/source, Compose/PostgreSQL, or deployment policy).
2. Add operational metadata to the YAML only when it cannot be derived safely.
3. Add/update the appropriate example file without real credentials.
4. Add a focused validator test for requiredness, placeholder, conditional behavior, or conflict behavior.
5. Run the local validation command and review `git diff --check`.

Required means production cannot proceed without a non-empty valid value. Optional means absence is reported `NOT_REQUIRED`. Conditional means required only when its expression is true, such as `GEOIP_ENABLED == true` or Paymob being enabled.

## Build-time, runtime, and secrets

`NEXT_PUBLIC_*` values are public build-time inputs and require a frontend rebuild when changed. Backend/database values are runtime inputs and generally require restart only. Secrets are never printed, partially displayed, length-counted, or included in Compose diagnostics. Production secret files are passed by explicit path; the validator never assumes they live in Git.

## Local validation

With safe local/fixture env files:

```text
node deploy/scripts/validate-environment-contract.js --backend-env <backend-env> --frontend-env <frontend-env> --db-env <db-env> --environment production
```

On Linux/WSL with a disposable Compose environment:

```text
bash deploy/scripts/validate-production-preflight.sh --project-dir "$PWD" --backend-env <backend-env> --frontend-env <frontend-env> --db-env <db-env>
```

For deterministic tests without Docker:

```text
node --test deploy/scripts/validate-environment-contract.test.js
```

## Production release order

`deploy/scripts/deploy-production.sh` uses this order:

1. Resolve the project and acquire the deployment lock.
2. Run bootstrap-only host checks without touching the active release.
3. Fetch an explicit full target SHA (or resolve `origin/main` once to `FETCH_HEAD`).
4. Materialize that SHA in a detached temporary Git worktree.
5. Run the target worktree's validator and Compose/preflight checks against the server's production env-file paths.
6. On any target failure, remove the temporary worktree and exit; the active checkout and running containers are unchanged.
7. Only after success, remove the temporary worktree, reset the active checkout to the captured SHA, and continue the existing Compose build, PostgreSQL, migration, permission-sync, restart, and health checks.

Use an immutable target explicitly when invoking production:

```text
bash /opt/sawiyaa/deploy/scripts/deploy-production.sh --target-sha <full-40-character-commit-sha>
```

`SAWIYAA_TARGET_SHA` is equivalent to `--target-sha`. If neither is supplied, the wrapper fetches `origin/main` only to capture its full SHA once; it never deploys a moving branch reference directly. The standalone preflight supports `--bootstrap-only` and `--target-only` modes for this sequence and remains read-only: it does not fetch/reset/build/start/recreate/migrate/seed/backup or modify env files.

The target validator blocks missing, empty, placeholder, invalid, unknown, and forbidden values. Contract metadata supports conditional Paymob/GeoIP requirements, deprecated aliases, optional USD Paymob configuration, and the forbidden `PAYMENT_PROVIDER_ROUTES_JSON` setting. Diagnostics contain statuses and variable names only, never values.

## Statuses and blocking

`PRESENT` is a usable value; `MISSING`, `EMPTY`, `PLACEHOLDER`, `INVALID`, `UNKNOWN`, and `CONFLICT` are blocking when they affect a required or forbidden policy. `DEPRECATED` is reported for transitional aliases; `NOT_REQUIRED` means an optional/disabled condition is absent. Any blocking status makes the validator and preflight exit non-zero. Reports contain names/statuses only.

Paymob routing remains database-authoritative. `PAYMENT_PROVIDER_ROUTES_JSON` is forbidden. Conflicting canonical/legacy integration IDs or a method registry combined with explicit routes are blocked. An empty USD integration is allowed when the USD route is not required.

## Phase 0C limitations

Phase 0A/0B does not implement GHCR or immutable image deployment, release manifests, automatic database restore or rollback, monitoring, or full CI/CD deployment. It also does not fix the existing frontend lint baseline. Phase 0C remains deferred.
