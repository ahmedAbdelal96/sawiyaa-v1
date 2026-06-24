import { ForbiddenException } from '@nestjs/common';
import {
  ConversationParticipantRole,
  MessageStatus,
  SupportTicketPriority,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportTicketRepository } from './support-ticket.repository';

function buildTicketDetails(input: {
  ticketId: string;
  conversationId: string;
  assignedToUserId: string | null;
  senderUserId: string;
  message: string;
}) {
  return {
    id: input.ticketId,
    ticketType: 'PAYMENT',
    subject: 'subject',
    status: 'OPEN',
    priority: SupportTicketPriority.NORMAL,
    assignedToUserId: input.assignedToUserId,
    description: 'desc',
    relatedSessionId: null,
    relatedPaymentId: null,
    relatedInstantBookingRequestId: null,
    relatedMatchingSessionId: null,
    relatedAssessmentSubmissionId: null,
    lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    conversation: {
      id: input.conversationId,
      participants: [
        {
          userId: input.senderUserId,
          participantRole: ConversationParticipantRole.SUPPORT_AGENT,
        },
      ],
      messages: [
        {
          id: 'msg-1',
          senderUserId: input.senderUserId,
          contentText: input.message,
          status: MessageStatus.SENT,
          sentAt: new Date('2026-01-01T00:00:00.000Z'),
          deliveredAt: null,
          readAt: null,
        },
      ],
      internalNotes: [],
    },
  };
}

function buildInternalNoteTicketDetails(input: {
  ticketId: string;
  conversationId: string;
  assignedToUserId: string | null;
  noteText: string;
}) {
  return {
    id: input.ticketId,
    ticketType: 'PAYMENT',
    subject: 'subject',
    status: 'OPEN',
    priority: SupportTicketPriority.NORMAL,
    assignedToUserId: input.assignedToUserId,
    description: 'desc',
    relatedSessionId: null,
    relatedPaymentId: null,
    relatedInstantBookingRequestId: null,
    relatedMatchingSessionId: null,
    relatedAssessmentSubmissionId: null,
    lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    conversation: {
      id: input.conversationId,
      participants: [],
      messages: [],
      internalNotes: [
        {
          id: 'note-1',
          noteText: input.noteText,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    },
  };
}

describe('SupportTicketRepository addPublicSupportMessage', () => {
  let assignedToUserId: string | null;
  let lastSenderUserId: string;
  let lastMessageText: string;
  let findCallCount: number;

  const supportTicketFindUniqueOrThrow = jest.fn();
  const supportTicketUpdateMany = jest.fn();
  const supportTicketUpdate = jest.fn();
  const conversationParticipantUpsert = jest.fn();
  const messageCreate = jest.fn();
  const supportTicketEventCreate = jest.fn();

  const prisma = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<never>) =>
      callback(
        {
          supportTicket: {
            findUniqueOrThrow: supportTicketFindUniqueOrThrow,
            updateMany: supportTicketUpdateMany,
            update: supportTicketUpdate,
          },
          conversationParticipant: {
            upsert: conversationParticipantUpsert,
          },
          message: {
            create: messageCreate,
          },
          supportTicketEvent: {
            create: supportTicketEventCreate,
          },
        } as never,
      ),
    ),
  } as unknown as PrismaService;

  const repository = new SupportTicketRepository(prisma);

  beforeEach(() => {
    assignedToUserId = null;
    lastSenderUserId = '';
    lastMessageText = '';
    findCallCount = 0;
    jest.clearAllMocks();

    supportTicketFindUniqueOrThrow.mockImplementation(async () => {
      findCallCount += 1;
      if (findCallCount === 1) {
        return {
          id: 'ticket-1',
          conversationId: 'conv-1',
          assignedToUserId,
        };
      }

      return buildTicketDetails({
        ticketId: 'ticket-1',
        conversationId: 'conv-1',
        assignedToUserId,
        senderUserId: lastSenderUserId || 'agent-1',
        message: lastMessageText || 'reply',
      });
    });

    supportTicketUpdateMany.mockImplementation(async ({ data }) => {
      if (assignedToUserId !== null) {
        return { count: 0 };
      }

      assignedToUserId = data.assignedToUserId as string | null;
      return { count: 1 };
    });

    supportTicketUpdate.mockResolvedValue({
      id: 'ticket-1',
    });

    conversationParticipantUpsert.mockResolvedValue({
      id: 'participant-1',
    });

    messageCreate.mockImplementation(async ({ data }) => {
      lastSenderUserId = data.senderUserId as string;
      lastMessageText = data.contentText as string;
      return {
        id: 'msg-1',
      };
    });

    supportTicketEventCreate.mockResolvedValue({
      id: 'event-1',
    });
  });

  it('claims an unassigned ticket on the first public reply', async () => {
    const result = await repository.addPublicSupportMessage({
      ticketId: 'ticket-1',
      senderUserId: 'agent-1',
      senderRole: ConversationParticipantRole.SUPPORT_AGENT,
      message: 'reply',
    });

    expect(supportTicketUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'ticket-1',
        assignedToUserId: null,
      },
      data: {
        assignedToUserId: 'agent-1',
      },
    });
    expect(supportTicketEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supportTicketId: 'ticket-1',
        eventType: 'ASSIGNED',
        actorUserId: 'agent-1',
        actorRole: ConversationParticipantRole.SUPPORT_AGENT,
        payloadJson: expect.objectContaining({
          assignedToUserId: 'agent-1',
          claimedOnFirstPublicReply: true,
        }),
      }),
    });
    expect(messageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conv-1',
        senderUserId: 'agent-1',
        contentText: 'reply',
      }),
    });
    expect(result.assignedToUserId).toBe('agent-1');
    expect(result.conversation.messages).toHaveLength(1);
  });

  it('allows the assigned owner to reply without reclaiming', async () => {
    assignedToUserId = 'agent-1';

    const result = await repository.addPublicSupportMessage({
      ticketId: 'ticket-1',
      senderUserId: 'agent-1',
      senderRole: ConversationParticipantRole.SUPPORT_AGENT,
      message: 'owner reply',
    });

    expect(supportTicketUpdateMany).not.toHaveBeenCalled();
    expect(supportTicketEventCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'ASSIGNED',
        }),
      }),
    );
    expect(messageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        senderUserId: 'agent-1',
        contentText: 'owner reply',
      }),
    });
    expect(result.assignedToUserId).toBe('agent-1');
  });

  it('allows an assigned admin owner to reply without reclaiming', async () => {
    assignedToUserId = 'admin-1';

    const result = await repository.addPublicSupportMessage({
      ticketId: 'ticket-1',
      senderUserId: 'admin-1',
      senderRole: ConversationParticipantRole.ADMIN,
      message: 'admin owner reply',
    });

    expect(supportTicketUpdateMany).not.toHaveBeenCalled();
    expect(messageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        senderUserId: 'admin-1',
        contentText: 'admin owner reply',
      }),
    });
    expect(result.assignedToUserId).toBe('admin-1');
  });

  it('rejects another agent when the ticket is already assigned', async () => {
    assignedToUserId = 'agent-1';

    await expect(
      repository.addPublicSupportMessage({
        ticketId: 'ticket-1',
        senderUserId: 'agent-2',
      senderRole: ConversationParticipantRole.SUPPORT_AGENT,
      message: 'blocked reply',
    }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-owner admin when the ticket is already assigned', async () => {
    assignedToUserId = 'agent-1';

    await expect(
      repository.addPublicSupportMessage({
        ticketId: 'ticket-1',
        senderUserId: 'admin-1',
        senderRole: ConversationParticipantRole.ADMIN,
        message: 'blocked admin reply',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messageCreate).not.toHaveBeenCalled();
    expect(supportTicketUpdateMany).not.toHaveBeenCalled();
  });

  it('allows only one claimant to win the first-reply race', async () => {
    const firstReply = repository.addPublicSupportMessage({
      ticketId: 'ticket-1',
      senderUserId: 'agent-1',
      senderRole: ConversationParticipantRole.SUPPORT_AGENT,
      message: 'first reply',
    });
    const secondReply = repository.addPublicSupportMessage({
      ticketId: 'ticket-1',
      senderUserId: 'agent-2',
      senderRole: ConversationParticipantRole.SUPPORT_AGENT,
      message: 'second reply',
    });

    await expect(firstReply).resolves.toMatchObject({
      assignedToUserId: 'agent-1',
    });
    await expect(secondReply).rejects.toBeInstanceOf(ForbiddenException);

    expect(supportTicketUpdateMany).toHaveBeenCalledTimes(2);
    expect(supportTicketEventCreate).toHaveBeenCalledTimes(2);
    expect(messageCreate).toHaveBeenCalledTimes(1);
    expect(assignedToUserId).toBe('agent-1');
  });
});

describe('SupportTicketRepository addInternalNote', () => {
  let assignedToUserId: string | null;
  let lastNoteAuthorUserId: string;
  let lastNoteText: string;
  let findCallCount: number;

  const supportTicketFindUniqueOrThrow = jest.fn();
  const supportTicketUpdate = jest.fn();
  const conversationParticipantUpsert = jest.fn();
  const internalConversationNoteCreate = jest.fn();
  const supportTicketEventCreate = jest.fn();
  const messageCreate = jest.fn();

  const prisma = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<never>) =>
      callback(
        {
          supportTicket: {
            findUniqueOrThrow: supportTicketFindUniqueOrThrow,
            update: supportTicketUpdate,
          },
          conversationParticipant: {
            upsert: conversationParticipantUpsert,
          },
          internalConversationNote: {
            create: internalConversationNoteCreate,
          },
          supportTicketEvent: {
            create: supportTicketEventCreate,
          },
          message: {
            create: messageCreate,
          },
        } as never,
      ),
    ),
  } as unknown as PrismaService;

  const repository = new SupportTicketRepository(prisma);

  beforeEach(() => {
    assignedToUserId = null;
    lastNoteAuthorUserId = '';
    lastNoteText = '';
    findCallCount = 0;
    jest.clearAllMocks();

    supportTicketFindUniqueOrThrow.mockImplementation(async () => {
      findCallCount += 1;
      if (findCallCount === 1) {
        return {
          id: 'ticket-1',
          conversationId: 'conv-1',
          assignedToUserId,
        };
      }

      return buildInternalNoteTicketDetails({
        ticketId: 'ticket-1',
        conversationId: 'conv-1',
        assignedToUserId,
        noteText: lastNoteText || 'internal note',
      });
    });

    supportTicketUpdate.mockResolvedValue({
      id: 'ticket-1',
    });

    conversationParticipantUpsert.mockResolvedValue({
      id: 'participant-1',
    });

    internalConversationNoteCreate.mockImplementation(async ({ data }) => {
      lastNoteAuthorUserId = data.createdByUserId as string;
      lastNoteText = data.noteText as string;
      return {
        id: 'note-1',
      };
    });

    supportTicketEventCreate.mockResolvedValue({
      id: 'event-1',
    });

    messageCreate.mockResolvedValue({
      id: 'msg-1',
    });
  });

  it('creates an internal note on an unassigned ticket without claiming ownership', async () => {
    const result = await repository.addInternalNote({
      ticketId: 'ticket-1',
      actorUserId: 'admin-1',
      actorRole: ConversationParticipantRole.ADMIN,
      note: 'internal note',
    });

    expect(internalConversationNoteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conv-1',
        createdByUserId: 'admin-1',
        noteText: 'internal note',
      }),
    });
    expect(supportTicketUpdate).not.toHaveBeenCalled();
    expect(messageCreate).not.toHaveBeenCalled();
    expect(result.assignedToUserId).toBeNull();
    expect(result.conversation.internalNotes).toHaveLength(1);
    expect(result.conversation.internalNotes[0]?.noteText).toBe('internal note');
    expect(lastNoteAuthorUserId).toBe('admin-1');
  });

  it('creates an internal note on another staff-owned ticket without changing assignment', async () => {
    assignedToUserId = 'agent-1';

    const result = await repository.addInternalNote({
      ticketId: 'ticket-1',
      actorUserId: 'admin-1',
      actorRole: ConversationParticipantRole.ADMIN,
      note: 'another internal note',
    });

    expect(internalConversationNoteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conv-1',
        createdByUserId: 'admin-1',
        noteText: 'another internal note',
      }),
    });
    expect(supportTicketUpdate).not.toHaveBeenCalled();
    expect(messageCreate).not.toHaveBeenCalled();
    expect(result.assignedToUserId).toBe('agent-1');
    expect(lastNoteAuthorUserId).toBe('admin-1');
  });

  it('does not interfere with later public reply ownership rules for the same staff user', async () => {
    assignedToUserId = 'agent-1';

    const noteResult = await repository.addInternalNote({
      ticketId: 'ticket-1',
      actorUserId: 'agent-1',
      actorRole: ConversationParticipantRole.SUPPORT_AGENT,
      note: 'same owner internal note',
    });
    const updateCallsAfterNote = supportTicketUpdate.mock.calls.length;

    const replyResult = await repository.addPublicSupportMessage({
      ticketId: 'ticket-1',
      senderUserId: 'agent-1',
      senderRole: ConversationParticipantRole.SUPPORT_AGENT,
      message: 'public reply after note',
    });

    expect(noteResult.assignedToUserId).toBe('agent-1');
    expect(replyResult.assignedToUserId).toBe('agent-1');
    expect(internalConversationNoteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdByUserId: 'agent-1',
        noteText: 'same owner internal note',
      }),
    });
    expect(updateCallsAfterNote).toBe(0);
    expect(supportTicketUpdate).toHaveBeenCalledTimes(1);
    expect(messageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        senderUserId: 'agent-1',
        contentText: 'public reply after note',
      }),
    });
  });
});
