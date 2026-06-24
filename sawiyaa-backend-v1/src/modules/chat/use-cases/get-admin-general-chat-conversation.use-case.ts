import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';

@Injectable()
export class GetAdminGeneralChatConversationUseCase {
  constructor(
    private readonly adminGeneralChatRepository: AdminGeneralChatRepository,
    private readonly generalChatModerationStateService: GeneralChatModerationStateService,
  ) {}

  async execute(input: { conversationId: string }) {
    const conversation = await this.adminGeneralChatRepository.findConversationById(
      input.conversationId,
    );

    if (!conversation) {
      throw new NotFoundException({
        messageKey: 'chat.errors.conversationNotFound',
        errorCode: 'GENERAL_CHAT_CONVERSATION_NOT_FOUND',
      });
    }

    const stats = await this.adminGeneralChatRepository.getConversationStats([
      conversation.id,
    ]);
    const participantStats = stats.get(conversation.id) ?? {
      messagesCount: 0,
      attachmentsCount: 0,
    };
    const latestMessage = conversation.messages[0] ?? null;
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

    return {
      item: {
        conversationId: conversation.id,
        conversationStatus: conversation.status,
        status: moderationState.status,
        canSendMessage: moderationState.canSendMessage,
        messagesCount: participantStats.messagesCount,
        attachmentsCount: participantStats.attachmentsCount,
        patient: {
          id: conversation.patient?.id ?? '',
          displayName:
            conversation.patient?.user.displayName ??
            conversation.patient?.displayName ??
            null,
          email: conversation.patient?.user.emails[0]?.email ?? null,
        },
        practitioner: {
          id: conversation.practitioner?.id ?? '',
          displayName:
            conversation.practitioner?.user.displayName ?? null,
          email: conversation.practitioner?.user.emails[0]?.email ?? null,
        },
        session: {
          sessionId: conversation.session?.id ?? conversation.sessionId ?? '',
          sessionCode: conversation.session?.sessionCode ?? '',
          sessionDateTime:
            conversation.session?.scheduledStartAt?.toISOString() ??
            conversation.session?.createdAt?.toISOString() ??
            null,
          status: conversation.session?.status ?? conversation.status,
        },
        moderationState: {
          status: moderationState.status,
          closedBy: moderationState.closedBy,
          closedAt: moderationState.closedAt?.toISOString() ?? null,
          closeReason: moderationState.closeReason,
        },
        adminLockState: {
          isActive: moderationState.adminLockState.isActive,
          disabledAt:
            moderationState.adminLockState.disabledAt?.toISOString() ?? null,
          disabledByUserId: moderationState.adminLockState.disabledByUserId,
          disabledReason: moderationState.adminLockState.disabledReason,
          enabledAt:
            moderationState.adminLockState.enabledAt?.toISOString() ?? null,
          enabledByUserId: moderationState.adminLockState.enabledByUserId,
        },
        practitionerLockState: {
          isActive: moderationState.practitionerLockState.isActive,
          disabledAt:
            moderationState.practitionerLockState.disabledAt?.toISOString() ??
            null,
          disabledByUserId:
            moderationState.practitionerLockState.disabledByUserId,
          disabledReason:
            moderationState.practitionerLockState.disabledReason,
          enabledAt:
            moderationState.practitionerLockState.enabledAt?.toISOString() ??
            null,
          enabledByUserId:
            moderationState.practitionerLockState.enabledByUserId,
        },
        lastMessageAt: latestMessage?.sentAt.toISOString() ?? null,
        lastMessagePreviewType:
          this.generalChatModerationStateService.resolveMessagePreviewType(
            latestMessage
              ? {
                  contentText: latestMessage.contentText,
                  attachments: latestMessage.attachments,
                }
              : null,
          ),
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
    };
  }
}
