import { PrismaService } from '@common/prisma/prisma.service';
import { GeneralChatRepository } from './general-chat.repository';

describe('GeneralChatRepository', () => {
  const prisma = {
    conversation: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    conversationParticipant: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    message: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest
      .fn()
      .mockImplementation((operations: unknown[]) =>
        Promise.all(operations as Promise<unknown>[]),
      ),
  } as unknown as PrismaService;

  const repository = new GeneralChatRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies participant-scoped ownership + boundary filters for list', async () => {
    await repository.listOwnedConversations({
      userId: 'user_1',
      page: 1,
      limit: 20,
    });

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationType: 'SYSTEM',
          supportTicketId: null,
          chatApprovalRequestId: null,
          participants: {
            some: {
              userId: 'user_1',
              isActive: true,
            },
          },
        }),
      }),
    );
  });

  it('uses deterministic ordering and pagination for list', async () => {
    await repository.listOwnedConversations({
      userId: 'user_1',
      page: 3,
      limit: 10,
    });

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: 20,
        take: 10,
      }),
    );
  });

  it('enforces general chat boundary for detail reads', async () => {
    await repository.findConversationByIdInGeneralScope('conversation_1');

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'conversation_1',
          conversationType: 'SYSTEM',
          supportTicketId: null,
          chatApprovalRequestId: null,
        }),
      }),
    );
  });

  it('counts unread messages for participant deterministically', async () => {
    await repository.countUnreadMessagesForParticipant({
      conversationId: 'conversation_1',
      userId: 'user_1',
      lastReadAt: new Date('2026-04-01T10:00:00.000Z'),
    });

    expect(prisma.message.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: 'conversation_1',
          senderUserId: { not: 'user_1' },
          sentAt: { gt: new Date('2026-04-01T10:00:00.000Z') },
        }),
      }),
    );
  });

  it('finds accessible message in participant-scoped general conversation', async () => {
    await repository.findAccessibleMessageInConversationScope({
      conversationId: 'conversation_1',
      messageId: 'message_1',
      userId: 'user_1',
    });

    expect(prisma.message.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'message_1',
          conversationId: 'conversation_1',
          conversation: expect.objectContaining({
            conversationType: 'SYSTEM',
            supportTicketId: null,
            chatApprovalRequestId: null,
          }),
        }),
      }),
    );
  });
});
