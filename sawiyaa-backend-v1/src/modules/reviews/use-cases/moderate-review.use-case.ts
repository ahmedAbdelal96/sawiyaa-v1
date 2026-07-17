import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ConversationParticipantRole,
  ReviewModerationAction,
  SessionReviewModerationDecision,
} from '@prisma/client';
import { ModerateReviewDto } from '../dto/moderate-review.dto';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';
import { ValidateReviewModerationTransitionService } from '../services/validate-review-moderation-transition.service';

@Injectable()
export class ModerateReviewUseCase {
  private readonly logger = new Logger(ModerateReviewUseCase.name);

  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly validateReviewModerationTransitionService: ValidateReviewModerationTransitionService,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: {
    userId: string;
    reviewId: string;
    payload: ModerateReviewDto;
  }) {
    const review = await this.reviewRepository.findById(input.reviewId);
    if (!review) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.reviewNotFound',
        error: 'REVIEW_NOT_FOUND',
      });
    }

    const now = new Date();
    const next =
      this.validateReviewModerationTransitionService.resolveNextState({
        currentStatus: review.reviewStatus,
        decision: input.payload.decision,
        originalRatingValue: review.ratingValue,
        publicRatingValue: input.payload.publicRatingValue ?? null,
        now,
      });

    const updated = await this.reviewRepository.withTransaction(async (tx) => {
      const row = await this.reviewRepository.updateReview(
        review.id,
        {
          reviewStatus: next.status,
          publishedAt: next.publishedAt,
          hiddenAt: next.hiddenAt,
          archivedAt: next.archivedAt,
          publicRatingValue: next.publicRatingValue,
          countsInPublicAverage: next.countsInPublicAverage,
          moderationDecision: next.moderationDecision,
          moderatedByUserId: input.userId,
          moderatedAt: now,
          moderationReason: input.payload.moderationReason?.trim() || null,
        },
        tx,
      );

      await this.reviewRepository.createModerationEntry(
        {
          sessionReviewId: review.id,
          reviewerUserId: input.userId,
          moderationAction: this.resolveModerationAction(input.payload.decision),
          moderationNote: input.payload.moderationReason?.trim() || null,
          internalReason: input.payload.moderationReason?.trim() || null,
        },
        tx,
      );

      return row;
    });

    this.logger.log(
      `Review moderated (review=${review.id}, decision=${input.payload.decision}, moderator=${input.userId}, role=${ConversationParticipantRole.ADMIN})`,
    );

    return this.reviewPresenter.presentModerationResult({
      decision: input.payload.decision,
      item: this.reviewPresenter.presentAdminReviewItem(updated),
    });
  }

  private resolveModerationAction(
    decision: SessionReviewModerationDecision,
  ): ReviewModerationAction {
    switch (decision) {
      case SessionReviewModerationDecision.APPROVED_AS_IS:
      case SessionReviewModerationDecision.EDITED_AND_APPROVED:
        return ReviewModerationAction.APPROVED;
      case SessionReviewModerationDecision.REJECTED_PUBLISHING:
        return ReviewModerationAction.REJECTED;
      case SessionReviewModerationDecision.INTERNAL_NOTE_ONLY:
      case SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE:
        return ReviewModerationAction.HIDDEN;
      case SessionReviewModerationDecision.AUTO_APPROVED_POSITIVE:
        return ReviewModerationAction.APPROVED;
      default:
        return ReviewModerationAction.APPROVED;
    }
  }
}
