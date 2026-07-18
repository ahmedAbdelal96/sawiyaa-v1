import { MessageStatus, MessageVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { MessagingRepository } from './messaging.repository';

describe('MessagingRepository composite read ordering', () => {
  const prisma = {
    message: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue({
        id: 'message-2',
        senderUserId: 'sender-1',
        sentAt: new Date('2026-07-18T12:00:00.000Z'),
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    conversation: { findUnique: jest.fn() },
    conversationParticipant: {
      findFirst: jest.fn().mockResolvedValue({
        lastReadMessageId: 'message-1',
        lastReadAt: new Date('2026-07-18T12:00:00.000Z'),
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn().mockImplementation((operations: unknown[]) => Promise.all(operations as Promise<unknown>[])),
  } as unknown as PrismaService;

  const repository = new MessagingRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('lists newest messages with the reverse composite order', async () => {
    await repository.listMessages('conversation-1', 1, 50);

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('counts unread messages after the same timestamp/id boundary', async () => {
    const lastReadAt = new Date('2026-07-18T12:00:00.000Z');

    await repository.countUnread('conversation-1', 'recipient-1', lastReadAt, 'message-1');

    expect(prisma.message.count).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-1',
        senderUserId: { not: 'recipient-1' },
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        OR: [
          { sentAt: { gt: lastReadAt } },
          { sentAt: lastReadAt, id: { gt: 'message-1' } },
        ],
      },
    });
  });

  it('marks the selected message and all earlier equal-order messages read', async () => {
    await repository.markRead({
      conversationId: 'conversation-1',
      userId: 'recipient-1',
      messageId: 'message-2',
    });

    expect(prisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
          OR: [
            { sentAt: { lt: new Date('2026-07-18T12:00:00.000Z') } },
            { sentAt: new Date('2026-07-18T12:00:00.000Z'), id: { lte: 'message-2' } },
          ],
        }),
      }),
    );
  });
});

describe('MessagingRepository message idempotency contract', () => {
  const baseMessage = {
    id: 'message-1',
    conversationId: 'conversation-1',
    senderUserId: 'sender-1',
    messageType: 'TEXT',
    status: 'SENT',
    contentText: 'hello',
    sentAt: new Date('2026-07-18T12:00:00.000Z'),
    deliveredAt: null,
    readAt: null,
    clientMessagePayloadHash: 'hash-1',
  };

  function input(overrides: Record<string, unknown> = {}) {
    return {
      conversationId: 'conversation-1',
      senderUserId: 'sender-1',
      senderRole: 'PATIENT',
      message: 'hello',
      clientMessageId: 'client-1',
      clientMessagePayloadHash: 'hash-1',
      ...overrides,
    } as any;
  }

  it('returns the original message on an exact unique-conflict retry', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(baseMessage)
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    const prisma = {
      message: { create, findFirst: jest.fn().mockResolvedValue(baseMessage) },
      messageAttachment: { createMany: jest.fn() },
      conversation: { update: jest.fn() },
      conversationParticipant: { updateMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((callback: (tx: any) => Promise<unknown>) => callback({
        message: { create },
        messageAttachment: { createMany: jest.fn() },
        conversation: { update: jest.fn() },
        conversationParticipant: { updateMany: jest.fn() },
      })),
    } as unknown as PrismaService;

    const repository = new MessagingRepository(prisma);
    await expect(repository.appendMessage(input())).resolves.toMatchObject({ created: true });
    await expect(repository.appendMessage(input())).resolves.toEqual({ message: baseMessage, created: false });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('rejects reuse of a key with a different payload fingerprint', async () => {
    const prisma = {
      message: {
        create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' })),
        findFirst: jest.fn().mockResolvedValue(baseMessage),
      },
      $transaction: jest.fn().mockImplementation((callback: (tx: any) => Promise<unknown>) => callback({
        message: { create: prisma.message.create },
        messageAttachment: { createMany: jest.fn() },
        conversation: { update: jest.fn() },
        conversationParticipant: { updateMany: jest.fn() },
      })),
    } as unknown as PrismaService;

    const repository = new MessagingRepository(prisma);
    await expect(repository.appendMessage(input({ clientMessagePayloadHash: 'different' }))).rejects.toMatchObject({
      response: { errorCode: 'MESSAGE_IDEMPOTENCY_CONFLICT' },
    });
  });

  it('keeps missing-key sends backward compatible', async () => {
    const create = jest.fn().mockResolvedValue(baseMessage);
    const prisma = {
      message: { create },
      messageAttachment: { createMany: jest.fn() },
      conversation: { update: jest.fn() },
      conversationParticipant: { updateMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((callback: (tx: any) => Promise<unknown>) => callback({
        message: { create },
        messageAttachment: { createMany: jest.fn() },
        conversation: { update: jest.fn() },
        conversationParticipant: { updateMany: jest.fn() },
      })),
    } as unknown as PrismaService;

    const repository = new MessagingRepository(prisma);
    await expect(repository.appendMessage(input({ clientMessageId: undefined, clientMessagePayloadHash: undefined })))
      .resolves.toMatchObject({ created: true });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ clientMessageId: null }) }));
  });
});
