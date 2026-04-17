import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS, GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';
import { SendGeneralChatMessageDto } from '../dto/send-general-chat-message.dto';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ValidateGeneralChatMessagePayloadService } from '../services/validate-general-chat-message-payload.service';

@Injectable()
export class SendGeneralChatMessageUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly validateGeneralChatMessagePayloadService: ValidateGeneralChatMessagePayloadService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
    dto: SendGeneralChatMessageDto;
  }) {
    const conversation =
      await this.generalChatRepository.findConversationByIdInGeneralScope(
        input.conversationId,
      );

    if (!conversation) {
      throw new NotFoundException({
        messageKey: 'chat.errors.conversationNotFound',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationNotFound,
      });
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === input.authenticatedUser.id,
    );
    if (!isParticipant) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.conversationAccessDenied',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationAccessDenied,
      });
    }

    const statusAllowed = GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS.includes(
      conversation.status as (typeof GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS)[number],
    );
    if (!statusAllowed) {
      throw new BadRequestException({
        messageKey: 'chat.errors.conversationNotSendable',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationNotSendable,
      });
    }

    const normalized = this.validateGeneralChatMessagePayloadService.normalize(
      input.dto,
    );

    const now = new Date();
    const persisted = await this.generalChatRepository.appendMessageInGeneralConversation(
      {
        conversationId: input.conversationId,
        senderUserId: input.authenticatedUser.id,
        contentText: normalized.contentText,
        attachments: normalized.attachments,
        sentAt: now,
      },
    );

    return {
      item: {
        messageId: persisted.message.id,
        conversationId: persisted.message.conversationId,
        senderUserId: persisted.message.senderUserId,
        messageType: persisted.message.messageType,
        contentText: persisted.message.contentText,
        sentAt: persisted.message.sentAt.toISOString(),
        attachments: persisted.attachments.map((attachment) => ({
          fileId: this.extractFileId(attachment.storageProvider),
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize ?? null,
          originalName: attachment.originalName ?? null,
        })),
        conversationLatestActivityAt:
          persisted.conversationLatestActivityAt.toISOString(),
      },
    };
  }

  private extractFileId(storageProvider: string | null): string {
    if (!storageProvider) {
      return '';
    }

    if (storageProvider.startsWith('ref:')) {
      return storageProvider.slice(4);
    }

    return storageProvider;
  }
}

