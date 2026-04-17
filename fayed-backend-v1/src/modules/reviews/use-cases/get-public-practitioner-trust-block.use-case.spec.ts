import { ContentLocale } from '@prisma/client';
import { ListPublicArticlesUseCase } from '@modules/articles/use-cases/list-public-articles.use-case';
import { BuildPublicTrustConversionContentQueryService } from '../services/build-public-trust-conversion-content-query.service';
import { GetPublicPractitionerTrustSummaryUseCase } from './get-public-practitioner-trust-summary.use-case';
import { ListPublicPractitionerReviewsUseCase } from './list-public-practitioner-reviews.use-case';
import { GetPublicPractitionerTrustBlockUseCase } from './get-public-practitioner-trust-block.use-case';

describe('GetPublicPractitionerTrustBlockUseCase', () => {
  const trustSummaryUseCase = {
    execute: jest.fn(),
  } as unknown as GetPublicPractitionerTrustSummaryUseCase;
  const listReviewsUseCase = {
    execute: jest.fn(),
  } as unknown as ListPublicPractitionerReviewsUseCase;
  const listPublicArticlesUseCase = {
    execute: jest.fn(),
  } as unknown as ListPublicArticlesUseCase;

  const useCase = new GetPublicPractitionerTrustBlockUseCase(
    trustSummaryUseCase,
    listReviewsUseCase,
    listPublicArticlesUseCase,
    new BuildPublicTrustConversionContentQueryService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes deterministic trust block from safe read layers', async () => {
    (trustSummaryUseCase.execute as jest.Mock).mockResolvedValue({
      practitioner: {
        id: 'prac-1',
        slug: 'dr-safe',
        displayName: 'Dr Safe',
      },
      summary: {
        averageOverallRating: 4.6,
        totalPublicReviews: 8,
        totalPublishedReviews: 8,
        totalSubmittedReviews: 8,
        latestPublishedReviewAt: '2026-03-01T10:00:00.000Z',
        hasEnoughPublicReviews: true,
        volumeLevel: 'ESTABLISHED',
        freshness: 'RECENT',
        rationaleCodes: ['CREDIBILITY_ESTABLISHED'],
      },
    });
    (listReviewsUseCase.execute as jest.Mock).mockResolvedValue({
      summary: {},
      items: [
        {
          id: 'review-1',
          overallRating: 5,
          textReview: 'Great',
          submittedAt: '2026-03-01T10:00:00.000Z',
          publishedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 3, totalItems: 1, totalPages: 1 },
    });
    (listPublicArticlesUseCase.execute as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 'article-1',
          title: 'Therapy Basics',
          slug: 'therapy-basics',
          excerpt: null,
          coverImageUrl: null,
          publishedAt: '2026-03-28T10:00:00.000Z',
          category: null,
          trust: {
            freshnessBand: 'RECENT',
            isFreshContent: true,
            authorDisplayName: null,
            reasonCodes: ['PUBLISHED_DATE_VERIFIED'],
          },
        },
      ],
      pagination: { page: 1, limit: 3, totalItems: 1, totalPages: 1 },
    });

    const result = await useCase.execute({
      slug: 'dr-safe',
      query: {
        locale: ContentLocale.ar,
        reviewLimit: 3,
        contentLimit: 3,
      },
    });

    expect(result.practitioner.slug).toBe('dr-safe');
    expect(result.highlightedReviews).toHaveLength(1);
    expect(result.contentSuggestions).toHaveLength(1);
    expect(result.compositionMeta.reasonCodes).toContain(
      'TRUST_BLOCK_COMPOSED_FROM_SAFE_READ_LAYERS',
    );
  });

  it('caps and deduplicates content suggestions with fallback', async () => {
    (trustSummaryUseCase.execute as jest.Mock).mockResolvedValue({
      practitioner: { id: 'prac-1', slug: 'dr-safe', displayName: 'Dr Safe' },
      summary: {
        averageOverallRating: null,
        totalPublicReviews: 0,
        totalPublishedReviews: 0,
        totalSubmittedReviews: 0,
        latestPublishedReviewAt: null,
        hasEnoughPublicReviews: false,
        volumeLevel: 'NONE',
        freshness: 'NONE',
        rationaleCodes: ['CREDIBILITY_NONE'],
      },
    });
    (listReviewsUseCase.execute as jest.Mock).mockResolvedValue({
      summary: {},
      items: [],
      pagination: { page: 1, limit: 3, totalItems: 0, totalPages: 1 },
    });
    (listPublicArticlesUseCase.execute as jest.Mock)
      .mockResolvedValueOnce({
        items: [{ id: 'a1' }, { id: 'a2' }],
        pagination: { page: 1, limit: 3, totalItems: 2, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        items: [{ id: 'a2' }, { id: 'a3' }],
        pagination: { page: 1, limit: 3, totalItems: 2, totalPages: 1 },
      });

    const result = await useCase.execute({
      slug: 'dr-safe',
      query: {
        locale: ContentLocale.ar,
        reviewLimit: 3,
        contentLimit: 3,
      },
    });

    expect(result.contentSuggestions.map((item: { id: string }) => item.id)).toEqual([
      'a1',
      'a2',
      'a3',
    ]);
  });
});
