import { registerAs } from '@nestjs/config';

function readInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export default registerAs('sessionReminderDispatch', () => ({
  // 100 rows keeps each claim small enough for the existing pool while
  // allowing a dispatcher to drain a normal minute of due work quickly.
  batchSize: readInteger('REMINDER_DISPATCH_BATCH_SIZE', 100),
  // Hard cap per cycle prevents a backlog from monopolizing the application.
  maxRowsPerSweep: readInteger('REMINDER_DISPATCH_MAX_ROWS_PER_SWEEP', 500),
  // Five seconds leaves room for API traffic between one-minute sweeps.
  maxDurationMs: readInteger('REMINDER_DISPATCH_MAX_DURATION_MS', 5_000),
  // Four in-flight items is conservative for the current DB pool and avoids
  // turning reminder delivery into an unbounded fan-out.
  concurrency: readInteger('REMINDER_DISPATCH_CONCURRENCY', 4),
  // One minute covers the bounded window and gives another dispatcher a
  // deterministic crash-recovery point.
  leaseDurationMs: readInteger('REMINDER_LEASE_DURATION_MS', 60_000),
}));
