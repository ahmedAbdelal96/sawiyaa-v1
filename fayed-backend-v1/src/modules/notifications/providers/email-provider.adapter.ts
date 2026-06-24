/**
 * Email provider adapter contract.
 *
 * Used by NotificationEmailService to send email via any supported provider
 * (SMTP, Brevo, Amazon SES, etc.) without coupling to any specific implementation.
 *
 * All providers must:
 *  - Accept pre-rendered subject + body (platform owns the content)
 *  - Return a safe internal result shape (never expose provider errors to callers)
 *  - Never log sensitive data (API keys, OTP codes, passwords)
 *  - Support short timeouts to avoid blocking the caller
 */
export interface EmailProviderAdapter {
  /** Provider identifier, e.g. 'smtp' or 'brevo' */
  readonly name: string;

  /**
   * Send a pre-rendered email.
   *
   * @param input.to        - Recipient email address
   * @param input.subject   - Pre-rendered subject line (already interpolated)
   * @param input.body      - Pre-rendered plain-text body (already interpolated)
   * @param input.html      - Optional pre-rendered HTML body. When present, providers
   *                          should send it as htmlContent. At least one of `body`
   *                          or `html` MUST be a non-empty string.
   * @param input.isOtp     - Whether this is an OTP email (allows provider-specific dev handling)
   */
  sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    isOtp?: boolean;
  }): Promise<EmailDeliveryResult>;
}

/**
 * Provider-agnostic delivery result.
 * The `error` field, if present, is a safe internal code — never a raw provider message.
 */
export type EmailDeliveryResult =
  | { delivered: true; deliveryTarget: string; providerMessageId?: string }
  | { delivered: false; deliveryTarget: string; error: string };
