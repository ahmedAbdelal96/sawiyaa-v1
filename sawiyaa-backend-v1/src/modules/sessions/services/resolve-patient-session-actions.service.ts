import { Injectable } from '@nestjs/common';
import {
  Session,
  SessionAdminDecisionType,
  SessionStatus,
} from '@prisma/client';
import { ResolveSessionReviewEligibilityService } from '@modules/reviews/services/resolve-session-review-eligibility.service';
import { EvaluateSessionCancellationPolicyService } from './evaluate-session-cancellation-policy.service';
import {
  resolveSessionJoinPolicy,
} from '../utils/session-join-policy.util';

export type PatientSessionActionsViewModel = {
  canCancel: boolean;
  canPrepareRoom: boolean;
  canJoin: boolean;
  canPay: boolean;
  canReview: boolean;
};

type SessionForPatientActions = Pick<
  Session,
  | 'id'
  | 'status'
  | 'flowType'
  | 'sessionMode'
  | 'scheduledStartAt'
  | 'scheduledEndAt'
  | 'expiresAt'
  | 'provider'
  | 'providerRoomId'
  | 'providerSessionRef'
  | 'videoRoomClosedAt'
>;

const CANCELLABLE_STATUSES = new Set<SessionStatus>([
  SessionStatus.PENDING_PAYMENT,
  SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
]);

@Injectable()
export class ResolvePatientSessionActionsService {
  constructor(
    private readonly evaluateCancellationPolicy: EvaluateSessionCancellationPolicyService,
    private readonly resolveSessionReviewEligibility: ResolveSessionReviewEligibilityService,
  ) {}

  async resolveMany(input: {
    sessions: SessionForPatientActions[];
    finalDecisionBySessionId: Map<string, SessionAdminDecisionType>;
    now: Date;
  }): Promise<Map<string, PatientSessionActionsViewModel>> {
    const reviewEligibility =
      await this.resolveSessionReviewEligibility.resolveMany(
        input.sessions.map((session) => session.id),
      );
    const resolved = await Promise.all(
      input.sessions.map(async (session) => [
        session.id,
        await this.resolveOne({
          session,
          finalManualDecision:
            input.finalDecisionBySessionId.get(session.id) ?? null,
          now: input.now,
          hasReviewEligibleSource: reviewEligibility.get(session.id)?.hasValidSource ?? false,
          hasReview: reviewEligibility.get(session.id)?.hasReview ?? false,
        }),
      ] as const),
    );

    return new Map(resolved);
  }

  async resolveOne(input: {
    session: SessionForPatientActions;
    finalManualDecision: SessionAdminDecisionType | null;
    now: Date;
    hasCapturedPayment?: boolean;
    hasReviewEligibleSource?: boolean;
    hasReview?: boolean;
  }): Promise<PatientSessionActionsViewModel> {
    const facts =
      input.hasReviewEligibleSource === undefined ||
      input.hasReview === undefined
        ? await this.resolveSessionReviewEligibility.resolveMany([input.session.id])
        : null;
    const hasReview =
      input.hasReview ?? facts?.get(input.session.id)?.hasReview ?? false;
    const hasReviewEligibleSource =
      input.hasReviewEligibleSource ??
      facts?.get(input.session.id)?.hasValidSource ?? false;
    const reviewEligibility =
      this.resolveSessionReviewEligibility.resolveOne({
        status: input.session.status,
        finalDecision: input.finalManualDecision,
        hasValidSource: hasReviewEligibleSource,
        hasReview,
      });
    const runtime = resolveSessionJoinPolicy({
      ...input.session,
      now: input.now,
      finalManualDecision: input.finalManualDecision,
    });
    const runtimePrepared =
      Boolean(input.session.providerRoomId) &&
      Boolean(input.session.providerSessionRef);
    const isTerminalPresentation = ([
      SessionStatus.COMPLETED,
      SessionStatus.CANCELLED,
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
      SessionStatus.EXPIRED,
      SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
    ] as SessionStatus[]).includes(input.session.status);
    const canCancel = await this.resolveCanCancel({
      session: input.session,
      isTerminalPresentation,
      now: input.now,
    });
    return {
      canCancel,
      canPrepareRoom:
        !isTerminalPresentation &&
        runtime.canPrepareRuntime &&
        !runtimePrepared,
      canJoin:
        !isTerminalPresentation &&
        runtime.canJoin &&
        ([SessionStatus.READY_TO_JOIN, SessionStatus.IN_PROGRESS] as SessionStatus[]).includes(
          input.session.status,
        ),
      canPay:
        !isTerminalPresentation &&
        input.session.status === SessionStatus.PENDING_PAYMENT &&
        Boolean(input.session.expiresAt && input.session.expiresAt > input.now),
      canReview:
        reviewEligibility.canReview,
    };
  }

  private async resolveCanCancel(input: {
    session: SessionForPatientActions;
    isTerminalPresentation: boolean;
    now: Date;
  }): Promise<boolean> {
    if (
      input.isTerminalPresentation ||
      !CANCELLABLE_STATUSES.has(input.session.status)
    ) {
      return false;
    }

    try {
      const evaluation = await this.evaluateCancellationPolicy.evaluate({
        session: input.session,
        at: input.now,
      });
      return evaluation.cancellationAllowed;
    } catch {
      return false;
    }
  }
}
