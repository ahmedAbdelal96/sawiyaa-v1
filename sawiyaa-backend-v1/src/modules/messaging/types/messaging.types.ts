import { AppRole } from '@common/enums/app-role.enum';
import {
  ConversationParticipantRole,
  ConversationType,
  MessageStatus,
  MessageType,
} from '@prisma/client';

export type MessagingPublicConversationType = 'SESSION' | 'CARE' | 'SUPPORT';

export type MessagingActor = {
  id: string;
  roles: AppRole[];
};

export type MessagingSendDisabledReason =
  | 'CONVERSATION_CLOSED'
  | 'SESSION_NOT_SENDABLE'
  | 'MODERATION_LOCKED'
  | 'CARE_NOT_APPROVED'
  | 'SUPPORT_CONVERSATION_CLOSED'
  | 'SUPPORT_TICKET_RESOLVED'
  | 'NOT_PARTICIPANT';

export type MessagingConversationRecord = {
  id: string;
  conversationType: ConversationType;
  status: string;
  sessionId: string | null;
  supportTicketId: string | null;
  supportTicket: { status: string; subject: string } | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  expiresAt: Date | null;
  adminSendingDisabledAt: Date | null;
  adminSendingEnabledAt: Date | null;
  practitionerSendingDisabledAt: Date | null;
  practitionerSendingEnabledAt: Date | null;
  participants: Array<{
    userId: string;
    participantRole: ConversationParticipantRole;
    lastReadMessageId: string | null;
    lastReadAt: Date | null;
  }>;
  messages: Array<{
    id: string;
    senderUserId: string | null;
    messageType: MessageType;
    status: MessageStatus;
    contentText: string | null;
    sentAt: Date;
    deliveredAt: Date | null;
    readAt: Date | null;
  }>;
  session: { status: string } | null;
  chatApprovalRequest: { status: string; expiresAt: Date | null } | null;
};

export function toPublicMessagingType(
  value: ConversationType,
): MessagingPublicConversationType {
  if (value === ConversationType.SYSTEM) return 'SESSION';
  if (value === ConversationType.CARE_APPROVED) return 'CARE';
  return 'SUPPORT';
}

export type MessagingParticipantIdentity = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  publicRoleLabel: 'Patient' | 'Practitioner' | 'Support team' | 'Admin' | 'System';
};
