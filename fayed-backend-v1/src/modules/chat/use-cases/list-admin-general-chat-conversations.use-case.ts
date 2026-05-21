import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { ListAdminGeneralChatConversationsDto } from '../dto/admin-general-chat-query.dto';

@Injectable()
export class ListAdminGeneralChatConversationsUseCase {
  constructor(
    private readonly adminGeneralChatRepository: AdminGeneralChatRepository,
    private readonly generalChatModerationStateService: GeneralChatModerationStateService,
  ) {}

  async execute(input: { query: ListAdminGeneralChatConversationsDto }) {
    const page = Math.max(1, input.query.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.query.limit ?? 20));
    const search = input.query.search?.trim();
    const baseWhere = this.adminGeneralChatRepository.buildSessionConversationWhere(
      {
        search,
        patientId: input.query.patientId,
        practitionerId: input.query.practitionerId,
        sessionId: input.query.sessionId,
        fromDate: input.query.fromDate,
        toDate: input.query.toDate,
        hasAttachmentsOnly: input.query.hasAttachmentsOnly,
      },
    );
    const statusWhere = this.adminGeneralChatRepository.buildStatusWhere(
      input.query.status,
    );
    const where =
      input.query.status && Object.keys(statusWhere).length > 0
        ? { AND: [baseWhere, statusWhere] }
        : baseWhere;

    const orderDirection = input.query.sortDirection ?? 'desc';
    const orderBy: Prisma.ConversationOrderByWithRelationInput[] =
      input.query.sortBy === 'sessionDateTime'
        ? [
            {
              session: {
                scheduledStartAt: orderDirection,
              },
            },
            { createdAt: orderDirection },
            { id: 'asc' },
          ]
        : input.query.sortBy === 'createdAt'
          ? [{ createdAt: orderDirection }, { id: 'asc' }]
          : input.query.sortBy === 'lastMessageAt'
            ? [{ updatedAt: orderDirection }, { id: 'asc' }]
            : [{ updatedAt: orderDirection }, { id: 'asc' }];

    const [rows, totalItems] = await this.adminGeneralChatRepository.listConversations(
      {
        where,
        page,
        limit,
        orderBy,
      },
    );

    const conversationIds = rows.map((row) => row.id);
    const stats =
      await this.adminGeneralChatRepository.getConversationStats(conversationIds);

    const items = rows.map((row) => {
      const latestMessage = row.messages[0] ?? null;
      const moderationState =
        this.generalChatModerationStateService.resolveConversationState({
          status: row.status,
          closedAt: row.closedAt ?? null,
          adminLock: {
            disabledAt: row.adminSendingDisabledAt ?? null,
            disabledByUserId: row.adminSendingDisabledByUserId ?? null,
            disabledReason: row.adminSendingDisabledReason ?? null,
            enabledAt: row.adminSendingEnabledAt ?? null,
            enabledByUserId: row.adminSendingEnabledByUserId ?? null,
          },
          practitionerLock: {
            disabledAt: row.practitionerSendingDisabledAt ?? null,
            disabledByUserId: row.practitionerSendingDisabledByUserId ?? null,
            disabledReason: row.practitionerSendingDisabledReason ?? null,
            enabledAt: row.practitionerSendingEnabledAt ?? null,
            enabledByUserId: row.practitionerSendingEnabledByUserId ?? null,
          },
        });
      const participantStats = stats.get(row.id) ?? {
        messagesCount: 0,
        attachmentsCount: 0,
      };

      return {
        conversationId: row.id,
        sessionId: row.session?.id ?? '',
        sessionCode: row.session?.sessionCode ?? '',
        patientName:
          row.patient?.user.displayName ??
          row.patient?.displayName ??
          null,
        patientEmail: row.patient?.user.emails[0]?.email ?? null,
        practitionerName:
          row.practitioner?.user.displayName ?? null,
        practitionerEmail: row.practitioner?.user.emails[0]?.email ?? null,
        sessionDateTime:
          row.session?.scheduledStartAt?.toISOString() ??
          row.session?.createdAt?.toISOString() ??
          null,
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
        messagesCount: participantStats.messagesCount,
        attachmentsCount: participantStats.attachmentsCount,
        status: moderationState.status,
        canSendMessage: moderationState.canSendMessage,
        closedBy: moderationState.closedBy,
        closedAt: moderationState.closedAt?.toISOString() ?? null,
        closeReason: moderationState.closeReason,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
