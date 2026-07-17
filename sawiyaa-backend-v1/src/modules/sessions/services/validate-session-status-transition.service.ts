import { BadRequestException, Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class ValidateSessionStatusTransitionService {
  private readonly allowedTransitions: Record<SessionStatus, SessionStatus[]> = {
    [SessionStatus.DRAFT]: [
      SessionStatus.PENDING_PAYMENT,
      SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
      SessionStatus.CANCELLED,
    ],
    [SessionStatus.PENDING_PAYMENT]: [
      SessionStatus.UPCOMING,
      SessionStatus.CANCELLED,
      SessionStatus.EXPIRED,
    ],
    [SessionStatus.PENDING_PRACTITIONER_CONFIRMATION]: [
      SessionStatus.UPCOMING,
      SessionStatus.CANCELLED,
      SessionStatus.EXPIRED,
    ],
    [SessionStatus.UPCOMING]: [
      SessionStatus.READY_TO_JOIN,
      SessionStatus.IN_PROGRESS,
      SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      SessionStatus.CANCELLED,
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
    ],
    [SessionStatus.READY_TO_JOIN]: [
      SessionStatus.IN_PROGRESS,
      SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      SessionStatus.CANCELLED,
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
    ],
    [SessionStatus.IN_PROGRESS]: [
      SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      SessionStatus.COMPLETED,
      SessionStatus.CANCELLED,
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
    ],
    [SessionStatus.AWAITING_COMPLETION_CONFIRMATION]: [
      SessionStatus.COMPLETED,
      SessionStatus.CANCELLED,
      SessionStatus.PATIENT_NO_SHOW,
      SessionStatus.PRACTITIONER_NO_SHOW,
      SessionStatus.BOTH_NO_SHOW,
    ],
    [SessionStatus.COMPLETED]: [],
    [SessionStatus.CANCELLED]: [],
    [SessionStatus.PATIENT_NO_SHOW]: [],
    [SessionStatus.PRACTITIONER_NO_SHOW]: [],
    [SessionStatus.BOTH_NO_SHOW]: [],
    [SessionStatus.EXPIRED]: [],
  };

  assertCanTransition(from: SessionStatus, to: SessionStatus): void {
    if (from === to) return;
    if (!this.allowedTransitions[from]?.includes(to)) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.invalidStatusTransition',
        error: 'SESSION_INVALID_STATUS_TRANSITION',
        messageParams: { from, to },
      });
    }
  }
}
