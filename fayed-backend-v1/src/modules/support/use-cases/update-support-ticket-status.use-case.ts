import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { UpdateSupportTicketStatusDto } from '../dto/update-support-ticket-status.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { ResolveSupportAdminActorRoleService } from '../services/resolve-support-admin-actor-role.service';
import { ValidateSupportTicketStatusTransitionService } from '../services/validate-support-ticket-status-transition.service';

@Injectable()
export class UpdateSupportTicketStatusUseCase {
  private readonly logger = new Logger(UpdateSupportTicketStatusUseCase.name);

  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly validateSupportTicketStatusTransitionService: ValidateSupportTicketStatusTransitionService,
    private readonly resolveSupportAdminActorRoleService: ResolveSupportAdminActorRoleService,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: {
    userId: string;
    roles: AppRole[];
    ticketId: string;
    payload: UpdateSupportTicketStatusDto;
  }) {
    const ticket = await this.supportTicketRepository.findByIdForAdmin(input.ticketId);
    if (!ticket) {
      throw new NotFoundException({
        messageKey: 'support.errors.ticketNotFound',
        error: 'SUPPORT_TICKET_NOT_FOUND',
      });
    }

    this.validateSupportTicketStatusTransitionService.assertValid({
      currentStatus: ticket.status,
      nextStatus: input.payload.status,
    });

    const actorRole = this.resolveSupportAdminActorRoleService.resolve(input.roles);
    const updated = await this.supportTicketRepository.updateStatus({
      ticketId: input.ticketId,
      status: input.payload.status,
      actorUserId: input.userId,
      actorRole,
    });

    this.logger.log(
      `Support ticket status changed (ticket=${ticket.id}, status=${ticket.status}->${input.payload.status})`,
    );

    return {
      item: this.supportPresenter.presentAdminTicketDetails(updated),
    };
  }
}
