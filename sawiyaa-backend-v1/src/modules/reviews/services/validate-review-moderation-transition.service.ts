import { ConflictException, Injectable } from '@nestjs/common';
import { ReviewModerationAction, SessionReviewStatus } from '@prisma/client';
import { ReviewNextPublicState } from '../types/reviews.types';

@Injectable()
export class ValidateReviewModerationTransitionService {
  private readonly allowedActionsByStatus: Record<
    SessionReviewStatus,
    ReviewModerationAction[]
  > = {
    [SessionReviewStatus.DRAFT]: [
      ReviewModerationAction.APPROVED,
      ReviewModerationAction.REJECTED,
      ReviewModerationAction.HIDDEN,
      ReviewModerationAction.ARCHIVED,
    ],
    [SessionReviewStatus.SUBMITTED]: [
      ReviewModerationAction.APPROVED,
      ReviewModerationAction.REJECTED,
      ReviewModerationAction.HIDDEN,
      ReviewModerationAction.ARCHIVED,
    ],
    [SessionReviewStatus.PENDING_MODERATION]: [
      ReviewModerationAction.APPROVED,
      ReviewModerationAction.REJECTED,
      ReviewModerationAction.HIDDEN,
      ReviewModerationAction.ARCHIVED,
    ],
    [SessionReviewStatus.PUBLISHED]: [
      ReviewModerationAction.HIDDEN,
      ReviewModerationAction.REJECTED,
      ReviewModerationAction.ARCHIVED,
    ],
    [SessionReviewStatus.HIDDEN]: [
      ReviewModerationAction.RESTORED,
      ReviewModerationAction.REJECTED,
      ReviewModerationAction.ARCHIVED,
    ],
    [SessionReviewStatus.REJECTED]: [
      ReviewModerationAction.RESTORED,
      ReviewModerationAction.HIDDEN,
      ReviewModerationAction.ARCHIVED,
    ],
    [SessionReviewStatus.ARCHIVED]: [ReviewModerationAction.RESTORED],
  };

  resolveNextState(input: {
    currentStatus: SessionReviewStatus;
    action: ReviewModerationAction;
    now: Date;
  }): ReviewNextPublicState {
    const allowed = this.allowedActionsByStatus[input.currentStatus] ?? [];
    if (!allowed.includes(input.action)) {
      throw new ConflictException({
        messageKey: 'reviews.errors.invalidModerationTransition',
        error: 'REVIEW_INVALID_MODERATION_TRANSITION',
      });
    }

    switch (input.action) {
      case ReviewModerationAction.APPROVED:
      case ReviewModerationAction.RESTORED:
        return {
          status: SessionReviewStatus.PUBLISHED,
          publishedAt: input.now,
          hiddenAt: null,
          archivedAt: null,
        };
      case ReviewModerationAction.REJECTED:
        return {
          status: SessionReviewStatus.REJECTED,
          publishedAt: null,
          hiddenAt: null,
          archivedAt: null,
        };
      case ReviewModerationAction.HIDDEN:
        return {
          status: SessionReviewStatus.HIDDEN,
          publishedAt: null,
          hiddenAt: input.now,
          archivedAt: null,
        };
      case ReviewModerationAction.ARCHIVED:
        return {
          status: SessionReviewStatus.ARCHIVED,
          publishedAt: null,
          hiddenAt: null,
          archivedAt: input.now,
        };
      default:
        throw new ConflictException({
          messageKey: 'reviews.errors.invalidModerationTransition',
          error: 'REVIEW_INVALID_MODERATION_TRANSITION',
        });
    }
  }
}
