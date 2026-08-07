import { SessionStatus } from '@prisma/client';
import { OrchestrateSessionPaymentStatusService } from './orchestrate-session-payment-status.service';

describe('OrchestrateSessionPaymentStatusService', () => {
  function buildService() {
    const prisma = {
      $transaction: jest.fn((fn: (tx: never) => unknown) => fn({} as never)),
    };
    const sessionRepository = {
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
      transitionIfCurrentStatus: jest.fn().mockResolvedValue({
        outcome: 'transitioned',
        session: {
          id: 'session_1',
          status: SessionStatus.UPCOMING,
          scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
        },
      }),
    };
    const expireUnpaidSessionUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const operationalNotificationService = {
      notifySessionConfirmed: jest.fn().mockResolvedValue(undefined),
    };

    const sessionSchedulePolicyService = {
      resolve: jest.fn().mockResolvedValue({
        reminderOffsetsMinutes: [1440, 60, 15],
        join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 },
      }),
      withScheduleRevision: jest.fn().mockReturnValue({
        reminderOffsetsMinutes: [1440, 60, 15],
        join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 10 },
      }),
    };

    const service = new OrchestrateSessionPaymentStatusService(
      prisma as never,
      sessionRepository as never,
      sessionLifecycleService as never,
      expireUnpaidSessionUseCase as never,
      operationalNotificationService as never,
      sessionSchedulePolicyService as never,
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
    expect(
      setup.sessionLifecycleService.transitionIfCurrentStatus,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_1',
        expectedStatuses: [SessionStatus.PENDING_PAYMENT],
        to: SessionStatus.UPCOMING,
        data: expect.objectContaining({ joinOpenAt: new Date('2026-04-02T09:45:00.000Z') }),
        tx: expect.anything() as unknown,
      }),
    );
  });

  it('does not append a payment event or notify again for a replayed callback', async () => {
    const setup = buildService();
    setup.sessionLifecycleService.transitionIfCurrentStatus.mockResolvedValue({
      outcome: 'skipped',
      session: {
        id: 'session_1',
        status: SessionStatus.UPCOMING,
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
      },
    });

    await setup.service.markSessionConfirmedFromPayment({
      session: {
        id: 'session_1',
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
      },
    });

    expect(setup.sessionRepository.createEvent).not.toHaveBeenCalled();
    expect(
      setup.operationalNotificationService.notifySessionConfirmed,
    ).not.toHaveBeenCalled();
  });
});
