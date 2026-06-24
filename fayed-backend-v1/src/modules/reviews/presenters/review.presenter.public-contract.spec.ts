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

  it('returns admin review item with patient context and anonymous-safe label', () => {
    const item = presenter.presentAdminReviewItem({
      id: 'review_1',
      sessionId: 'session_1',
      patientId: 'patient_1',
      practitionerId: 'practitioner_1',
      isAnonymous: true,
      ratingValue: 5,
      reviewTitle: 'Great',
      reviewText: 'Great session.',
      reviewStatus: 'PUBLISHED',
      submittedAt: new Date('2026-03-01T10:00:00.000Z'),
      publishedAt: new Date('2026-03-02T10:00:00.000Z'),
      updatedAt: new Date('2026-03-02T10:00:00.000Z'),
      practitioner: {
        id: 'practitioner_1',
        publicSlug: 'dr-one',
        user: {
          displayName: 'Dr One',
        },
      },
      patient: {
        id: 'patient_1',
        displayName: 'Patient One',
        user: {
          displayName: 'Patient User',
        },
      },
      session: {
        id: 'session_1',
        scheduledStartAt: new Date('2026-03-01T09:00:00.000Z'),
      },
    });

    expect(item.patientProfileId).toBe('patient_1');
    expect(item.patient).toEqual({
      id: 'patient_1',
      displayName: 'Patient One',
      label: 'Anonymous patient',
      isAnonymous: true,
    });
    expect(item.session).toEqual({
      id: 'session_1',
      scheduledStartAt: '2026-03-01T09:00:00.000Z',
    });
  });

  it('returns stable public trust summary shape', () => {
    const summary = presenter.presentPublicSummary({
      averageRating: 4.25,
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
    });

    expect(summary).toEqual({
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
    });
  });
});
