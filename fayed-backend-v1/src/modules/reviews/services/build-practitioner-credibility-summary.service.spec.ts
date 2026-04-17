import { BuildPractitionerCredibilitySummaryService } from './build-practitioner-credibility-summary.service';

describe('BuildPractitionerCredibilitySummaryService', () => {
  const service = new BuildPractitionerCredibilitySummaryService();

  it('returns safe empty state for practitioner with no public reviews', () => {
    const result = service.build({
      totalPublicReviews: 0,
      averagePublicRating: null,
      latestPublishedAt: null,
      now: new Date('2026-03-31T00:00:00.000Z'),
    });

    expect(result).toEqual({
      averageOverallRating: null,
      totalPublicReviews: 0,
      totalPublishedReviews: 0,
      totalSubmittedReviews: 0,
      latestPublishedReviewAt: null,
      hasEnoughPublicReviews: false,
      volumeLevel: 'NONE',
      freshness: 'NONE',
      rationaleCodes: ['NO_PUBLIC_REVIEWS', 'NO_PUBLIC_FEEDBACK_TIMELINE'],
    });
  });

  it('keeps deterministic low-volume aggregation semantics', () => {
    const result = service.build({
      totalPublicReviews: 2,
      averagePublicRating: 4.126,
      latestPublishedAt: new Date('2026-03-20T00:00:00.000Z'),
      now: new Date('2026-03-31T00:00:00.000Z'),
    });

    expect(result).toEqual({
      averageOverallRating: 4.13,
      totalPublicReviews: 2,
      totalPublishedReviews: 2,
      totalSubmittedReviews: 2,
      latestPublishedReviewAt: '2026-03-20T00:00:00.000Z',
      hasEnoughPublicReviews: false,
      volumeLevel: 'LOW',
      freshness: 'RECENT',
      rationaleCodes: ['LOW_PUBLIC_REVIEW_VOLUME', 'RECENT_PUBLIC_FEEDBACK'],
    });
  });

  it('marks established and stale when review volume is sufficient but latest review is old', () => {
    const result = service.build({
      totalPublicReviews: 8,
      averagePublicRating: 3.75,
      latestPublishedAt: new Date('2026-01-01T00:00:00.000Z'),
      now: new Date('2026-03-31T00:00:00.000Z'),
    });

    expect(result.volumeLevel).toBe('ESTABLISHED');
    expect(result.hasEnoughPublicReviews).toBe(true);
    expect(result.freshness).toBe('STALE');
    expect(result.rationaleCodes).toEqual([
      'ESTABLISHED_PUBLIC_REVIEW_VOLUME',
      'PUBLIC_FEEDBACK_NOT_RECENT',
    ]);
  });
});

