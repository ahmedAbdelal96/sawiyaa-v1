import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { ReviewSessionRepository } from '../repositories/review-session.repository';

@Injectable()
export class ValidateSessionReviewEligibilityService {
  constructor(
    private readonly reviewSessionRepository: ReviewSessionRepository,
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

    if (!this.reviewSessionRepository.isSessionCompleted(session.status)) {
      throw new BadRequestException({
        messageKey: 'reviews.errors.sessionNotCompleted',
        error: 'REVIEW_SESSION_NOT_COMPLETED',
        messageParams: {
          currentStatus: session.status,
          requiredStatus: SessionStatus.COMPLETED,
        },
      });
    }

    const capturedCount =
      await this.reviewSessionRepository.hasCapturedPaymentForSession(
        input.sessionId,
        input.patientId,
      );
    if (capturedCount < 1) {
      throw new BadRequestException({
        messageKey: 'reviews.errors.sessionNotPaid',
        error: 'REVIEW_SESSION_NOT_PAID',
      });
    }

    return session;
  }
}
