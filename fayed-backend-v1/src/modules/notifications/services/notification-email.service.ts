import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailTransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
};

type EmailTransporter = {
  sendMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

type NodemailerModule = {
  createTransport(config: EmailTransportConfig): EmailTransporter;
};

type OtpRedirectResolution = {
  deliveryTarget: string;
  wasRedirected: boolean;
  redirectTarget?: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  notificationId: string;
  isOtp: boolean;
};

/**
 * Minimal SMTP email sender for notifications.
 * This is intentionally small and environment-driven to keep OTP delivery testable in dev.
 */
@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);
  private transporter: EmailTransporter | null = null;
  private loggedTransportConfig = false;

  constructor(private readonly configService: ConfigService) {}

  private normalizeTarget(target: string): string {
    return target.trim();
  }

  private isLikelyEmailTarget(target: string): boolean {
    return target.includes('@');
  }

  private maskTarget(target: string): string {
    if (!target) {
      return '***';
    }
    if (target.includes('@')) {
      const [local, domain] = target.split('@');
      const safeLocal =
        local.length <= 2
          ? `${local[0] ?? ''}*`
          : `${local.slice(0, 2)}***${local.slice(-1)}`;
      return `${safeLocal}@${domain}`;
    }
    if (target.length <= 4) {
      return `${target[0] ?? ''}***`;
    }
    return `${target.slice(0, 2)}***${target.slice(-2)}`;
  }

  resolveOtpTarget(target: string): OtpRedirectResolution {
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    const redirectTarget = this.configService.get<string>(
      'notification.mail.devOtpEmailRedirect',
    );

    if (nodeEnv === 'development' && redirectTarget?.trim()) {
      const normalizedRedirectTarget = this.normalizeTarget(redirectTarget);
      if (!this.isLikelyEmailTarget(normalizedRedirectTarget)) {
        this.logger.warn(
          `OTP email redirect ignored (invalid target): ${this.maskTarget(normalizedRedirectTarget)}`,
        );
        return {
          deliveryTarget: target,
          wasRedirected: false,
        };
      }

      this.logger.warn(
        `OTP email redirect enabled: ${this.maskTarget(target)} -> ${this.maskTarget(normalizedRedirectTarget)}`,
      );
      return {
        deliveryTarget: normalizedRedirectTarget,
        redirectTarget: normalizedRedirectTarget,
        wasRedirected: true,
      };
    }

    return {
      deliveryTarget: target,
      wasRedirected: false,
    };
  }

  private logTransportConfigOnce(): void {
    if (this.loggedTransportConfig) {
      return;
    }

    const provider = this.configService.get<string>(
      'notification.mail.provider',
    );
    const host = this.configService.get<string>('notification.mail.smtp.host');
    const port = this.configService.get<number>('notification.mail.smtp.port');
    const secure = this.configService.get<boolean>(
      'notification.mail.smtp.secure',
    );
    const redirectTarget = this.configService.get<string>(
      'notification.mail.devOtpEmailRedirect',
    );
    const devOtpBypassDeliveryFailures = this.configService.get<boolean>(
      'notification.mail.devOtpBypassDeliveryFailures',
    );
    const nodeEnv = this.configService.get<string>('app.nodeEnv');

    this.logger.log(
      `Email transport configured (env=${nodeEnv ?? 'unknown'}) provider=${provider ?? 'undefined'} host=${host ?? 'undefined'} port=${port ?? 'undefined'} secure=${secure ? 'true' : 'false'} devRedirect=${redirectTarget?.trim() ? this.maskTarget(redirectTarget.trim()) : 'disabled'} devOtpBypassFailures=${devOtpBypassDeliveryFailures ? 'true' : 'false'}`,
    );

    this.loggedTransportConfig = true;
  }

  private shouldBypassOtpDeliveryFailure(): boolean {
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    const devOtpBypassDeliveryFailures = this.configService.get<boolean>(
      'notification.mail.devOtpBypassDeliveryFailures',
    );

    return nodeEnv === 'development' && Boolean(devOtpBypassDeliveryFailures);
  }

  async sendEmail(input: SendEmailInput): Promise<{
    delivered: boolean;
    deliveryTarget: string;
    error?: string;
  }> {
    const normalizedTarget = this.normalizeTarget(input.to);
    if (!normalizedTarget) {
      this.logger.warn(
        `Email target missing for notification ${input.notificationId}`,
      );
      return {
        delivered: false,
        deliveryTarget: input.to,
        error: 'EMAIL_TARGET_MISSING',
      };
    }

    if (!this.isLikelyEmailTarget(normalizedTarget)) {
      this.logger.warn(
        `Email target invalid for notification ${input.notificationId}: ${this.maskTarget(normalizedTarget)}`,
      );
      return {
        delivered: false,
        deliveryTarget: normalizedTarget,
        error: 'EMAIL_TARGET_INVALID',
      };
    }

    const purposeLabel = input.isOtp ? 'OTP' : 'notification';
    const provider = this.configService.get<string>(
      'notification.mail.provider',
    );
    const from = this.configService.get<string>('notification.mail.from');
    const host = this.configService.get<string>('notification.mail.smtp.host');
    const port = this.configService.get<number>('notification.mail.smtp.port');
    const secure = this.configService.get<boolean>(
      'notification.mail.smtp.secure',
    );
    const user = this.configService.get<string>('notification.mail.smtp.user');
    const pass = this.configService.get<string>('notification.mail.smtp.pass');

    if (provider !== 'smtp') {
      this.logger.warn(
        `Email provider "${provider ?? 'undefined'}" not supported for OTP delivery`,
      );
      return {
        delivered: false,
        deliveryTarget: normalizedTarget,
        error: 'MAIL_PROVIDER_UNSUPPORTED',
      };
    }

    if (!from || !host || !port) {
      this.logger.warn(
        'SMTP mail configuration is incomplete; OTP email delivery skipped',
      );
      return {
        delivered: false,
        deliveryTarget: normalizedTarget,
        error: 'MAIL_TRANSPORT_NOT_CONFIGURED',
      };
    }

    this.logTransportConfigOnce();

    if (!this.transporter) {
      const nodemailer = (await import('nodemailer')) as NodemailerModule;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: Boolean(secure),
        auth: user && pass ? { user, pass } : undefined,
      });
    }

    try {
      await this.transporter.sendMail({
        from,
        to: normalizedTarget,
        subject: input.subject,
        text: input.body,
      });

      this.logger.log(
        `${purposeLabel} email delivered to ${this.maskTarget(normalizedTarget)} (notification ${input.notificationId})`,
      );

      return {
        delivered: true,
        deliveryTarget: normalizedTarget,
      };
    } catch (error) {
      this.logger.error(
        `Failed to deliver OTP email (notification ${input.notificationId})`,
        error instanceof Error ? error.stack : String(error),
      );

      if (input.isOtp && this.shouldBypassOtpDeliveryFailure()) {
        this.logger.warn(
          `DEV OTP fallback enabled; treating delivery as successful for notification ${input.notificationId}`,
        );
        return {
          delivered: true,
          deliveryTarget: normalizedTarget,
        };
      }

      return {
        delivered: false,
        deliveryTarget: normalizedTarget,
        error: 'MAIL_SEND_FAILED',
      };
    }
  }
}
