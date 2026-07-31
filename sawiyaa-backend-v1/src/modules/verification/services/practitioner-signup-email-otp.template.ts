export function renderPractitionerSignupEmailOtp(input: {
  code: string;
  ttlMinutes: number;
}) {
  const code = String(input.code ?? '').trim();
  const ttl = Math.max(1, Math.floor(Number(input.ttlMinutes) || 0));
  const subject = 'Verify your Sawiyaa practitioner email';
  const body = `Hello Doctor,\n\nUse this code to verify the email for your Sawiyaa practitioner registration:\n\n${code}\n\nThis code is valid for ${ttl} minutes. Your account will be created only after this verification succeeds.\n\nDo not share this code with anyone.`;
  const safeCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = `<div style="font-family:Arial,sans-serif;color:#1f2937"><h2>${subject}</h2><p>Use this code to verify the email for your practitioner registration.</p><p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#065f46">${safeCode}</p><p>This code is valid for ${ttl} minutes. Your account will be created only after verification succeeds.</p><p>Do not share this code with anyone.</p></div>`;
  return { subject, body, html };
}
