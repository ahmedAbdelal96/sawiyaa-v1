import { SessionStatus } from '@prisma/client';
import { OrchestrateSessionPaymentStatusService } from './orchestrate-session-payment-status.service';

describe('OrchestrateSessionPaymentStatusService', () => {
  function buildService() {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'session.joinLeadMinutes') {
          return 15;
        }

        return undefined;
      }),
    };
    const prisma = {
      $transaction: jest.fn((fn: (tx: never) => unknown) => fn({} as never)),
    };
    const sessionRepository = {
      updateStatus: jest.fn().mockResolvedValue({
        id: 'session_1',
        status: SessionStatus.CONFIRMED,
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
        patient: { id: 'patient_1' },
        practitioner: { id: 'pr_1' },
      }),
      createEvent: jest.fn().mockResolvedValue({}),
      findById: jest.fn().mockResolvedValue({
        id: 'session_1',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
      }),
    };
    const validateSessionStatusTransitionService = {
      assertCanTransition: jest.fn(),
    };
    const expireUnpaidSessionUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const operationalNotificationService = {
      notifySessionConfirmed: jest.fn().mockResolvedValue(undefined),
    };

    const service = new OrchestrateSessionPaymentStatusService(
      configService as never,
      prisma as never,
      sessionRepository as never,
      validateSessionStatusTransitionService as never,
      expireUnpaidSessionUseCase as never,
      operationalNotificationService as never,
    );

    return { service, operationalNotificationService, sessionRepository };
  }

  it('sends session-confirmed notification after status confirmation', async () => {
    const setup = buildService();

    await setup.service.markSessionConfirmedFromPayment({
      session: {
        id: 'session_1',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
      },
    });

    expect(
      setup.operationalNotificationService.notifySessionConfirmed,
    ).toHaveBeenCalledTimes(1);
    expect(setup.sessionRepository.updateStatus).toHaveBeenCalledWith(
      'session_1',
      expect.objectContaining({
        status: SessionStatus.CONFIRMED,
        joinOpenAt: new Date('2026-04-02T09:45:00.000Z'),
      }),
      expect.anything(),
    );
  });
});
