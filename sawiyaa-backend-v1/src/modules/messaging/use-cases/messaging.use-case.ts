import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationParticipantRole } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { MessagingPolicyRegistry } from '../policies/messaging-policy-registry';
import { MessagingPresenter } from '../presenters/messaging.presenter';
import { MessagingRepository } from '../repositories/messaging.repository';
import { MessagingActor, MessagingConversationRecord } from '../types/messaging.types';
import { GeneralChatAttachmentStorageService } from '@modules/chat/services/general-chat-attachment-storage.service';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

@Injectable()
export class MessagingUseCase {
  constructor(
    private readonly repository: MessagingRepository,
    private readonly policies: MessagingPolicyRegistry,
    private readonly presenter: MessagingPresenter,
    private readonly notifications: OperationalNotificationService,
    private readonly attachmentStorage: GeneralChatAttachmentStorageService,
  ) {}

  async listConversations(actor: AuthenticatedUser, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const result = await this.repository.listConversations(actor, safePage, safeLimit);
    const items = await Promise.all(result.items.map((conversation) => this.presentConversation(conversation, actor)));
    return { items, pagination: { page: safePage, limit: safeLimit, totalItems: result.totalItems, totalPages: Math.max(1, Math.ceil(result.totalItems / safeLimit)) } };
  }

  async getConversation(actor: AuthenticatedUser, conversationId: string) {
    const conversation = await this.requireConversation(conversationId);
    this.policies.assertCanView(conversation, actor);
    return { item: await this.presentConversation(conversation, actor) };
  }

  async listMessages(actor: AuthenticatedUser, conversationId: string, page = 1, limit = 30) {
    const conversation = await this.requireConversation(conversationId);
    this.policies.assertCanView(conversation, actor);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const result = await this.repository.listMessages(conversationId, safePage, safeLimit);
    const identities = await this.buildIdentities(
      conversation,
      [],
      result.items
        .map((message) => message.senderUserId)
        .filter((id): id is string => Boolean(id)),
    );
    return {
      items: result.items.map((message) => ({
        ...this.presenter.presentMessage(message as MessagingConversationRecord['messages'][number], identities),
        conversationId,
        attachments: (message.attachments ?? []).map((attachment) => ({
          id: attachment.id,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          originalName: attachment.originalName,
        })),
      })),
      pagination: { page: safePage, limit: safeLimit, totalItems: result.totalItems, totalPages: Math.max(1, Math.ceil(result.totalItems / safeLimit)) },
    };
  }

  async sendMessage(
    actor: AuthenticatedUser,
    conversationId: string,
    message: string,
    attachments: Array<{
      fileId: string;
      fileUrl: string;
      mimeType: string;
      fileSize?: number;
      originalName?: string;
    }> = [],
  ) {
    const conversation = await this.requireConversation(conversationId);
    const authorization = this.policies.canSend(conversation, actor);
    if (!authorization.allowed) {
      throw new BadRequestException({ messageKey: 'messages.errors.conversationNotSendable', errorCode: `MESSAGING_${authorization.reason}` });
    }
    const normalized = message.trim();
    if (!normalized) throw new BadRequestException({ messageKey: 'messages.errors.messageRequired', errorCode: 'MESSAGING_MESSAGE_REQUIRED' });
    const senderRole = this.resolveSenderRole(conversation, actor);
    const created = await this.repository.appendMessage({ conversationId, senderUserId: actor.id, senderRole, message: normalized, attachments });
    const fresh = await this.requireConversation(conversationId);
    await this.notifications.notifyConversationMessage({
      lane:
        conversation.conversationType === 'SUPPORT'
          ? 'SUPPORT'
          : conversation.conversationType === 'CARE_APPROVED'
            ? 'CARE_CHAT'
            : 'SESSION_CHAT',
      threadId: conversation.supportTicketId ?? conversationId,
      messageId: created.id,
      senderUserId: actor.id,
      participants: fresh.participants,
    });
    const identities = await this.buildIdentities(fresh, [{ id: actor.id, role: senderRole }]);
    return {
      item: {
        ...this.presenter.presentMessage(
          created as MessagingConversationRecord['messages'][number],
          identities,
        ),
        conversationId,
        attachments,
        conversationLatestActivityAt: fresh.updatedAt.toISOString(),
      },
    };
  }

  async markRead(actor: AuthenticatedUser, conversationId: string, messageId: string) {
    const conversation = await this.requireConversation(conversationId);
    this.policies.assertCanView(conversation, actor);
    const result = await this.repository.markRead({ conversationId, userId: actor.id, messageId });
    const unreadCount = await this.repository.countUnread(conversationId, actor.id, result.lastReadAt);
    return { item: { conversationId, ...result, lastReadAt: result.lastReadAt?.toISOString() ?? null, unreadCount, hasUnread: unreadCount > 0 } };
  }

  async uploadAttachment(
    actor: AuthenticatedUser,
    conversationId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
    options: { allowLegacyAdmin?: boolean } = {},
  ) {
    await this.assertAttachmentAccess(actor, conversationId, options);
    if (
      !file.buffer?.length ||
      file.size > MAX_ATTACHMENT_SIZE ||
      !this.attachmentStorage.isAllowedMimeType(file.mimetype)
    ) {
      throw new BadRequestException({
        messageKey: 'messages.errors.invalidAttachment',
        errorCode: 'MESSAGING_ATTACHMENT_INVALID',
      });
    }
    const stored = await this.attachmentStorage.save({
      conversationId,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      originalFileName: file.originalname ?? null,
    });
    return {
      fileId: stored.fileId,
      fileUrl: `/api/v1/messages/conversations/${conversationId}/attachments/${stored.fileId}`,
      mimeType: stored.mimeType,
      fileSize: stored.fileSizeBytes,
      originalName: stored.originalFileName,
    };
  }

  markMessageDelivered(input: {
    conversationId: string;
    messageId: string;
    deliveredAt: Date;
  }) {
    return this.repository.markMessageDelivered(input);
  }

  markMessagesDeliveredForRecipient(input: {
    conversationId: string;
    recipientUserId: string;
    deliveredAt: Date;
  }) {
    return this.repository.markMessagesDeliveredForRecipient(input);
  }

  async resolveAttachment(
    actor: AuthenticatedUser,
    conversationId: string,
    fileId: string,
    options: { allowLegacyAdmin?: boolean } = {},
  ) {
    await this.assertAttachmentAccess(actor, conversationId, options);
    const resolved = await this.attachmentStorage.resolve({ conversationId, fileId });
    if (!resolved) {
      throw new NotFoundException({
        messageKey: 'messages.errors.attachmentNotFound',
        errorCode: 'MESSAGING_ATTACHMENT_NOT_FOUND',
      });
    }
    return resolved;
  }

  async getUnreadSummary(actor: AuthenticatedUser) {
    const result = await this.repository.listConversations(actor, 1, 50);
    let unreadCount = 0;
    for (const conversation of result.items) {
      const participant = conversation.participants.find(
        (item) => item.userId === actor.id,
      );
      if (participant) {
        unreadCount += await this.repository.countUnread(
          conversation.id,
          actor.id,
          participant.lastReadAt,
        );
      }
    }
    const isSupportStaff = actor.roles.some((role) =>
      ['ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT'].includes(role as string),
    );
    const needsSupportReplyCount = isSupportStaff
      ? await this.repository.countSupportNeedsReply()
      : 0;
    return {
      item: {
        unreadCount,
        hasUnread: unreadCount > 0 || needsSupportReplyCount > 0,
        needsSupportReplyCount,
      },
    };
  }

  private async requireConversation(conversationId: string) {
    const conversation = await this.repository.findConversation(conversationId);
    if (!conversation) throw new NotFoundException({ messageKey: 'messages.errors.conversationNotFound', errorCode: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    return conversation;
  }

  private async assertAttachmentAccess(
    actor: AuthenticatedUser,
    conversationId: string,
    options: { allowLegacyAdmin?: boolean },
  ) {
    const conversation = await this.requireConversation(conversationId);
    const isLegacyAdmin =
      options.allowLegacyAdmin === true &&
      actor.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role as string));
    if (!isLegacyAdmin) this.policies.assertCanView(conversation, actor);
    return conversation;
  }

  private async presentConversation(conversation: MessagingConversationRecord, actor: AuthenticatedUser) {
    const participant = conversation.participants.find((item) => item.userId === actor.id);
    const unreadCount = participant ? await this.repository.countUnread(conversation.id, actor.id, participant.lastReadAt) : 0;
    const authorization = this.policies.canSend(conversation, actor);
    return this.presenter.presentConversation({ conversation, actorId: actor.id, participants: await this.buildIdentities(conversation), unreadCount, canSend: authorization.allowed, sendDisabledReason: authorization.allowed ? null : authorization.reason, publicType: this.policies.getPublicType(conversation) });
  }

  private async buildIdentities(
    conversation: MessagingConversationRecord,
    extras: Array<{ id: string; role: ConversationParticipantRole }> = [],
    extraUserIds: string[] = [],
  ) {
    const userIds = Array.from(
      new Set([
        ...conversation.participants.map((participant) => participant.userId),
        ...conversation.messages
          .map((message) => message.senderUserId)
          .filter((id): id is string => Boolean(id)),
        ...extras.map((extra) => extra.id),
        ...extraUserIds,
      ]),
    );
    const users = await this.repository.loadUsers(userIds);
    const map = new Map(users.map((user) => [user.id, user]));
    const roles = new Map(
      conversation.participants.map((participant) => [participant.userId, participant.participantRole]),
    );
    for (const extra of extras) roles.set(extra.id, extra.role);
    return userIds.map((userId) => {
      const user = map.get(userId);
      const role = roles.get(userId) ?? (conversation.conversationType === 'SUPPORT' ? ConversationParticipantRole.SUPPORT_AGENT : ConversationParticipantRole.SYSTEM);
      const displayName = user?.displayName ?? user?.patientProfile?.displayName ?? user?.practitionerProfile?.professionalTitle ?? 'Platform user';
      return { userId, displayName, avatarUrl: user?.practitionerProfile?.avatarUrl ?? null, publicRoleLabel: MessagingPresenter.roleLabel(role) };
    });
  }

  private resolveSenderRole(conversation: MessagingConversationRecord, actor: AuthenticatedUser) {
    const existing = conversation.participants.find((participant) => participant.userId === actor.id);
    if (existing) return existing.participantRole;
    if (actor.roles.includes('SUPPORT_AGENT' as never)) return ConversationParticipantRole.SUPPORT_AGENT;
    if (actor.roles.includes('ADMIN' as never) || actor.roles.includes('SUPER_ADMIN' as never)) return ConversationParticipantRole.ADMIN;
    return ConversationParticipantRole.SYSTEM;
  }
}
