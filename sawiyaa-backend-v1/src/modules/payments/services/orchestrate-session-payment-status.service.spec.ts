import { SessionStatus } from '@prisma/client';
import { OrchestrateSessionPaymentStatusService } from './orchestrate-session-payment-status.service';

describe('OrchestrateSessionPaymentStatusService', () => {
  function buildService() {
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
        patient: { id: 'patient_1' },
        practitioner: { id: 'pr_1' },
      }),
    };
    const sessionLifecycleService = {
      transition: jest.fn().mockResolvedValue({
        id: 'session_1',
        status: SessionStatus.UPCOMING,
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
      }),
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
      sessionLifecycleService as never,
      expireUnpaidSessionUseCase as never,
      operationalNotificationService as never,
    );

    return {
      service,
      operationalNotificationService,
      sessionRepository,
      sessionLifecycleService,
    };
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
    expect(setup.sessionLifecycleService.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        to: SessionStatus.UPCOMING,
        data: { joinOpenAt: new Date('2026-04-02T09:58:00.000Z') },
        tx: expect.anything(),
      }),
    );
  });
});
