/**
 * Password reset OTP email — locale-aware (English / Arabic).
 *
 * Practitioner password reset is English-only by product decision.
 * Patient password reset is locale-driven (ar/en).
 *
 * The dispatcher calls this template directly for OtpPurpose.PASSWORD_RESET
 * instead of going through the i18n catalog, so that we can render a
 * rich HTML body consistently without depending on notification-type DB
 * records for email content.
 *
 * IMPORTANT:
 *  - The OTP code value is interpolated into both `body` and `html`.
 *    Never log the returned strings — they contain the verification code.
 *  - `html` is rendered as a self-contained, inline-CSS email (no remote
 *    images, no buttons) that satisfies the Sawiyaa brand layout.
 *  - `ttlMinutes` is the validity window in whole minutes (>= 1).
 */
export interface PasswordResetOtpEmailInput {
  code: string;
  ttlMinutes: number;
  locale: 'en' | 'ar';
  /** Set to true for practitioner (English only regardless of locale). */
  isPractitioner: boolean;
}

export interface PasswordResetOtpEmail {
  subject: string;
  body: string;
  html: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const BRAND_LINE = 'Sawiyaa | سويّة';
const TAGLINE_EN = 'Safer, more private mental healthcare.';
const TAGLINE_AR = 'رعاية صحية نفسية أكثر أمانًا وخصوصية.';

// ─── English ────────────────────────────────────────────────────────────────

const SUBJECT_EN = 'Your Sawiyaa password reset code';

const BODY_TEMPLATE_EN = `Hello,

Use this verification code to reset your Sawiyaa password:

{{code}}

This code is valid for {{ttlMinutes}} minutes.

For your security, do not share this code with anyone. The Sawiyaa team will never ask for your verification code.

${BRAND_LINE}
${TAGLINE_EN}`;

// ─── Arabic ─────────────────────────────────────────────────────────────────

const SUBJECT_AR = 'رمز إعادة تعيين كلمة المرور في سويّة';

const BODY_TEMPLATE_AR = `مرحبًا،

استخدم رمز التحقق التالي لإعادة تعيين كلمة المرور في سويّة:

{{code}}

صالح لمدة {{ttlMinutes}} دقيقة.

لأمانك، لا تشارك رمز التحقق هذا مع أي شخص. لن يطلب منك فريق سويّة رمز التحقق مطلقًا.

${BRAND_LINE}
${TAGLINE_AR}`;

/**
 * Build the OTP code block (highlighted, large, monospaced, LTR).
 * The container uses `dir="ltr"` so digits render correctly even when
 * the surrounding email is in an RTL locale.
 */
const renderOtpBlock = (safeCode: string): string => `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;margin-bottom:8px;">
      <tr>
        <td align="center" style="background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:22px 16px;">
          <div dir="ltr" style="direction:ltr;unicode-bidi:isolate;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:38px;font-weight:800;letter-spacing:6px;color:#065F46;text-align:center;line-height:1.1;">${safeCode}</div>
        </td>
      </tr>
    </table>`.trim();

/**
 * Security warning callout box.
 */
const renderSecurityWarning = (text: string): string => `
    <tr>
      <td style="padding:20px 32px 0 32px;">
        <div style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;">
          <p style="margin:0;font-size:13px;line-height:19px;color:#92400E;">${escapeHtml(text)}</p>
        </div>
      </td>
    </tr>`.trim();

/**
 * Footer with brand line and tagline.
 */
const renderFooter = (brandLine: string, tagline: string): string => `
    <tr>
      <td style="padding:24px 32px 28px 32px;text-align:center;">
        <p style="margin:0;font-size:13px;line-height:18px;color:#0F766E;font-weight:600;">${escapeHtml(brandLine)}</p>
        <p style="margin:4px 0 0 0;font-size:12px;line-height:18px;color:#9CA3AF;">${escapeHtml(tagline)}</p>
      </td>
    </tr>`.trim();

const renderHtmlEn = (safeCode: string, ttlMinutes: number): string => `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(SUBJECT_EN)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7FAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1F2937;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F7FAF8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 4px 32px;text-align:center;">
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#0F766E;letter-spacing:0.2px;">${escapeHtml(BRAND_LINE)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;text-align:center;">
                <h2 style="margin:0;font-size:18px;font-weight:600;color:#111827;line-height:26px;">${escapeHtml(SUBJECT_EN)}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:15px;line-height:22px;color:#374151;">Hello,</p>
                <p style="margin:8px 0 0 0;font-size:15px;line-height:22px;color:#374151;">Use this verification code to reset your Sawiyaa password:</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                ${renderOtpBlock(safeCode)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;text-align:center;">
                <p style="margin:8px 0 0 0;font-size:13px;line-height:20px;color:#6B7280;">This code is valid for ${ttlMinutes} minutes.</p>
              </td>
            </tr>
            ${renderSecurityWarning('For your security, do not share this code with anyone. The Sawiyaa team will never ask for your verification code.')}
            ${renderFooter(BRAND_LINE, TAGLINE_EN)}
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;line-height:16px;color:#9CA3AF;text-align:center;">If you did not request a password reset, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const renderHtmlAr = (safeCode: string, ttlMinutes: number): string => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(SUBJECT_AR)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7FAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1F2937;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F7FAF8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 4px 32px;text-align:center;">
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#0F766E;letter-spacing:0.2px;">${escapeHtml(BRAND_LINE)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;text-align:center;">
                <h2 style="margin:0;font-size:18px;font-weight:600;color:#111827;line-height:26px;">${escapeHtml(SUBJECT_AR)}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:15px;line-height:22px;color:#374151;" dir="rtl">مرحبًا،</p>
                <p style="margin:8px 0 0 0;font-size:15px;line-height:22px;color:#374151;" dir="rtl">استخدم رمز التحقق التالي لإعادة تعيين كلمة المرور في سويّة:</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                ${renderOtpBlock(safeCode)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;text-align:center;">
                <p style="margin:8px 0 0 0;font-size:13px;line-height:20px;color:#6B7280;" dir="rtl">صالح لمدة ${ttlMinutes} دقيقة.</p>
              </td>
            </tr>
            ${renderSecurityWarning('لأمانك، لا تشارك رمز التحقق هذا مع أي شخص. لن يطلب منك فريق سويّة رمز التحقق مطلقًا.')}
            ${renderFooter(BRAND_LINE, TAGLINE_AR)}
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;line-height:16px;color:#9CA3AF;text-align:center;" dir="rtl">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const renderBodyEn = (code: string, ttlMinutes: number): string =>
  BODY_TEMPLATE_EN.replace('{{code}}', code).replace(
    '{{ttlMinutes}}',
    String(ttlMinutes),
  );

const renderBodyAr = (code: string, ttlMinutes: number): string =>
  BODY_TEMPLATE_AR.replace('{{code}}', code).replace(
    '{{ttlMinutes}}',
    String(ttlMinutes),
  );

/**
 * Renders the password reset OTP email.
 *
 * - For practitioners: always English, regardless of `locale` field.
 * - For patients: locale-driven (ar → Arabic, en → English).
 *
 * Pure and side-effect free — safe to unit-test without mocking.
 */
export const renderPasswordResetOtpEmail = (
  input: PasswordResetOtpEmailInput,
): PasswordResetOtpEmail => {
  const code = String(input.code ?? '').trim();
  const ttlMinutes = Math.max(1, Math.floor(Number(input.ttlMinutes) || 0));
  const safeCode = escapeHtml(code);

  // Practitioner password reset is always English.
  const locale: 'en' | 'ar' = input.isPractitioner ? 'en' : input.locale;

  if (locale === 'ar') {
    return {
      subject: SUBJECT_AR,
      body: renderBodyAr(code, ttlMinutes),
      html: renderHtmlAr(safeCode, ttlMinutes),
    };
  }

  return {
    subject: SUBJECT_EN,
    body: renderBodyEn(code, ttlMinutes),
    html: renderHtmlEn(safeCode, ttlMinutes),
  };
};
