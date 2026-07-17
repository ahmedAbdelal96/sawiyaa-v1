import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  SessionReviewModerationDecision,
  SessionReviewStatus,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateSessionReviewDto } from '../dto/create-session-review.dto';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { ValidateSessionReviewEligibilityService } from '../services/validate-session-review-eligibility.service';
import {
  REVIEW_AUTO_PUBLISH_MIN_RATING,
  REVIEW_SUBMIT_INITIAL_STATUS,
} from '../types/reviews.types';

@Injectable()
export class CreateSessionReviewUseCase {
  private readonly logger = new Logger(CreateSessionReviewUseCase.name);

  constructor(
    private readonly reviewActorRepository: ReviewActorRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly validateSessionReviewEligibilityService: ValidateSessionReviewEligibilityService,
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
    const shouldAutoPublish =
      input.payload.overallRating >= REVIEW_AUTO_PUBLISH_MIN_RATING;
    const reviewStatus = shouldAutoPublish
      ? SessionReviewStatus.PUBLISHED
      : REVIEW_SUBMIT_INITIAL_STATUS;

    try {
      const created = await this.reviewRepository.withTransaction(
        async (tx) => {
          const row = await this.reviewRepository.createReview(
            {
              sessionId: session.id,
              patientId: patient.id,
              practitionerId: session.practitionerId,
              ratingValue: input.payload.overallRating,
              publicRatingValue: shouldAutoPublish
                ? input.payload.overallRating
                : null,
              reviewTitle: input.payload.title?.trim() || null,
              reviewText: input.payload.textReview?.trim() || null,
              reviewStatus,
              moderationDecision: shouldAutoPublish
                ? SessionReviewModerationDecision.AUTO_APPROVED_POSITIVE
                : null,
              moderatedByUserId: null,
              moderatedAt: shouldAutoPublish ? now : null,
              moderationReason: null,
              countsInPublicAverage: shouldAutoPublish,
              publishedAt: shouldAutoPublish ? now : null,
              submittedAt: now,
            },
            tx,
          );

          return row;
        },
      );

      this.logger.log(
        `Session review submitted (review=${created.id}, session=${input.sessionId}, status=${reviewStatus})`,
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
