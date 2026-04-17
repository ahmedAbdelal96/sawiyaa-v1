import { ConflictException, Injectable } from '@nestjs/common';
import { SupportTicketStatus } from '@prisma/client';

@Injectable()
export class ValidateSupportTicketStatusTransitionService {
  private readonly allowedTransitions: Record<
    SupportTicketStatus,
    SupportTicketStatus[]
  > = {
    [SupportTicketStatus.OPEN]: [
      SupportTicketStatus.IN_PROGRESS,
      SupportTicketStatus.WAITING_FOR_USER,
      SupportTicketStatus.ESCALATED,
      SupportTicketStatus.RESOLVED,
      SupportTicketStatus.CLOSED,
    ],
    [SupportTicketStatus.IN_PROGRESS]: [
      SupportTicketStatus.WAITING_FOR_USER,
      SupportTicketStatus.ESCALATED,
      SupportTicketStatus.RESOLVED,
      SupportTicketStatus.CLOSED,
    ],
    [SupportTicketStatus.WAITING_FOR_USER]: [
      SupportTicketStatus.IN_PROGRESS,
      SupportTicketStatus.ESCALATED,
      SupportTicketStatus.RESOLVED,
      SupportTicketStatus.CLOSED,
    ],
    [SupportTicketStatus.ESCALATED]: [
      SupportTicketStatus.IN_PROGRESS,
      SupportTicketStatus.WAITING_FOR_USER,
      SupportTicketStatus.RESOLVED,
      SupportTicketStatus.CLOSED,
    ],
    [SupportTicketStatus.RESOLVED]: [
      SupportTicketStatus.IN_PROGRESS,
      SupportTicketStatus.CLOSED,
    ],
    [SupportTicketStatus.CLOSED]: [],
  };

  assertValid(input: {
    currentStatus: SupportTicketStatus;
    nextStatus: SupportTicketStatus;
  }) {
    if (input.currentStatus === input.nextStatus) {
      return;
    }

    const allowed = this.allowedTransitions[input.currentStatus] ?? [];
    if (!allowed.includes(input.nextStatus)) {
      throw new ConflictException({
        messageKey: 'support.errors.invalidStatusTransition',
        error: 'SUPPORT_INVALID_STATUS_TRANSITION',
      });
    }
  }
}
