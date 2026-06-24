import { Injectable, NotFoundException } from '@nestjs/common';
import { ListPatientReviewsDto } from '../dto/list-patient-reviews.dto';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ReviewRepository } from '../repositories/review.repository';

@Injectable()
export class ListMyReviewsUseCase {
  constructor(
    private readonly reviewActorRepository: ReviewActorRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: { userId: string; query: ListPatientReviewsDto }) {
    const patient = await this.reviewActorRepository.findPatientProfileByUserId(
      input.userId,
    );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.patientProfileNotFound',
        error: 'REVIEW_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const [rows, totalItems] = await this.reviewRepository.listPatientReviews({
      patientId: patient.id,
      page: input.query.page,
      limit: input.query.limit,
      status: input.query.status,
    });

    return this.reviewPresenter.presentReviewList({
      items: rows.map((row) =>
        this.reviewPresenter.presentPatientReviewItem(row),
      ),
      page: input.query.page,
      limit: input.query.limit,
      totalItems,
    });
  }
}
