import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { ReviewSessionRepository } from '../repositories/review-session.repository';
import { ResolveSessionReviewEligibilityService } from './resolve-session-review-eligibility.service';

@Injectable()
export class ValidateSessionReviewEligibilityService {
  constructor(
    private readonly reviewSessionRepository: ReviewSessionRepository,
    private readonly resolveSessionReviewEligibility: ResolveSessionReviewEligibilityService,
  ) {}

  async assertEligible(input: { sessionId: string; patientId: string }) {
    const session =
      await this.reviewSessionRepository.findOwnedSessionForReview(
        input.sessionId,
        input.patientId,
      );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'reviews.errors.sessionNotFoundForPatient',
        error: 'REVIEW_SESSION_NOT_FOUND_FOR_PATIENT',
      });
    }

    const eligibility = await this.resolveSessionReviewEligibility.resolveMany([
      input.sessionId,
    ]);
    const decision = eligibility.get(input.sessionId);
    if (!decision?.isEffectivelyCompleted) {
      throw new BadRequestException({
        messageKey: 'reviews.errors.sessionNotCompleted',
        error: 'REVIEW_SESSION_NOT_COMPLETED',
        messageParams: {
          currentStatus: session.status,
          requiredStatus: SessionStatus.COMPLETED,
        },
      });
    }

    if (!decision.hasValidSource) {
      throw new BadRequestException({
        messageKey: 'reviews.errors.sessionNotPaid',
        error: 'REVIEW_SESSION_NOT_PAID',
      });
    }

    return session;
  }
}
