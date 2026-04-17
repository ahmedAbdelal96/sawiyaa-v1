import { Injectable } from '@nestjs/common';
import { ListAdminReviewsDto } from '../dto/list-admin-reviews.dto';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';

@Injectable()
export class ListAdminReviewsUseCase {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: { query: ListAdminReviewsDto }) {
    const [rows, totalItems] = await this.reviewRepository.listAdminReviews({
      page: input.query.page,
      limit: input.query.limit,
      status: input.query.status,
      practitionerId: input.query.practitionerId,
      sessionId: input.query.sessionId,
      needsModeration: input.query.needsModeration,
    });

    return this.reviewPresenter.presentReviewList({
      items: rows.map((row) => this.reviewPresenter.presentAdminReviewItem(row)),
      page: input.query.page,
      limit: input.query.limit,
      totalItems,
    });
  }
}
