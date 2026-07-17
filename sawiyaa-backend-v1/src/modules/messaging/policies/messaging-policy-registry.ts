import { ForbiddenException, Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { ConversationType, SessionStatus } from '@prisma/client';
import {
  MessagingActor,
  MessagingConversationRecord,
  MessagingSendDisabledReason,
  MessagingPublicConversationType,
  toPublicMessagingType,
} from '../types/messaging.types';

const ADMIN_LIKE_ROLES = [AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.SUPPORT_AGENT];

@Injectable()
export class MessagingPolicyRegistry {
  assertCanView(conversation: MessagingConversationRecord, actor: MessagingActor) {
    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === actor.id,
    );
    const isSupportStaff =
      conversation.conversationType === ConversationType.SUPPORT &&
      actor.roles.some((role) => ADMIN_LIKE_ROLES.includes(role));

    if (!isParticipant && !isSupportStaff) {
      throw new ForbiddenException({
        messageKey: 'messages.errors.conversationAccessDenied',
        errorCode: 'MESSAGING_CONVERSATION_ACCESS_DENIED',
      });
    }
  }

  canSend(
    conversation: MessagingConversationRecord,
    actor: MessagingActor,
  ): { allowed: true } | { allowed: false; reason: MessagingSendDisabledReason } {
    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === actor.id,
    );
    const isSupportStaff =
      conversation.conversationType === ConversationType.SUPPORT &&
      actor.roles.some((role) => ADMIN_LIKE_ROLES.includes(role));

    if (!isParticipant && !isSupportStaff) {
      return { allowed: false, reason: 'NOT_PARTICIPANT' };
    }

    if (conversation.conversationType === ConversationType.SUPPORT) {
      const closedConversation = ['CLOSED', 'EXPIRED', 'SUSPENDED'].includes(
        conversation.status,
      );
      if (conversation.supportTicket?.status === 'RESOLVED') {
        return { allowed: false, reason: 'SUPPORT_TICKET_RESOLVED' };
      }
      const closedTicket = conversation.supportTicket?.status === 'CLOSED';
      return closedConversation || closedTicket
        ? { allowed: false, reason: 'SUPPORT_CONVERSATION_CLOSED' }
        : { allowed: true };
    }

    if (conversation.conversationType === ConversationType.CARE_APPROVED) {
      const careExpired = Boolean(
        conversation.chatApprovalRequest?.expiresAt &&
          conversation.chatApprovalRequest.expiresAt.getTime() <= Date.now(),
      );
      return conversation.status === 'OPEN' &&
        conversation.chatApprovalRequest?.status === 'APPROVED' &&
        !careExpired
        ? { allowed: true }
        : { allowed: false, reason: 'CARE_NOT_APPROVED' };
    }

    const sessionStatus = conversation.session?.status as SessionStatus | undefined;
    const moderationLocked =
      this.isLockActive(
        conversation.adminSendingDisabledAt,
        conversation.adminSendingEnabledAt,
      ) ||
      this.isLockActive(
        conversation.practitionerSendingDisabledAt,
        conversation.practitionerSendingEnabledAt,
      );
    const sessionIsSendable =
      sessionStatus === SessionStatus.READY_TO_JOIN ||
      sessionStatus === SessionStatus.IN_PROGRESS;
    if (moderationLocked) {
      return { allowed: false, reason: 'MODERATION_LOCKED' };
    }
    if (!conversation.session) {
      return conversation.status === 'OPEN'
        ? { allowed: true }
        : { allowed: false, reason: 'SESSION_NOT_SENDABLE' };
    }
    return sessionIsSendable && conversation.status === 'OPEN'
      ? { allowed: true }
      : { allowed: false, reason: 'SESSION_NOT_SENDABLE' };
  }

  private isLockActive(disabledAt: Date | null, enabledAt: Date | null) {
    return Boolean(disabledAt && (!enabledAt || enabledAt < disabledAt));
  }

  getPublicType(conversation: MessagingConversationRecord): MessagingPublicConversationType {
    return toPublicMessagingType(conversation.conversationType);
  }
}
