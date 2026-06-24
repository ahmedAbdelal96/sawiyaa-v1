import { NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';
import { BuildPractitionerCredibilitySummaryService } from '../services/build-practitioner-credibility-summary.service';
import { SessionReviewRatingAggregationService } from '../services/session-review-rating-aggregation.service';
import { GetPublicPractitionerTrustSummaryUseCase } from './get-public-practitioner-trust-summary.use-case';

describe('GetPublicPractitionerTrustSummaryUseCase', () => {
  const reviewRepository = {
    findPublicPractitionerBySlug: jest.fn(),
  } as unknown as ReviewRepository;
  const sessionReviewRatingAggregationService = {
    aggregateByPractitionerId: jest.fn(),
  } as unknown as SessionReviewRatingAggregationService;

  const useCase = new GetPublicPractitionerTrustSummaryUseCase(
    reviewRepository,
    new BuildPractitionerCredibilitySummaryService(),
    sessionReviewRatingAggregationService,
    new ReviewPresenter(),
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws when practitioner is not publicly visible', async () => {
    (
      reviewRepository.findPublicPractitionerBySlug as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        slug: 'not-public',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns deterministic moderation-safe trust summary contract', async () => {
    (
      reviewRepository.findPublicPractitionerBySlug as jest.Mock
    ).mockResolvedValue({
      id: 'pr_1',
      publicSlug: 'dr-one',
      user: {
        displayName: 'Dr One',
      },
    });
    (
      sessionReviewRatingAggregationService.aggregateByPractitionerId as jest.Mock
    ).mockResolvedValue({
      averageRating: 4.25,
      ratingsCount: 4,
      publishedRatingsCount: 4,
      writtenReviewsCount: 3,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 1,
      rating4Count: 1,
      rating5Count: 2,
      latestPublishedReviewAt: '2026-03-15T00:00:00.000Z',
    });

    const result = await useCase.execute({ slug: 'dr-one' });

    expect(result).toEqual({
      practitioner: {
        id: 'pr_1',
        slug: 'dr-one',
        displayName: 'Dr One',
      },
      summary: {
        averageOverallRating: 4.25,
        ratingsCount: 4,
        publishedRatingsCount: 4,
        writtenReviewsCount: 3,
        totalPublicReviews: 4,
        totalPublishedReviews: 4,
        totalSubmittedReviews: 4,
        latestPublishedReviewAt: '2026-03-15T00:00:00.000Z',
        hasEnoughPublicReviews: true,
        volumeLevel: 'ESTABLISHED',
        freshness: 'RECENT',
        rationaleCodes: [
          'ESTABLISHED_PUBLIC_REVIEW_VOLUME',
          'RECENT_PUBLIC_FEEDBACK',
        ],
      },
    });
  });
});
