# Financial Accounting Reconciliation

## Canonical accounting layers

- `LedgerEntry` is the canonical internal accounting source of truth.
- `Payment` is the collection lifecycle truth.
- `JournalEntry` is the balanced posting audit trail.
- `PractitionerWallet`, `CustomerWallet`, `SettlementBatch`, `PractitionerSettlement`, `PackageSettlement`, and payout tables are projections / workflow layers.

## Reconciliation layers

### Read-only diagnostics

The accounting diagnostics service compares:

- payment vs ledger vs journal
- practitioner wallet vs ledger-derived balances
- customer wallet vs reservations/entries
- settlement / batch vs included ledger entries
- refund vs reversal ledger entries
- package settlement vs release entries

### Operational reconciliation runs

The reconciliation operations service persists reconciliation runs and issues for operator review.

Run scopes:

- `PAYMENTS`
- `WALLETS`
- `SETTLEMENTS`
- `REFUNDS`
- `PACKAGE_SETTLEMENTS`
- `FULL`

Triggers:

- `MANUAL`
- `ADMIN`
- `SCHEDULED`
- `SYSTEM`

Severity:

- `INFO`
- `WARNING`
- `ERROR`
- `CRITICAL`

Issue lifecycle:

- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`
- `IGNORED`

## Admin operations

Admin operators can use the read-only endpoints to inspect runs and issues:

- `POST /admin/finance/accounting/reconciliation-runs/payments`
- `POST /admin/finance/accounting/reconciliation-runs/wallets`
- `POST /admin/finance/accounting/reconciliation-runs/settlements`
- `POST /admin/finance/accounting/reconciliation-runs/refunds`
- `POST /admin/finance/accounting/reconciliation-runs/package-settlements`
- `POST /admin/finance/accounting/reconciliation-runs/full`
- `GET /admin/finance/accounting/reconciliation-runs`
- `GET /admin/finance/accounting/reconciliation-runs/:runId`
- `GET /admin/finance/accounting/reconciliation-issues`
- `GET /admin/finance/accounting/reconciliation-issues/:issueId`
- `PATCH /admin/finance/accounting/reconciliation-issues/:issueId/acknowledge`
- `PATCH /admin/finance/accounting/reconciliation-issues/:issueId/resolve`
- `PATCH /admin/finance/accounting/reconciliation-issues/:issueId/ignore`

These endpoints are read-only with respect to financial data. Review actions only change issue review state.

## Environment flags

- `ACCOUNTING_RECONCILIATION_ENABLED`
- `ACCOUNTING_RECONCILIATION_ALERTS_ENABLED`
- `ACCOUNTING_RECONCILIATION_LOOKBACK_DAYS`
- `ACCOUNTING_RECONCILIATION_BATCH_SIZE`
- `ACCOUNTING_RECONCILIATION_CRON`

## Scheduler

When `ACCOUNTING_RECONCILIATION_ENABLED=true`, the backend starts a safe NestJS cron job that:

- runs a full reconciliation sweep on the configured cron schedule
- uses the configured lookback window and batch size
- writes a persisted reconciliation run and issues
- never mutates financial records
- logs only a safe summary with run id, status, issue counts, and severity counts
- remains disabled in test environments unless explicitly enabled

The scheduler is operational only. It does not auto-correct drift.

## Alerts

When `ACCOUNTING_RECONCILIATION_ALERTS_ENABLED=true`, the reconciliation operations flow emits a safe alert signal for critical reconciliation issues. Alerts:

- are grouped by currency where applicable
- include run id, scope, issue count, critical count, and top issue codes
- use safe metadata only
- are cooldown-limited to reduce spam
- never include provider payloads, secrets, tokens, or patient-sensitive notes

If alerts are disabled, reconciliation still runs normally and persists runs/issues.

## Admin status endpoint

The admin accounting UI can query a safe scheduler status endpoint:

- `GET /admin/finance/accounting/reconciliation-status`

It returns:

- enabled
- alertsEnabled
- cron
- lookbackDays
- batchSize
- active
- nextScheduledRunAt
- lastScheduledRunAt
- lastScheduledRunId
- lastScheduledRunStatus
- lastScheduledIssueCount
- lastScheduledCriticalCount
- lastFullRunAt
- openCriticalCount
- openWarningCount

## Operating rules

- Never auto-correct financial data from reconciliation results.
- Never mix currencies in settlement or wallet reconciliation.
- Never trust frontend/mobile calculations.
- No FX conversion is supported.
- Do not mix currencies in reconciliation summaries or settlement batches.
- Keep read/write permissions strict: `ACCOUNTING_READ` for review, `ACCOUNTING_WRITE` for run/review actions.
- Use step-up for sensitive run and review actions.
- Do not use reconciliation to rewrite historical finance records.

## Drift handling

When drift is detected:

1. Inspect the persisted run and issue records.
2. Review the safe metadata and issue code.
3. Compare payment, journal, ledger, wallet, settlement, and refund records.
4. Decide whether a manual finance fix is needed.
5. Never patch balances silently.
