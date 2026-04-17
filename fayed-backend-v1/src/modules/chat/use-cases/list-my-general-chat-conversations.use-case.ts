import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListGeneralChatConversationsDto } from '../dto/list-general-chat-conversations.dto';
import { GeneralChatRepository } from '../repositories/general-chat.repository';

@Injectable()
export class ListMyGeneralChatConversationsUseCase {
  constructor(private readonly generalChatRepository: GeneralChatRepository) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    query: ListGeneralChatConversationsDto;
  }) {
    const [rows, totalItems] = await this.generalChatRepository.listOwnedConversations(
      {
        userId: input.authenticatedUser.id,
        page: input.query.page,
        limit: input.query.limit,
      },
    );

    const items = await Promise.all(
      rows.map(async (row) => {
        const latestMessage = row.messages[0] ?? null;
        const latestActivityAt = latestMessage
          ? latestMessage.sentAt
          : row.updatedAt;
        const viewerParticipant = row.participants.find(
          (participant) => participant.userId === input.authenticatedUser.id,
        );
        const lastReadAt = viewerParticipant?.lastReadAt ?? null;
        const unreadCount =
          await this.generalChatRepository.countUnreadMessagesForParticipant({
            conversationId: row.id,
            userId: input.authenticatedUser.id,
            lastReadAt,
          });

        return {
          conversationId: row.id,
          conversationRef: row.conversationRef ?? '',
          status: row.status,
          linkedSessionId: row.sessionId,
          participants: row.participants.map((participant) => ({
            userId: participant.userId,
            role: participant.participantRole,
          })),
          createdAt: row.createdAt.toISOString(),
          latestActivityAt: latestActivityAt.toISOString(),
          latestMessage: latestMessage
            ? {
                messageId: latestMessage.id,
                senderUserId: latestMessage.senderUserId,
                messageType: latestMessage.messageType,
                previewText: latestMessage.contentText,
                sentAt: latestMessage.sentAt.toISOString(),
              }
            : null,
          unreadCount,
          hasUnread: unreadCount > 0,
          lastReadMessageId: viewerParticipant?.lastReadMessageId ?? null,
          lastReadAt: lastReadAt ? lastReadAt.toISOString() : null,
        };
      }),
    );

    return {
      items,
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / input.query.limit),
      },
    };
  }
}
