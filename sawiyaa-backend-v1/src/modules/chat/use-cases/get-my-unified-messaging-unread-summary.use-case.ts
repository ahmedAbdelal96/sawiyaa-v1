import { Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CareChatConversationRepository } from '@modules/care-chat/repositories/care-chat-conversation.repository';
import { SupportTicketRepository } from '@modules/support/repositories/support-ticket.repository';
import { GeneralChatRepository } from '../repositories/general-chat.repository';

@Injectable()
export class GetMyUnifiedMessagingUnreadSummaryUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly careChatConversationRepository: CareChatConversationRepository,
  ) {}

  async execute(input: { authenticatedUser: AuthenticatedUser }) {
    const isAdminLike =
      input.authenticatedUser.roles.includes(AppRole.ADMIN) ||
      input.authenticatedUser.roles.includes(AppRole.SUPER_ADMIN) ||
      input.authenticatedUser.roles.includes(AppRole.SUPPORT_AGENT);

    const [session, support, practitioner] = await Promise.all([
      isAdminLike
        ? Promise.resolve({ unreadMessages: 0, unreadConversations: 0 })
        : this.generalChatRepository.countSessionUnreadForUser({
            userId: input.authenticatedUser.id,
          }),
      this.supportTicketRepository.countUnreadForUser({
        userId: input.authenticatedUser.id,
        adminLike: isAdminLike,
      }),
      isAdminLike
        ? Promise.resolve({ unreadMessages: 0, unreadConversations: 0 })
        : this.careChatConversationRepository.countUnreadForUser({
            userId: input.authenticatedUser.id,
          }),
    ]);

    return {
      item: {
        session,
        support,
        practitioner,
        totalUnreadMessages:
          session.unreadMessages +
          support.unreadMessages +
          practitioner.unreadMessages,
        totalUnreadConversations:
          session.unreadConversations +
          support.unreadConversations +
          practitioner.unreadConversations,
      },
    };
  }
}
