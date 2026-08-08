import { AppRole } from '@common/enums/app-role.enum';
import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { GetMyNextSessionUseCase } from './get-my-next-session.use-case';

describe('GetMyNextSessionUseCase', () => {
  it('uses operational candidate predicates and returns the canonical interpretation additively', async () => {
    const now = new Date('2026-08-08T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const prisma = {
      session: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session_1', patientId: 'patient_1', practitionerId: 'practitioner_1',
          status: SessionStatus.READY_TO_JOIN, flowType: 'DIRECT', sessionMode: SessionMode.VIDEO,
          durationMinutes: 30, scheduledStartAt: new Date('2026-08-08T09:50:00.000Z'),
          scheduledEndAt: new Date('2026-08-08T10:20:00.000Z'), joinOpenAt: new Date('2026-08-08T09:35:00.000Z'),
          joinCloseAt: new Date('2026-08-08T10:35:00.000Z'), expiresAt: null, scheduleRevision: 1,
          schedulePolicySnapshotJson: null, timezoneSnapshot: 'UTC', provider: SessionProvider.DAILY,
          providerRoomId: 'room_1', providerSessionRef: 'ref_1', videoRoomClosedAt: null,
          originalSessionId: null, patient: { user: { displayName: 'Patient' } },
          practitioner: { user: { displayName: 'Practitioner' }, avatarUrl: null },
        }),
      },
    };
    const operational = { state: SessionStatus.READY_TO_JOIN, join: { allowed: true } };
    const useCase = new GetMyNextSessionUseCase(
      prisma as never,
      { parseSnapshot: jest.fn().mockReturnValue(null), resolve: jest.fn().mockResolvedValue({ join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 15 } }), withScheduleRevision: jest.fn((value) => value) } as never,
      { interpret: jest.fn().mockResolvedValue(operational) } as never,
    );

    const result = await useCase.execute({ currentUser: { id: 'user_1', roles: [AppRole.PATIENT] } as never, locale: 'en' });

    expect(prisma.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ videoRoomClosedAt: null, cancelledAt: null }),
    }));
    expect(result).toMatchObject({ sessionId: 'session_1', operational });
    jest.useRealTimers();
  });
});
