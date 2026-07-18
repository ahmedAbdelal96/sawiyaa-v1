import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagingUseCase } from './messaging.use-case';
import { ConversationType, MessageStatus, MessageVisibility } from '@prisma/client';

describe('Messaging Unified Read Cursor Correctness and Monotonicity', () => {
  let dbMessages: any[] = [];
  let dbParticipants: Map<string, any> = new Map();
  let nextMessageIdCounter = 1;

  const mockRepository = {
    findConversation: jest.fn().mockImplementation(async (id: string) => {
      return {
        id,
        conversationType: ConversationType.SUPPORT,
        status: 'OPEN',
        sessionId: null,
        supportTicketId: 'ticket-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        expiresAt: null,
        participants: Array.from(dbParticipants.values()),
        messages: dbMessages,
        session: null,
        supportTicket: { status: 'OPEN', subject: 'Support' },
        chatApprovalRequest: null,
      };
    }),
    markRead: jest.fn().mockImplementation(async (input: { conversationId: string; userId: string; messageId: string }) => {
      const target = dbMessages.find((m) => m.id === input.messageId && m.deletedAt === null && m.visibility === MessageVisibility.NORMAL);
      if (!target) {
        throw new NotFoundException({ messageKey: 'messages.errors.messageNotFound', errorCode: 'MESSAGING_MESSAGE_NOT_FOUND' });
      }
      const participant = dbParticipants.get(input.userId);
      if (!participant || !participant.isActive) {
        return { lastReadMessageId: null, lastReadAt: null };
      }

      const current = participant.lastReadAt?.getTime() ?? -1;
      const currentMsgId = participant.lastReadMessageId ?? '';

      // The new monotonic condition:
      const shouldUpdate =
        target.sentAt.getTime() > current ||
        (target.sentAt.getTime() === current && target.id > currentMsgId);

      if (target.senderUserId !== input.userId && shouldUpdate) {
        participant.lastReadMessageId = target.id;
        participant.lastReadAt = target.sentAt; // FIX: set to message sentAt

        dbMessages.forEach((msg) => {
          if (
            msg.senderUserId !== input.userId &&
            (msg.sentAt.getTime() < target.sentAt.getTime() ||
              (msg.sentAt.getTime() === target.sentAt.getTime() && msg.id <= target.id))
          ) {
            msg.status = MessageStatus.READ;
          }
        });
        return { lastReadMessageId: target.id, lastReadAt: target.sentAt };
      }

      return { lastReadMessageId: participant.lastReadMessageId, lastReadAt: participant.lastReadAt };
    }),
    countUnread: jest.fn().mockImplementation(async (conversationId: string, userId: string, lastReadAt: Date | null, lastReadMessageId: string | null = null) => {
      return dbMessages.filter((msg) => {
        if (msg.senderUserId === userId || msg.deletedAt !== null || msg.visibility !== MessageVisibility.NORMAL) {
          return false;
        }
        if (!lastReadAt) return true;
        // The new cursor calculation supporting timestamp collisions:
        return (
          msg.sentAt.getTime() > lastReadAt.getTime() ||
          (msg.sentAt.getTime() === lastReadAt.getTime() && (lastReadMessageId ? msg.id > lastReadMessageId : false))
        );
      }).length;
    }),
    listConversations: jest.fn(),
    countSupportNeedsReply: jest.fn(),
  };

  // Real messaging policy assertion mock that enforces membership
  const policy = {
    assertCanView: jest.fn().mockImplementation((conversation, actor) => {
      const isParticipant = conversation.participants.some((p: any) => p.userId === actor.id);
      if (!isParticipant) {
        throw new ForbiddenException();
      }
    }),
    canSend: jest.fn(),
  };

  const presenter = {
    presentMessage: jest.fn().mockImplementation((msg) => msg),
  };

  const notifications = {
    notifyConversationMessage: jest.fn(),
  };

  const useCase = new MessagingUseCase(
    mockRepository as any,
    policy as any,
    presenter as any,
    notifications as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => {
    nextMessageIdCounter = 1;
    dbParticipants.clear();

    // Participant 1 (recipient)
    dbParticipants.set('recipient-1', {
      userId: 'recipient-1',
      participantRole: 'PATIENT',
      isActive: true,
      lastReadMessageId: null,
      lastReadAt: null,
    });

    // Participant 2 (recipient 2) - to test isolation
    dbParticipants.set('recipient-2', {
      userId: 'recipient-2',
      participantRole: 'PRACTITIONER',
      isActive: true,
      lastReadMessageId: null,
      lastReadAt: null,
    });

    dbMessages = [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderUserId: 'sender-1',
        contentText: 'Message 1',
        sentAt: new Date('2026-07-18T12:00:00.000Z'),
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        status: MessageStatus.SENT,
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        senderUserId: 'sender-1',
        contentText: 'Message 2',
        sentAt: new Date('2026-07-18T12:05:00.000Z'),
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        status: MessageStatus.SENT,
      },
      {
        id: 'msg-3',
        conversationId: 'conv-1',
        senderUserId: 'sender-1',
        contentText: 'Message 3',
        sentAt: new Date('2026-07-18T12:10:00.000Z'),
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        status: MessageStatus.SENT,
      },
    ];
  });

  it('1. should allow a participant to mark a valid message as read', async () => {
    const actor = { id: 'recipient-1', roles: [] } as any;
    const res = await useCase.markRead(actor, 'conv-1', 'msg-1');
    expect(res.item.lastReadMessageId).toBe('msg-1');
    expect(res.item.lastReadAt).toBe(new Date('2026-07-18T12:00:00.000Z').toISOString());
  });

  it('2. should advance to a newer target, keep messages newer than target unread, and mark previous read', async () => {
    const actor = { id: 'recipient-1', roles: [] } as any;

    // Mark msg-2 as read
    const res = await useCase.markRead(actor, 'conv-1', 'msg-2');
    expect(res.item.lastReadMessageId).toBe('msg-2');

    // msg-1 and msg-2 must be read, msg-3 must remain unread (unread count = 1)
    expect(res.item.unreadCount).toBe(1);
    expect(res.item.hasUnread).toBe(true);
  });

  it('3. should make repeated same-message requests idempotent and not move cursor backward', async () => {
    const actor = { id: 'recipient-1', roles: [] } as any;

    await useCase.markRead(actor, 'conv-1', 'msg-2');
    const firstResult = await useCase.markRead(actor, 'conv-1', 'msg-2');

    // Repeated request should return same cursor
    expect(firstResult.item.lastReadMessageId).toBe('msg-2');
    expect(firstResult.item.unreadCount).toBe(1);

    // Try marking msg-1 (older) as read after msg-2 (newer) was already read
    const backwardResult = await useCase.markRead(actor, 'conv-1', 'msg-1');

    // Cursor MUST not move backward (remain msg-2)
    expect(backwardResult.item.lastReadMessageId).toBe('msg-2');
    expect(backwardResult.item.unreadCount).toBe(1);
  });

  it('4. should correctly count unread as zero after a full read', async () => {
    const actor = { id: 'recipient-1', roles: [] } as any;

    const res = await useCase.markRead(actor, 'conv-1', 'msg-3');
    expect(res.item.lastReadMessageId).toBe('msg-3');
    expect(res.item.unreadCount).toBe(0);
    expect(res.item.hasUnread).toBe(false);
  });

  it('5. should ensure participant read-state isolation (one participant does not affect another)', async () => {
    const actor1 = { id: 'recipient-1', roles: [] } as any;
    const actor2 = { id: 'recipient-2', roles: [] } as any;

    // Participant 1 marks msg-3 as read
    const res1 = await useCase.markRead(actor1, 'conv-1', 'msg-3');
    expect(res1.item.unreadCount).toBe(0);

    // Participant 2 unread count should still remain 3 (unaffected by participant 1)
    const p2Unread = await mockRepository.countUnread(
      'conv-1',
      actor2.id,
      dbParticipants.get(actor2.id).lastReadAt,
      dbParticipants.get(actor2.id).lastReadMessageId
    );
    expect(p2Unread).toBe(3);
  });

  it('6. should reject unauthorized access to markRead', async () => {
    const intruder = { id: 'intruder-1', roles: [] } as any;
    await expect(useCase.markRead(intruder, 'conv-1', 'msg-1')).rejects.toThrow(ForbiddenException);
  });

  it('7. should handle equal timestamp boundary ordering based on message ID', async () => {
    // Add three concurrent messages with the exact same timestamp and distinct IDs.
    // Ordered as msg-x < msg-y < msg-z.
    dbMessages.push(
      {
        id: 'msg-x',
        conversationId: 'conv-1',
        senderUserId: 'sender-1',
        contentText: 'Concurrent X',
        sentAt: new Date('2026-07-18T13:00:00.000Z'),
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        status: MessageStatus.SENT,
      },
      {
        id: 'msg-y',
        conversationId: 'conv-1',
        senderUserId: 'sender-1',
        contentText: 'Concurrent Y',
        sentAt: new Date('2026-07-18T13:00:00.000Z'),
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        status: MessageStatus.SENT,
      },
      {
        id: 'msg-z',
        conversationId: 'conv-1',
        senderUserId: 'sender-1',
        contentText: 'Concurrent Z',
        sentAt: new Date('2026-07-18T13:00:00.000Z'),
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        status: MessageStatus.SENT,
      },
    );

    const actor = { id: 'recipient-1', roles: [] } as any;

    // Participant marks msg-x as read
    const resX = await useCase.markRead(actor, 'conv-1', 'msg-x');
    expect(resX.item.lastReadMessageId).toBe('msg-x');

    // Y and Z have the same timestamp but larger IDs, so both must remain unread.
    // Total unread should be 2 (msg-y and msg-z).
    // Note: msg-1, msg-2, msg-3 are already at earlier timestamps and are marked read.
    expect(resX.item.unreadCount).toBe(2);

    // Participant marks msg-y as read (equal timestamp but larger ID is allowed to advance cursor)
    const resY = await useCase.markRead(actor, 'conv-1', 'msg-y');
    expect(resY.item.lastReadMessageId).toBe('msg-y');
    expect(resY.item.unreadCount).toBe(1);

    const resZ = await useCase.markRead(actor, 'conv-1', 'msg-z');
    expect(resZ.item.lastReadMessageId).toBe('msg-z');
    expect(resZ.item.unreadCount).toBe(0);

    // Try marking msg-x again (moving backward to older ID within same timestamp)
    const resRetryX = await useCase.markRead(actor, 'conv-1', 'msg-x');
    // Cursor must NOT move backward (remain msg-y)
    expect(resRetryX.item.lastReadMessageId).toBe('msg-z');
  });
});
