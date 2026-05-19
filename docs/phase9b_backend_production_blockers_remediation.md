# Phase 9B — Backend Production Blockers Remediation

Date: 2026-05-12  
Project: `D:\Web\full-projects\fayed\fayed-backend-v1`

## Executive Verdict
**Mostly complete with remaining blockers.**

Closed in this phase:
- Step-up is now **enforced** (DB-backed, session-scoped) for routes already marked with `@RequireStepUp(...)` when `STEP_UP_ENABLED=true` (defaults to enabled in production).
- Rate limiting now supports a **Redis shared store** (multi-instance ready) with a strict production posture (no silent fallback when explicitly configured).
- Public academy enrollment mutation is now throttled.

Remaining blockers / risks discovered:
- Prisma migration history drift was detected in the current local DB when attempting `prisma migrate dev`. This indicates at least one **previously-applied migration checksum mismatch** in this DB and needs production-side verification/repair planning (details below).

## Inventory (Before Changes)

### Step-up
- Only metadata existed: `@RequireStepUp(...)` via [`step-up.decorator.ts`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/decorators/step-up.decorator.ts)
- No enforcement guard or verification flow.

### Rate limiting
- Global guard existed: [`ThrottlePolicyGuard`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/throttle/throttle-policy.guard.ts)
- Store was in-memory only: [`ThrottleStoreService`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/throttle/throttle-store.service.ts)

### Public academy enrollment
- Endpoint existed and was not throttled:
  - [`PublicAcademyController.createEnrollment`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts)

## What Changed

### A) Step-up Enforcement

Status: **Enforced (not scaffold-only)** when enabled via config.

Implementation:
- Global guard:
  - [`StepUpGuard`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/guards/security/step-up.guard.ts)
- Storage model:
  - DB-backed, session-scoped timestamps stored on `UserSession`:
    - `stepUpVerifiedAt`
    - `stepUpExpiresAt`
  - Prisma schema:
    - [`prisma/schema.prisma`](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/schema.prisma)
  - Migration (created without resetting DB):
    - [`prisma/migrations/20260512163421_add_step_up_to_user_session/migration.sql`](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/migrations/20260512163421_add_step_up_to_user_session/migration.sql)
- Verification endpoint (password re-auth):
  - `POST /auth/admin/step-up/verify`
  - Controller:
    - [`AdminAuthController.verifyStepUp`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/auth/controllers/admin-auth.controller.ts)
  - DTO:
    - [`AdminStepUpVerifyDto`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/auth/dto/admin-step-up-verify.dto.ts)
  - Use case:
    - [`VerifyAdminStepUpUseCase`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/auth/use-cases/verify-admin-step-up.use-case.ts)
  - Session marker service:
    - [`StepUpService`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/auth/services/step-up.service.ts)

Policy:
- TTL default: `600s` (10 minutes) via `STEP_UP_TTL_SECONDS`.
- SUPER_ADMIN is **not exempt** (no silent bypass).
- Step-up is **config gated**:
  - `STEP_UP_ENABLED=true|false`
  - Default: enabled in production, disabled elsewhere (unless explicitly set).

Auditing:
- Step-up events are security-audited (sanitized metadata only):
  - `security.step_up.verify.success`
  - `security.step_up.verify.failure`
  - `security.step_up.required`

### B) Shared Rate Limit Store (Redis)

Status: **Multi-instance ready when configured with Redis**.

Implementation:
- Redis client dependency added: `redis@4.7.1`
- Store selection:
  - Memory (default): dev/test safe, **not** multi-instance safe.
  - Redis: selected by env `THROTTLE_STORE=redis`.
- Strict production posture:
  - If `THROTTLE_STORE=redis` and `REDIS_URL` is missing:
    - production: fail-fast (throws on boot)
    - non-production: warns and falls back to memory
- Key hygiene:
  - Namespaced prefix: `THROTTLE_KEY_PREFIX` (default `fayed:throttle`)
  - Optional hashing: `THROTTLE_KEY_HASH_SECRET` (prevents storing raw emails/phones in Redis keys)

Code:
- Config:
  - [`throttle.config.ts`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/config/throttle.config.ts)
- Store:
  - [`ThrottleStoreService`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/throttle/throttle-store.service.ts)
- Guard:
  - [`ThrottlePolicyGuard`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/throttle/throttle-policy.guard.ts)

### C) Academy Public Enrollment Throttling

Status: **Throttled**.

Implementation:
- Decorator added:
  - [`PublicAcademyController.createEnrollment`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts)
- Policy added:
  - [`THROTTLE_POLICIES`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/throttle/throttle-policy-config.ts)
  - Key: `academy-public-enrollment` = 10 per 15 minutes (IP keyed)
- Test:
  - [`public-academy.controller.security.spec.ts`](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.security.spec.ts)

## Config / Env Additions

Backend examples updated:
- [`fayed-backend-v1/.env.example`](/D:/Web/full-projects/fayed/fayed-backend-v1/.env.example)
- [`fayed-backend-v1/.env.staging.example`](/D:/Web/full-projects/fayed/fayed-backend-v1/.env.staging.example)

New env vars:
- Throttle:
  - `THROTTLE_STORE=memory|redis`
  - `REDIS_URL=redis://...`
  - `THROTTLE_KEY_PREFIX=...`
  - `THROTTLE_KEY_HASH_SECRET=...`
- Step-up:
  - `STEP_UP_ENABLED=true|false`
  - `STEP_UP_TTL_SECONDS=600`

## Commands Run (And Results)

In `D:\Web\full-projects\fayed\fayed-backend-v1`:
- `npm install` (ok)
- `npm audit --audit-level=moderate` (0 vulnerabilities)
- `npx prisma validate` (ok)
- `npx prisma migrate status`:
  - shows **pending migration** `20260512163421_add_step_up_to_user_session`
- `npx prisma generate` (ok)
- `npm run build` (ok)
- Targeted Jest tests (all pass):
  - step-up metadata + guard + verify use-case
  - csrf guard
  - throttle store/guard
  - permissions/finance access checks
  - webhook tests
  - academy throttling metadata test

## Prisma / Migration Notes (Important)

While attempting to generate a migration via `prisma migrate dev --create-only`, Prisma reported drift for the **current local DB**, including:
- "The migration `20260418201500_repair_session_cancellation_policy_drift` was modified after it was applied."
- "Drift detected: Your database schema is not in sync with your migration history."

This does **not** mean production is broken by default, but it is a serious signal:
- If any **already deployed** database has that migration recorded with the old checksum, `prisma migrate deploy` can fail due to checksum mismatch.

Action required (production readiness follow-up):
1. Verify whether production/staging DBs have applied the same migration checksum as the repo version.
2. If checksum mismatch exists, follow a controlled Prisma "patching/hotfix" workflow (do not edit historical migrations again; use a new migration and/or `prisma migrate resolve` as appropriate).

## Remaining Backend Blockers (Ranked)

Critical:
- None discovered in code paths implemented here.

High:
- Prisma migration checksum drift risk (must be verified for any already-deployed DBs before relying on `migrate deploy`).

Medium:
- Step-up is config-gated; ensure `STEP_UP_ENABLED=true` is set for production, and that admin clients are updated to call the verify endpoint before step-up protected actions.

Low:
- None.

## Clear Answer

Is backend now production-ready regarding Phase 9B blockers?  
**No (not yet)** due to the **migration history drift risk** that must be checked/confirmed for already-deployed environments.

If the migration history issue is confirmed not applicable (fresh DB) or is repaired correctly, then:
- Step-up enforcement: **yes**
- Shared rate limit store: **yes (Redis mode)**
- Academy enrollment throttling: **yes**

