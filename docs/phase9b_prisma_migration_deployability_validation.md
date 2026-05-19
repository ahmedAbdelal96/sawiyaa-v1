# Phase 9B Follow-up — Prisma Migration Drift & Deployability Validation

Date: 2026-05-12  
Project: `D:\Web\full-projects\fayed\fayed-backend-v1`

## Executive Verdict
**Deployability mostly validated with existing DB verification required.**

What is now evidence-backed:
- The repository migration chain **applies cleanly on a truly fresh database** from zero, including:
  - `20260512163421_add_step_up_to_user_session`
- The new Phase 9B migration only adds the expected `UserSession` step-up columns + index.

What is still conditional:
- Any **already-deployed** database (staging/production/other dev DBs) must verify the checksum for:
  - `20260418201500_repair_session_cancellation_policy_drift`
  - and confirm there is no schema drift beyond checksum differences.

## Part A — Migration Inspection (File-level)

### Latest migration added in Phase 9B
- Migration:
  - [`20260512163421_add_step_up_to_user_session/migration.sql`](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/migrations/20260512163421_add_step_up_to_user_session/migration.sql)
- Contents summary:
  - Adds columns:
    - `UserSession.stepUpVerifiedAt TIMESTAMP(3) NULL`
    - `UserSession.stepUpExpiresAt TIMESTAMP(3) NULL`
  - Adds index:
    - `UserSession_stepUpExpiresAt_idx`
- Non-destructive: yes (additive schema change only).

SHA256 (repo file):
- `20260512163421_add_step_up_to_user_session`: `A5200CDD3AAC18A91ABBA4FBED5570C3697F9028E1BFDDC0DE7791A653B5141B`

### Drift-flagged migration
- Migration:
  - [`20260418201500_repair_session_cancellation_policy_drift/migration.sql`](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/migrations/20260418201500_repair_session_cancellation_policy_drift/migration.sql)
- Contents summary:
  - Idempotent “repair drift” SQL (creates enums/tables/indexes/constraints if missing).
  - Non-destructive intent: yes (uses `IF NOT EXISTS` / `duplicate_object` guards).

SHA256 (repo file):
- `20260418201500_repair_session_cancellation_policy_drift`: `D7DEF6370BDF79C816FA4BFD8A24050E23181EDB87F50BEB7562260C1CD39CCF`

## Part B — Fresh DB Deployability Validation (From Repo Migrations)

Because `psql` CLI is not available in this environment, we created a **temporary fresh Postgres database** using Node + the already-present `pg` dependency (via Prisma adapter).

Fresh validation DB created:
- `fayed_phase9b_migration_validation_20260512173010`

Commands run (with `DATABASE_URL` pointed at the fresh DB only):
1. `npx prisma migrate deploy`
   - Result: **success**
   - All 56 migrations applied, including:
     - `20260512163421_add_step_up_to_user_session`
2. `npx prisma validate`
   - Result: **success**
3. `npx prisma migrate status`
   - Result: **Database schema is up to date**
4. `npx prisma generate`
   - Result: **success**

Evidence that the drift-flagged migration matches repo content on a fresh DB:
- In the fresh DB `_prisma_migrations`, the checksum for:
  - `20260418201500_repair_session_cancellation_policy_drift`
- was:
  - `d7def6370bdf79c816fa4bfd8a24050e23181edb87f50beb7562260c1cd39ccf`
- which matches the repo file SHA256 above (lowercased).

## Part C — Current Local DB Status (Read-only + Metadata)

Local DB (from `.env`):
- `postgresql://postgres:PostgreSQL123@localhost:5432/fayed_db` (schema `public`)

Read-only checks:
- `npx prisma validate`: **success**
- `npx prisma migrate status` (before applying Phase 9B migration): showed:
  - pending `20260512163421_add_step_up_to_user_session`

`_prisma_migrations` inspection for the drift-flagged migration:
- Migration name: `20260418201500_repair_session_cancellation_policy_drift`
- Local DB contained **two rows** for the same migration name:
  1. rolled back attempt:
     - `finished_at = null`
     - `rolled_back_at != null`
     - checksum: `366117...`
  2. applied attempt:
     - `finished_at != null`
     - `rolled_back_at = null`
     - checksum: `ff5081dd44a7d9e4e5e8a2ab42fbae2348592a6f991dd7eac02f844879c9561b`

This applied checksum **does not match** the current repo migration SHA256 (`d7def6...`), which confirms:
- **The migration file was changed after at least one DB applied an earlier version.**

## Part D — Can Phase 9B Migration Apply Locally Without Reset?

We attempted a safe, non-destructive application on the local dev DB using deploy-mode:
- `npx prisma migrate deploy`
  - Result: **success**
  - Applied:
    - `20260512163421_add_step_up_to_user_session`
- `npx prisma migrate status`
  - Result: **Database schema is up to date**

Notes:
- `prisma migrate dev` previously detected drift and would prompt for reset. We did **not** reset any DB.
- `migrate deploy` succeeded despite the historical checksum mismatch, but drift still matters for:
  - developer workflows
  - environment parity
  - confidence that production history matches repo.

## Part E — Staging/Production Drift Risk Assessment (No Remote Connections)

Risk classification:
- Fresh DBs: **PASS** (repo migration chain is deployable from zero).
- Current local DB: **DRIFT CONFIRMED** (checksum mismatch for `20260418201500`).
- Staging/production DBs: **UNKNOWN** until verified.

Recommended read-only verification checklist per environment:
1. Take a DB backup snapshot (standard operational requirement).
2. Query `_prisma_migrations` for:
   - `migration_name = '20260418201500_repair_session_cancellation_policy_drift'`
   - record `checksum`, `finished_at`, `rolled_back_at`, `applied_steps_count`
3. Compare that checksum to the repo migration file hash:
   - `d7def6370bdf79c816fa4bfd8a24050e23181edb87f50beb7562260c1cd39ccf`
4. Run (read-only):
   - `npx prisma migrate status`
   - `npx prisma validate`
5. If checksum mismatches:
   - validate on a staging clone first
   - confirm whether `migrate deploy` proceeds and whether any schema drift exists beyond checksum.

## Part F — Safe Remediation Plan (If Checksum Drift Exists)

Rules respected:
- Do not edit historical migrations in-place.
- Do not reset production.
- Do not use `prisma db push` as a production fix.

### Option 1 — No drift in deployed DBs (best case)
Use when:
- deployed checksums match repo.

Action:
- deploy normally; no remediation required.

### Option 2 — Deployed DB checksum differs but schema is correct
Use when:
- checksum mismatch exists,
- but schema matches expected state and `migrate deploy` is not blocked.

Actions:
1. Treat as a release/process incident: historical migration content diverged.
2. Locate the exact originally-applied migration content:
   - from build artifacts, old tags, CI cache, or a prior commit.
3. Decide one of:
   - keep current repo migration and accept drift warnings (not ideal), or
   - store original migration content in a controlled way (preferred for long-term hygiene), without rewriting history again.
4. Validate deploy pipeline on a staging clone.

### Option 3 — Deployed DB checksum differs and schema differs
Use when:
- checksum mismatch and real schema drift exist.

Action:
- Create a new **forward-only corrective migration** to bring schema to desired state.
- Validate on staging clone.
- Deploy normally.

### Option 4 — Local-only drift (developer machine)
Use when:
- only a local dev DB has mismatched checksum(s).

Safe options:
- Use a fresh local dev DB (recommended).
- Continue using `migrate deploy` (no reset), but avoid `migrate dev` prompts that attempt to reset.

Avoid:
- manually editing `_prisma_migrations` checksums
- deleting `_prisma_migrations` rows
unless following an approved Prisma support procedure with backups.

## Part G — Phase 9B Code Verification (Post-validation)

Commands run:
- `npm audit --audit-level=moderate` (0 vulnerabilities)
- `npm run build` (pass)
- `npx prisma validate` (pass)
- `npx prisma generate` (pass)
- Targeted security tests (pass) — see Phase 9B remediation report.

## Files Changed In This Follow-up
- Added:
  - [`phase9b_prisma_migration_deployability_validation.md`](/D:/Web/full-projects/fayed/docs/phase9b_prisma_migration_deployability_validation.md)

(No historical migration files were edited in this follow-up.)

## Clear Final Answer

Is Phase 9B backend deployability now production-ready?
- **Conditional**:
  - **Yes for fresh DBs** (validated: repo migrations apply cleanly from zero).
  - **Existing staging/production DBs must verify** the checksum and applied state for:
    - `20260418201500_repair_session_cancellation_policy_drift`
  - If staging/prod checksum mismatches exist, follow the remediation options above before claiming full deployability confidence.

