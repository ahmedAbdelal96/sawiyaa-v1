import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';
import { GetMyPatientSessionSummaryUseCase } from './get-my-patient-session-summary.use-case';

describe('GetMyPatientSessionSummaryUseCase', () => {
  it('uses the shared presentation policy for patient summary counts', async () => {
    const sessionPatientRepository = {
      findByUserId: jest.fn().mockResolvedValue({
        id: 'patient_1',
      }),
    } as unknown as SessionPatientRepository;

    const sessionRepository = {
      listPatientSessionSummaryCandidates: jest.fn().mockResolvedValue([
        {
          status: SessionStatus.CONFIRMED,
          sessionMode: SessionMode.VIDEO,
          scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
          scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
          provider: SessionProvider.DAILY,
          providerRoomId: 'room-1',
          providerSessionRef: 'room-ref-1',
        },
        {
          status: SessionStatus.CONFIRMED,
          sessionMode: SessionMode.VIDEO,
          scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
          scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
          provider: SessionProvider.DAILY,
          providerRoomId: 'room-1',
          providerSessionRef: 'room-ref-1',
        },
        {
          status: SessionStatus.CANCELLED,
          sessionMode: SessionMode.VIDEO,
          scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
          scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
          provider: SessionProvider.DAILY,
          providerRoomId: 'room-1',
          providerSessionRef: 'room-ref-1',
        },
      ]),
    } as unknown as SessionRepository;

    const useCase = new GetMyPatientSessionSummaryUseCase(
      sessionPatientRepository,
      sessionRepository,
    );

    const result = await useCase.execute({ userId: 'user_1' });

    expect(result.totalItems).toBe(3);
    expect(result.readyToJoin).toBeGreaterThanOrEqual(0);
    expect(result.actionRequired).toBeGreaterThanOrEqual(result.readyToJoin);
    expect(sessionRepository.listPatientSessionSummaryCandidates).toHaveBeenCalledWith(
      'patient_1',
    );
  });
});
