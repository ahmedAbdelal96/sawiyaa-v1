import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';
import { BuildPractitionerCredibilitySummaryService } from '../services/build-practitioner-credibility-summary.service';
import { SessionReviewRatingAggregationService } from '../services/session-review-rating-aggregation.service';

@Injectable()
export class GetPublicPractitionerTrustSummaryUseCase {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly buildPractitionerCredibilitySummaryService: BuildPractitionerCredibilitySummaryService,
    private readonly sessionReviewRatingAggregationService: SessionReviewRatingAggregationService,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: { slug: string }) {
    const practitioner =
      await this.reviewRepository.findPublicPractitionerBySlug(input.slug);
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.publicPractitionerNotFound',
        error: 'PUBLIC_PRACTITIONER_NOT_FOUND',
      });
    }

    const aggregate =
      await this.sessionReviewRatingAggregationService.aggregateByPractitionerId(
        practitioner.id,
      );

    const summary = this.buildPractitionerCredibilitySummaryService.build({
      ratingsCount: aggregate.ratingsCount,
      writtenReviewsCount: aggregate.writtenReviewsCount,
      averagePublicRating: aggregate.averageRating,
      latestPublishedAt: aggregate.latestPublishedReviewAt
        ? new Date(aggregate.latestPublishedReviewAt)
        : null,
    });

    return {
      practitioner: this.reviewPresenter.presentPublicPractitionerSummary({
        id: practitioner.id,
        slug: practitioner.publicSlug,
        displayName: practitioner.user.displayName ?? null,
      }),
      summary: this.reviewPresenter.presentPublicSummary({
        averageRating: summary.averageOverallRating,
        ratingsCount: summary.ratingsCount,
        publishedRatingsCount: summary.publishedRatingsCount,
        writtenReviewsCount: summary.writtenReviewsCount,
        totalPublicReviews: summary.totalPublicReviews,
        totalPublishedReviews: summary.totalPublishedReviews,
        totalSubmittedReviews: summary.totalSubmittedReviews,
        latestPublishedReviewAt: summary.latestPublishedReviewAt,
        hasEnoughPublicReviews: summary.hasEnoughPublicReviews,
        volumeLevel: summary.volumeLevel,
        freshness: summary.freshness,
        rationaleCodes: summary.rationaleCodes,
      }),
    };
  }
}
