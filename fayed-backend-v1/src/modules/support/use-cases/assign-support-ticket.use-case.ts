import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AssignSupportTicketDto } from '../dto/assign-support-ticket.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { ResolveSupportAdminActorRoleService } from '../services/resolve-support-admin-actor-role.service';

@Injectable()
export class AssignSupportTicketUseCase {
  private readonly logger = new Logger(AssignSupportTicketUseCase.name);

  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportActorRepository: SupportActorRepository,
    private readonly resolveSupportAdminActorRoleService: ResolveSupportAdminActorRoleService,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: {
    userId: string;
    roles: AppRole[];
    ticketId: string;
    payload: AssignSupportTicketDto;
  }) {
    const ticket = await this.supportTicketRepository.findByIdForAdmin(input.ticketId);
    if (!ticket) {
      throw new NotFoundException({
        messageKey: 'support.errors.ticketNotFound',
        error: 'SUPPORT_TICKET_NOT_FOUND',
      });
    }

    if (input.payload.assignedAdminUserId) {
      const assignableCount = await this.supportActorRepository.isSupportAssignableUser(
        input.payload.assignedAdminUserId,
      );
      if (assignableCount === 0) {
        throw new BadRequestException({
          messageKey: 'support.errors.invalidAssignedUser',
          error: 'SUPPORT_INVALID_ASSIGNED_USER',
        });
      }
    }

    const actorRole = this.resolveSupportAdminActorRoleService.resolve(input.roles);
    const updated = await this.supportTicketRepository.assignTicket({
      ticketId: input.ticketId,
      assignedToUserId: input.payload.assignedAdminUserId ?? null,
      actorUserId: input.userId,
      actorRole,
    });

    this.logger.log(
      `Support ticket assignment updated (ticket=${ticket.id}, assignedTo=${input.payload.assignedAdminUserId ?? 'null'})`,
    );

    return {
      item: this.supportPresenter.presentAdminTicketDetails(updated),
    };
  }
}
