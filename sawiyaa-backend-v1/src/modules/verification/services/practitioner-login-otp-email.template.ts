/**
 * Practitioner login OTP email — English only (product decision).
 *
 * For now, practitioner login OTP emails must be sent in English regardless
 * of the frontend locale / request locale. The dispatcher forces English
 * content for `OtpPurpose.PRACTITIONER_LOGIN` by calling this template
 * directly, instead of going through the i18n catalog.
 *
 * Other OTP purposes (PASSWORD_RESET) still use the i18n catalog and remain
 * locale-driven.
 *
 * IMPORTANT:
 *  - The OTP code value is interpolated into both `body` and `html`.
 *    Never log the returned strings — they contain the verification code.
 *  - `html` is rendered as a self-contained, inline-CSS email (no remote
 *    images, no buttons) that satisfies the Sawiyaa brand layout.
 *  - `ttlMinutes` is the validity window in whole minutes (>= 1).
 */
export interface PractitionerLoginOtpEmailInput {
  code: string;
  ttlMinutes: number;
}

export interface PractitionerLoginOtpEmail {
  subject: string;
  body: string;
  html: string;
}

const SUBJECT = 'Your Sawiyaa login code';

const BRAND_LINE = 'Sawiyaa | سويّة';
const TAGLINE = 'Safer, more private mental healthcare.';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Build the OTP code block (highlighted, large, monospaced, LTR).
 * Used by both the HTML body and by the assertion that the code block
 * is visually highlighted. We keep the markup minimal and inline so it
 * renders well in Gmail, Outlook, and Brevo's preview.
 */
const renderOtpBlock = (safeCode: string): string => `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;margin-bottom:8px;">
      <tr>
        <td align="center" style="background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:22px 16px;">
          <div dir="ltr" style="direction:ltr;unicode-bidi:isolate;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:38px;font-weight:800;letter-spacing:6px;color:#065F46;text-align:center;line-height:1.1;">${safeCode}</div>
        </td>
      </tr>
    </table>`.trim();

const renderHtml = (safeCode: string, ttlMinutes: number): string => `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(SUBJECT)}</title>
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
                <h2 style="margin:0;font-size:18px;font-weight:600;color:#111827;line-height:26px;">${escapeHtml(SUBJECT)}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:15px;line-height:22px;color:#374151;">Hello Doctor,</p>
                <p style="margin:8px 0 0 0;font-size:15px;line-height:22px;color:#374151;">Use this verification code to complete signing in to your Sawiyaa account:</p>
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
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <div style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;">
                  <p style="margin:0;font-size:13px;line-height:19px;color:#92400E;">For your security, do not share this code with anyone. The Sawiyaa team will never ask for your verification code.</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px 32px;text-align:center;">
                <p style="margin:0;font-size:13px;line-height:18px;color:#0F766E;font-weight:600;">${escapeHtml(BRAND_LINE)}</p>
                <p style="margin:4px 0 0 0;font-size:12px;line-height:18px;color:#9CA3AF;">${escapeHtml(TAGLINE)}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;line-height:16px;color:#9CA3AF;text-align:center;">If you did not request this code, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const renderBody = (code: string, ttlMinutes: number): string => `Hello Doctor,

Use this verification code to complete signing in to your Sawiyaa account:

${code}

This code is valid for ${ttlMinutes} minutes.

For your security, do not share this code with anyone. The Sawiyaa team will never ask for your verification code.

${BRAND_LINE}
${TAGLINE}`;

/**
 * Renders the practitioner login OTP email in English only.
 *
 * The function is pure and side-effect free so it is easy to unit-test
 * and cannot accidentally leak secrets. The OTP code is interpolated
 * with `{{code}}` substitution, and the value is HTML-escaped before
 * being embedded in the HTML body.
 */
export const renderPractitionerLoginOtpEmail = (
  input: PractitionerLoginOtpEmailInput,
): PractitionerLoginOtpEmail => {
  const code = String(input.code ?? '').trim();
  const ttlMinutes = Math.max(1, Math.floor(Number(input.ttlMinutes) || 0));
  const safeCode = escapeHtml(code);

  return {
    subject: SUBJECT,
    body: renderBody(code, ttlMinutes),
    html: renderHtml(safeCode, ttlMinutes),
  };
};
