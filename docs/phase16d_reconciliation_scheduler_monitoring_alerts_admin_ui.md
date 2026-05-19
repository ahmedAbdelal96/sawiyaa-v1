# Phase 16D - Reconciliation Scheduler, Monitoring Alerts & Admin UI

## Executive Summary

Phase 16D completed the operational layer for accounting reconciliation.

What changed:
- backend reconciliation now has scheduled execution wiring
- critical reconciliation findings now emit a safe alert signal
- admins now have a dedicated Financial Reconciliation UI at `/[locale]/admin/finance/accounting/reconciliation`
- the legacy `/admin/finance/reconciliation` route now redirects to the new operational screen
- the UI can run reconciliation sweeps, list runs, inspect issues, and review issues without mutating financial data

The system still does not auto-correct finance data. LedgerEntry remains the internal accounting source of truth.

## Final Verdict

Conditional pass.

The phase implementation is complete and verified at build/test level, but broader manual browser smoke for the new admin screen was not run in this turn. External alert delivery is still intentionally abstracted as a safe internal signal and the scheduler remains disabled in test environments by design.

## Backend Scheduler Implementation

Implemented:
- `AccountingReconciliationSchedulerService`
- safe cron bootstrap using `CronJob.from`
- scheduler disabled unless `ACCOUNTING_RECONCILIATION_ENABLED=true`
- scheduler disabled in `NODE_ENV=test`
- scheduler uses configured `ACCOUNTING_RECONCILIATION_CRON`, `LOOKBACK_DAYS`, and `BATCH_SIZE`
- scheduled runs call the existing reconciliation operations service
- safe status snapshot support

Behavior:
- scheduled runs create persisted reconciliation runs with trigger `SCHEDULED`
- no financial records are auto-mutated
- safe summary logging only
- single-run in-flight guard prevents overlapping scheduled sweeps

Status endpoint:
- `GET /admin/finance/accounting/reconciliation-status`
- admin read-only
- returns safe scheduler state and open issue counters

## Backend Alert / Monitoring Implementation

Implemented:
- `AccountingReconciliationAlertService`
- critical alert emission after reconciliation run persistence
- alert suppression cooldown to avoid repeated spam
- safe metadata only
- audit-log based alert signal

Behavior:
- alerts are emitted only when `ACCOUNTING_RECONCILIATION_ALERTS_ENABLED=true`
- alerts are grouped by currency where applicable
- only critical findings produce alert signals
- no provider payloads, secrets, tokens, or patient-sensitive notes are included

## Admin UI Route / Page

Added:
- `/[locale]/admin/finance/accounting/reconciliation`

Legacy redirect:
- `/[locale]/admin/finance/reconciliation` now redirects to the new operational page

Navigation:
- admin finance navigation now points reconciliation to `/finance/accounting/reconciliation`
- dashboard and settlement shortcuts now point to the new route

## What the Screen Shows

Screen title:
- Arabic: `مراجعة الحسابات المالية`
- English: `Financial Reconciliation`

Screen sections:
- safety notice explaining this is review/diagnostics only
- summary cards for scheduler, alerts, open critical issues, open warnings/errors, last scheduled run, and next scheduled run
- run controls for:
  - full reconciliation
  - payments
  - wallets
  - settlements
  - refunds
  - package settlements
- reconciliation runs table
- reconciliation issues table
- run detail drawer
- issue detail drawer
- safe review note input
- acknowledge / resolve / ignore issue actions
- step-up dialog for sensitive actions

## Run Controls

Implemented:
- run full reconciliation
- run payments reconciliation
- run wallet reconciliation
- run settlement reconciliation
- run refund reconciliation
- run package-settlement reconciliation

Behavior:
- run buttons require `ACCOUNTING_WRITE`
- step-up is required for sensitive run actions
- results refresh the runs/issues/status queries
- no auto-correction is performed

## Runs Table

Shows:
- scope
- trigger
- status
- currency
- started at
- finished at
- checked / passed / warning / critical counts
- view action

Filtering:
- scope
- trigger
- status
- currency
- date range

## Issues Table

Shows:
- severity
- issue code
- scope
- entity type
- entity id
- currency
- review status
- last detected
- expected / actual
- view action

Filtering:
- scope
- severity
- review status
- currency
- entity type
- entity id
- issue code
- run id
- date range

## Issue Details / Review Actions

Implemented:
- safe issue detail drawer
- safe metadata rendering
- review note capture
- acknowledge
- resolve
- ignore

Safety:
- no secrets
- no raw provider payloads
- no patient-sensitive notes
- no financial mutation

## Permissions and Step-up

Backend:
- read endpoints require `ACCOUNTING_READ`
- run/review actions require `ACCOUNTING_WRITE`
- allowed roles remain `ADMIN`, `SUPER_ADMIN`, `FINANCE_STAFF`
- support/patient/practitioner remain blocked

Frontend:
- navigation and page visibility respect `ACCOUNTING_READ`
- sensitive actions use the existing step-up dialog
- backend remains the source of truth

## Scheduler Status Visibility

Exposed in the UI via the new status endpoint:
- enabled
- alerts enabled
- cron expression
- lookback days
- batch size
- active state
- next scheduled run
- last scheduled run
- last scheduled run id
- last scheduled status
- last scheduled issue counts
- open critical count
- open warning count

## Alert Behavior

Implemented:
- critical issue alert signal
- safe, logged summary
- cooldown protection
- currency grouping

Deferred:
- external email/SMS/webhook delivery

## Files Changed

Backend:
- `fayed-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-operations.service.ts`
- `fayed-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-scheduler.service.ts`
- `fayed-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-alert.service.ts`
- `fayed-backend-v1/src/modules/financial-operations/controllers/admin-accounting-reconciliation-operations.controller.ts`
- `fayed-backend-v1/src/modules/financial-operations/financial-operations.module.ts`
- `fayed-backend-v1/src/modules/financial-operations/controllers/admin-accounting-reconciliation-operations.controller.access.spec.ts`
- `fayed-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-operations.service.spec.ts`
- `fayed-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-scheduler.service.spec.ts`
- `fayed-backend-v1/src/modules/financial-operations/services/accounting-reconciliation-alert.service.spec.ts`
- `fayed-backend-v1/docs/finance_accounting_reconciliation.md`

Frontend:
- `fayed-frontend-v1/src/features/admin/accounting-reconciliation/components/FinancialReconciliationScreen.tsx`
- `fayed-frontend-v1/src/features/admin/accounting-reconciliation/components/AccountingStepUpDialog.tsx`
- `fayed-frontend-v1/src/features/admin/accounting-reconciliation/api.ts`
- `fayed-frontend-v1/src/features/admin/accounting-reconciliation/hooks.ts`
- `fayed-frontend-v1/src/features/admin/accounting-reconciliation/query-keys.ts`
- `fayed-frontend-v1/src/features/admin/accounting-reconciliation/types.ts`
- `fayed-frontend-v1/src/features/admin/accounting-reconciliation/hooks/use-accounting-step-up.ts`
- `fayed-frontend-v1/src/app/[locale]/(admin)/admin/finance/accounting/reconciliation/page.tsx`
- `fayed-frontend-v1/src/app/[locale]/(admin)/admin/finance/reconciliation/page.tsx`
- `fayed-frontend-v1/src/config/navigation/admin.tsx`
- `fayed-frontend-v1/src/features/admin/accounting/components/AdminAccountingDashboardScreen.tsx`
- `fayed-frontend-v1/src/features/admin/settlements/components/AdminPayoutOperationsScreen.tsx`
- `fayed-frontend-v1/messages/en/admin-accounting.json`
- `fayed-frontend-v1/messages/ar/admin-accounting.json`

## Tests Added / Updated

Backend:
- scheduler service tests
- alert service tests
- reconciliation operations service tests
- admin reconciliation access contract test

Frontend:
- no new unit tests added in this phase

## Verification Results

Backend:
- `npm audit --audit-level=moderate` passed
- `npm run build` passed
- `npx prisma validate` passed
- `npx prisma migrate status` passed
- targeted Jest suites passed: `26/26`

Frontend:
- `npm audit --audit-level=moderate` passed
- `npx tsc --noEmit` passed
- `npm run build` passed
- targeted ESLint on changed files passed

Known caveat:
- full-repo `npm run lint` still hits a pre-existing ESLint scandir error in this repository layout, but the changed files lint cleanly

## Manual / Local QA Results

Not run in-browser in this phase.

The admin screen compiled successfully and the route was present in the build output, but no dedicated browser smoke session was performed during this turn.

## Remaining Gaps

- external alert delivery remains deferred
- no scheduled job is active in test environments by design
- broader browser smoke for the new admin screen still needs to be run
- full-repo ESLint remains affected by an existing repository-level scandir issue

## Final Answers

- Is scheduler/cron wiring implemented? yes
- Is alert/monitoring hook implemented? yes
- Is admin UI implemented? yes
- Can finance/admin users run reconciliation from UI? yes
- Can issues be reviewed from UI? yes
- Does the UI auto-correct financial data? no
- Are permissions and step-up enforced? yes
- Is the system now production-ready for financial reconciliation? conditional
- What remains before production? external alert delivery, scheduled-job rollout validation, and browser smoke on the new Financial Reconciliation screen

