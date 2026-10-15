import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailProviderAdapter,
  EmailDeliveryResult,
} from './email-provider.adapter';
import {
  isProviderCapacityAdmissionError,
  ProviderCapacityService,
} from '../services/provider-capacity.service';

type EmailTransporter = {
  sendMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<{
    messageId?: string;
    accepted?: string[];
    rejected?: string[];
    response?: string;
  }>;
  close?: () => void;
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

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly capacity?: ProviderCapacityService,
  ) {}

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
      connectionTimeout: 30_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }

  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    isOtp?: boolean;
    operationKey?: string;
  }): Promise<EmailDeliveryResult> {
    const from = this.configService.get<string>('notification.mail.from');

    if (!from) {
      this.logger.warn('SMTP from address not configured');
      return {
        delivered: false,
        deliveryTarget: input.to,
        error: 'MAIL_TRANSPORT_NOT_CONFIGURED',
        ...(input.operationKey
          ? { errorCategory: 'CONFIGURATION' as const }
          : {}),
      };
    }

    const purposeLabel = input.isOtp ? 'OTP' : 'notification';

    try {
      if (!this.transporter) {
        this.logTransportConfigOnce();
        this.transporter = await this.buildTransporter();
      }

      // Provider sends to exactly the `to` address it receives.
      // Dev redirect / bypass is handled by NotificationEmailService.
      const transport = this.transporter;
      const send = async () => {
        const sendPromise = transport.sendMail({
          from,
          to: input.to,
          subject: input.subject,
          text: input.body,
        });
        let timeoutHandle: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            transport.close?.();
            reject(new Error('SMTP_OPERATION_TIMEOUT'));
          }, 30_000);
          timeoutHandle.unref?.();
        });
        return Promise.race([sendPromise, timeoutPromise]).finally(() => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        });
      };
      const info = this.capacity
        ? await this.capacity.execute('SMTP', send)
        : await send();

      this.logger.log(
        `${purposeLabel} email delivered to ${this.maskTarget(input.to)}`,
      );

      return {
        delivered: true,
        deliveryTarget: input.to,
        ...(input.operationKey
          ? {
              providerMessageId: info.messageId,
              providerOutcome: 'ACCEPTED' as const,
              responsePayload: {
                ...(info.accepted ? { accepted: info.accepted } : {}),
                ...(info.rejected ? { rejected: info.rejected } : {}),
                ...(info.response ? { response: info.response } : {}),
              },
            }
          : {}),
      };
    } catch (error) {
      if (isProviderCapacityAdmissionError(error)) {
        return {
          delivered: false,
          deliveryTarget: input.to,
          error: error.code,
          ...(input.operationKey
            ? {
                providerOutcome: 'FAILED' as const,
                errorCategory: 'TRANSIENT' as const,
                providerErrorCode: error.code,
                retryAfterMs: error.retryAfterMs || undefined,
                responsePayload: {
                  capacityReason: error.reason,
                  providerSendAttempted: false,
                },
              }
            : {}),
        };
      }
      this.logger.error(
        `Failed to deliver ${purposeLabel.toLowerCase()} email`,
        error instanceof Error ? error.stack : String(error),
      );
      const errorRecord =
        error && typeof error === 'object'
          ? (error as {
              code?: string;
              command?: string;
              response?: string;
              responseCode?: number;
            })
          : {};
      const command = errorRecord.command?.toUpperCase();
      const unknown =
        error instanceof Error &&
        (error.message === 'SMTP_OPERATION_TIMEOUT' ||
          ['DATA', 'UNKNOWN'].includes(command ?? '') ||
          ['ETIMEDOUT', 'ESOCKET', 'EPIPE'].includes(errorRecord.code ?? ''));
      const responseCode = errorRecord.responseCode;
      const errorCategory = unknown
        ? ('UNKNOWN_OUTCOME' as const)
        : responseCode && responseCode >= 400 && responseCode < 500
          ? ('TRANSIENT' as const)
          : responseCode && responseCode >= 500
            ? responseCode === 550 ||
              responseCode === 551 ||
              responseCode === 553
              ? ('RECIPIENT_INVALID' as const)
              : ('PERMANENT' as const)
            : ('TRANSIENT' as const);
      return {
        delivered: false,
        deliveryTarget: input.to,
        error: unknown ? 'SMTP_OUTCOME_UNKNOWN' : 'MAIL_SEND_FAILED',
        ...(input.operationKey
          ? {
              providerOutcome: unknown
                ? ('UNKNOWN' as const)
                : ('FAILED' as const),
              errorCategory,
              providerErrorCode: errorRecord.code ?? command,
              responsePayload: {
                ...(errorRecord.code ? { code: errorRecord.code } : {}),
                ...(command ? { command } : {}),
                ...(errorRecord.responseCode
                  ? { responseCode: errorRecord.responseCode }
                  : {}),
              },
            }
          : {}),
      };
    }
  }
}
