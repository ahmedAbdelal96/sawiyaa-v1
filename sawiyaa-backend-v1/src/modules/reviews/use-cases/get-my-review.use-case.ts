import { Injectable, NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ReviewRepository } from '../repositories/review.repository';

@Injectable()
export class GetMyReviewUseCase {
  constructor(
    private readonly reviewActorRepository: ReviewActorRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: { userId: string; reviewId: string }) {
    const patient = await this.reviewActorRepository.findPatientProfileByUserId(
      input.userId,
    );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.patientProfileNotFound',
        error: 'REVIEW_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const review = await this.reviewRepository.findPatientReviewById(
      input.reviewId,
      patient.id,
    );
    if (!review) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.reviewNotFound',
        error: 'REVIEW_NOT_FOUND',
      });
    }

    return {
      item: this.reviewPresenter.presentPatientReviewItem(review),
    };
  }
}
