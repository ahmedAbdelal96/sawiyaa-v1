import { registerAs } from '@nestjs/config';

function parseBooleanFlag(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export default registerAs('accountingReconciliation', () => ({
  enabled: parseBooleanFlag(
    process.env.ACCOUNTING_RECONCILIATION_ENABLED,
    false,
  ),
  alertsEnabled: parseBooleanFlag(
    process.env.ACCOUNTING_RECONCILIATION_ALERTS_ENABLED,
    false,
  ),
  lookbackDays: parseInt(
    process.env.ACCOUNTING_RECONCILIATION_LOOKBACK_DAYS ?? '7',
    10,
  ),
  batchSize: parseInt(
    process.env.ACCOUNTING_RECONCILIATION_BATCH_SIZE ?? '100',
    10,
  ),
  cron: process.env.ACCOUNTING_RECONCILIATION_CRON ?? '0 3 * * *',
}));
