import { SessionStatus } from '@prisma/client';
import { OrchestrateSessionPaymentStatusService } from './orchestrate-session-payment-status.service';

describe('OrchestrateSessionPaymentStatusService', () => {
  function buildService() {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
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
      prisma as never,
      sessionRepository as never,
      validateSessionStatusTransitionService as never,
      expireUnpaidSessionUseCase as never,
      operationalNotificationService as never,
    );

    return { service, operationalNotificationService };
  }

  it('sends session-confirmed notification after status confirmation', async () => {
    const setup = buildService();

    await setup.service.markSessionConfirmedFromPayment({
      session: {
        id: 'session_1',
        status: SessionStatus.PENDING_PAYMENT,
      },
    });

    expect(
      setup.operationalNotificationService.notifySessionConfirmed,
    ).toHaveBeenCalledTimes(1);
  });
});

