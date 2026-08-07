import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  web: {
    // Development is an explicit local-testing environment. Every deployed
    // environment must configure this to the public Sawiyaa web origin.
    publicUrl:
      process.env.WEB_APP_URL ??
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null),
  },
  mail: {
    provider: process.env.MAIL_PROVIDER,
    from: process.env.MAIL_FROM,
    devOtpEmailRedirect: process.env.DEV_OTP_EMAIL_REDIRECT,
    devOtpBypassDeliveryFailures:
      process.env.DEV_OTP_BYPASS_DELIVERY_FAILURES === 'true',
    smtp: {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
      secure: process.env.MAIL_SECURE === 'true',
    },
  },
  sms: {
    provider: process.env.SMS_PROVIDER,
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    apiUrl: process.env.BREVO_API_URL ?? 'https://api.brevo.com',
  },
}));
