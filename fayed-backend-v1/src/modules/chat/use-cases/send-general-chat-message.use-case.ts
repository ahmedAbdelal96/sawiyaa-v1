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
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { ValidateGeneralChatMessagePayloadService } from '../services/validate-general-chat-message-payload.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { GENERAL_CHAT_AVAILABILITY_REASONS } from '../types/general-chat.types';

@Injectable()
export class SendGeneralChatMessageUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly generalChatAvailabilityService: GeneralChatAvailabilityService,
    private readonly validateGeneralChatMessagePayloadService: ValidateGeneralChatMessagePayloadService,
    private readonly conversationAccessPolicy: ConversationAccessPolicy,
    private readonly operationalNotificationService: OperationalNotificationService,
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

    const chatAvailability =
      this.generalChatAvailabilityService.resolveAvailability({
        conversation: {
          status: conversation.status,
          closedAt: conversation.closedAt,
          adminLock: {
            disabledAt: conversation.adminSendingDisabledAt,
            disabledByUserId: conversation.adminSendingDisabledByUserId,
            disabledReason: conversation.adminSendingDisabledReason,
            enabledAt: conversation.adminSendingEnabledAt,
            enabledByUserId: conversation.adminSendingEnabledByUserId,
          },
          practitionerLock: {
            disabledAt: conversation.practitionerSendingDisabledAt,
            disabledByUserId: conversation.practitionerSendingDisabledByUserId,
            disabledReason: conversation.practitionerSendingDisabledReason,
            enabledAt: conversation.practitionerSendingEnabledAt,
            enabledByUserId: conversation.practitionerSendingEnabledByUserId,
          },
        },
        linkedSession: conversation.session
          ? {
              status: conversation.session.status,
              sessionMode: conversation.session.sessionMode,
              scheduledStartAt: conversation.session.scheduledStartAt,
              scheduledEndAt: conversation.session.scheduledEndAt,
              provider: conversation.session.provider,
              providerRoomId: conversation.session.providerRoomId,
              providerSessionRef: conversation.session.providerSessionRef,
            }
          : null,
      });

    if (!chatAvailability.canSend) {
      const sessionReadOnlyReason =
        chatAvailability.reason ===
          GENERAL_CHAT_AVAILABILITY_REASONS.sessionEnded ||
        chatAvailability.reason ===
          GENERAL_CHAT_AVAILABILITY_REASONS.sessionCancelled ||
        chatAvailability.reason ===
          GENERAL_CHAT_AVAILABILITY_REASONS.sessionNotStarted;

      throw new BadRequestException({
        messageKey:
          sessionReadOnlyReason
            ? 'chat.errors.sessionChatReadOnly'
            : 'chat.errors.conversationNotSendable',
        errorCode:
          sessionReadOnlyReason
            ? GENERAL_CHAT_ERROR_CODES.sessionChatReadOnly
            : GENERAL_CHAT_ERROR_CODES.conversationNotSendable,
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

    await this.operationalNotificationService.notifyConversationMessage({
      lane: 'SESSION_CHAT',
      threadId: input.conversationId,
      messageId: persisted.message.id,
      senderUserId: input.authenticatedUser.id,
      participants: conversation.participants,
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
