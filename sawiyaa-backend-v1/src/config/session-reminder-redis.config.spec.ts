import sessionReminderRedisConfig, {
  normalizeSessionReminderRedisMode,
} from './session-reminder-redis.config';

const readConfig = () =>
  (
    sessionReminderRedisConfig as unknown as () => {
      enabled: boolean;
      mode: string;
      redisUrl?: string;
    }
  )();

describe('session reminder Redis configuration', () => {
  const originalMode = process.env.REMINDER_REDIS_MODE;
  const originalEnabled = process.env.REMINDER_REDIS_ENABLED;
  const originalReminderUrl = process.env.REMINDER_REDIS_URL;
  const originalNotificationUrl = process.env.NOTIFICATION_QUEUE_REDIS_URL;
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.REMINDER_REDIS_MODE;
    else process.env.REMINDER_REDIS_MODE = originalMode;
    if (originalEnabled === undefined)
      delete process.env.REMINDER_REDIS_ENABLED;
    else process.env.REMINDER_REDIS_ENABLED = originalEnabled;
    if (originalReminderUrl === undefined)
      delete process.env.REMINDER_REDIS_URL;
    else process.env.REMINDER_REDIS_URL = originalReminderUrl;
    if (originalNotificationUrl === undefined)
      delete process.env.NOTIFICATION_QUEUE_REDIS_URL;
    else process.env.NOTIFICATION_QUEUE_REDIS_URL = originalNotificationUrl;
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedisUrl;
  });

  it.each([undefined, '', '   ', 'UNKNOWN', 'REDIS_PRIMARY'])(
    'falls back to DB_ONLY for an invalid or missing mode: %p',
    (mode) => {
      if (mode === undefined) delete process.env.REMINDER_REDIS_MODE;
      else process.env.REMINDER_REDIS_MODE = mode;

      expect(normalizeSessionReminderRedisMode(mode)).toBe('DB_ONLY');
      expect(readConfig()).toMatchObject({
        mode: 'DB_ONLY',
        enabled: false,
      });
    },
  );

  it('requires an explicit valid non-default mode before reminder Redis is enabled', () => {
    process.env.REMINDER_REDIS_ENABLED = 'true';
    process.env.REMINDER_REDIS_MODE = 'DB_ONLY';
    expect(readConfig()).toMatchObject({ mode: 'DB_ONLY', enabled: false });

    process.env.REMINDER_REDIS_MODE = 'REDIS_SHADOW';
    expect(readConfig()).toMatchObject({ mode: 'REDIS_SHADOW', enabled: true });
  });
});
