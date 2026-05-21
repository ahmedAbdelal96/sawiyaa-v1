import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationParticipantRole } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';
import { SendGeneralChatMessageDto } from '../dto/send-general-chat-message.dto';
import {
  buildGeneralChatParticipantIdentity,
  buildGeneralChatParticipantDirectoryMap,
} from '../helpers/general-chat-identity.mapper';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { ValidateGeneralChatMessagePayloadService } from '../services/validate-general-chat-message-payload.service';

@Injectable()
export class SendGeneralChatMessageUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly generalChatModerationStateService: GeneralChatModerationStateService,
    private readonly validateGeneralChatMessagePayloadService: ValidateGeneralChatMessagePayloadService,
    private readonly conversationAccessPolicy: ConversationAccessPolicy,
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

    this.conversationAccessPolicy.assertParticipant({
      participants: conversation.participants,
      requesterId: input.authenticatedUser.id,
    });

    const moderationState =
      this.generalChatModerationStateService.resolveConversationState({
        status: conversation.status,
        closedAt: conversation.closedAt ?? null,
        adminLock: {
          disabledAt: conversation.adminSendingDisabledAt ?? null,
          disabledByUserId: conversation.adminSendingDisabledByUserId ?? null,
          disabledReason: conversation.adminSendingDisabledReason ?? null,
          enabledAt: conversation.adminSendingEnabledAt ?? null,
          enabledByUserId: conversation.adminSendingEnabledByUserId ?? null,
        },
        practitionerLock: {
          disabledAt: conversation.practitionerSendingDisabledAt ?? null,
          disabledByUserId:
            conversation.practitionerSendingDisabledByUserId ?? null,
          disabledReason:
            conversation.practitionerSendingDisabledReason ?? null,
          enabledAt: conversation.practitionerSendingEnabledAt ?? null,
          enabledByUserId:
            conversation.practitionerSendingEnabledByUserId ?? null,
        },
      });

    if (!moderationState.canSendMessage) {
      throw new BadRequestException({
        messageKey: 'chat.errors.conversationNotSendable',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationNotSendable,
      });
    }

    const normalized = this.validateGeneralChatMessagePayloadService.normalize(
      input.dto,
    );

    const now = new Date();
    const senderIdentityRecord =
      (await this.generalChatRepository.loadParticipantIdentityRecord?.(
        input.authenticatedUser.id,
      )) ?? null;
    const senderIdentity = senderIdentityRecord
      ? buildGeneralChatParticipantIdentity(
          {
            userId: senderIdentityRecord.id,
            participantRole:
              conversation.participants.find(
                (participant) =>
                  participant.userId === input.authenticatedUser.id,
              )?.participantRole ?? ConversationParticipantRole.PATIENT,
          },
          buildGeneralChatParticipantDirectoryMap([senderIdentityRecord]),
        )
      : null;

    const persisted =
      await this.generalChatRepository.appendMessageInGeneralConversation({
        conversationId: input.conversationId,
        senderUserId: input.authenticatedUser.id,
        contentText: normalized.contentText,
        attachments: normalized.attachments,
        sentAt: now,
      });

    return {
      item: {
        messageId: persisted.message.id,
        conversationId: persisted.message.conversationId,
        senderUserId: persisted.message.senderUserId,
        messageType: persisted.message.messageType,
        status: persisted.message.status,
        contentText: persisted.message.contentText,
        sentAt: persisted.message.sentAt.toISOString(),
        deliveredAt: persisted.message.deliveredAt?.toISOString() ?? null,
        readAt: persisted.message.readAt?.toISOString() ?? null,
        attachments: persisted.attachments.map((attachment) => ({
          fileId: this.extractFileId(attachment.storageProvider),
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize ?? null,
          originalName: attachment.originalName ?? null,
        })),
        conversationLatestActivityAt:
          persisted.conversationLatestActivityAt.toISOString(),
        senderIdentity,
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
