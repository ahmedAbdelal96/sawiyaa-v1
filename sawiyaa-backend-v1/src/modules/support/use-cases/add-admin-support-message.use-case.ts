import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AddSupportMessageDto } from '../dto/add-support-message.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { MessagingUseCase } from '@modules/messaging/use-cases/messaging.use-case';

@Injectable()
export class AddAdminSupportMessageUseCase {
  private readonly logger = new Logger(AddAdminSupportMessageUseCase.name);

  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportPresenter: SupportPresenter,
    private readonly messagingUseCase: MessagingUseCase,
  ) {}

  async execute(input: {
    userId: string;
    roles: AppRole[];
    ticketId: string;
    payload: AddSupportMessageDto;
  }) {
    const ticket = await this.supportTicketRepository.findByIdForAdmin(
      input.ticketId,
    );
    if (!ticket) {
      throw new NotFoundException({
        messageKey: 'support.errors.ticketNotFound',
        error: 'SUPPORT_TICKET_NOT_FOUND',
      });
    }

    const updated = await this.messagingUseCase
      .sendMessage(
        { id: input.userId, roles: input.roles },
        ticket.conversationId,
        input.payload.message,
      )
      .then(() => this.supportTicketRepository.findByIdForAdmin(input.ticketId));

    if (!updated) {
      throw new NotFoundException({ messageKey: 'support.errors.ticketNotFound', error: 'SUPPORT_TICKET_NOT_FOUND' });
    }

    this.logger.log(
      `Support message added by admin/support (ticket=${ticket.id}, user=${input.userId})`,
    );

    return {
      item: this.supportPresenter.presentAdminTicketDetails(updated),
    };
  }
}
