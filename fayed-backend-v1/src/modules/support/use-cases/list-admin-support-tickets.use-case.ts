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
    const [items, totalItems] = await this.supportTicketRepository.listForAdmin(
      {
        userId: input.userId,
        page: input.query.page,
        limit: input.query.limit,
        status: input.query.status,
        category: input.query.category,
        priority: input.query.priority,
        assignedToMe: input.query.assignedToMe,
      },
    );

    const unreadByConversationId =
      await this.supportTicketRepository.countUnreadByConversationIdsForUser({
        userId: input.userId,
        conversationIds: items.map((item) => item.conversationId),
      });

    const unreadByTicketId = Object.fromEntries(
      items.map((item) => {
        const unreadCount =
          unreadByConversationId.get(item.conversationId) ?? 0;
        return [item.id, { unreadCount, hasUnread: unreadCount > 0 }];
      }),
    );

    return this.supportPresenter.presentTicketList({
      items,
      unreadByTicketId,
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.query.limit)),
      },
    });
  }
}
