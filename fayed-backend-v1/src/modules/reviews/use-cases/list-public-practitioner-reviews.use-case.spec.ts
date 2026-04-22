import { NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';
import { BuildPractitionerCredibilitySummaryService } from '../services/build-practitioner-credibility-summary.service';
import { ListPublicPractitionerReviewsUseCase } from './list-public-practitioner-reviews.use-case';

describe('ListPublicPractitionerReviewsUseCase', () => {
  const reviewRepository = {
    findPublicPractitionerBySlug: jest.fn(),
    listPublicPublishedReviews: jest.fn(),
    aggregatePublicVisibleReviews: jest.fn(),
  } as unknown as ReviewRepository;

  const reviewPresenter = new ReviewPresenter();
  const buildPractitionerCredibilitySummaryService =
    new BuildPractitionerCredibilitySummaryService();

  const useCase = new ListPublicPractitionerReviewsUseCase(
    reviewRepository,
    buildPractitionerCredibilitySummaryService,
    reviewPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws not found when practitioner is not public-visible', async () => {
    (
      reviewRepository.findPublicPractitionerBySlug as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        slug: 'dr-hidden',
        query: { page: 1, limit: 10 },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns stable public contract shape and deterministic item ordering from repository output', async () => {
    (
      reviewRepository.findPublicPractitionerBySlug as jest.Mock
    ).mockResolvedValue({
      id: 'pr_1',
      publicSlug: 'dr-one',
      ratingSummary: {
        averageRating: 4.5,
        totalReviews: 7,
        publishedReviewsCount: 5,
      },
    });

    (
      reviewRepository.listPublicPublishedReviews as jest.Mock
    ).mockResolvedValue([
      [
        {
          id: 'review_older',
          ratingValue: 4,
          reviewText: 'Older',
          submittedAt: new Date('2026-03-01T00:00:00.000Z'),
          publishedAt: new Date('2026-03-05T00:00:00.000Z'),
        },
        {
          id: 'review_newer',
          ratingValue: 5,
          reviewText: 'Newer',
          submittedAt: new Date('2026-03-02T00:00:00.000Z'),
          publishedAt: new Date('2026-03-06T00:00:00.000Z'),
        },
      ],
      2,
    ]);
    (
      reviewRepository.aggregatePublicVisibleReviews as jest.Mock
    ).mockResolvedValue({
      _count: { id: 2 },
      _avg: { ratingValue: 4.5 },
      _max: { publishedAt: new Date('2026-03-06T00:00:00.000Z') },
    });

    const result = await useCase.execute({
      slug: 'dr-one',
      query: { page: 1, limit: 10 },
    });

    expect(result).toEqual({
      summary: {
        averageOverallRating: 4.5,
        totalPublicReviews: 2,
        totalPublishedReviews: 2,
        totalSubmittedReviews: 2,
        latestPublishedReviewAt: '2026-03-06T00:00:00.000Z',
        hasEnoughPublicReviews: false,
        volumeLevel: 'LOW',
        freshness: 'RECENT',
        rationaleCodes: ['LOW_PUBLIC_REVIEW_VOLUME', 'RECENT_PUBLIC_FEEDBACK'],
      },
      items: [
        {
          id: 'review_older',
          overallRating: 4,
          textReview: 'Older',
          submittedAt: '2026-03-01T00:00:00.000Z',
          publishedAt: '2026-03-05T00:00:00.000Z',
        },
        {
          id: 'review_newer',
          overallRating: 5,
          textReview: 'Newer',
          submittedAt: '2026-03-02T00:00:00.000Z',
          publishedAt: '2026-03-06T00:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
      },
    });
  });
});
