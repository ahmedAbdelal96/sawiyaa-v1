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
  heartbeatIntervalMs: readInteger(
    'NOTIFICATION_WORKER_HEARTBEAT_INTERVAL_MS',
    10_000,
  ),
}));
