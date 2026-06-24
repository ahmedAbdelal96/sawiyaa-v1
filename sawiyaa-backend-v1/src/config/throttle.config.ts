import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  // memory is fine for dev/test, but not multi-instance safe.
  store: (process.env.THROTTLE_STORE ?? 'memory').toLowerCase(),
  redisUrl: process.env.REDIS_URL,
  keyPrefix: process.env.THROTTLE_KEY_PREFIX ?? 'sawiyaa:throttle',
  keyHashSecret: process.env.THROTTLE_KEY_HASH_SECRET ?? '',
}));
