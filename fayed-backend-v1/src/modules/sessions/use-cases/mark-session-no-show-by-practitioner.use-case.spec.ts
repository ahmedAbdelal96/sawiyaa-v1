import { SessionEventType, SessionStatus } from '@prisma/client';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';
import { MarkSessionNoShowByPractitionerUseCase } from './mark-session-no-show-by-practitioner.use-case';

describe('MarkSessionNoShowByPractitionerUseCase', () => {
  it('marks owned session as no-show and emits patient-no-show event', async () => {
    const practitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'practitioner-1' }),
    } as unknown as SessionPractitionerRepository;

    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.UPCOMING,
        practitioner: { id: 'practitioner-1' },
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.NO_SHOW,
        scheduledStartAt: null,
        scheduledEndAt: null,
        durationMinutes: 60,
        sessionMode: 'VIDEO',
        flowType: 'SCHEDULED',
        expiresAt: null,
        cancelledAt: null,
        cancellationReason: null,
        completedAt: null,
        expiredAt: null,
        timezoneSnapshot: 'Africa/Cairo',
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-one',
          user: { displayName: 'Dr One' },
        },
        patient: {
          id: 'patient-1',
          user: { displayName: 'Patient One' },
        },
      }),
      createEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as SessionRepository;

    const transitionService = {
      assertCanTransition: jest.fn(),
    } as unknown as ValidateSessionStatusTransitionService;

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: never) => fn({})),
    } as never;

    const useCase = new MarkSessionNoShowByPractitionerUseCase(
      prisma,
      practitionerRepository,
      sessionRepository,
      new SessionMapper(),
      transitionService,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      sessionId: 'session-1',
    });

    expect(result.item.status).toBe(SessionStatus.NO_SHOW);
    expect(transitionService.assertCanTransition).toHaveBeenCalledWith(
      SessionStatus.UPCOMING,
      SessionStatus.NO_SHOW,
    );
    expect(
      (sessionRepository.createEvent as jest.Mock).mock.calls[0][0].eventType,
    ).toBe(SessionEventType.NO_SHOW_PATIENT);
  });
});
