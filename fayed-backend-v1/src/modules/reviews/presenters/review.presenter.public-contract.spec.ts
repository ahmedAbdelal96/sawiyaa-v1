import { ReviewPresenter } from './review.presenter';

describe('ReviewPresenter public contract', () => {
  const presenter = new ReviewPresenter();

  it('returns public-safe review item shape without moderation internals', () => {
    const item = presenter.presentPublicReviewItem({
      id: 'review_1',
      ratingValue: 5,
      reviewText: 'Great session.',
      submittedAt: new Date('2026-03-01T10:00:00.000Z'),
      publishedAt: new Date('2026-03-02T10:00:00.000Z'),
    });

    expect(item).toEqual({
      id: 'review_1',
      overallRating: 5,
      textReview: 'Great session.',
      submittedAt: '2026-03-01T10:00:00.000Z',
      publishedAt: '2026-03-02T10:00:00.000Z',
    });

    expect(item).not.toHaveProperty('status');
    expect(item).not.toHaveProperty('moderationNote');
    expect(item).not.toHaveProperty('internalReason');
    expect(item).not.toHaveProperty('patientProfileId');
  });

  it('returns safe empty list contract shape', () => {
    const result = presenter.presentReviewList({
      items: [],
      page: 1,
      limit: 10,
      totalItems: 0,
    });

    expect(result).toEqual({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
      },
    });
  });

  it('returns stable public trust summary shape', () => {
    const summary = presenter.presentPublicSummary({
      averageRating: 4.25,
      totalPublicReviews: 4,
      totalPublishedReviews: 4,
      totalSubmittedReviews: 4,
      latestPublishedReviewAt: '2026-03-15T00:00:00.000Z',
      hasEnoughPublicReviews: true,
      volumeLevel: 'ESTABLISHED',
      freshness: 'RECENT',
      rationaleCodes: ['ESTABLISHED_PUBLIC_REVIEW_VOLUME', 'RECENT_PUBLIC_FEEDBACK'],
    });

    expect(summary).toEqual({
      averageOverallRating: 4.25,
      totalPublicReviews: 4,
      totalPublishedReviews: 4,
      totalSubmittedReviews: 4,
      latestPublishedReviewAt: '2026-03-15T00:00:00.000Z',
      hasEnoughPublicReviews: true,
      volumeLevel: 'ESTABLISHED',
      freshness: 'RECENT',
      rationaleCodes: ['ESTABLISHED_PUBLIC_REVIEW_VOLUME', 'RECENT_PUBLIC_FEEDBACK'],
    });
  });
});
