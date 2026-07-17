import { ConflictException } from '@nestjs/common';
import {
  SessionReviewModerationDecision,
  SessionReviewStatus,
} from '@prisma/client';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { ValidateSessionReviewEligibilityService } from '../services/validate-session-review-eligibility.service';
import { CreateSessionReviewUseCase } from './create-session-review.use-case';

describe('CreateSessionReviewUseCase', () => {
  const reviewActorRepository = {
    findPatientProfileByUserId: jest.fn(),
  } as unknown as ReviewActorRepository;

  const reviewRepository = {
    findBySessionId: jest.fn(),
    createReview: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as ReviewRepository;

  const validateSessionReviewEligibilityService = {
    assertEligible: jest.fn(),
  } as unknown as ValidateSessionReviewEligibilityService;

  const reviewPresenter = {
    presentPatientReviewItem: jest.fn(),
  } as unknown as ReviewPresenter;

  const useCase = new CreateSessionReviewUseCase(
    reviewActorRepository,
    reviewRepository,
    validateSessionReviewEligibilityService,
    reviewPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents duplicate review per session', async () => {
    (
      reviewActorRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient-1',
    });
    (reviewRepository.findBySessionId as jest.Mock).mockResolvedValue({
      id: 'review-1',
      sessionId: 'session-1',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        sessionId: 'session-1',
        payload: { overallRating: 5 },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('auto-publishes a four-star review and counts it publicly', async () => {
    (
      reviewActorRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient-1',
    });
    (reviewRepository.findBySessionId as jest.Mock).mockResolvedValue(null);
    (
      validateSessionReviewEligibilityService.assertEligible as jest.Mock
    ).mockResolvedValue({
      id: 'session-1',
      practitionerId: 'practitioner-1',
    });
    (reviewRepository.createReview as jest.Mock).mockResolvedValue({
      id: 'review-1',
      sessionId: 'session-1',
      ratingValue: 4,
      publicRatingValue: 4,
      reviewTitle: null,
      reviewText: 'Great session',
      reviewStatus: SessionReviewStatus.PUBLISHED,
      moderationDecision:
        SessionReviewModerationDecision.AUTO_APPROVED_POSITIVE,
      moderatedByUserId: null,
      moderatedAt: new Date('2026-03-30T10:00:00.000Z'),
      moderationReason: null,
      countsInPublicAverage: true,
      submittedAt: new Date('2026-03-30T10:00:00.000Z'),
      publishedAt: new Date('2026-03-30T10:00:00.000Z'),
      updatedAt: new Date('2026-03-30T10:00:00.000Z'),
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-1',
        user: { displayName: 'Dr 1' },
      },
    });
    (reviewRepository.withTransaction as jest.Mock).mockImplementation(
      async (runner: (tx: { mock: true }) => Promise<unknown>) =>
        runner({ mock: true }),
    );
    (reviewPresenter.presentPatientReviewItem as jest.Mock).mockReturnValue({
      id: 'review-1',
      status: SessionReviewStatus.PUBLISHED,
    });

    const result = await useCase.execute({
      userId: 'user-1',
      sessionId: 'session-1',
      payload: { overallRating: 4, textReview: 'Great session' },
    });

    expect(result.item).toEqual({
      id: 'review-1',
      status: SessionReviewStatus.PUBLISHED,
    });
    expect(reviewRepository.createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        ratingValue: 4,
        publicRatingValue: 4,
        reviewStatus: SessionReviewStatus.PUBLISHED,
        moderationDecision:
          SessionReviewModerationDecision.AUTO_APPROVED_POSITIVE,
        countsInPublicAverage: true,
        moderatedAt: expect.any(Date),
        publishedAt: expect.any(Date),
      }),
      expect.anything(),
    );
  });

  it('creates a pending moderation review for a low rating', async () => {
    (
      reviewActorRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'patient-1',
    });
    (reviewRepository.findBySessionId as jest.Mock).mockResolvedValue(null);
    (
      validateSessionReviewEligibilityService.assertEligible as jest.Mock
    ).mockResolvedValue({
      id: 'session-1',
      practitionerId: 'practitioner-1',
    });
    (reviewRepository.createReview as jest.Mock).mockResolvedValue({
      id: 'review-2',
      sessionId: 'session-1',
      ratingValue: 3,
      publicRatingValue: null,
      reviewTitle: null,
      reviewText: 'Okay session',
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
    });
    (reviewRepository.withTransaction as jest.Mock).mockImplementation(
      async (runner: (tx: { mock: true }) => Promise<unknown>) =>
        runner({ mock: true }),
    );
    (reviewPresenter.presentPatientReviewItem as jest.Mock).mockReturnValue({
      id: 'review-2',
      status: SessionReviewStatus.PENDING_MODERATION,
    });

    const result = await useCase.execute({
      userId: 'user-1',
      sessionId: 'session-1',
      payload: { overallRating: 3, textReview: 'Okay session' },
    });

    expect(result.item).toEqual({
      id: 'review-2',
      status: SessionReviewStatus.PENDING_MODERATION,
    });
    expect(reviewRepository.createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        ratingValue: 3,
        publicRatingValue: null,
        reviewStatus: SessionReviewStatus.PENDING_MODERATION,
        moderationDecision: null,
        countsInPublicAverage: false,
        publishedAt: null,
        moderatedAt: null,
      }),
      expect.anything(),
    );
  });
});
