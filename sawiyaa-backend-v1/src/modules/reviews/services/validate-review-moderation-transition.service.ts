import { ConflictException, Injectable } from '@nestjs/common';
import {
  SessionReviewModerationDecision,
  SessionReviewStatus,
} from '@prisma/client';

export type ReviewModerationResolution = {
  status: SessionReviewStatus;
  publishedAt: Date | null;
  hiddenAt: Date | null;
  archivedAt: Date | null;
  publicRatingValue: number | null;
  countsInPublicAverage: boolean;
  moderationDecision: SessionReviewModerationDecision;
};

@Injectable()
export class ValidateReviewModerationTransitionService {
  private readonly allowedDecisionsByStatus: Record<
    SessionReviewStatus,
    SessionReviewModerationDecision[]
  > = {
    [SessionReviewStatus.DRAFT]: [
      SessionReviewModerationDecision.APPROVED_AS_IS,
      SessionReviewModerationDecision.EDITED_AND_APPROVED,
      SessionReviewModerationDecision.REJECTED_PUBLISHING,
      SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
    ],
    [SessionReviewStatus.SUBMITTED]: [
      SessionReviewModerationDecision.APPROVED_AS_IS,
      SessionReviewModerationDecision.EDITED_AND_APPROVED,
      SessionReviewModerationDecision.REJECTED_PUBLISHING,
      SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
    ],
    [SessionReviewStatus.PENDING_MODERATION]: [
      SessionReviewModerationDecision.APPROVED_AS_IS,
      SessionReviewModerationDecision.EDITED_AND_APPROVED,
      SessionReviewModerationDecision.REJECTED_PUBLISHING,
      SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
    ],
    [SessionReviewStatus.PUBLISHED]: [
      SessionReviewModerationDecision.APPROVED_AS_IS,
      SessionReviewModerationDecision.EDITED_AND_APPROVED,
      SessionReviewModerationDecision.REJECTED_PUBLISHING,
      SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
    ],
    [SessionReviewStatus.HIDDEN]: [
      SessionReviewModerationDecision.APPROVED_AS_IS,
      SessionReviewModerationDecision.EDITED_AND_APPROVED,
      SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
    ],
    [SessionReviewStatus.REJECTED]: [
      SessionReviewModerationDecision.APPROVED_AS_IS,
      SessionReviewModerationDecision.EDITED_AND_APPROVED,
      SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
    ],
    [SessionReviewStatus.ARCHIVED]: [],
  };

  resolveNextState(input: {
    currentStatus: SessionReviewStatus;
    decision: SessionReviewModerationDecision;
    originalRatingValue: number;
    publicRatingValue?: number | null;
    now: Date;
  }): ReviewModerationResolution {
    const allowed = this.allowedDecisionsByStatus[input.currentStatus] ?? [];
    if (!allowed.includes(input.decision)) {
      throw new ConflictException({
        messageKey: 'reviews.errors.invalidModerationTransition',
        error: 'REVIEW_INVALID_MODERATION_TRANSITION',
      });
    }

    switch (input.decision) {
      case SessionReviewModerationDecision.APPROVED_AS_IS:
        return {
          status: SessionReviewStatus.PUBLISHED,
          publishedAt: input.now,
          hiddenAt: null,
          archivedAt: null,
          publicRatingValue: input.originalRatingValue,
          countsInPublicAverage: true,
          moderationDecision: input.decision,
        };
      case SessionReviewModerationDecision.EDITED_AND_APPROVED:
        if (input.publicRatingValue == null) {
          throw new ConflictException({
            messageKey: 'reviews.errors.publicRatingRequired',
            error: 'REVIEW_PUBLIC_RATING_REQUIRED',
          });
        }
        return {
          status: SessionReviewStatus.PUBLISHED,
          publishedAt: input.now,
          hiddenAt: null,
          archivedAt: null,
          publicRatingValue: input.publicRatingValue,
          countsInPublicAverage: true,
          moderationDecision: input.decision,
        };
      case SessionReviewModerationDecision.REJECTED_PUBLISHING:
        return {
          status: SessionReviewStatus.REJECTED,
          publishedAt: null,
          hiddenAt: null,
          archivedAt: null,
          publicRatingValue: null,
          countsInPublicAverage: false,
          moderationDecision: input.decision,
        };
      case SessionReviewModerationDecision.INTERNAL_NOTE_ONLY:
      case SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE:
        return {
          status: SessionReviewStatus.HIDDEN,
          publishedAt: null,
          hiddenAt: input.now,
          archivedAt: null,
          publicRatingValue: null,
          countsInPublicAverage: false,
          moderationDecision: input.decision,
        };
      default:
        throw new ConflictException({
          messageKey: 'reviews.errors.invalidModerationTransition',
          error: 'REVIEW_INVALID_MODERATION_TRANSITION',
        });
    }
  }
}
