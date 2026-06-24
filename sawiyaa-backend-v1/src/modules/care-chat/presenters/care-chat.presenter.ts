import { Injectable } from '@nestjs/common';
import { ConversationParticipantRole, MessageStatus } from '@prisma/client';
import { ResolveCareChatActivityStateService } from '../services/resolve-care-chat-activity-state.service';

@Injectable()
export class CareChatPresenter {
  constructor(
    private readonly resolveCareChatActivityStateService: ResolveCareChatActivityStateService,
  ) {}

  presentUserRequestItem(
    item: {
      id: string;
      status: import('@prisma/client').ChatApprovalStatus;
      requestReason: string | null;
      relatedSessionId: string | null;
      linkedConversationId: string | null;
      requestedAt: Date;
      reviewedAt: Date | null;
      approvedAt: Date | null;
      rejectedAt: Date | null;
      expiresAt: Date | null;
      revokedAt: Date | null;
      patient: { id: string; user: { displayName: string | null } };
      practitioner: { id: string; user: { displayName: string | null } };
    },
    unread?: { unreadCount: number; hasUnread: boolean },
  ) {
    return {
      id: item.id,
      status: item.status,
      reason: item.requestReason ?? null,
      relatedSessionId: item.relatedSessionId ?? null,
      linkedConversationId: item.linkedConversationId ?? null,
      requestedAt: item.requestedAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      approvedAt: item.approvedAt?.toISOString() ?? null,
      rejectedAt: item.rejectedAt?.toISOString() ?? null,
      expiresAt: item.expiresAt?.toISOString() ?? null,
      revokedAt: item.revokedAt?.toISOString() ?? null,
      patient: {
        id: item.patient.id,
        displayName: item.patient.user.displayName ?? null,
      },
      practitioner: {
        id: item.practitioner.id,
        displayName: item.practitioner.user.displayName ?? null,
      },
      unreadCount: unread?.unreadCount ?? 0,
      hasUnread: unread?.hasUnread ?? false,
    };
  }

  presentAdminRequestItem(item: {
    id: string;
    status: import('@prisma/client').ChatApprovalStatus;
    requestReason: string | null;
    internalReviewNote: string | null;
    relatedSessionId: string | null;
    linkedConversationId: string | null;
    requestedAt: Date;
    reviewedAt: Date | null;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    expiresAt: Date | null;
    revokedAt: Date | null;
    patient: { id: string; user: { displayName: string | null } };
    practitioner: { id: string; user: { displayName: string | null } };
  }) {
    return {
      ...this.presentUserRequestItem(item),
      internalReviewNote: item.internalReviewNote ?? null,
    };
  }

  presentRequestList(input: {
    items: Array<
      | ReturnType<CareChatPresenter['presentUserRequestItem']>
      | ReturnType<CareChatPresenter['presentAdminRequestItem']>
    >;
    page: number;
    limit: number;
    totalItems: number;
  }) {
    return {
      items: input.items,
      pagination: {
        page: input.page,
        limit: input.limit,
        totalItems: input.totalItems,
        totalPages: Math.max(1, Math.ceil(input.totalItems / input.limit)),
      },
    };
  }

  presentConversation(item: {
    id: string;
    status: import('@prisma/client').ConversationStatus;
    expiresAt: Date | null;
    closedAt: Date | null;
    sessionId: string | null;
    chatApprovalRequest: {
      id: string;
      status: import('@prisma/client').ChatApprovalStatus;
      expiresAt: Date | null;
      relatedSessionId: string | null;
    } | null;
    patient: { id: string; user: { displayName: string | null } } | null;
    practitioner: { id: string; user: { displayName: string | null } } | null;
    participants: Array<{
      userId: string;
      participantRole: ConversationParticipantRole;
    }>;
    messages: Array<{
      id: string;
      senderUserId: string | null;
      contentText: string | null;
      status: MessageStatus;
      sentAt: Date;
      deliveredAt: Date | null;
      readAt: Date | null;
    }>;
  }) {
    const participantRoleMap = new Map(
      item.participants.map((entry) => [entry.userId, entry.participantRole]),
    );
    const now = new Date();
    const resolvedExpiresAt =
      item.expiresAt ?? item.chatApprovalRequest?.expiresAt ?? null;
    const approvalStatus = item.chatApprovalRequest?.status ?? 'REVOKED';
    const activityState = this.resolveCareChatActivityStateService.resolve({
      conversationStatus: item.status,
      approvalStatus,
      expiresAt: resolvedExpiresAt,
      now,
    });

    return {
      id: item.id,
      status: item.status,
      activityState,
      canSendMessage: activityState === 'ACTIVE',
      linkedRequestId: item.chatApprovalRequest?.id ?? null,
      relatedSessionId:
        item.chatApprovalRequest?.relatedSessionId ?? item.sessionId ?? null,
      expiresAt: resolvedExpiresAt?.toISOString() ?? null,
      closedAt: item.closedAt?.toISOString() ?? null,
      patient: {
        id: item.patient?.id ?? '',
        displayName: item.patient?.user.displayName ?? null,
      },
      practitioner: {
        id: item.practitioner?.id ?? '',
        displayName: item.practitioner?.user.displayName ?? null,
      },
      messages: item.messages
        .map((message) => ({
          id: message.id,
          senderUserId: message.senderUserId ?? null,
          senderRole: message.senderUserId
            ? (participantRoleMap.get(message.senderUserId) ??
              ConversationParticipantRole.SYSTEM)
            : ConversationParticipantRole.SYSTEM,
          message: message.contentText ?? '',
          status: message.status,
          deliveredAt: message.deliveredAt?.toISOString() ?? null,
          createdAt: message.sentAt.toISOString(),
          readAt: message.readAt?.toISOString() ?? null,
        }))
        .filter((message) => Boolean(message.message.trim())),
    };
  }
}
