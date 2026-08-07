import {
  renderSessionNotificationEmail,
  resolveAbsoluteSawiyaaUrl,
} from './session-notification-email.template';

describe('session notification email template', () => {
  it('renders a localized CTA and only an absolute stable Sawiyaa route', () => {
    const rendered = renderSessionNotificationEmail({
      locale: 'ar',
      title: 'تذكير بموعد الجلسة',
      body: 'جلستك تبدأ بعد 15 دقيقة.',
      action: {
        href: '/ar/patient/sessions/session_1/join',
        label: 'دخول الجلسة',
      },
      publicWebUrl: 'https://app.sawiyaa.example',
      sessionStartsAt: '2026-08-06T10:00:00.000Z',
      timezone: 'Africa/Cairo',
    });

    expect(rendered?.absoluteUrl).toBe(
      'https://app.sawiyaa.example/ar/patient/sessions/session_1/join',
    );
    expect(rendered?.html).toContain('دخول الجلسة');
    expect(rendered?.html).toContain('dir="rtl"');
    expect(rendered?.html).not.toMatch(/daily|token|participant/i);
  });

  it('rejects provider and protocol-relative action targets', () => {
    expect(
      resolveAbsoluteSawiyaaUrl(
        'https://app.sawiyaa.example',
        'https://provider.example/room',
      ),
    ).toBeNull();
    expect(
      resolveAbsoluteSawiyaaUrl('https://app.sawiyaa.example', '//evil.test'),
    ).toBeNull();
  });

  it.each([
    ['T-60', 'View session details'],
    ['T-15', 'Join session'],
    ['T0', 'Join now'],
    ['T+5', 'Join now'],
    ['CANCELLED', 'View cancellation details'],
  ])('uses the canonical %s CTA and has no raw date or timezone', (stage, cta) => {
    const rendered = renderSessionNotificationEmail({
      locale: 'en',
      title: 'Session reminder',
      body: 'Scheduled at 2026-08-06T10:00:00.000Z in Asia/Riyadh.',
      action: { href: '/en/patient/sessions/s1/join' },
      actionType: stage === 'T-15' ? 'JOIN_SESSION' : stage === 'CANCELLED' ? 'CANCELLATION_DETAILS' : stage === 'T0' || stage === 'T+5' ? 'JOIN_NOW' : 'DETAILS',
      publicWebUrl: 'https://app.sawiyaa.example/',
      environment: 'production',
      startsAtUtc: '2026-08-06T10:00:00.000Z',
      recipientTimezone: 'Asia/Riyadh',
      packageContext: { sessionIndex: 1, sessionCount: 2 },
    });
    expect(rendered?.html).toContain(cta);
    expect(rendered?.text).not.toContain('2026-08-06T10:00:00.000Z');
    expect(rendered?.text).not.toContain('Asia/Riyadh');
    expect(rendered?.html).toContain('Session 1 of 2');
    if (stage === 'CANCELLED') expect(rendered?.html).not.toContain('Join now');
  });

  it('rejects a local web origin in production and normalizes configured slashes', () => {
    expect(resolveAbsoluteSawiyaaUrl('http://localhost:3000/', '/en/patient/sessions/s1', 'production')).toBeNull();
    expect(resolveAbsoluteSawiyaaUrl('https://app.sawiyaa.example///', '/en/patient/sessions/s1', 'production')).toBe('https://app.sawiyaa.example/en/patient/sessions/s1');
  });
});
