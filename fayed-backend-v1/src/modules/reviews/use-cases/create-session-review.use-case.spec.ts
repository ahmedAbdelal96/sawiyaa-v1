import { ConflictException } from '@nestjs/common';
import { SessionReviewStatus } from '@prisma/client';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { ValidateSessionReviewEligibilityService } from '../services/validate-session-review-eligibility.service';
import { UpdatePractitionerRatingSummaryService } from '../services/update-practitioner-rating-summary.service';
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

  const updatePractitionerRatingSummaryService = {
    execute: jest.fn(),
  } as unknown as UpdatePractitionerRatingSummaryService;

  const reviewPresenter = {
    presentPatientReviewItem: jest.fn(),
  } as unknown as ReviewPresenter;

  const useCase = new CreateSessionReviewUseCase(
    reviewActorRepository,
    reviewRepository,
    validateSessionReviewEligibilityService,
    updatePractitionerRatingSummaryService,
    reviewPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents duplicate review per session', async () => {
    (reviewActorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue({
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

  it('creates pending moderation review when eligible', async () => {
    (reviewActorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue({
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
      reviewTitle: null,
      reviewText: 'Great session',
      reviewStatus: SessionReviewStatus.PENDING_MODERATION,
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
      async (
        runner: (tx: { mock: true }) => Promise<unknown>,
      ) => runner({ mock: true }),
    );
    (reviewPresenter.presentPatientReviewItem as jest.Mock).mockReturnValue({
      id: 'review-1',
      status: SessionReviewStatus.PENDING_MODERATION,
    });

    const result = await useCase.execute({
      userId: 'user-1',
      sessionId: 'session-1',
      payload: { overallRating: 4, textReview: 'Great session' },
    });

    expect(result.item).toEqual({
      id: 'review-1',
      status: SessionReviewStatus.PENDING_MODERATION,
    });
  });
});
