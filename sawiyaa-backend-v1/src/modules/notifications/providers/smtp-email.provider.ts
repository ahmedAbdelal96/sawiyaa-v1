import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailProviderAdapter,
  EmailDeliveryResult,
} from './email-provider.adapter';

type EmailTransporter = {
  sendMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

type NodemailerModule = {
  createTransport(config: unknown): EmailTransporter;
};

/**
 * SMTP email provider using nodemailer.
 * Implements {@link EmailProviderAdapter} so it can be swapped for any other provider.
 *
 * This provider handles only SMTP transport concerns:
 *   - Creating and reusing the nodemailer transporter
 *   - Validating that MAIL_FROM is configured
 *   - Mapping SMTP errors to safe internal error codes
 *   - Safe logging with masked targets
 *
 * Dev OTP redirect and bypass are NOT handled here — those are the
 * responsibility of {@link NotificationEmailService} so that all providers
 * receive the same platform-level behaviour.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProviderAdapter {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: EmailTransporter | null = null;
  private loggedTransportConfig = false;

  constructor(private readonly configService: ConfigService) {}

  get name(): string {
    return 'smtp';
  }

  protected maskTarget(target: string): string {
    if (!target) return '***';
    if (target.includes('@')) {
      const [local, domain] = target.split('@');
      const safeLocal =
        local.length <= 2
          ? `${local[0] ?? ''}*`
          : `${local.slice(0, 2)}***${local.slice(-1)}`;
      return `${safeLocal}@${domain}`;
    }
    if (target.length <= 4) return `${target[0] ?? ''}***`;
    return `${target.slice(0, 2)}***${target.slice(-2)}`;
  }

  private logTransportConfigOnce(): void {
    if (this.loggedTransportConfig) return;

    const host = this.configService.get<string>('notification.mail.smtp.host');
    const port = this.configService.get<number>('notification.mail.smtp.port');
    const secure = this.configService.get<boolean>(
      'notification.mail.smtp.secure',
    );
    const nodeEnv = this.configService.get<string>('app.nodeEnv');

    this.logger.log(
      `Email transport configured (env=${nodeEnv ?? 'unknown'}) provider=smtp host=${host ?? 'undefined'} port=${port ?? 'undefined'} secure=${secure ? 'true' : 'false'}`,
    );

    this.loggedTransportConfig = true;
  }

  private async buildTransporter(): Promise<EmailTransporter> {
    const host = this.configService.get<string>('notification.mail.smtp.host');
    const port = this.configService.get<number>('notification.mail.smtp.port');
    const secure = this.configService.get<boolean>(
      'notification.mail.smtp.secure',
    );
    const user = this.configService.get<string>('notification.mail.smtp.user');
    const pass = this.configService.get<string>('notification.mail.smtp.pass');

    const nodemailer = (await import('nodemailer')) as NodemailerModule;
    return nodemailer.createTransport({
      host,
      port,
      secure: Boolean(secure),
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    isOtp?: boolean;
  }): Promise<EmailDeliveryResult> {
    const from = this.configService.get<string>('notification.mail.from');

    if (!from) {
      this.logger.warn('SMTP from address not configured');
      return {
        delivered: false,
        deliveryTarget: input.to,
        error: 'MAIL_TRANSPORT_NOT_CONFIGURED',
      };
    }

    const purposeLabel = input.isOtp ? 'OTP' : 'notification';

    if (!this.transporter) {
      this.logTransportConfigOnce();
      this.transporter = await this.buildTransporter();
    }

    try {
      // Provider sends to exactly the `to` address it receives.
      // Dev redirect / bypass is handled by NotificationEmailService.
      await this.transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.body,
      });

      this.logger.log(
        `${purposeLabel} email delivered to ${this.maskTarget(input.to)}`,
      );

      return { delivered: true, deliveryTarget: input.to };
    } catch (error) {
      this.logger.error(
        `Failed to deliver ${purposeLabel.toLowerCase()} email`,
        error instanceof Error ? error.stack : String(error),
      );
      return { delivered: false, deliveryTarget: input.to, error: 'MAIL_SEND_FAILED' };
    }
  }
}
