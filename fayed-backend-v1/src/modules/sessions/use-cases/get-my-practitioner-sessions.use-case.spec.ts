import { SessionMode, SessionStatus } from '@prisma/client';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionMapper } from '../mappers/session.mapper';
import { GetMyPractitionerSessionsUseCase } from './get-my-practitioner-sessions.use-case';
import { SessionPresentationFilter } from '../types/session-video.types';

describe('GetMyPractitionerSessionsUseCase', () => {
  it('forwards presentation filters and preserves pagination totals', async () => {
    const sessionPractitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({
        id: 'practitioner_1',
      }),
    } as unknown as SessionPractitionerRepository;

    const sessions = [
      {
        id: 'session_1',
        sessionCode: 'SES-2026-000001',
        status: SessionStatus.CONFIRMED,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
        scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
        durationMinutes: 30,
        provider: 'DAILY' as const,
        providerRoomId: 'room-1',
        providerSessionRef: 'room-ref-1',
        practitioner: {
          id: 'practitioner_1',
          publicSlug: 'practitioner-1',
          user: {
            displayName: 'Dr. Practitioner',
          },
        },
        patient: {
          id: 'patient_1',
          user: {
            displayName: 'Patient One',
          },
        },
        createdAt: new Date('2026-08-02T10:00:00.000Z'),
        joinOpenAt: null,
      },
    ];

    const sessionRepository = {
      listPractitionerSessions: jest.fn().mockResolvedValue([sessions, 11]),
      countUnreadBySessionIdsForUser: jest.fn().mockResolvedValue(new Map()),
      findLatestActiveSessionAdminDecisionsForSessions: jest.fn().mockResolvedValue(new Map()),
    } as unknown as SessionRepository;

    const sessionMapper = {
      toListItem: jest.fn((session, now) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        scheduledStartAt: session.scheduledStartAt.toISOString(),
        scheduledEndAt: session.scheduledEndAt.toISOString(),
        practitioner: {
          id: session.practitioner.id,
          slug: session.practitioner.publicSlug,
          displayName: session.practitioner.user.displayName,
        },
        patient: {
          id: session.patient.id,
          displayName: session.patient.user.displayName,
        },
        joinAvailability: {
          canJoin: false,
          blockedReason: null,
          availableAt: null,
          expiresAt: null,
        },
        presentationStatus: 'JOINABLE',
        _now: now,
      })),
    } as unknown as SessionMapper;

    const useCase = new GetMyPractitionerSessionsUseCase(
      sessionPractitionerRepository,
      sessionRepository,
      sessionMapper,
    );

    const result = await useCase.execute({
      userId: 'user_1',
      locale: 'ar',
      query: {
        presentationFilter: SessionPresentationFilter.JOINABLE,
        page: 2,
        limit: 10,
      },
    });

    expect(sessionRepository.listPractitionerSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'practitioner_1',
        presentationFilter: SessionPresentationFilter.JOINABLE,
        skip: 10,
        take: 10,
      }),
    );
    expect(result.pagination.totalItems).toBe(11);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.items).toHaveLength(1);
  });
});
