import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListGeneralChatConversationsDto } from '../dto/list-general-chat-conversations.dto';
import {
  buildGeneralChatParticipantDirectoryMap,
  buildGeneralChatParticipantSummary,
} from '../helpers/general-chat-identity.mapper';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';

@Injectable()
export class ListMyGeneralChatConversationsUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly generalChatAvailabilityService: GeneralChatAvailabilityService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    query: ListGeneralChatConversationsDto;
  }) {
    const [rows, totalItems] =
      await this.generalChatRepository.listOwnedConversations({
        userId: input.authenticatedUser.id,
        page: input.query.page,
        limit: input.query.limit,
      });

    const participantUserIds = Array.from(
      new Set(
        rows.flatMap((row) =>
          row.participants.map((participant) => participant.userId),
        ),
      ),
    );
    const participantDirectoryRecords =
      (await this.generalChatRepository.loadParticipantIdentityRecords?.(
        participantUserIds,
      )) ?? [];
    const participantDirectory = buildGeneralChatParticipantDirectoryMap(
      participantDirectoryRecords,
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
            lastReadMessageId: viewerParticipant?.lastReadMessageId ?? null,
          });
        const participantSummaries = row.participants.map((participant) =>
          buildGeneralChatParticipantSummary(participant, participantDirectory),
        );
        const chatAvailability =
          this.generalChatAvailabilityService.resolveAvailability({
            conversation: {
              status: row.status,
              closedAt: row.closedAt,
              adminLock: {
                disabledAt: row.adminSendingDisabledAt,
                disabledByUserId: row.adminSendingDisabledByUserId,
                disabledReason: row.adminSendingDisabledReason,
                enabledAt: row.adminSendingEnabledAt,
                enabledByUserId: row.adminSendingEnabledByUserId,
              },
              practitionerLock: {
                disabledAt: row.practitionerSendingDisabledAt,
                disabledByUserId: row.practitionerSendingDisabledByUserId,
                disabledReason: row.practitionerSendingDisabledReason,
                enabledAt: row.practitionerSendingEnabledAt,
                enabledByUserId: row.practitionerSendingEnabledByUserId,
              },
            },
            linkedSession: row.session
              ? {
                  status: row.session.status,
                  sessionMode: row.session.sessionMode,
                  scheduledStartAt: row.session.scheduledStartAt,
                  scheduledEndAt: row.session.scheduledEndAt,
                  provider: row.session.provider,
                  providerRoomId: row.session.providerRoomId,
                  providerSessionRef: row.session.providerSessionRef,
                }
              : null,
          });

        return {
          conversationId: row.id,
          conversationRef: row.conversationRef ?? '',
          status: row.status,
          linkedSessionId: row.sessionId,
          participants: participantSummaries,
          createdAt: row.createdAt.toISOString(),
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
          unreadCount,
          hasUnread: unreadCount > 0,
          lastReadMessageId: viewerParticipant?.lastReadMessageId ?? null,
          lastReadAt: lastReadAt ? lastReadAt.toISOString() : null,
          chatAvailability,
        };
      }),
    );

    return {
      items,
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages:
          totalItems === 0 ? 0 : Math.ceil(totalItems / input.query.limit),
      },
    };
  }
}
