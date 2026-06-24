import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  buildGeneralChatParticipantDirectoryMap,
  buildGeneralChatParticipantSummary,
} from '../helpers/general-chat-identity.mapper';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';

@Injectable()
export class GetMyGeneralChatConversationDetailUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly conversationAccessPolicy: ConversationAccessPolicy,
    private readonly generalChatAvailabilityService: GeneralChatAvailabilityService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
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

    const viewerParticipant = conversation.participants.find(
      (participant) => participant.userId === input.authenticatedUser.id,
    )!;

    const latestMessage = conversation.messages[0] ?? null;
    const latestActivityAt = latestMessage
      ? latestMessage.sentAt
      : conversation.updatedAt;
    const unreadCount =
      await this.generalChatRepository.countUnreadMessagesForParticipant({
        conversationId: input.conversationId,
        userId: input.authenticatedUser.id,
        lastReadAt: viewerParticipant.lastReadAt,
      });

    const participantDirectoryRecords =
      (await this.generalChatRepository.loadParticipantIdentityRecords?.(
        conversation.participants.map((participant) => participant.userId),
      )) ?? [];
    const participantDirectory = buildGeneralChatParticipantDirectoryMap(
      participantDirectoryRecords,
    );
    const participantSummaries = conversation.participants.map((participant) =>
      buildGeneralChatParticipantSummary(participant, participantDirectory),
    );
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

    return {
      item: {
        conversationId: conversation.id,
        conversationRef: conversation.conversationRef ?? '',
        status: conversation.status,
        linkedSessionId: conversation.sessionId,
        participants: participantSummaries,
        createdAt: conversation.createdAt.toISOString(),
        latestActivityAt: latestActivityAt.toISOString(),
        latestMessage: latestMessage
          ? {
              messageId: latestMessage.id,
              senderUserId: latestMessage.senderUserId,
              messageType: latestMessage.messageType,
              previewText: latestMessage.contentText,
              sentAt: latestMessage.sentAt.toISOString(),
              senderIdentity: latestMessage.senderUserId
                ? (participantSummaries.find(
                    (participant) =>
                      participant.userId === latestMessage.senderUserId,
                  )?.identity ?? null)
                : null,
            }
          : null,
        hasMessages: Boolean(latestMessage),
        unreadCount,
        hasUnread: unreadCount > 0,
        lastReadMessageId: viewerParticipant.lastReadMessageId,
        lastReadAt: viewerParticipant.lastReadAt
          ? viewerParticipant.lastReadAt.toISOString()
          : null,
        chatAvailability,
      },
    };
  }
}
