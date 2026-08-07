import { SessionReminderType } from '@prisma/client';
import { OperationalNotificationService } from './operational-notification.service';

describe('session reminder action contract', () => {
  const service = Object.create(
    OperationalNotificationService.prototype,
  ) as OperationalNotificationService;

  it.each([
    [SessionReminderType.REMINDER_60, 'sessions.notifications.sessionReminderViewDetailsCta'],
    [SessionReminderType.REMINDER_15, 'sessions.notifications.sessionReminderJoinCta'],
    [SessionReminderType.STARTING_NOW, 'sessions.notifications.sessionStartingNowCta'],
    [SessionReminderType.LATE_JOIN, 'sessions.notifications.sessionLateJoinCta'],
  ])('maps %s to its localized structured CTA', (type, key) => {
    expect((service as any).resolveSessionReminderCtaKey(type)).toBe(key);
  });

  it('only creates role-scoped stable Sawiyaa join routes', () => {
    expect((service as any).buildSessionRoutePath('ar', 'PATIENT', 'session_1')).toBe(
      '/ar/patient/sessions/session_1/join',
    );
    expect((service as any).buildSessionRoutePath('en', 'PRACTITIONER', 'session_1')).toBe(
      '/en/practitioner/sessions/session_1/join',
    );
  });
});
