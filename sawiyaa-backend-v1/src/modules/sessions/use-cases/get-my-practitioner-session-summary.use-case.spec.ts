import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { GetMyPractitionerSessionSummaryUseCase } from './get-my-practitioner-session-summary.use-case';

describe('GetMyPractitionerSessionSummaryUseCase', () => {
  it('uses the shared presentation policy for practitioner summary counts', async () => {
    const sessionPractitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({
        id: 'practitioner_1',
      }),
    } as unknown as SessionPractitionerRepository;

    const sessionRepository = {
      listPractitionerSessionSummaryCandidates: jest.fn().mockResolvedValue([
        {
          status: SessionStatus.UPCOMING,
          sessionMode: SessionMode.VIDEO,
          scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
          scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
          provider: SessionProvider.DAILY,
          providerRoomId: 'room-1',
          providerSessionRef: 'room-ref-1',
        },
        {
          status: SessionStatus.UPCOMING,
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

    const useCase = new GetMyPractitionerSessionSummaryUseCase(
      sessionPractitionerRepository,
      sessionRepository,
    );

    const result = await useCase.execute({ userId: 'user_2' });

    expect(result.totalItems).toBe(3);
    expect(result.ready).toBeGreaterThanOrEqual(0);
    expect(result.actionRequired).toBe(result.ready);
    expect(sessionRepository.listPractitionerSessionSummaryCandidates).toHaveBeenCalledWith(
      'practitioner_1',
    );
  });
});
