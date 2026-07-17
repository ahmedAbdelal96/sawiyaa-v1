import { Injectable } from '@nestjs/common';
import { SessionAdminDecisionType, SessionStatus } from '@prisma/client';
import { ReviewSessionRepository } from '../repositories/review-session.repository';

export type SessionReviewEligibility = {
  isEffectivelyCompleted: boolean;
  hasValidSource: boolean;
  hasReview: boolean;
  canReview: boolean;
};

const REVIEW_BLOCKED_STATUSES = new Set<SessionStatus>([
  SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
  SessionStatus.CANCELLED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
  SessionStatus.EXPIRED,
]);

@Injectable()
export class ResolveSessionReviewEligibilityService {
  constructor(private readonly repository: ReviewSessionRepository) {}

  async resolveMany(sessionIds: string[]) {
    const facts = await this.repository.findReviewEligibilityFacts(sessionIds);
    return new Map(
      facts.map((fact) => [
        fact.id,
        this.resolveOne({
          status: fact.status,
          finalDecision: fact.finalDecision,
          hasValidSource: fact.hasValidSource,
          hasReview: fact.hasReview,
        }),
      ] as const),
    );
  }

  resolveOne(input: {
    status: SessionStatus;
    finalDecision: SessionAdminDecisionType | null;
    hasValidSource: boolean;
    hasReview: boolean;
  }): SessionReviewEligibility {
    const isEffectivelyCompleted =
      !REVIEW_BLOCKED_STATUSES.has(input.status) &&
      (input.status === SessionStatus.COMPLETED ||
        input.finalDecision === SessionAdminDecisionType.MARK_COMPLETED);
    const canReview =
      isEffectivelyCompleted && input.hasValidSource && !input.hasReview;

    return {
      isEffectivelyCompleted,
      hasValidSource: input.hasValidSource,
      hasReview: input.hasReview,
      canReview,
    };
  }

  listEligibleSessionsForReview(input: {
    patientId: string;
    page: number;
    limit: number;
  }) {
    return this.repository.listEligibleSessionsForReview(input);
  }
}
