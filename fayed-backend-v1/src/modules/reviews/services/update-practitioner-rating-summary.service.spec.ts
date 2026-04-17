import { SessionReviewStatus } from '@prisma/client';
import { ReviewRepository } from '../repositories/review.repository';
import { UpdatePractitionerRatingSummaryService } from './update-practitioner-rating-summary.service';

describe('UpdatePractitionerRatingSummaryService', () => {
  const reviewRepository = {
    countByPractitionerAndStatuses: jest.fn(),
    countByPractitionerAndStatus: jest.fn(),
    aggregateAverageRating: jest.fn(),
    groupRatingHistogram: jest.fn(),
    upsertPractitionerRatingSummary: jest.fn(),
  } as unknown as ReviewRepository;

  const service = new UpdatePractitionerRatingSummaryService(reviewRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rebuilds summary with average and histogram', async () => {
    (
      reviewRepository.countByPractitionerAndStatuses as jest.Mock
    ).mockResolvedValue(8);
    (reviewRepository.countByPractitionerAndStatus as jest.Mock).mockResolvedValue(
      3,
    );
    (reviewRepository.aggregateAverageRating as jest.Mock).mockResolvedValue({
      _avg: { ratingValue: 4.125 },
      _max: { submittedAt: new Date('2026-03-29T10:00:00.000Z') },
    });
    (reviewRepository.groupRatingHistogram as jest.Mock).mockResolvedValue([
      { ratingValue: 4, _count: { ratingValue: 5 } },
      { ratingValue: 5, _count: { ratingValue: 3 } },
    ]);

    await service.execute({ practitionerId: 'practitioner-1' });

    expect(reviewRepository.upsertPractitionerRatingSummary).toHaveBeenCalledWith(
      'practitioner-1',
      expect.objectContaining({
        totalReviews: 8,
        publishedReviewsCount: 3,
        averageRating: 4.13,
        rating1Count: 0,
        rating2Count: 0,
        rating3Count: 0,
        rating4Count: 5,
        rating5Count: 3,
      }),
      undefined,
    );
    expect(reviewRepository.countByPractitionerAndStatus).toHaveBeenCalledWith(
      'practitioner-1',
      SessionReviewStatus.PUBLISHED,
      undefined,
    );
  });
});
