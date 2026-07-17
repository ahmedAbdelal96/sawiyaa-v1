import { SessionAdminDecisionType, SessionStatus } from '@prisma/client';
import { CancelSessionUseCase } from './cancel-session.use-case';
import { PreviewSessionCancellationUseCase } from './preview-session-cancellation.use-case';

describe('patient cancellation after a final admin decision', () => {
  const session = {
    id: 'session_1',
    status: SessionStatus.UPCOMING,
    patient: { id: 'patient_1' },
  };

  it('rejects cancellation before any status or financial mutation', async () => {
    const prisma = { $transaction: jest.fn() };
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue(session),
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue({
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      }),
    };
    const validateTransition = { assertCanTransition: jest.fn() };
    const evaluatePolicy = { evaluate: jest.fn() };
    const useCase = new CancelSessionUseCase(
      prisma as never,
      { findByUserId: jest.fn().mockResolvedValue({ id: 'patient_1' }) } as never,
      sessionRepository as never,
      {} as never,
      {} as never,
      validateTransition as never,
      evaluatePolicy as never,
      {} as never,
      {} as never,
    );

    await expect(
      useCase.execute({
        userId: 'user_1',
        locale: 'ar',
        sessionId: session.id,
      }),
    ).rejects.toMatchObject({
      response: {
        error: 'SESSION_CANCELLATION_NOT_ALLOWED_FINAL_DECISION',
      },
    });

    expect(validateTransition.assertCanTransition).not.toHaveBeenCalled();
    expect(evaluatePolicy.evaluate).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a blocked cancellation preview for a finalized session', async () => {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue(session),
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue({
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
      }),
    };
    const useCase = new PreviewSessionCancellationUseCase(
      {
        payment: { findFirst: jest.fn().mockResolvedValue(null) },
        refund: { aggregate: jest.fn() },
      } as never,
      { findByUserId: jest.fn().mockResolvedValue({ id: 'patient_1' }) } as never,
      sessionRepository as never,
      {
        evaluate: jest.fn().mockResolvedValue({
          cancellationAllowed: true,
          bookingType: 'DIRECT_SESSION',
          hoursBeforeStart: { toFixed: () => '2.00' },
          ruleCode: 'DEFAULT',
          ruleDisplayName: 'Default',
          refundMode: 'NONE',
          refundPercent: null,
          refundDestination: 'CUSTOMER_WALLET',
        }),
      } as never,
    );

    const result = await useCase.execute({
      userId: 'user_1',
      locale: 'ar',
      sessionId: session.id,
    });

    expect(result.item.canCancelNow).toBe(false);
    expect(result.item.outcomeType).toBe('POLICY_BLOCKED');
    expect(result.item.blockingReasonCode).toBe(
      'SESSION_CANCELLATION_NOT_ALLOWED_FINAL_DECISION',
    );
  });
});
