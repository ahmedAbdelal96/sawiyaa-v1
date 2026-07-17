import {
  SessionAdminDecisionType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { ResolvePatientSessionActionsService } from './resolve-patient-session-actions.service';

describe('ResolvePatientSessionActionsService', () => {
  const now = new Date('2026-07-14T06:00:00.000Z');
  const baseSession = {
    id: 'session_1',
    status: SessionStatus.UPCOMING,
    flowType: 'DIRECT',
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-07-14T06:01:00.000Z'),
    scheduledEndAt: new Date('2026-07-14T07:01:00.000Z'),
    expiresAt: new Date('2026-07-14T05:30:00.000Z'),
    provider: SessionProvider.NONE,
    providerRoomId: null,
    providerSessionRef: null,
    videoRoomClosedAt: null,
  };

  function buildService(cancellationAllowed = true) {
    const reviewEligibility = {
      resolveMany: jest.fn().mockResolvedValue(new Map()),
      resolveOne: jest.fn(({ status, hasValidSource, hasReview }) => ({
        isEffectivelyCompleted: status === SessionStatus.COMPLETED,
        hasValidSource,
        hasReview,
        canReview:
          status === SessionStatus.COMPLETED && hasValidSource && !hasReview,
      })),
    };
    const evaluateCancellationPolicy = {
      evaluate: jest.fn().mockResolvedValue({ cancellationAllowed }),
    };
    return {
      service: new ResolvePatientSessionActionsService(
        evaluateCancellationPolicy as never,
        reviewEligibility as never,
      ),
      evaluateCancellationPolicy,
    };
  }

  it('does not infer completion from a final decision while the canonical status is upcoming', async () => {
    const { service, evaluateCancellationPolicy } = buildService();

    const actions = await service.resolveOne({
      session: baseSession as never,
      finalManualDecision: SessionAdminDecisionType.MARK_COMPLETED,
      now,
      hasCapturedPayment: true,
      hasReview: false,
    });

    expect(actions).toEqual({
      canCancel: true,
      canPrepareRoom: true,
      canJoin: false,
      canPay: false,
      canReview: false,
    });
    expect(evaluateCancellationPolicy.evaluate).toHaveBeenCalled();
  });

  it('allows review only for a genuinely completed, paid, unrated session', async () => {
    const { service } = buildService();

    const actions = await service.resolveOne({
      session: {
        ...baseSession,
        status: SessionStatus.COMPLETED,
      } as never,
      finalManualDecision: null,
      now,
      hasCapturedPayment: true,
      hasReviewEligibleSource: true,
      hasReview: false,
    });

    expect(actions.canReview).toBe(true);
    expect(actions.canCancel).toBe(false);
    expect(actions.canPrepareRoom).toBe(false);
    expect(actions.canJoin).toBe(false);
    expect(actions.canPay).toBe(false);
  });

  it('allows review for a completed package-covered session without a captured payment row', async () => {
    const { service } = buildService();

    const actions = await service.resolveOne({
      session: {
        ...baseSession,
        status: SessionStatus.COMPLETED,
        paymentCoverageType: 'PACKAGE',
        packagePurchaseId: 'package_1',
      } as never,
      finalManualDecision: null,
      now,
      hasReviewEligibleSource: true,
      hasCapturedPayment: false,
      hasReview: false,
    });

    expect(actions.canReview).toBe(true);
  });

  it('does not offer review for a completed session without a valid source', async () => {
    const { service } = buildService();

    const actions = await service.resolveOne({
      session: {
        ...baseSession,
        status: SessionStatus.COMPLETED,
      } as never,
      finalManualDecision: null,
      now,
      hasReviewEligibleSource: false,
      hasReview: false,
    });

    expect(actions.canReview).toBe(false);
  });

  it('does not offer another review after the session is already rated', async () => {
    const { service } = buildService();

    const actions = await service.resolveOne({
      session: {
        ...baseSession,
        status: SessionStatus.COMPLETED,
      } as never,
      finalManualDecision: null,
      now,
      hasCapturedPayment: true,
      hasReview: true,
    });

    expect(actions.canReview).toBe(false);
  });

  it.each([
    SessionStatus.CANCELLED,
    SessionStatus.PATIENT_NO_SHOW,
    SessionStatus.EXPIRED,
  ])('does not expose actions for terminal status %s', async (status) => {
    const { service } = buildService();

    const actions = await service.resolveOne({
      session: { ...baseSession, status } as never,
      finalManualDecision: null,
      now,
      hasCapturedPayment: true,
      hasReview: false,
    });

    expect(actions).toEqual({
      canCancel: false,
      canPrepareRoom: false,
      canJoin: false,
      canPay: false,
      canReview: false,
    });
  });
});
