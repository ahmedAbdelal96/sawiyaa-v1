import {
  ReviewModerationAction,
  SessionReviewModerationDecision,
  SessionReviewStatus,
} from '@prisma/client';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewRepository } from '../repositories/review.repository';
import { ValidateReviewModerationTransitionService } from '../services/validate-review-moderation-transition.service';
import { ModerateReviewUseCase } from './moderate-review.use-case';

describe('ModerateReviewUseCase', () => {
  const reviewRepository = {
    findById: jest.fn(),
    updateReview: jest.fn(),
    createModerationEntry: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as ReviewRepository;

  const validateReviewModerationTransitionService = new ValidateReviewModerationTransitionService();

  const reviewPresenter = {
    presentAdminReviewItem: jest.fn(),
    presentModerationResult: jest.fn(),
  } as unknown as ReviewPresenter;

  const useCase = new ModerateReviewUseCase(
    reviewRepository,
    validateReviewModerationTransitionService,
    reviewPresenter,
  );

  const baseReview = {
    id: 'review-1',
    sessionId: 'session-1',
    patientId: 'patient-1',
    practitionerId: 'practitioner-1',
    isAnonymous: false,
    ratingValue: 2,
    publicRatingValue: null,
    reviewTitle: 'Title',
    reviewText: 'Text',
    reviewStatus: SessionReviewStatus.PENDING_MODERATION,
    moderationDecision: null,
    moderatedByUserId: null,
    moderatedAt: null,
    moderationReason: null,
    countsInPublicAverage: false,
    submittedAt: new Date('2026-03-30T10:00:00.000Z'),
    publishedAt: null,
    updatedAt: new Date('2026-03-30T10:00:00.000Z'),
    practitioner: {
      id: 'practitioner-1',
      publicSlug: 'dr-1',
      user: { displayName: 'Dr 1' },
    },
    patient: {
      id: 'patient-1',
      displayName: 'Patient 1',
      user: { displayName: 'Patient User' },
    },
    session: {
      id: 'session-1',
      scheduledStartAt: new Date('2026-03-30T09:00:00.000Z'),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (reviewRepository.findById as jest.Mock).mockResolvedValue(baseReview);
    (reviewRepository.updateReview as jest.Mock).mockImplementation(
      async (_id: string, data: unknown) => ({
        ...baseReview,
        ...(data as Record<string, unknown>),
      }),
    );
    (reviewRepository.createModerationEntry as jest.Mock).mockResolvedValue(
      null,
    );
    (reviewRepository.withTransaction as jest.Mock).mockImplementation(
      async (runner: (tx: { mock: true }) => Promise<unknown>) =>
        runner({ mock: true }),
    );
    (reviewPresenter.presentAdminReviewItem as jest.Mock).mockImplementation(
      (item) => item,
    );
    (reviewPresenter.presentModerationResult as jest.Mock).mockImplementation(
      ({ decision, item }) => ({ decision, action: decision, item }),
    );
  });

  it('approves as-is and preserves the original rating', async () => {
    const result = await useCase.execute({
      userId: 'admin-1',
      reviewId: 'review-1',
      payload: {
        decision: SessionReviewModerationDecision.APPROVED_AS_IS,
        moderationReason: 'Looks good',
      },
    });

    expect(reviewRepository.updateReview).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({
        reviewStatus: SessionReviewStatus.PUBLISHED,
        publicRatingValue: 2,
        countsInPublicAverage: true,
        moderationDecision:
          SessionReviewModerationDecision.APPROVED_AS_IS,
        moderatedByUserId: 'admin-1',
        moderationReason: 'Looks good',
      }),
      expect.anything(),
    );
    expect(result.decision).toBe(
      SessionReviewModerationDecision.APPROVED_AS_IS,
    );
    expect(result.action).toBe(
      SessionReviewModerationDecision.APPROVED_AS_IS,
    );
  });

  it('edits and approves with a public rating', async () => {
    await useCase.execute({
      userId: 'admin-1',
      reviewId: 'review-1',
      payload: {
        decision: SessionReviewModerationDecision.EDITED_AND_APPROVED,
        publicRatingValue: 4,
        moderationReason: 'Adjusted for representativeness',
      },
    });

    expect(reviewRepository.updateReview).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({
        publicRatingValue: 4,
        reviewStatus: SessionReviewStatus.PUBLISHED,
        countsInPublicAverage: true,
        moderationDecision:
          SessionReviewModerationDecision.EDITED_AND_APPROVED,
      }),
      expect.anything(),
    );
    expect(reviewRepository.createModerationEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        moderationAction: ReviewModerationAction.APPROVED,
        moderationNote: 'Adjusted for representativeness',
      }),
      expect.anything(),
    );
  });

  it('rejects publishing and removes the review from public counts', async () => {
    await useCase.execute({
      userId: 'admin-1',
      reviewId: 'review-1',
      payload: {
        decision: SessionReviewModerationDecision.REJECTED_PUBLISHING,
        moderationReason: 'Not representative',
      },
    });

    expect(reviewRepository.updateReview).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({
        reviewStatus: SessionReviewStatus.REJECTED,
        publicRatingValue: null,
        countsInPublicAverage: false,
        moderationDecision:
          SessionReviewModerationDecision.REJECTED_PUBLISHING,
      }),
      expect.anything(),
    );
    expect(reviewRepository.createModerationEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        moderationAction: ReviewModerationAction.REJECTED,
      }),
      expect.anything(),
    );
  });

  it('marks internal note only as hidden', async () => {
    await useCase.execute({
      userId: 'admin-1',
      reviewId: 'review-1',
      payload: {
        decision: SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
        moderationReason: 'Internal note',
      },
    });

    expect(reviewRepository.updateReview).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({
        reviewStatus: SessionReviewStatus.HIDDEN,
        publicRatingValue: null,
        countsInPublicAverage: false,
        moderationDecision:
          SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      }),
      expect.anything(),
    );
    expect(reviewRepository.createModerationEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        moderationAction: ReviewModerationAction.HIDDEN,
      }),
      expect.anything(),
    );
  });

  it('excludes a review from public average', async () => {
    await useCase.execute({
      userId: 'admin-1',
      reviewId: 'review-1',
      payload: {
        decision: SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
        moderationReason: 'Not representative',
      },
    });

    expect(reviewRepository.updateReview).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({
        reviewStatus: SessionReviewStatus.HIDDEN,
        publicRatingValue: null,
        countsInPublicAverage: false,
        moderationDecision:
          SessionReviewModerationDecision.EXCLUDED_FROM_PUBLIC_AVERAGE,
      }),
      expect.anything(),
    );
    expect(reviewRepository.createModerationEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        moderationAction: ReviewModerationAction.HIDDEN,
      }),
      expect.anything(),
    );
  });
});
