# Session lifecycle scenario validation — Phase 2H

**Status: COMPLETE — isolated PostgreSQL E2E validation passed**

## Scope and baseline

Validation began on `main` at `28845b55871a629391badccbaf6c03a094e1ee8e`.
The existing dirty worktree was preserved. No application lifecycle, payment,
entitlement, chat, or financial production behavior was changed by this phase.

## Isolated database execution

Two local development-only databases were created from the development
`DATABASE_URL`; neither shared the normal development database.

| Database | Purpose | Migration result |
| --- | --- | --- |
| `sawiyaa_phase2h_integration` | Workflow and financial-boundary suites | 140/140 migrations applied |
| `sawiyaa_phase3b1a_integration` | Manual no-show and replacement-entitlement suites, whose existing guard requires a `phase3b1a`/`phase3b2a` name | 140/140 migrations applied |

The workflow suite received its first URL through both `DATABASE_URL` and
`SAWIYAA_PHASE3A_DATABASE_URL`; all other persisted suites used `DATABASE_URL`.
The existing suite database-name guards were retained.

## Deterministic scenario matrix

| Scenario group | Evidence | Result |
| --- | --- | --- |
| Join boundary, read/command alignment, and token denial | Join-readiness, bootstrap, prepare-runtime, and interpreter tests | Passed |
| Upcoming, ready, in-progress, terminal, expired, no-show, and resolution | Operational interpreter cross-actor/lifecycle regressions | Passed |
| Closed room while lifecycle appears active | Operational interpreter regression | Passed: `SESSION_ROOM_CLOSED`, no credential, Admin resolution required |
| Patient/practitioner/admin shared operational truth | Cross-actor operational projection regression | Passed; shared fields match and only actor actions differ |
| Attendance reconciliation, manual no-show, and Admin resolution | Focused suites plus PostgreSQL manual no-show integration | Passed |
| Completion, cancellation, reschedule, payment return | Focused command/service suites | Passed |
| Financial boundaries and replacement earning entitlement | PostgreSQL financial and entitlement integrations | Passed |
| Full persisted Session workflow | PostgreSQL workflow integration | Passed |

## Seed and fixture decision

`prisma/seed/modules/session-access.seed.ts` remains useful for durable,
human-readable development scenarios: joinable/future/package/in-progress/
expired/rescheduled/replacement/cancelled Sessions and join-ready notification
facts. Evidence-backed no-show and unresolved-Admin cases remain integration
fixtures because each requires purpose-specific attendance evidence,
reconciliation timestamps, and idempotency state. The persisted tests create
those facts through the normal schema and service boundaries; no seed bypass or
synthetic policy path was introduced.

## Integration correction discovered

Live database execution identified stale test wiring and expectations in
`session-workflow.postgres.integration.spec.ts`:

- the finalizer and payment orchestrator fixtures had not been updated for
  their current injected dependencies;
- both-absent evidence now correctly remains non-terminal and routes to
  `AWAITING_ADMIN_RESOLUTION`, rather than automatic finalization.

The test fixture contracts and assertions were updated to match the established
policy. No production behavior changed.

## Verification evidence

| Check | Result |
| --- | --- |
| Session workflow PostgreSQL integration | 18 passed |
| Financial-boundary PostgreSQL integration | 6 passed |
| Manual no-show + replacement-entitlement PostgreSQL integrations | 7 passed |
| Focused lifecycle/contract regression | 13 suites, 86 passed |
| Backend `npm run typecheck` | Passed |
| Frontend `npm run typecheck` | Passed |
| Frontend `npm run test:session-contract` | Passed |

## Reproduction process

From `sawiyaa-backend-v1`, derive an isolated URL from the development `.env`
without printing its credentials, create the named development-only database,
then run `npx prisma migrate deploy` with `DATABASE_URL` set to that URL.

For `sawiyaa_phase2h_integration`, set both `DATABASE_URL` and
`SAWIYAA_PHASE3A_DATABASE_URL`, then run:

```powershell
npx jest src/modules/sessions/integration/session-workflow.postgres.integration.spec.ts --runInBand
npx jest src/modules/financial-operations/integration/financial-boundary-scenarios.postgres.integration.spec.ts --runInBand
```

For `sawiyaa_phase3b1a_integration`, set `DATABASE_URL`, then run:

```powershell
npx jest src/modules/sessions/integration/manual-no-show-policy.postgres.integration.spec.ts src/modules/financial-operations/integration/replacement-earning-entitlement.postgres.integration.spec.ts --runInBand
```

Run the focused regression command from `sawiyaa-backend-v1`:

```powershell
npx jest src/modules/sessions/services/session-operational-interpreter.service.spec.ts src/modules/sessions/services/resolve-session-join-readiness.service.spec.ts src/modules/sessions/use-cases/resolve-session-join-contract.use-case.spec.ts src/modules/sessions/use-cases/prepare-session-runtime.use-case.spec.ts src/modules/sessions/use-cases/reconcile-session-attendance.use-case.spec.ts src/modules/sessions/use-cases/mark-session-no-show-by-practitioner.use-case.spec.ts src/modules/sessions/use-cases/mark-session-completed-by-practitioner.use-case.spec.ts src/modules/sessions/services/reschedule-session.service.spec.ts src/modules/sessions/use-cases/cancel-session-final-decision.spec.ts src/modules/payments/use-cases/reconcile-session-payment-return.use-case.spec.ts src/modules/sessions/use-cases/create-admin-session-manual-decision.use-case.spec.ts src/modules/package-plans/presenters/package-purchase.presenter.spec.ts src/modules/patient-journey/use-cases/get-my-patient-journey.use-case.spec.ts --runInBand
npm run typecheck
```

From `sawiyaa-frontend-v1`, run `npm run typecheck` and
`npm run test:session-contract`. The test databases can be recreated for a
fresh run; they must not be pointed at the normal development database.
