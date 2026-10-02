import { registerAs } from '@nestjs/config';

function readInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export default registerAs('operationsQueue', () => ({
  enabled: process.env.DAILY_ATTENDANCE_QUEUE_ENABLED === 'true',
  redisUrl:
    process.env.OPERATIONS_QUEUE_REDIS_URL?.trim() ||
    process.env.NOTIFICATION_QUEUE_REDIS_URL?.trim() ||
    process.env.REDIS_URL?.trim() ||
    undefined,
  prefix:
    process.env.OPERATIONS_QUEUE_PREFIX?.trim() || 'sawiyaa:operations',
  connectionTimeoutMs: readInteger(
    'OPERATIONS_QUEUE_CONNECTION_TIMEOUT_MS',
    10_000,
  ),
  dailyAttendanceConcurrency: readInteger(
    'DAILY_ATTENDANCE_WORKER_CONCURRENCY',
    1,
  ),
  heartbeatIntervalMs: readInteger(
    'OPERATIONS_WORKER_HEARTBEAT_INTERVAL_MS',
    10_000,
  ),
}));
