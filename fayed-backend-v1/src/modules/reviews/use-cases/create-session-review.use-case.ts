import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SessionReviewStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateSessionReviewDto } from '../dto/create-session-review.dto';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { ValidateSessionReviewEligibilityService } from '../services/validate-session-review-eligibility.service';
import { UpdatePractitionerRatingSummaryService } from '../services/update-practitioner-rating-summary.service';
import { REVIEW_SUBMIT_INITIAL_STATUS } from '../types/reviews.types';

@Injectable()
export class CreateSessionReviewUseCase {
  private readonly logger = new Logger(CreateSessionReviewUseCase.name);

  constructor(
    private readonly reviewActorRepository: ReviewActorRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly validateSessionReviewEligibilityService: ValidateSessionReviewEligibilityService,
    private readonly updatePractitionerRatingSummaryService: UpdatePractitionerRatingSummaryService,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    payload: CreateSessionReviewDto;
  }) {
    const patient = await this.reviewActorRepository.findPatientProfileByUserId(
      input.userId,
    );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.patientProfileNotFound',
        error: 'REVIEW_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const existing = await this.reviewRepository.findBySessionId(
      input.sessionId,
    );
    if (existing) {
      throw new ConflictException({
        messageKey: 'reviews.errors.reviewAlreadyExists',
        error: 'REVIEW_ALREADY_EXISTS_FOR_SESSION',
      });
    }

    const session =
      await this.validateSessionReviewEligibilityService.assertEligible({
        sessionId: input.sessionId,
        patientId: patient.id,
      });

    const now = new Date();
    try {
      const created = await this.reviewRepository.withTransaction(
        async (tx) => {
          const row = await this.reviewRepository.createReview(
            {
              sessionId: session.id,
              patientId: patient.id,
              practitionerId: session.practitionerId,
              ratingValue: input.payload.overallRating,
              reviewTitle: input.payload.title?.trim() || null,
              reviewText: input.payload.textReview?.trim() || null,
              reviewStatus: REVIEW_SUBMIT_INITIAL_STATUS,
              submittedAt: now,
            },
            tx,
          );

          await this.updatePractitionerRatingSummaryService.execute({
            practitionerId: session.practitionerId,
            tx,
          });

          return row;
        },
      );

      this.logger.log(
        `Session review submitted (review=${created.id}, session=${input.sessionId}, status=${SessionReviewStatus.PENDING_MODERATION})`,
      );

      return {
        item: this.reviewPresenter.presentPatientReviewItem(created),
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey: 'reviews.errors.reviewAlreadyExists',
          error: 'REVIEW_ALREADY_EXISTS_FOR_SESSION',
        });
      }
      throw error;
    }
  }
}
