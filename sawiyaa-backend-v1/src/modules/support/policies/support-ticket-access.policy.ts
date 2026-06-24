import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SupportTicketAccessPolicy {
  assertPatientOwnership(input: {
    ticketPatientId: string | null;
    requesterPatientId: string;
  }) {
    if (
      !input.ticketPatientId ||
      input.ticketPatientId !== input.requesterPatientId
    ) {
      throw new ForbiddenException({
        messageKey: 'support.errors.ticketForbidden',
        error: 'SUPPORT_TICKET_FORBIDDEN',
      });
    }
  }

  assertPractitionerOwnership(input: {
    ticketPractitionerId: string | null;
    requesterPractitionerId: string;
  }) {
    if (
      !input.ticketPractitionerId ||
      input.ticketPractitionerId !== input.requesterPractitionerId
    ) {
      throw new ForbiddenException({
        messageKey: 'support.errors.ticketForbidden',
        error: 'SUPPORT_TICKET_FORBIDDEN',
      });
    }
  }
}
