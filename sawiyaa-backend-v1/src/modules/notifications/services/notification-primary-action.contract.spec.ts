import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerProfessionalContentRepository } from '@modules/practitioners/repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { NotificationContextEnrichmentService } from './notification-context-enrichment.service';

describe('Notification primary action contract', () => {
  it('presents an Admin moderation report as a canonical review action', async () => {
    const prisma = {
      message: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      conversation: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'reviewer-1',
            displayName: 'Reviewer',
            roles: [{ role: 'ADMIN' }],
          },
        ]),
      },
      session: { findMany: jest.fn().mockResolvedValue([]) },
      supportTicket: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const service = new NotificationContextEnrichmentService(
      prisma,
      {
        findByPractitionerProfileIds: jest.fn().mockResolvedValue([]),
      } as unknown as PractitionerProfessionalContentRepository,
      new PractitionerProfessionalContentResolver(),
    );

    const result = await service.enrichOne({
      id: 'notification-report',
      userId: 'reviewer-1',
      relatedEntityType: 'MODERATION_REPORT',
      relatedEntityId: 'report-1',
      payloadJson: { reportId: 'report-1' },
      typeSlug: 'moderation.report-created',
    });

    expect(result.primaryAction).toMatchObject({
      kind: 'moderation',
      targetType: 'MODERATION_REPORT',
      targetId: 'report-1',
      href: '/admin/moderation/reports/report-1',
    });
  });

  it('presents a role-aware canonical session action while preserving reminder hrefs', async () => {
    const prisma = {
      message: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      conversation: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'patient-1',
            displayName: 'Patient',
            roles: [{ role: 'PATIENT' }],
          },
        ]),
      },
      session: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'session-1',
            sessionCode: 'S-1',
            status: 'UPCOMING',
            scheduledStartAt: new Date('2026-10-07T12:00:00.000Z'),
            patient: {
              displayName: 'Patient',
              user: { displayName: 'Patient user' },
            },
            practitioner: null,
          },
        ]),
      },
      supportTicket: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const service = new NotificationContextEnrichmentService(
      prisma,
      {
        findByPractitionerProfileIds: jest.fn().mockResolvedValue([]),
      } as unknown as PractitionerProfessionalContentRepository,
      new PractitionerProfessionalContentResolver(),
    );

    const result = await service.enrichOne({
      id: 'notification-session',
      userId: 'patient-1',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session-1',
      payloadJson: {
        routePath: '/en/patient/sessions/session-1/join',
        recipientRole: 'PATIENT',
      },
      typeSlug: 'sessions.session-reminder-15',
    });

    expect(result.primaryAction).toMatchObject({
      kind: 'session',
      targetType: 'SESSION',
      targetId: 'session-1',
      href: '/en/patient/sessions/session-1/join',
    });
  });
});
