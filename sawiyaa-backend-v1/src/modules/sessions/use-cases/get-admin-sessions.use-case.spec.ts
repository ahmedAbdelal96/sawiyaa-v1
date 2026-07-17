import { SessionMode, SessionStatus } from '@prisma/client';
import { GetAdminSessionsUseCase } from './get-admin-sessions.use-case';

describe('GetAdminSessionsUseCase', () => {
  type SessionFixture = {
    id: string;
    sessionCode: string;
    status: SessionStatus;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    durationMinutes: number;
    sessionMode: SessionMode;
    practitioner: {
      id: string;
      publicSlug: string;
      user: { displayName: string | null };
    };
    patient: {
      id: string;
      user: { displayName: string | null };
    };
  };

  function createSession(
    overrides: Partial<SessionFixture> = {},
  ): SessionFixture {
    return {
      id: 'session-1',
      sessionCode: 'SES-2026-000001',
      status: SessionStatus.UPCOMING,
      scheduledStartAt: new Date('2026-04-07T08:00:00.000Z'),
      scheduledEndAt: new Date('2026-04-07T08:30:00.000Z'),
      durationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-one',
        user: { displayName: 'Dr One' },
      },
      patient: {
        id: 'patient-1',
        user: { displayName: 'Patient One' },
      },
      ...overrides,
    };
  }

  function setup() {
    const sessionRepository = {
      listAdminSessions: jest.fn(),
      findLatestActiveSessionAdminDecisionsForSessions: jest.fn().mockResolvedValue(new Map()),
    };
    const sessionMapper = {
      toListItem: jest.fn((session: SessionFixture) => ({
        id: session.id,
        sessionCode: session.sessionCode,
        status: session.status,
        scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
        scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
        durationMinutes: session.durationMinutes,
        sessionMode: session.sessionMode,
        practitioner: {
          id: session.practitioner.id,
          slug: session.practitioner.publicSlug,
          displayName: session.practitioner.user.displayName,
        },
        patient: {
          id: session.patient.id,
          displayName: session.patient.user.displayName,
        },
      })),
    };

    const useCase = new GetAdminSessionsUseCase(
      sessionRepository as never,
      sessionMapper as never,
    );

    return { useCase, sessionRepository, sessionMapper };
  }

  it('returns paginated list and delayed flag', async () => {
    const { useCase, sessionRepository } = setup();
    const now = new Date();
    const delayed = new Date(now.getTime() - 10 * 60 * 1000);
    const upcoming = new Date(now.getTime() + 60 * 60 * 1000);

    sessionRepository.listAdminSessions.mockResolvedValue([
      [
        createSession({
          id: 's-1',
          status: SessionStatus.UPCOMING,
          scheduledStartAt: delayed,
        }),
        createSession({
          id: 's-2',
          status: SessionStatus.UPCOMING,
          scheduledStartAt: upcoming,
        }),
        createSession({
          id: 's-3',
          status: SessionStatus.COMPLETED,
          scheduledStartAt: delayed,
        }),
      ],
      3,
    ]);

    const result = await useCase.execute({
      query: { page: 1, limit: 20, late: undefined },
    });

    expect(sessionRepository.listAdminSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        status: undefined,
        late: undefined,
        skip: 0,
        take: 20,
      }),
    );

    expect(result.pagination.totalItems).toBe(3);
    expect(result.items.map((item) => item.isDelayed)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('passes late filter and status filter to repository', async () => {
    const { useCase, sessionRepository } = setup();
    sessionRepository.listAdminSessions.mockResolvedValue([[], 0]);

    await useCase.execute({
      query: {
        page: 2,
        limit: 10,
        late: true,
        query: 'SES-2026-000123',
        status: SessionStatus.UPCOMING,
        practitionerId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        scheduledFrom: '2026-04-01T00:00:00.000Z',
        scheduledTo: '2026-04-30T23:59:59.000Z',
        missingAttendance: true,
      },
    });

    expect(sessionRepository.listAdminSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SessionStatus.UPCOMING,
        query: 'SES-2026-000123',
        late: true,
        practitionerId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        scheduledFrom: new Date('2026-04-01T00:00:00.000Z'),
        scheduledTo: new Date('2026-04-30T23:59:59.000Z'),
        missingAttendance: true,
        skip: 10,
        take: 10,
      }),
    );
  });
});
