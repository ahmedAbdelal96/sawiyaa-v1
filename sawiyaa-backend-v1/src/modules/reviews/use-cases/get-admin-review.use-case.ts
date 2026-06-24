import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';

@Injectable()
export class GetAdminReviewUseCase {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: { reviewId: string }) {
    const review = await this.reviewRepository.findById(input.reviewId);
    if (!review) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.reviewNotFound',
        error: 'REVIEW_NOT_FOUND',
      });
    }

    return {
      item: this.reviewPresenter.presentAdminReviewItem(review),
    };
  }
}
