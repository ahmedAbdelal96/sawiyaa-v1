import { ConflictException } from '@nestjs/common';
import { SupportTicketStatus } from '@prisma/client';
import { ValidateSupportTicketStatusTransitionService } from './validate-support-ticket-status-transition.service';

describe('ValidateSupportTicketStatusTransitionService', () => {
  let service: ValidateSupportTicketStatusTransitionService;

  beforeEach(() => {
    service = new ValidateSupportTicketStatusTransitionService();
  });

  it('allows valid transitions', () => {
    expect(() =>
      service.assertValid({
        currentStatus: SupportTicketStatus.OPEN,
        nextStatus: SupportTicketStatus.IN_PROGRESS,
      }),
    ).not.toThrow();

    expect(() =>
      service.assertValid({
        currentStatus: SupportTicketStatus.RESOLVED,
        nextStatus: SupportTicketStatus.RESOLVED,
      }),
    ).not.toThrow();
  });

  it('rejects invalid transitions', () => {
    expect(() =>
      service.assertValid({
        currentStatus: SupportTicketStatus.CLOSED,
        nextStatus: SupportTicketStatus.IN_PROGRESS,
      }),
    ).toThrow(ConflictException);

    expect(() =>
      service.assertValid({
        currentStatus: SupportTicketStatus.RESOLVED,
        nextStatus: SupportTicketStatus.IN_PROGRESS,
      }),
    ).toThrow(ConflictException);
  });
});
