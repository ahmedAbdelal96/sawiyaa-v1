import { EmailProviderAdapter } from './email-provider.adapter';

/**
 * DI token for the email provider adapter.
 * Used in NotificationsModule to provide either SmtpEmailProvider or BrevoEmailProvider.
 */
export const EMAIL_PROVIDER = 'EMAIL_PROVIDER' as const;
