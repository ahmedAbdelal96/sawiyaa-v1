import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConversationParticipantRole } from '@prisma/client';
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
        action: input.payload.action,
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
        },
        tx,
      );

      await this.reviewRepository.createModerationEntry(
        {
          sessionReviewId: review.id,
          reviewerUserId: input.userId,
          moderationAction: input.payload.action,
          moderationNote: input.payload.moderatorNote?.trim() || null,
        },
        tx,
      );

      return row;
    });

    this.logger.log(
      `Review moderated (review=${review.id}, action=${input.payload.action}, moderator=${input.userId}, role=${ConversationParticipantRole.ADMIN})`,
    );

    return this.reviewPresenter.presentModerationResult({
      action: input.payload.action,
      item: this.reviewPresenter.presentAdminReviewItem(updated),
    });
  }
}
