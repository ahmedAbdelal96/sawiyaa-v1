import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerProfessionalContentRepository } from '@modules/practitioners/repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { NotificationContextEnrichmentService } from './notification-context-enrichment.service';

describe('NotificationContextEnrichmentService professional content', () => {
  const practitioner = (id: string, professionalTitle: string) => ({
    id,
    professionalTitle,
    user: { displayName: `${id} display name` },
  });

  const rows = [
    {
      id: 'notification-session',
      userId: 'patient-1',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session-a',
      payloadJson: {},
      typeSlug: 'sessions.session-reminder',
    },
    {
      id: 'notification-message',
      userId: 'patient-1',
      relatedEntityType: 'GENERAL_CHAT_MESSAGE',
      relatedEntityId: 'message-a',
      payloadJson: {},
      typeSlug: 'messages.session-message-received',
    },
    {
      id: 'notification-payment',
      userId: 'patient-1',
      relatedEntityType: 'PAYMENT',
      relatedEntityId: 'payment-b',
      payloadJson: {},
      typeSlug: 'payments.payment-success',
    },
    {
      id: 'notification-support',
      userId: 'patient-1',
      relatedEntityType: 'SUPPORT_TICKET',
      relatedEntityId: 'ticket-b',
      payloadJson: {},
      typeSlug: 'support.ticket-updated',
    },
    {
      id: 'notification-legacy',
      userId: 'patient-1',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session-legacy',
      payloadJson: {},
      typeSlug: 'sessions.session-reminder',
    },
    {
      id: 'notification-unrelated',
      userId: 'patient-1',
      relatedEntityType: null,
      relatedEntityId: null,
      payloadJson: { referenceId: 'account-1' },
      typeSlug: 'account.profile-updated',
    },
  ];

  it('resolves one locale-aware practitioner title per unique profile batch without changing notification identity', async () => {
    const prisma = {
      message: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'message-a',
            conversationId: 'conversation-a',
            senderUserId: 'sender-1',
          },
        ]),
      },
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'payment-b', sessionId: 'session-b' }]),
      },
      conversation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'conversation-a',
            conversationType: 'SESSION',
            sessionId: 'session-a',
            supportTicketId: null,
            patient: {
              displayName: 'Patient',
              user: { displayName: 'Patient user' },
            },
            practitioner: practitioner('pr-a', 'Legacy A'),
            supportTicket: null,
          },
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'patient-1',
            displayName: 'Patient',
            roles: [{ role: 'PATIENT' }],
          },
          {
            id: 'sender-1',
            displayName: 'Sender',
            roles: [{ role: 'PRACTITIONER' }],
          },
        ]),
      },
      session: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'session-a',
            sessionCode: 'A',
            status: 'UPCOMING',
            scheduledStartAt: new Date('2026-08-20T10:00:00.000Z'),
            patient: {
              displayName: 'Patient',
              user: { displayName: 'Patient user' },
            },
            practitioner: practitioner('pr-a', 'Legacy A'),
          },
          {
            id: 'session-b',
            sessionCode: 'B',
            status: 'UPCOMING',
            scheduledStartAt: new Date('2026-08-21T10:00:00.000Z'),
            patient: {
              displayName: 'Patient',
              user: { displayName: 'Patient user' },
            },
            practitioner: practitioner('pr-b', 'Legacy B'),
          },
          {
            id: 'session-legacy',
            sessionCode: 'LEGACY',
            status: 'UPCOMING',
            scheduledStartAt: new Date('2026-08-22T10:00:00.000Z'),
            patient: {
              displayName: 'Patient',
              user: { displayName: 'Patient user' },
            },
            practitioner: practitioner('pr-legacy', 'Legacy only title'),
          },
        ]),
      },
      supportTicket: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ticket-b',
            subject: 'Question',
            status: 'OPEN',
            conversationId: null,
            patient: {
              displayName: 'Patient',
              user: { displayName: 'Patient user' },
            },
            practitioner: practitioner('pr-b', 'Legacy B'),
          },
        ]),
      },
    } as unknown as PrismaService;

    const findByPractitionerProfileIds = jest.fn().mockResolvedValue([
      {
        id: 'pr-a',
        primaryContentLocale: 'ar',
        professionalTitle: 'Legacy A',
        bio: null,
        professionalContentTranslations: [
          { locale: 'ar', professionalTitle: 'أخصائي نفسي', bio: null },
          {
            locale: 'en',
            professionalTitle: 'Clinical Psychologist',
            bio: null,
          },
        ],
      },
      {
        id: 'pr-b',
        primaryContentLocale: 'en',
        professionalTitle: 'Legacy B',
        bio: null,
        professionalContentTranslations: [
          { locale: 'en', professionalTitle: 'Family Therapist', bio: null },
        ],
      },
      // A pending/unapproved content row is intentionally absent from the
      // repository projection; the legacy profile title must remain the fallback.
    ]);
    const professionalContentRepository = {
      findByPractitionerProfileIds,
    } as unknown as PractitionerProfessionalContentRepository;

    const service = new NotificationContextEnrichmentService(
      prisma,
      professionalContentRepository,
      new PractitionerProfessionalContentResolver(),
    );

    const arabic = await service.enrichMany(rows, 'ar');
    const english = await service.enrichMany(rows, 'en');
    const arabicAgain = await service.enrichMany(rows, 'ar');
    await service.enrichMany(rows);

    expect(arabic.get('notification-session')?.context.practitionerName).toBe(
      'أخصائي نفسي',
    );
    expect(english.get('notification-session')?.context.practitionerName).toBe(
      'Clinical Psychologist',
    );
    expect(arabic.get('notification-payment')?.context.practitionerName).toBe(
      'Family Therapist',
    );
    expect(arabic.get('notification-support')?.context.practitionerName).toBe(
      'Family Therapist',
    );
    expect(arabic.get('notification-legacy')?.context.practitionerName).toBe(
      'Legacy only title',
    );
    expect(
      arabic.get('notification-unrelated')?.context.practitionerName,
    ).toBeUndefined();
    expect(
      arabicAgain.get('notification-session')?.context.practitionerName,
    ).toBe('أخصائي نفسي');

    expect(arabic.get('notification-session')?.primaryAction).toEqual(
      english.get('notification-session')?.primaryAction,
    );
    expect(arabic.get('notification-session')?.context.sessionCode).toBe(
      english.get('notification-session')?.context.sessionCode,
    );
    expect(findByPractitionerProfileIds).toHaveBeenCalledTimes(3);
    expect(findByPractitionerProfileIds).toHaveBeenNthCalledWith(1, [
      'pr-a',
      'pr-b',
      'pr-legacy',
    ]);
  });
});
