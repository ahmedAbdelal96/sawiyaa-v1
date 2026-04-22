import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';
import { BuildPractitionerCredibilitySummaryService } from '../services/build-practitioner-credibility-summary.service';

@Injectable()
export class GetPublicPractitionerTrustSummaryUseCase {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly buildPractitionerCredibilitySummaryService: BuildPractitionerCredibilitySummaryService,
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

    const aggregate = await this.reviewRepository.aggregatePublicVisibleReviews(
      practitioner.id,
    );

    const summary = this.buildPractitionerCredibilitySummaryService.build({
      totalPublicReviews: aggregate._count.id ?? 0,
      averagePublicRating:
        aggregate._avg.ratingValue === null ||
        aggregate._avg.ratingValue === undefined
          ? null
          : Number(aggregate._avg.ratingValue),
      latestPublishedAt: aggregate._max.publishedAt ?? null,
    });

    return {
      practitioner: this.reviewPresenter.presentPublicPractitionerSummary({
        id: practitioner.id,
        slug: practitioner.publicSlug,
        displayName: practitioner.user.displayName ?? null,
      }),
      summary: this.reviewPresenter.presentPublicSummary({
        averageRating: summary.averageOverallRating,
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
