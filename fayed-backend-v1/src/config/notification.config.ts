import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
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
}));
