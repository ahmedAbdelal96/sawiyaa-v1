import { registerAs } from '@nestjs/config';

export type SessionReminderRedisMode =
  | 'DB_ONLY'
  | 'REDIS_SHADOW'
  | 'REDIS_PRIMARY_WITH_DB_RECOVERY';

export const DEFAULT_SESSION_REMINDER_REDIS_MODE: SessionReminderRedisMode =
  'DB_ONLY';

const SESSION_REMINDER_REDIS_MODES: readonly SessionReminderRedisMode[] = [
  'DB_ONLY',
  'REDIS_SHADOW',
  'REDIS_PRIMARY_WITH_DB_RECOVERY',
];

export function normalizeSessionReminderRedisMode(
  value: string | undefined,
): SessionReminderRedisMode {
  const normalized = value?.trim();
  return SESSION_REMINDER_REDIS_MODES.includes(
    normalized as SessionReminderRedisMode,
  )
    ? (normalized as SessionReminderRedisMode)
    : DEFAULT_SESSION_REMINDER_REDIS_MODE;
}

function readInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export default registerAs('sessionReminderRedis', () => {
  const mode = normalizeSessionReminderRedisMode(
    process.env.REMINDER_REDIS_MODE,
  );

  return {
    enabled:
      process.env.REMINDER_REDIS_ENABLED === 'true' && mode !== 'DB_ONLY',
    mode,
    redisUrl:
      process.env.REMINDER_REDIS_URL?.trim() ||
      process.env.NOTIFICATION_QUEUE_REDIS_URL?.trim() ||
      process.env.REDIS_URL?.trim() ||
      undefined,
    prefix:
      process.env.REMINDER_REDIS_QUEUE_PREFIX?.trim() ||
      'sawiyaa:session-reminders',
    connectionTimeoutMs: readInteger(
      'REMINDER_REDIS_CONNECTION_TIMEOUT_MS',
      10_000,
    ),
    horizonMinutes: readInteger('REMINDER_REDIS_HORIZON_MINUTES', 60),
    lookbackMinutes: readInteger('REMINDER_REDIS_LOOKBACK_MINUTES', 15),
    refillIntervalMs: readInteger('REMINDER_REDIS_REFILL_INTERVAL_MS', 30_000),
    stageBatchSize: readInteger('REMINDER_REDIS_STAGE_BATCH_SIZE', 500),
    stageMaxRows: readInteger('REMINDER_REDIS_STAGE_MAX_ROWS', 5_000),
    workerConcurrency: readInteger('REMINDER_REDIS_WORKER_CONCURRENCY', 10),
    heartbeatIntervalMs: readInteger(
      'REMINDER_REDIS_WORKER_HEARTBEAT_INTERVAL_MS',
      10_000,
    ),
    removeOnCompleteAgeSeconds: readInteger(
      'REMINDER_REDIS_REMOVE_ON_COMPLETE_AGE_SECONDS',
      86_400,
    ),
    removeOnCompleteCount: readInteger(
      'REMINDER_REDIS_REMOVE_ON_COMPLETE_COUNT',
      10_000,
    ),
    removeOnFailAgeSeconds: readInteger(
      'REMINDER_REDIS_REMOVE_ON_FAIL_AGE_SECONDS',
      604_800,
    ),
    removeOnFailCount: readInteger(
      'REMINDER_REDIS_REMOVE_ON_FAIL_COUNT',
      10_000,
    ),
  };
});
