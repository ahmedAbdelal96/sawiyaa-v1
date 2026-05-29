import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewRepository } from '../repositories/review.repository';
import {
  REVIEW_COUNTABLE_STATUSES,
  REVIEW_PUBLIC_STATUS,
} from '../types/reviews.types';

@Injectable()
export class UpdatePractitionerRatingSummaryService {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async execute(input: {
    practitionerId: string;
    tx?: Prisma.TransactionClient;
  }) {
    const [totalSubmittedReviews, totalPublishedReviews, averageAggregate, histogram] =
      await Promise.all([
        this.reviewRepository.countByPractitionerAndStatuses(
          input.practitionerId,
          REVIEW_COUNTABLE_STATUSES,
          input.tx,
        ),
      this.reviewRepository.countByPractitionerAndStatus(
        input.practitionerId,
        REVIEW_PUBLIC_STATUS,
        input.tx,
        ),
        this.reviewRepository.aggregateAverageRating(
          input.practitionerId,
          [REVIEW_PUBLIC_STATUS],
          input.tx,
        ),
        this.reviewRepository.groupRatingHistogram(
          input.practitionerId,
          [REVIEW_PUBLIC_STATUS],
          input.tx,
        ),
      ]);

    const histogramMap = new Map<number, number>();
    for (const item of histogram) {
      histogramMap.set(item.ratingValue, item._count.ratingValue);
    }

    const average = averageAggregate._avg.ratingValue ?? 0;
    const roundedAverage = Number(Number(average).toFixed(2));

    await this.reviewRepository.upsertPractitionerRatingSummary(
      input.practitionerId,
      {
        totalReviews: totalSubmittedReviews,
        publishedReviewsCount: totalPublishedReviews,
        averageRating: roundedAverage,
        rating1Count: histogramMap.get(1) ?? 0,
        rating2Count: histogramMap.get(2) ?? 0,
        rating3Count: histogramMap.get(3) ?? 0,
        rating4Count: histogramMap.get(4) ?? 0,
        rating5Count: histogramMap.get(5) ?? 0,
        lastReviewAt: averageAggregate._max.submittedAt ?? null,
      },
      input.tx,
    );
  }
}
