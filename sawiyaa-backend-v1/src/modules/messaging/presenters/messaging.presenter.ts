import { Injectable } from '@nestjs/common';
import { ConversationParticipantRole } from '@prisma/client';
import { MessagingConversationRecord, MessagingParticipantIdentity } from '../types/messaging.types';

@Injectable()
export class MessagingPresenter {
  presentConversation(input: {
    conversation: MessagingConversationRecord;
    actorId: string;
    participants: MessagingParticipantIdentity[];
    unreadCount: number;
    canSend: boolean;
    sendDisabledReason: string | null;
    publicType: string;
  }) {
    const latest = input.conversation.messages[0] ?? null;
    return {
      id: input.conversation.id,
      conversationId: input.conversation.id,
      supportTicketId: input.conversation.supportTicketId,
      type: input.publicType,
      title: input.publicType === 'SUPPORT'
        ? (input.conversation.supportTicket?.subject ?? 'Support')
        : input.publicType === 'CARE' ? 'Care chat' : 'Session chat',
      subject: input.publicType === 'SUPPORT'
        ? (input.conversation.supportTicket?.subject ?? null)
        : null,
      contextLabel: input.publicType === 'SESSION' ? 'Session' : input.publicType === 'CARE' ? 'Care request' : 'Support ticket',
      contextId: input.conversation.sessionId ?? input.conversation.supportTicketId ?? input.conversation.id,
      status: input.conversation.status,
      isResolved: input.publicType === 'SUPPORT' && input.conversation.supportTicket?.status === 'RESOLVED',
      isReadOnly: input.publicType === 'SUPPORT' && input.conversation.supportTicket?.status === 'RESOLVED',
      canSend: input.canSend,
      sendDisabledReason: input.sendDisabledReason,
      unreadCount: input.unreadCount,
      lastMessage: latest ? this.presentMessage(latest, input.participants) : null,
      participants: input.participants,
      otherParty: input.participants.find((participant) => participant.userId !== input.actorId) ?? null,
      supportQueueState: input.publicType === 'SUPPORT'
        ? this.resolveSupportQueueState(
            latest,
            input.conversation.status,
            input.conversation.supportTicket?.status ?? null,
            input.participants,
          )
        : null,
      createdAt: input.conversation.createdAt.toISOString(),
      updatedAt: input.conversation.updatedAt.toISOString(),
      lastActivityAt: input.conversation.updatedAt.toISOString(),
    };
  }

  presentMessage(message: MessagingConversationRecord['messages'][number], identities: MessagingParticipantIdentity[]) {
    return {
      id: message.id,
      conversationId: '',
      sender: identities.find((identity) => identity.userId === message.senderUserId) ?? {
        userId: message.senderUserId,
        displayName: 'System',
        avatarUrl: null,
        publicRoleLabel: 'System' as const,
      },
      body: message.contentText,
      messageType: message.messageType,
      sentAt: message.sentAt.toISOString(),
      status: message.status,
      deliveredAt: message.deliveredAt?.toISOString() ?? null,
      readAt: message.readAt?.toISOString() ?? null,
    };
  }

  private resolveSupportQueueState(
    latest: MessagingConversationRecord['messages'][number] | null,
    status: string,
    supportTicketStatus: string | null,
    identities: MessagingParticipantIdentity[],
  ) {
    if (
      ['CLOSED', 'RESOLVED'].includes(status) ||
      ['CLOSED', 'RESOLVED'].includes(supportTicketStatus ?? '')
    ) return 'RESOLVED';
    if (!latest) return 'NEEDS_SUPPORT_REPLY';
    return ['Patient', 'Practitioner'].includes(
      identities.find((identity) => identity.userId === latest.senderUserId)?.publicRoleLabel ?? '',
    )
      ? 'NEEDS_SUPPORT_REPLY'
      : 'WAITING_FOR_USER';
  }

  static roleLabel(role: ConversationParticipantRole): MessagingParticipantIdentity['publicRoleLabel'] {
    if (role === ConversationParticipantRole.PATIENT) return 'Patient';
    if (role === ConversationParticipantRole.PRACTITIONER) return 'Practitioner';
    if (role === ConversationParticipantRole.SUPPORT_AGENT) return 'Support team';
    if (role === ConversationParticipantRole.ADMIN) return 'Admin';
    return 'System';
  }
}
