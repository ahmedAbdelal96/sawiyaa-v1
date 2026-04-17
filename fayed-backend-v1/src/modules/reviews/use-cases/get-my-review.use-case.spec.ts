import { NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { GetMyReviewUseCase } from './get-my-review.use-case';

describe('GetMyReviewUseCase', () => {
  const reviewActorRepository = {
    findPatientProfileByUserId: jest.fn(),
  } as unknown as ReviewActorRepository;

  const reviewRepository = {
    findPatientReviewById: jest.fn(),
  } as unknown as ReviewRepository;

  const reviewPresenter = {
    presentPatientReviewItem: jest.fn(),
  } as unknown as ReviewPresenter;

  const useCase = new GetMyReviewUseCase(
    reviewActorRepository,
    reviewRepository,
    reviewPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks access when review does not belong to patient', async () => {
    (reviewActorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (reviewRepository.findPatientReviewById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        reviewId: 'review-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
