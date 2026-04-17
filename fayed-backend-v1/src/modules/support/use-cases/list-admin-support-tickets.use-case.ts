import { Injectable } from '@nestjs/common';
import { ListSupportTicketsDto } from '../dto/list-support-tickets.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';

@Injectable()
export class ListAdminSupportTicketsUseCase {
  constructor(
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: { userId: string; query: ListSupportTicketsDto }) {
    const [items, totalItems] = await this.supportTicketRepository.listForAdmin({
      userId: input.userId,
      page: input.query.page,
      limit: input.query.limit,
      status: input.query.status,
      category: input.query.category,
      priority: input.query.priority,
      assignedToMe: input.query.assignedToMe,
    });

    return this.supportPresenter.presentTicketList({
      items,
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.query.limit)),
      },
    });
  }
}
