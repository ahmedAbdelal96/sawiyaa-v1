import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';

@Injectable()
export class GetAdminSupportTicketUseCase {
  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: { ticketId: string }) {
    const ticket = await this.supportTicketRepository.findByIdForAdmin(
      input.ticketId,
    );
    if (!ticket) {
      throw new NotFoundException({
        messageKey: 'support.errors.ticketNotFound',
        error: 'SUPPORT_TICKET_NOT_FOUND',
      });
    }

    return {
      item: this.supportPresenter.presentAdminTicketDetails(ticket),
    };
  }
}
