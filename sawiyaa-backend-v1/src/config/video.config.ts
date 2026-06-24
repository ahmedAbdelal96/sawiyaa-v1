import { registerAs } from '@nestjs/config';

export default registerAs('video', () => {
  const defaultProvider =
    (process.env.VIDEO_PROVIDER_DEFAULT ?? 'DAILY').trim().toUpperCase();

  if (defaultProvider !== 'DAILY') {
    throw new Error(
      `[video.config] Unsupported VIDEO_PROVIDER_DEFAULT="${process.env.VIDEO_PROVIDER_DEFAULT}". Only DAILY is supported in Phase 1.`,
    );
  }

  return {
    defaultProvider: 'DAILY',
    daily: {
      apiKey: process.env.DAILY_API_KEY,
      apiBaseUrl:
        process.env.DAILY_API_BASE_URL?.trim() ||
        'https://api.daily.co/v1',
      webhookSecret: process.env.DAILY_WEBHOOK_SECRET,
    },
  };
});
