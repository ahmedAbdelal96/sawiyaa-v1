import { ConfigService } from '@nestjs/config';
import { EmailProviderAdapter } from './email-provider.adapter';
import { BrevoEmailProvider } from './brevo-email.provider';
import { SmtpEmailProvider } from './smtp-email.provider';

export function createNotificationEmailProvider(
  configService: ConfigService,
): EmailProviderAdapter {
  const provider =
    configService.get<string>('notification.mail.provider')?.toLowerCase().trim() ??
    'smtp';

  if (provider === 'brevo') {
    const apiKey = configService.get<string>('notification.brevo.apiKey')?.trim();
    if (!apiKey) {
      throw new Error(
        '[NotificationEmailProvider] MAIL_PROVIDER=brevo requires BREVO_API_KEY to be set',
      );
    }
    return new BrevoEmailProvider(configService);
  }

  return new SmtpEmailProvider(configService);
}
