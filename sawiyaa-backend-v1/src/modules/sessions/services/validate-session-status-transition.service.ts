import { BadRequestException, Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class ValidateSessionStatusTransitionService {
  private readonly allowedTransitions: Record<SessionStatus, SessionStatus[]> =
    {
      [SessionStatus.DRAFT]: [
        SessionStatus.PENDING_PAYMENT,
        SessionStatus.CANCELLED,
      ],
      [SessionStatus.PENDING_PAYMENT]: [
        SessionStatus.CONFIRMED,
        SessionStatus.CANCELLED,
        SessionStatus.EXPIRED,
      ],
      [SessionStatus.PENDING_PRACTITIONER_RESPONSE]: [
        SessionStatus.CONFIRMED,
        SessionStatus.CANCELLED,
        SessionStatus.EXPIRED,
      ],
      [SessionStatus.CONFIRMED]: [
        SessionStatus.UPCOMING,
        SessionStatus.CANCELLED,
        SessionStatus.EXPIRED,
        SessionStatus.REFUND_PENDING,
      ],
      [SessionStatus.UPCOMING]: [
        SessionStatus.READY_TO_JOIN,
        SessionStatus.IN_PROGRESS,
        SessionStatus.CANCELLED,
        SessionStatus.NO_SHOW,
        SessionStatus.REFUND_PENDING,
      ],
      [SessionStatus.READY_TO_JOIN]: [
        SessionStatus.IN_PROGRESS,
        SessionStatus.CANCELLED,
        SessionStatus.NO_SHOW,
        SessionStatus.COMPLETED,
        SessionStatus.REFUND_PENDING,
      ],
      [SessionStatus.IN_PROGRESS]: [
        SessionStatus.COMPLETED,
        SessionStatus.NO_SHOW,
        SessionStatus.REFUND_PENDING,
      ],
      [SessionStatus.COMPLETED]: [SessionStatus.REFUND_PENDING],
      [SessionStatus.CANCELLED]: [SessionStatus.REFUND_PENDING],
      [SessionStatus.NO_SHOW]: [SessionStatus.REFUND_PENDING],
      [SessionStatus.EXPIRED]: [],
      [SessionStatus.REFUND_PENDING]: [SessionStatus.REFUNDED],
      [SessionStatus.REFUNDED]: [],
    };

  assertCanTransition(from: SessionStatus, to: SessionStatus): void {
    if (from === to) {
      return;
    }

    if (!this.allowedTransitions[from]?.includes(to)) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidStatusTransition',
        error: 'SESSION_INVALID_STATUS_TRANSITION',
        messageParams: {
          from,
          to,
        },
      });
    }
  }
}
