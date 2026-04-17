import { PrismaService } from '@common/prisma/prisma.service';
import { GeneralChatRepository } from './general-chat.repository';

describe('GeneralChatRepository (message append)', () => {
  const tx = {
    message: {
      create: jest.fn().mockResolvedValue({
        id: 'msg_1',
        conversationId: 'conv_1',
        senderUserId: 'user_1',
        messageType: 'TEXT',
        contentText: 'Hello',
        sentAt: new Date('2026-04-01T12:00:00.000Z'),
      }),
    },
    messageAttachment: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([
        {
          fileUrl: 'https://cdn.example.com/a.pdf',
          mimeType: 'application/pdf',
          fileSize: 1200,
          originalName: 'a.pdf',
          storageProvider: 'ref:file_1',
        },
      ]),
    },
    conversation: {
      update: jest.fn().mockResolvedValue({
        id: 'conv_1',
        updatedAt: new Date('2026-04-01T12:00:00.000Z'),
      }),
    },
  };

  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: typeof tx) => unknown) => callback(tx)),
  } as unknown as PrismaService;

  const repository = new GeneralChatRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists message and updates conversation latest activity timestamp', async () => {
    const sentAt = new Date('2026-04-01T12:00:00.000Z');

    await repository.appendMessageInGeneralConversation({
      conversationId: 'conv_1',
      senderUserId: 'user_1',
      contentText: 'Hello',
      attachments: [
        {
          fileId: 'file_1',
          fileUrl: 'https://cdn.example.com/a.pdf',
          mimeType: 'application/pdf',
        },
      ],
      sentAt,
    });

    expect(tx.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conv_1',
          senderUserId: 'user_1',
          contentText: 'Hello',
        }),
      }),
    );

    expect(tx.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv_1' },
        data: { updatedAt: sentAt },
      }),
    );
  });
});

