import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AddSupportMessageDto } from '../dto/add-support-message.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { ResolveSupportAdminActorRoleService } from '../services/resolve-support-admin-actor-role.service';

@Injectable()
export class AddAdminSupportNoteUseCase {
  private readonly logger = new Logger(AddAdminSupportNoteUseCase.name);

  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly resolveSupportAdminActorRoleService: ResolveSupportAdminActorRoleService,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: {
    userId: string;
    roles: AppRole[];
    ticketId: string;
    payload: AddSupportMessageDto;
  }) {
    const ticket = await this.supportTicketRepository.findByIdForAdmin(input.ticketId);
    if (!ticket) {
      throw new NotFoundException({
        messageKey: 'support.errors.ticketNotFound',
        error: 'SUPPORT_TICKET_NOT_FOUND',
      });
    }

    const actorRole = this.resolveSupportAdminActorRoleService.resolve(input.roles);
    const updated = await this.supportTicketRepository.addInternalNote({
      ticketId: input.ticketId,
      actorUserId: input.userId,
      actorRole,
      note: input.payload.message.trim(),
    });

    this.logger.log(
      `Support internal note added (ticket=${ticket.id}, user=${input.userId})`,
    );

    return {
      item: this.supportPresenter.presentAdminTicketDetails(updated),
    };
  }
}
