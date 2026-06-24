import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProviderAdapter } from '../providers/email-provider.adapter';
import { EMAIL_PROVIDER } from '../providers/email-provider.token';

type OtpRedirectResolution = {
  deliveryTarget: string;
  wasRedirected: boolean;
  redirectTarget?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  /**
   * Optional pre-rendered HTML body. When present, providers that support
   * rich content (Brevo) will deliver it as `htmlContent`. The plain-text
   * `body` is still sent as a fallback.
   *
   * SECURITY: never log this value — it may contain an OTP code.
   */
  html?: string;
  notificationId: string;
  isOtp: boolean;
};

/**
 * Notification email orchestrator.
 *
 * Owns all notification-level concerns:
 *   - Input validation (well-formed email address, target presence)
 *   - Dev redirect of OTP emails to a configured override address
 *   - Dev bypass of delivery failures for OTP emails
 *   - DB Notification record creation (via subclasses or callers)
 *   - Masking of delivery targets in logs
 *
 * Delegates actual transport/sending to the configured {@link EmailProviderAdapter}
 * (SMTP via nodemailer, Brevo, or a future provider).  The adapter contract
 * guarantees a safe internal result shape regardless of which provider is active.
 *
 * This separation means:
 * - Providers are easy to swap (set MAIL_PROVIDER)
 * - OTP delivery rules stay in one place (this service)
 * - Providers never need to know about dev redirects or bypass flags
 */
@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProviderAdapter,
  ) {}

  private normalizeTarget(target: string): string {
    return target.trim();
  }

  private isLikelyEmailTarget(target: string): boolean {
    return target.includes('@');
  }

  maskTarget(target: string): string {
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

  /**
   * Resolve the effective delivery target for OTP emails.
   * In development, redirects to the configured `DEV_OTP_EMAIL_REDIRECT` address
   * when that address looks like a valid email.
   *
   * Called by {@link OtpDeliveryDispatcherService} before dispatch.
   */
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

  private shouldBypassOtpDeliveryFailure(): boolean {
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    const devOtpBypassDeliveryFailures = this.configService.get<boolean>(
      'notification.mail.devOtpBypassDeliveryFailures',
    );

    return nodeEnv === 'development' && Boolean(devOtpBypassDeliveryFailures);
  }

  /**
   * Send an email notification.
   *
   * Validation and dev-redirect logic lives here.  The actual transport is
   * delegated to the injected {@link EmailProviderAdapter}.
   *
   * Returns the same shape as the adapter for compatibility with existing callers
   * ({@link OtpDeliveryDispatcherService}, operational notifications).
   */
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

    // Dev redirect: resolve effective delivery target for OTP emails before calling provider
    const { deliveryTarget } = input.isOtp
      ? this.resolveOtpTarget(normalizedTarget)
      : { deliveryTarget: normalizedTarget };

    // Delegate to the configured provider (SMTP, Brevo, etc.)
    // SECURITY: `html` may carry the OTP code — never log it here or downstream.
    const result = await this.emailProvider.sendEmail({
      to: deliveryTarget,
      subject: input.subject,
      body: input.body,
      ...(input.html ? { html: input.html } : {}),
      isOtp: input.isOtp,
    });

    if (result.delivered) {
      const redirectedFrom = input.isOtp && normalizedTarget !== deliveryTarget
        ? ` (redirected from ${this.maskTarget(normalizedTarget)})`
        : '';
      this.logger.log(
        `${purposeLabel} email delivered to ${this.maskTarget(result.deliveryTarget)}${redirectedFrom} (notification ${input.notificationId}, provider=${this.emailProvider.name})`,
      );
      return {
        delivered: true,
        deliveryTarget: result.deliveryTarget,
      };
    }

    // Provider failed
    this.logger.error(
      `Failed to deliver ${purposeLabel.toLowerCase()} email (notification ${input.notificationId}, provider=${this.emailProvider.name}): ${result.error}`,
    );

    // Dev OTP bypass: treat delivery failure as success so OTP flow continues
    if (input.isOtp && this.shouldBypassOtpDeliveryFailure()) {
      this.logger.warn(
        `DEV OTP fallback enabled; treating delivery as successful for notification ${input.notificationId}`,
      );
      return {
        delivered: true,
        deliveryTarget: result.deliveryTarget,
      };
    }

    return {
      delivered: false,
      deliveryTarget: result.deliveryTarget,
      error: result.error,
    };
  }
}
