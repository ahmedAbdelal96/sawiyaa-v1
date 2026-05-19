import { registerAs } from '@nestjs/config';

export default registerAs('stepUp', () => ({
  enabled:
    process.env.STEP_UP_ENABLED !== undefined
      ? process.env.STEP_UP_ENABLED === 'true'
      : (process.env.NODE_ENV ?? 'development') === 'production',
  ttlSeconds: parseInt(process.env.STEP_UP_TTL_SECONDS ?? '600', 10),
}));
