import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationParticipantRole } from '@prisma/client';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';

@Injectable()
export class ListAdminGeneralChatMessagesUseCase {
  constructor(
    private readonly adminGeneralChatRepository: AdminGeneralChatRepository,
  ) {}

  async execute(input: { conversationId: string; page: number; limit: number }) {
    const conversation = await this.adminGeneralChatRepository.findConversationById(
      input.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException({
        messageKey: 'chat.errors.conversationNotFound',
        errorCode: 'GENERAL_CHAT_CONVERSATION_NOT_FOUND',
      });
    }

    const participantRoleByUserId = new Map<
      string,
      ConversationParticipantRole
    >(
      conversation.participants.map((participant) => [
        participant.userId,
        participant.participantRole,
      ]),
    );
    const participantNameByUserId = new Map<string, string | null>([
      [
        conversation.patient?.userId ?? '',
        conversation.patient?.user.displayName ??
          conversation.patient?.displayName ??
          null,
      ],
      [
        conversation.practitioner?.userId ?? '',
        conversation.practitioner?.user.displayName ??
          null,
      ],
    ]);

    const [messages, totalItems] = await this.adminGeneralChatRepository.listMessages(
      {
        conversationId: input.conversationId,
        page: input.page,
        limit: input.limit,
      },
    );

    return {
      items: messages.map((message) => {
        const senderRole = message.senderUserId
          ? participantRoleByUserId.get(message.senderUserId) ??
            ConversationParticipantRole.SYSTEM
          : ConversationParticipantRole.SYSTEM;
        const senderName = message.senderUserId
          ? participantNameByUserId.get(message.senderUserId) ?? null
          : null;

        return {
          messageId: message.id,
          senderRole,
          senderName,
          sentAt: message.sentAt.toISOString(),
          body: message.contentText ?? '',
          messageType: message.messageType,
          status: message.status,
          attachments: message.attachments.map((attachment) => {
            const fileId = this.adminGeneralChatRepository.extractAttachmentFileId(
              attachment.storageProvider,
              attachment.fileUrl,
            );
            return {
              fileId,
              fileUrl:
                `/api/v1/admin/chat/conversations/${input.conversationId}/attachments/${fileId}`,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize ?? null,
              originalName: attachment.originalName ?? null,
            };
          }),
          deletedAt: message.deletedAt?.toISOString() ?? null,
          editedAt: message.editedAt?.toISOString() ?? null,
        };
      }),
      pagination: {
        page: input.page,
        limit: input.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.limit)),
      },
    };
  }
}
