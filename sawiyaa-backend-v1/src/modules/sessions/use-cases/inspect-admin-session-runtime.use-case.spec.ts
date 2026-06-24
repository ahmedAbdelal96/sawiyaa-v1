import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { InspectAdminSessionRuntimeUseCase } from './inspect-admin-session-runtime.use-case';

describe('InspectAdminSessionRuntimeUseCase', () => {
  function buildUseCase() {
    const sessionRepository = {
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(null),
      findByIdWithParticipants: jest.fn().mockResolvedValue({
        id: 'session_1',
        status: SessionStatus.UPCOMING,
        sessionMode: SessionMode.VIDEO,
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-02T10:30:00.000Z'),
        provider: SessionProvider.DAILY,
        providerRoomId: 'room_1',
        providerSessionRef: 'https://room.daily.co',
        patientId: 'user_patient_1',
        practitionerId: 'user_pract_1',
        patient: {
          id: 'patient_profile_1',
          user: {
            id: 'user_patient_1',
            displayName: 'Layla Hassan',
            emails: [{ email: 'layla@example.com', isPrimary: true }],
            phones: [],
          },
        },
        practitioner: {
          id: 'pract_profile_1',
          user: {
            id: 'user_pract_1',
            displayName: 'Dr. Karim Saleh',
            emails: [],
            phones: [],
          },
        },
      }),
    };

    const resolveSessionJoinReadinessService = {
      resolve: jest.fn().mockReturnValue({
        canPrepareRuntime: true,
        canJoin: true,
        blockedReason: null,
      }),
    };

    const useCase = new InspectAdminSessionRuntimeUseCase(
      sessionRepository as never,
      resolveSessionJoinReadinessService as never,
    );

    return { useCase, resolveSessionJoinReadinessService };
  }

  it('returns runtime inspection details with readiness state', async () => {
    const setup = buildUseCase();
    const result = await setup.useCase.execute({ sessionId: 'session_1' });

    expect(
      setup.resolveSessionJoinReadinessService.resolve,
    ).toHaveBeenCalledTimes(1);
    expect(result.item).toEqual(
      expect.objectContaining({
        id: 'session_1',
        canPrepareRuntime: true,
        canJoin: true,
        blockedReason: null,
      }),
    );
  });

  it('exposes a participants identity summary in the inspection item', async () => {
    const setup = buildUseCase();
    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(result.item.participants.patient.displayName).toBe('Layla Hassan');
    expect(result.item.participants.patient.email).toBe('layla@example.com');
    expect(result.item.participants.practitioner.displayName).toBe(
      'Dr. Karim Saleh',
    );
  });

  it('includes presentationStatus in the inspection item', async () => {
    const setup = buildUseCase();
    const result = await setup.useCase.execute({ sessionId: 'session_1' });
    expect(typeof result.item.presentationStatus).toBe('string');
  });
});
