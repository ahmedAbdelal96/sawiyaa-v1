import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProviderAdapter, EmailDeliveryResult } from './email-provider.adapter';

/**
 * Brevo (formerly Sendinblue) transactional email provider.
 * Implements {@link EmailProviderAdapter} so it can be swapped for any other provider.
 *
 * Uses the Brevo SMTP REST API — no SDK, just Node.js built-in `fetch`.
 * API docs: https://developers.brevo.com/docs/smtp-apis/
 *
 * Brevo API authentication uses the `api-key` request header (not Bearer).
 * The `Accept: application/json` header is required by the Brevo API.
 */
@Injectable()
export class BrevoEmailProvider implements EmailProviderAdapter {
  private readonly logger = new Logger(BrevoEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  get name(): string {
    return 'brevo';
  }

  private maskTarget(target: string): string {
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

  private get apiKey(): string {
    return (
      this.configService.get<string>('notification.brevo.apiKey') ?? ''
    );
  }

  private get apiUrl(): string {
    return (
      this.configService.get<string>('notification.brevo.apiUrl') ??
      'https://api.brevo.com'
    );
  }

  private get fromAddress(): string {
    return this.configService.get<string>('notification.mail.from') ?? '';
  }

  private async sendViaApi(payload: {
    to: string;
    subject: string;
    textContent?: string;
    htmlContent?: string;
  }): Promise<{ ok: boolean; messageId?: string; statusCode?: number }> {
    const url = `${this.apiUrl}/v3/smtp/email`;
    const apiKey = this.apiKey;

    // Brevo requires at least one of `htmlContent` or `textContent`.
    // Build the content payload from whichever content types are non-empty.
    const emailPayload: Record<string, unknown> = {
      sender: { email: this.fromAddress },
      to: [{ email: payload.to }],
      subject: payload.subject,
    };
    if (payload.htmlContent && payload.htmlContent.trim().length > 0) {
      emailPayload.htmlContent = payload.htmlContent;
    }
    if (payload.textContent && payload.textContent.trim().length > 0) {
      emailPayload.textContent = payload.textContent;
    }
    if (
      emailPayload.htmlContent === undefined &&
      emailPayload.textContent === undefined
    ) {
      // Fail-fast guard: Brevo would return 400 missing_parameter if we sent an
      // empty body. Surface a safe internal error before the HTTP call.
      this.logger.error('Brevo send aborted: no htmlContent or textContent');
      return { ok: false };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(emailPayload),
        // 10-second timeout per the Brevo SLA
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // Network error / DNS / timeout
      this.logger.error(
        `Brevo API network error: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { ok: false };
    }

    if (response.ok) {
      let messageId: string | undefined;
      try {
        const json = (await response.json()) as { messageId?: string };
        messageId = json.messageId;
      } catch {
        // ignore parse error — success is determined by status
      }
      return { ok: true, messageId };
    }

    // Log truncated body to aid debugging without leaking payload/creds
    let causeInfo = '';
    try {
      const body = await response.text();
      causeInfo = body.length > 200 ? ` body=${body.slice(0, 200)}...` : ` body=${body}`;
    } catch {
      // ignore
    }
    this.logger.warn(
      `Brevo API returned ${response.status}${causeInfo}`,
    );
    return { ok: false, statusCode: response.status };
  }

  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    isOtp?: boolean;
  }): Promise<EmailDeliveryResult> {
    if (!this.fromAddress) {
      this.logger.warn('Brevo from address not configured');
      return {
        delivered: false,
        deliveryTarget: input.to,
        error: 'MAIL_TRANSPORT_NOT_CONFIGURED',
      };
    }

    if (!this.apiKey) {
      this.logger.error('Brevo API key not configured');
      return {
        delivered: false,
        deliveryTarget: input.to,
        error: 'BREVO_API_KEY_NOT_CONFIGURED',
      };
    }

    // Fail fast before calling Brevo when both content fields are empty/whitespace.
    // Brevo would otherwise return 400 missing_parameter ("Either of htmlContent
    // or textContent is required").
    const textContent = input.body?.trim() ?? '';
    const htmlContent = input.html?.trim() ?? '';
    if (!textContent && !htmlContent) {
      this.logger.error(
        'Brevo send aborted: empty body and html for ' +
          `${input.isOtp ? 'OTP' : 'notification'} email`,
      );
      return {
        delivered: false,
        deliveryTarget: input.to,
        error: 'EMAIL_CONTENT_REQUIRED',
      };
    }

    const purposeLabel = input.isOtp ? 'OTP' : 'notification';
    const result = await this.sendViaApi({
      to: input.to,
      subject: input.subject,
      ...(htmlContent ? { htmlContent } : {}),
      ...(textContent ? { textContent } : {}),
    });

    if (result.ok) {
      this.logger.log(
        `${purposeLabel} email delivered to ${this.maskTarget(input.to)}${result.messageId ? ` (Brevo messageId=${result.messageId})` : ''}`,
      );
      return {
        delivered: true,
        deliveryTarget: input.to,
        providerMessageId: result.messageId,
      };
    }

    this.logger.error(
      `Failed to deliver ${purposeLabel.toLowerCase()} email via Brevo to ${this.maskTarget(input.to)}`,
    );
    return {
      delivered: false,
      deliveryTarget: input.to,
      error: 'BREVO_SEND_FAILED',
    };
  }
}
