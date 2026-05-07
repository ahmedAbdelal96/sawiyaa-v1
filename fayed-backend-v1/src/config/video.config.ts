import { registerAs } from '@nestjs/config';

export default registerAs('video', () => ({
  defaultProvider: process.env.VIDEO_PROVIDER_DEFAULT ?? 'DAILY',
  daily: {
    apiKey: process.env.DAILY_API_KEY,
    webhookSecret: process.env.DAILY_WEBHOOK_SECRET,
  },
  zoom: {
    accountId: process.env.ZOOM_ACCOUNT_ID,
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
  },
}));
