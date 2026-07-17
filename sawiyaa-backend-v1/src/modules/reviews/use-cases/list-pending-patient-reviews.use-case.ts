import { Injectable, NotFoundException } from '@nestjs/common';
import { ListPendingPatientReviewsDto } from '../dto/list-pending-patient-reviews.dto';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ResolveSessionReviewEligibilityService } from '../services/resolve-session-review-eligibility.service';

@Injectable()
export class ListPendingPatientReviewsUseCase {
  constructor(
    private readonly reviewActorRepository: ReviewActorRepository,
    private readonly resolveSessionReviewEligibility: ResolveSessionReviewEligibilityService,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: { userId: string; query: ListPendingPatientReviewsDto }) {
    const patient = await this.reviewActorRepository.findPatientProfileByUserId(
      input.userId,
    );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.patientProfileNotFound',
        error: 'REVIEW_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const [rows, totalItems] =
      await this.resolveSessionReviewEligibility.listEligibleSessionsForReview({
        patientId: patient.id,
        page: input.query.page,
        limit: input.query.limit,
      });

    return {
      items: rows.map((row) => this.reviewPresenter.presentPendingReviewItem(row)),
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.query.limit)),
      },
    };
  }
}
