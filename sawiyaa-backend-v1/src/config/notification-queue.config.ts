import { registerAs } from '@nestjs/config';

function readInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export default registerAs('notificationQueue', () => ({
  enabled: process.env.NOTIFICATION_QUEUE_ENABLED === 'true',
  redisUrl:
    process.env.NOTIFICATION_QUEUE_REDIS_URL?.trim() ||
    process.env.REDIS_URL?.trim() ||
    undefined,
  prefix:
    process.env.NOTIFICATION_QUEUE_PREFIX?.trim() || 'sawiyaa:notifications',
  connectionTimeoutMs: readInteger(
    'NOTIFICATION_QUEUE_CONNECTION_TIMEOUT_MS',
    10_000,
  ),
  workerConcurrency: readInteger('NOTIFICATION_WORKER_CONCURRENCY', 2),
  emailWorkerConcurrency: readInteger(
    'NOTIFICATION_EMAIL_WORKER_CONCURRENCY',
    1,
  ),
  pushWorkerConcurrency: readInteger('NOTIFICATION_PUSH_WORKER_CONCURRENCY', 1),
  providerRequestTimeoutMs: readInteger(
    'NOTIFICATION_PROVIDER_REQUEST_TIMEOUT_MS',
    10_000,
  ),
  retryMaxAttempts: readInteger('NOTIFICATION_RETRY_MAX_ATTEMPTS', 3),
  retryBaseDelayMs: readInteger('NOTIFICATION_RETRY_BASE_DELAY_MS', 300_000),
  retryMaxDelayMs: readInteger('NOTIFICATION_RETRY_MAX_DELAY_MS', 1_800_000),
  retryJitterMs: readInteger('NOTIFICATION_RETRY_JITTER_MS', 30_000),
  retryAfterMaxMs: readInteger('NOTIFICATION_RETRY_AFTER_MAX_MS', 1_800_000),
  heartbeatIntervalMs: readInteger(
    'NOTIFICATION_WORKER_HEARTBEAT_INTERVAL_MS',
    10_000,
  ),
  claimLeaseDurationMs: readInteger(
    'NOTIFICATION_CLAIM_LEASE_DURATION_MS',
    300_000,
  ),
  staleQueuedReconcilerEnabled:
    process.env.NOTIFICATION_STALE_QUEUED_RECONCILER_ENABLED !== 'false',
  staleQueuedReconciliationIntervalMs: readInteger(
    'NOTIFICATION_STALE_QUEUED_RECONCILIATION_INTERVAL_MS',
    60_000,
  ),
  staleQueuedReconciliationBatchSize: readInteger(
    'NOTIFICATION_STALE_QUEUED_RECONCILIATION_BATCH_SIZE',
    25,
  ),
  staleQueuedReconciliationMaxRowsPerSweep: readInteger(
    'NOTIFICATION_STALE_QUEUED_RECONCILIATION_MAX_ROWS_PER_SWEEP',
    100,
  ),
  staleQueuedReconciliationMaxDurationMs: readInteger(
    'NOTIFICATION_STALE_QUEUED_RECONCILIATION_MAX_DURATION_MS',
    5_000,
  ),
}));
