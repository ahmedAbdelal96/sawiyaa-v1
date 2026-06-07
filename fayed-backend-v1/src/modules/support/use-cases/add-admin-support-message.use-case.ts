import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AddSupportMessageDto } from '../dto/add-support-message.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { ResolveSupportAdminActorRoleService } from '../services/resolve-support-admin-actor-role.service';

@Injectable()
export class AddAdminSupportMessageUseCase {
  private readonly logger = new Logger(AddAdminSupportMessageUseCase.name);

  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly resolveSupportAdminActorRoleService: ResolveSupportAdminActorRoleService,
    private readonly supportPresenter: SupportPresenter,
    private readonly operationalNotificationService: OperationalNotificationService,
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

    const actorRole = this.resolveSupportAdminActorRoleService.resolve(
      input.roles,
    );
    const updated = await this.supportTicketRepository.addMessage({
      ticketId: input.ticketId,
      senderUserId: input.userId,
      senderRole: actorRole,
      message: input.payload.message.trim(),
    });

    const messageId =
      updated.conversation.messages[updated.conversation.messages.length - 1]
        ?.id;
    if (messageId) {
      await this.operationalNotificationService.notifyConversationMessage({
        lane: 'SUPPORT',
        threadId: input.ticketId,
        messageId,
        senderUserId: input.userId,
        participants: updated.conversation.participants,
      });
    }

    this.logger.log(
      `Support message added by admin/support (ticket=${ticket.id}, user=${input.userId})`,
    );

    return {
      item: this.supportPresenter.presentAdminTicketDetails(updated),
    };
  }
}
